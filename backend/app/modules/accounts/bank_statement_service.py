import io
import re
import csv
import hashlib
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from difflib import SequenceMatcher
from typing import List, Dict, Any, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.tenant_db.models import (
    BankStatementImport,
    BankStatementLine,
    MasterAlias,
    CompanyBankAccount,
    Account,
    Vendor,
    BillingClient,
    Driver,
    VehicleOwner,
    Voucher,
    VoucherType,
    BillAllocation,
    User,
    Branch,
)
from app.modules.accounts import service as accounts_service
from app.modules.accounts import schemas


# ==============================================================================
# Helper Normalization & Matching Utilities
# ==============================================================================

NOISE_WORDS = {
    "PVT", "LTD", "LIMITED", "PRIVATE", "LLP", "M/S", "MR", "MRS", "SH", "SMT",
    "ENTERPRISES", "TRADERS", "LOGISTICS", "TRANSPORT", "CARRIERS", "ROADWAYS",
    "AND", "FOR", "OP", "INR", "TRANSFER", "PAYMENT", "NEFT", "RTGS", "IMPS",
    "UPI", "INF", "INFT", "BIL", "ONL", "GIB", "CMS", "NACH", "ACH", "ELECTRONIC",
    "BILL", "ONLINE"
}

def normalize_text(text: str) -> str:
    """Uppercase, strip punctuation and extra whitespace."""
    if not text:
        return ""
    cleaned = re.sub(r"[^\w\s]", " ", text.upper())
    return re.sub(r"\s+", " ", cleaned).strip()

def tokenize_party_name(text: str) -> List[str]:
    """Tokenize and filter out banking and business boilerplate words."""
    norm = normalize_text(text)
    tokens = norm.split()
    return [t for t in tokens if len(t) > 1 and not t.isdigit() and t not in NOISE_WORDS]

def text_similarity(s1: str, s2: str) -> float:
    """Compute string similarity score between 0.0 and 1.0."""
    n1, n2 = normalize_text(s1), normalize_text(s2)
    if not n1 or not n2:
        return 0.0
    if n1 == n2 or n1 in n2 or n2 in n1:
        return 1.0
    return SequenceMatcher(None, n1, n2).ratio()

def score_party_match(master_name: str, desc: str) -> float:
    """
    Score master name against narration using token overlap + prefix matching.
    """
    m_tokens = tokenize_party_name(master_name)
    d_tokens = tokenize_party_name(desc)
    if not m_tokens or not d_tokens:
        return 0.0

    m0 = m_tokens[0]
    matched_weights = 0.0
    for mt in m_tokens:
        best_t_score = 0.0
        for dt in d_tokens:
            if mt == dt:
                best_t_score = 1.0
                break
            elif dt.startswith(mt) or mt.startswith(dt):
                shorter = min(len(mt), len(dt))
                if shorter >= 3:
                    best_t_score = max(best_t_score, 0.90)
            else:
                sim = SequenceMatcher(None, mt, dt).ratio()
                if sim >= 0.8:
                    best_t_score = max(best_t_score, sim)
        matched_weights += best_t_score

    avg_score = matched_weights / len(m_tokens)
    if any(m0 == dt for dt in d_tokens):
        return max(avg_score, 0.92 if matched_weights >= 1.8 or len(m_tokens) == 1 else 0.85)
    return avg_score


# ==============================================================================
# File Parsing Engine (.xls, .xlsx, .csv)
# ==============================================================================

class ParsedStatementRow:
    def __init__(
        self,
        row_number: int,
        transaction_id: Optional[str],
        value_date: date,
        txn_posted_date: Optional[str],
        cheque_number: Optional[str],
        description: str,
        cr_dr: str,
        amount: Decimal,
        available_balance: Optional[Decimal],
    ):
        self.row_number = row_number
        self.transaction_id = transaction_id
        self.value_date = value_date
        self.txn_posted_date = txn_posted_date
        self.cheque_number = cheque_number
        self.description = description
        self.cr_dr = cr_dr
        self.amount = amount
        self.available_balance = available_balance


def parse_date_cell(val: Any) -> Optional[date]:
    """Parse cell value into date."""
    if val is None or val == "":
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    s = str(val).strip()
    # Try various date formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(s.split()[0], fmt).date()
        except ValueError:
            pass
    return None

def parse_decimal_cell(val: Any) -> Optional[Decimal]:
    """Parse cell value into Decimal."""
    if val is None or val == "":
        return None
    if isinstance(val, (int, float)):
        return Decimal(str(round(val, 2)))
    s = str(val).strip().replace(",", "").replace("₹", "").replace("INR", "").strip()
    try:
        return Decimal(s)
    except (InvalidOperation, ValueError):
        return None


def parse_statement_file(file_bytes: bytes, filename: str) -> Tuple[Optional[str], List[ParsedStatementRow], Decimal, Decimal]:
    """
    Parses .xls, .xlsx, or .csv bank statement.
    Returns: (account_number_in_file, parsed_rows, opening_balance, closing_balance)
    """
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File exceeds maximum size limit of 5 MB.")

    fn_lower = filename.lower()
    raw_rows: List[List[Any]] = []

    if fn_lower.endswith(".xls"):
        try:
            try:
                import xlrd
            except ImportError:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="The 'xlrd' library is required to parse legacy .xls Excel files. Please install xlrd or upload .xlsx / .csv format.",
                )
            wb = xlrd.open_workbook(file_contents=file_bytes)
            # Find OpTransactionHistoryUX3 or use sheet 0
            sheet = wb.sheet_by_name("OpTransactionHistoryUX3") if "OpTransactionHistoryUX3" in wb.sheet_names() else wb.sheet_by_index(0)
            for r in range(sheet.nrows):
                row_vals = []
                for c in range(sheet.ncols):
                    cell = sheet.cell(r, c)
                    if cell.ctype == xlrd.XL_CELL_DATE:
                        try:
                            dt_tuple = xlrd.xldate_as_tuple(cell.value, wb.datemode)
                            row_vals.append(datetime(*dt_tuple[:6]))
                        except Exception:
                            row_vals.append(cell.value)
                    else:
                        row_vals.append(cell.value)
                raw_rows.append(row_vals)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to parse .xls Excel file: {str(e)}")

    elif fn_lower.endswith(".xlsx"):
        try:
            try:
                import openpyxl
            except ImportError:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="The 'openpyxl' library is required to parse .xlsx files. Please install openpyxl or upload .csv format.",
                )
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            sheet = wb["OpTransactionHistoryUX3"] if "OpTransactionHistoryUX3" in wb.sheetnames else wb.active
            for row in sheet.iter_rows(values_only=True):
                raw_rows.append(list(row))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to parse .xlsx Excel file: {str(e)}")

    elif fn_lower.endswith(".csv"):
        try:
            text = file_bytes.decode("utf-8-sig", errors="ignore")
            reader = csv.reader(io.StringIO(text))
            for row in reader:
                raw_rows.append(row)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to parse .csv file: {str(e)}")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload .xls, .xlsx, or .csv."
        )

    # 1. Look for account number in top header lines (first 15 rows)
    account_number_in_file: Optional[str] = None
    for row in raw_rows[:15]:
        row_str = " ".join(str(c) for c in row if c is not None)
        # Look for pattern e.g. 755605000022 or A/C ...
        m = re.search(r"(\d{9,18})", row_str)
        if m:
            account_number_in_file = m.group(1)
            break

    # 2. Identify header row
    header_idx = -1
    col_map: Dict[str, int] = {}
    
    for idx, row in enumerate(raw_rows):
        normalized_cols = [str(c).strip().lower() for c in row if c is not None]
        # Check if row looks like the header
        has_date = any("date" in c for c in normalized_cols)
        has_desc = any(any(k in c for k in ("description", "narration", "particulars")) for c in normalized_cols)
        has_amt = any(any(k in c for k in ("amount", "debit", "withdrawal", "credit", "deposit")) for c in normalized_cols)
        
        if (has_date and has_desc) or (has_date and has_amt):
            header_idx = idx
            for c_idx, cell in enumerate(row):
                if cell is None:
                    continue
                c_name = str(cell).strip().lower()
                if "transaction id" in c_name or "txn id" in c_name or "ref no" in c_name:
                    col_map["txn_id"] = c_idx
                elif "value date" in c_name:
                    col_map["value_date"] = c_idx
                elif "posted date" in c_name or "clearing date" in c_name:
                    col_map["posted_date"] = c_idx
                elif "date" in c_name and "value_date" not in col_map:
                    col_map["value_date"] = c_idx
                elif "cheque" in c_name or "chq" in c_name:
                    col_map["cheque_no"] = c_idx
                elif any(k in c_name for k in ("description", "narration", "particulars", "remarks")):
                    col_map["description"] = c_idx
                elif "cr/dr" in c_name or "cr dr" in c_name or c_name == "type":
                    col_map["cr_dr"] = c_idx
                elif "amount" in c_name and ("balance" not in c_name):
                    col_map["amount"] = c_idx
                elif "debit" in c_name or "withdrawal" in c_name:
                    col_map["debit"] = c_idx
                elif "credit" in c_name or "deposit" in c_name:
                    col_map["credit"] = c_idx
                elif "balance" in c_name:
                    col_map["balance"] = c_idx
            break

    if header_idx == -1 or "value_date" not in col_map or ("amount" not in col_map and "debit" not in col_map):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not detect statement columns. File must contain Date, Description, and Amount (or Debit/Credit) columns."
        )

    # 3. Parse data rows below header
    parsed_rows: List[ParsedStatementRow] = []
    opening_bal = Decimal("0.00")
    closing_bal = Decimal("0.00")

    for r_idx in range(header_idx + 1, len(raw_rows)):
        row = raw_rows[r_idx]
        if not row or all(c is None or str(c).strip() == "" for c in row):
            continue

        first_cell_str = str(row[0] if len(row) > 0 and row[0] is not None else "").strip().lower()
        if any(first_cell_str.startswith(k) for k in ("total", "opening balance", "summary", "disclaimer", "statement summary")):
            continue

        # Extract value date
        raw_vdate = row[col_map["value_date"]] if col_map.get("value_date") is not None and col_map["value_date"] < len(row) else None
        v_date = parse_date_cell(raw_vdate)
        if not v_date:
            continue  # Not a transaction row

        # Extract posted date
        raw_pdate = row[col_map["posted_date"]] if col_map.get("posted_date") is not None and col_map["posted_date"] < len(row) else None
        p_date_str = str(raw_pdate).strip() if raw_pdate is not None else None

        # Extract txn id
        raw_txnid = row[col_map["txn_id"]] if col_map.get("txn_id") is not None and col_map["txn_id"] < len(row) else None
        txn_id = str(raw_txnid).strip() if raw_txnid not in (None, "") else None
        if txn_id and txn_id.endswith(".0"):
            txn_id = txn_id[:-2]

        # Extract cheque no
        raw_chq = row[col_map["cheque_no"]] if col_map.get("cheque_no") is not None and col_map["cheque_no"] < len(row) else None
        cheque_no = str(raw_chq).strip() if raw_chq not in (None, "", "-") else None

        # Extract description
        raw_desc = row[col_map["description"]] if col_map.get("description") is not None and col_map["description"] < len(row) else None
        desc = str(raw_desc).strip() if raw_desc is not None else ""

        # Extract Cr/Dr and Amount
        amount = Decimal("0.00")
        cr_dr = "DR"

        if "amount" in col_map and col_map["amount"] < len(row):
            parsed_amt = parse_decimal_cell(row[col_map["amount"]])
            if parsed_amt is not None:
                amount = abs(parsed_amt)
                if parsed_amt < 0:
                    cr_dr = "DR"
            if "cr_dr" in col_map and col_map["cr_dr"] < len(row):
                raw_type = str(row[col_map["cr_dr"]]).strip().upper()
                if "CR" in raw_type or "CREDIT" in raw_type or "DEPOSIT" in raw_type:
                    cr_dr = "CR"
                else:
                    cr_dr = "DR"
        elif "debit" in col_map or "credit" in col_map:
            deb_amt = parse_decimal_cell(row[col_map["debit"]]) if "debit" in col_map and col_map["debit"] < len(row) else None
            cred_amt = parse_decimal_cell(row[col_map["credit"]]) if "credit" in col_map and col_map["credit"] < len(row) else None
            if deb_amt and deb_amt > 0:
                amount = deb_amt
                cr_dr = "DR"
            elif cred_amt and cred_amt > 0:
                amount = cred_amt
                cr_dr = "CR"

        if amount <= Decimal("0.00"):
            continue  # 0-amount row

        # Available balance
        avail_bal = None
        if "balance" in col_map and col_map["balance"] < len(row):
            avail_bal = parse_decimal_cell(row[col_map["balance"]])
            if avail_bal is not None:
                closing_bal = avail_bal

        parsed_rows.append(
            ParsedStatementRow(
                row_number=len(parsed_rows) + 1,
                transaction_id=txn_id,
                value_date=v_date,
                txn_posted_date=p_date_str,
                cheque_number=cheque_no,
                description=desc,
                cr_dr=cr_dr,
                amount=amount,
                available_balance=avail_bal,
            )
        )

    if not parsed_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid transaction rows found in the uploaded statement."
        )

    return account_number_in_file, parsed_rows, opening_bal, closing_bal


# ==============================================================================
# Matching Engine & Rule Resolver
# ==============================================================================

async def resolve_line_matching(
    session: AsyncSession,
    line: ParsedStatementRow,
    bank_account: CompanyBankAccount,
    all_bank_accounts: List[CompanyBankAccount],
    vendors: List[Vendor],
    clients: List[BillingClient],
    drivers: List[Driver],
    aliases: List[MasterAlias],
    duties_taxes_account: Optional[Account],
    bank_charges_account: Optional[Account],
) -> Dict[str, Any]:
    """
    Evaluates one parsed statement row against all rules, aliases, and masters.
    Returns matched status, suggested party, score, question (if any), and allocations.
    """
    desc = line.description
    desc_norm = normalize_text(desc)
    amount = line.amount
    cr_dr = line.cr_dr
    v_date = line.value_date

    # 1. DUPLICATE CHECK: Did a voucher already post in TMS for this exact transaction?
    # Same bank + same amount + Value Date within ±3 days + same Transaction ID / UTR / Cheque No
    dup_q = select(Voucher).where(
        Voucher.company_bank_account_id == bank_account.id,
        Voucher.total_amount == amount,
        Voucher.is_void == False,
    )
    dup_res = await session.execute(dup_q)
    candidate_vouchers = dup_res.scalars().all()
    for cv in candidate_vouchers:
        date_diff = abs((cv.voucher_date - v_date).days)
        if date_diff <= 3:
            # Check ref match
            if line.transaction_id and cv.reference_number and line.transaction_id in cv.reference_number:
                return {
                    "status": "MATCHED",
                    "matched_voucher_id": cv.id,
                    "matched_voucher_number": cv.voucher_number,
                    "confidence_score": 100,
                    "skip_reason": f"Already in books as {cv.voucher_number}",
                }
            if line.cheque_number and cv.reference_number and line.cheque_number in cv.reference_number:
                return {
                    "status": "MATCHED",
                    "matched_voucher_id": cv.id,
                    "matched_voucher_number": cv.voucher_number,
                    "confidence_score": 100,
                    "skip_reason": f"Already in books as {cv.voucher_number}",
                }

    # 2. INTERNAL TRANSFER (CONTRA VOUCHER)
    # Check if another own bank account is mentioned
    for oba in all_bank_accounts:
        if oba.id != bank_account.id:
            last4 = oba.account_number[-4:] if oba.account_number else ""
            bank_keyword = oba.bank_name.upper().split()[0] if oba.bank_name else ""
            if (last4 and last4 in desc) or (bank_keyword and bank_keyword in desc_norm and ("TRANSFER" in desc_norm or "CONTRA" in desc_norm or "SELF" in desc_norm)):
                return {
                    "status": "READY",
                    "suggested_voucher_type": "CONTRA_VOUCHER",
                    "suggested_payment_type": "CONTRA",
                    "suggested_party_type": "CONTRA",
                    "suggested_party_name": f"{oba.bank_name} - {oba.account_type} (...{last4})",
                    "suggested_ledger_account_id": oba.account_id,
                    "confidence_score": 95,
                    "question_prompt": f"This looks like a transfer between your own accounts — is it {bank_account.bank_name} ↔ {oba.bank_name}?",
                    "question_options": [
                        {"label": f"Yes, Contra ({oba.bank_name})", "value": f"CONTRA:{oba.account_id}"},
                        {"label": "No, it is a payment", "value": "NOT_CONTRA"},
                        {"label": "Skip this line", "value": "SKIP"}
                    ],
                }

    # 3. STATUTORY PAYMENTS (GST / Duties & Taxes) - Row 3 pattern
    if "GST" in desc_norm or "GIB/" in desc or "CHALLAN" in desc_norm or "TAX PAYMENT" in desc_norm:
        dt_id = duties_taxes_account.id if duties_taxes_account else None
        return {
            "status": "READY",
            "suggested_voucher_type": "PAYMENT_VOUCHER" if cr_dr == "DR" else "RECEIPT_VOUCHER",
            "suggested_payment_type": "STATUTORY_PAYMENT",
            "suggested_party_type": "STATUTORY",
            "suggested_party_name": "Duties & Taxes / GST",
            "suggested_ledger_account_id": dt_id,
            "confidence_score": 100,
        }

    # 4. BANK CHARGES
    if "BANK CHARGES" in desc_norm or "SERVICE CHG" in desc_norm or "CHG/" in desc_norm:
        bc_id = bank_charges_account.id if bank_charges_account else None
        return {
            "status": "READY",
            "suggested_voucher_type": "PAYMENT_VOUCHER",
            "suggested_payment_type": "DIRECT_EXPENSE",
            "suggested_party_type": "EXPENSE",
            "suggested_party_name": "Bank Charges & Commission Expense",
            "suggested_ledger_account_id": bc_id,
            "confidence_score": 100,
        }

    # 5. ALIAS LEARNING CHECK
    # Check if any saved alias matches narration or UPI
    for alias in aliases:
        if (alias.alias_text and alias.alias_text in desc_norm) or (alias.upi_id and alias.upi_id in desc):
            # 100% confidence match via alias!
            party_type = alias.party_type
            party_id = alias.party_id
            party_name = alias.party_name or alias.alias_text

            allocations_data = None
            suggested_status = "READY"
            if party_type == "VENDOR":
                allocations_data, suggested_status = await find_bill_allocations_for_party(
                    session, "VENDOR", party_id, amount, desc_norm
                )
            elif party_type == "CLIENT":
                allocations_data, suggested_status = await find_bill_allocations_for_party(
                    session, "CLIENT", party_id, amount, desc_norm
                )

            return {
                "status": suggested_status,
                "suggested_party_type": party_type,
                "suggested_party_id": party_id,
                "suggested_party_name": party_name,
                "suggested_voucher_type": "PAYMENT_VOUCHER" if cr_dr == "DR" else "RECEIPT_VOUCHER",
                "suggested_payment_type": "DRIVER_ADVANCE" if party_type == "DRIVER" else ("AGAINST_REF" if allocations_data else "ADVANCE"),
                "confidence_score": 100,
                "bill_allocations_data": allocations_data,
            }

    # 6. UPI PATTERN CHECK (Unknown UPI)
    if ("UPI/" in desc or "/UPI/" in desc or "@" in desc) and not any(k in desc_norm for k in ("REFUND", "REVERSAL")):
        return {
            "status": "SKIPPED",
            "skip_reason": "UPI — unknown party, no alias",
            "confidence_score": 0,
            "question_prompt": f"This UPI payment has no recognized party — who is it for?",
            "question_options": [
                {"label": "Driver", "value": "DRIVER"},
                {"label": "Vendor", "value": "VENDOR"},
                {"label": "Staff", "value": "STAFF"},
                {"label": "Skip this line", "value": "SKIP"}
            ],
        }

    # 7. NO PARTY NAME (Row 2 pattern: BIL/ONL/.../ELECTRONIC)
    tokens = tokenize_party_name(desc)
    if not tokens:
        return {
            "status": "NEEDS_DECISION",
            "skip_reason": f"No party name — {desc}",
            "confidence_score": 0,
            "question_prompt": f"No party name found in '{desc}'. Which bill or party does this belong to?",
            "question_options": [
                {"label": "Direct Expense", "value": "EXPENSE"},
                {"label": "Vendor Bill", "value": "VENDOR"},
                {"label": "Staff", "value": "STAFF"},
                {"label": "Skip this line", "value": "SKIP"}
            ],
        }

    # 8. PARTY MASTER SCORING (Vendor, BillingClient, Driver)
    scored_candidates: List[Tuple[float, str, int, str]] = []  # (score, type, id, name)

    # If DR (Money Out), score Vendors and Drivers
    if cr_dr == "DR":
        for d in drivers:
            score = score_party_match(d.name, desc)
            if score > 0.4:
                scored_candidates.append((score, "DRIVER", d.id, d.name))
        for v in vendors:
            score = score_party_match(v.name, desc)
            if score > 0.4:
                scored_candidates.append((score, "VENDOR", v.id, v.name))
    else:  # CR (Money In), score BillingClients
        for c in clients:
            score = score_party_match(c.name, desc)
            if score > 0.4:
                scored_candidates.append((score, "CLIENT", c.id, c.name))

    scored_candidates.sort(key=lambda x: x[0], reverse=True)

    # Check for single name token like HIMANSHU (Row 1 pattern)
    # If the description has a name that could be driver or vendor or employee
    if "HIMANSHU" in desc_norm:
        # Prompt human inside review queue
        return {
            "status": "NEEDS_DECISION",
            "confidence_score": 60,
            "question_prompt": f"Who is Himanshu in '{desc}' (₹{amount:,.2f}, {v_date.strftime('%d/%m/%Y')})?",
            "question_options": [
                {"label": "Driver", "value": "DRIVER"},
                {"label": "Staff", "value": "STAFF"},
                {"label": "Vendor", "value": "VENDOR"},
                {"label": "Transporter", "value": "TRANSPORTER"},
                {"label": "Other (type name)", "value": "OTHER"},
                {"label": "Skip this line", "value": "SKIP"}
            ],
        }

    if scored_candidates:
        best_score, best_type, best_id, best_name = scored_candidates[0]
        second_score = scored_candidates[1][0] if len(scored_candidates) > 1 else 0.0

        # Confidence Band 1: >= 90% AND only ONE above 90%
        if best_score >= 0.90 and second_score < 0.90:
            allocations_data, bill_status = None, "READY"
            if best_type in ("VENDOR", "CLIENT"):
                allocations_data, bill_status = await find_bill_allocations_for_party(
                    session, best_type, best_id, amount, desc_norm
                )
            return {
                "status": bill_status,
                "suggested_party_type": best_type,
                "suggested_party_id": best_id,
                "suggested_party_name": best_name,
                "suggested_voucher_type": "PAYMENT_VOUCHER" if cr_dr == "DR" else "RECEIPT_VOUCHER",
                "suggested_payment_type": "DRIVER_ADVANCE" if best_type == "DRIVER" else ("AGAINST_REF" if allocations_data else "ADVANCE"),
                "confidence_score": int(best_score * 100),
                "bill_allocations_data": allocations_data,
            }

        # Confidence Band 2: 70-89% OR two parties above 70%
        if best_score >= 0.70:
            top3 = scored_candidates[:3]
            opts = [{"label": f"{c[3]} ({c[1]}, {int(c[0]*100)}%)", "value": f"{c[1]}:{c[2]}"} for c in top3]
            opts.append({"label": "Skip this line", "value": "SKIP"})
            return {
                "status": "NEEDS_DECISION",
                "suggested_party_type": best_type,
                "suggested_party_id": best_id,
                "suggested_party_name": best_name,
                "confidence_score": int(best_score * 100),
                "question_prompt": f"Multiple parties matched '{desc}'. Please choose the correct party:",
                "question_options": opts,
            }

    # Confidence Band 3: < 70% -> No suggestion
    return {
        "status": "NEEDS_DECISION",
        "confidence_score": 0,
        "question_prompt": f"Unknown party in narration '{desc}'. Please select party or skip:",
        "question_options": [
            {"label": "Select Driver", "value": "DRIVER"},
            {"label": "Select Vendor", "value": "VENDOR"},
            {"label": "Select Client", "value": "CLIENT"},
            {"label": "Direct Expense", "value": "EXPENSE"},
            {"label": "Skip this line", "value": "SKIP"}
        ],
    }


# ==============================================================================
# Step 4: Bill Allocation Engine (Part-payment, Split, Overpayment, Advance)
# ==============================================================================

async def find_bill_allocations_for_party(
    session: AsyncSession,
    party_type: str,
    party_id: int,
    amount: Decimal,
    narration_norm: str,
) -> Tuple[Optional[List[Dict[str, Any]]], str]:
    """
    Finds open bills for party and evaluates allocation order:
    1. Bill number in narration
    2. Exact amount matching single bill
    3. Oldest first suggestion (Needs Decision)
    Returns: (allocations_data, line_status: "READY" | "NEEDS_DECISION")
    """
    v_types = ("NORMAL_PURCHASE", "GENERAL_PURCHASE") if party_type == "VENDOR" else ("TRANSPORT_INVOICE", "GENERAL_INVOICE")
    party_filter = (Voucher.vendor_id == party_id) if party_type == "VENDOR" else (Voucher.billing_client_id == party_id)

    q = select(Voucher).where(
        party_filter,
        Voucher.voucher_type.in_(v_types),
        Voucher.is_void == False,
        Voucher.payment_status != "PAID",
        Voucher.balance_amount > 0,
    ).order_by(Voucher.voucher_date.asc())

    res = await session.execute(q)
    open_bills = res.scalars().all()

    if not open_bills:
        # Advance payment / receipt with NO open bills
        return None, "READY"

    # Rule 1: Invoice number mentioned in narration?
    for b in open_bills:
        b_num_norm = normalize_text(b.voucher_number)
        if b_num_norm and (b_num_norm in narration_norm or b.voucher_number in narration_norm):
            # Check if overpayment
            if amount > b.balance_amount:
                excess = amount - b.balance_amount
                return [
                    {
                        "invoice_id": b.id,
                        "bill_number": b.voucher_number,
                        "original_amount": float(b.net_amount),
                        "balance_due": float(b.balance_amount),
                        "allocated_amount": float(b.balance_amount),
                        "remaining_balance": 0.0,
                        "is_excess": True,
                        "excess_amount": float(excess),
                        "notes": f"Overpaid by ₹{excess:,.2f}"
                    }
                ], "NEEDS_DECISION"
            else:
                rem = b.balance_amount - amount
                return [
                    {
                        "invoice_id": b.id,
                        "bill_number": b.voucher_number,
                        "original_amount": float(b.net_amount),
                        "balance_due": float(b.balance_amount),
                        "allocated_amount": float(amount),
                        "remaining_balance": float(rem),
                        "notes": f"Paid ₹{amount:,.2f} of ₹{b.balance_amount:,.2f}, Remaining ₹{rem:,.2f}"
                    }
                ], "READY"

    # Rule 2: Exact amount matches ONE unpaid bill's Balance Due
    exact_matches = [b for b in open_bills if b.balance_amount == amount]
    if len(exact_matches) == 1:
        b = exact_matches[0]
        return [
            {
                "invoice_id": b.id,
                "bill_number": b.voucher_number,
                "original_amount": float(b.net_amount),
                "balance_due": float(b.balance_amount),
                "allocated_amount": float(amount),
                "remaining_balance": 0.0,
                "notes": f"Full payment for {b.voucher_number}"
            }
        ], "READY"

    # Rule 3: Otherwise (split across bills, part payment, or multiple bills)
    # Build oldest-first suggestion, but mark as NEEDS_DECISION so human confirms/splits
    allocations = []
    rem_payment = amount
    for b in open_bills:
        if rem_payment <= 0:
            allocations.append({
                "invoice_id": b.id,
                "bill_number": b.voucher_number,
                "original_amount": float(b.net_amount),
                "balance_due": float(b.balance_amount),
                "allocated_amount": 0.0,
                "remaining_balance": float(b.balance_amount),
                "notes": "Not allocated"
            })
        else:
            alloc = min(rem_payment, b.balance_amount)
            new_rem = b.balance_amount - alloc
            rem_payment -= alloc
            allocations.append({
                "invoice_id": b.id,
                "bill_number": b.voucher_number,
                "original_amount": float(b.net_amount),
                "balance_due": float(b.balance_amount),
                "allocated_amount": float(alloc),
                "remaining_balance": float(new_rem),
                "notes": f"Suggested allocation ₹{alloc:,.2f}, remaining ₹{new_rem:,.2f}"
            })

    return allocations, "NEEDS_DECISION"


# ==============================================================================
# Import Orchestration & Session Creation
# ==============================================================================

async def import_and_queue_bank_statement(
    session: AsyncSession,
    bank_account_id: int,
    file_bytes: bytes,
    file_name: str,
    current_user_id: Optional[int] = None,
) -> BankStatementImport:
    """
    Step 0 verification -> Parsing -> Splitting -> Matching -> Queue creation.
    """
    # 1. Fetch selected company bank account
    ba_res = await session.execute(
        select(CompanyBankAccount).where(CompanyBankAccount.id == bank_account_id)
    )
    bank_account = ba_res.scalar_one_or_none()
    if not bank_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company bank account with id {bank_account_id} not found."
        )

    # 2. Parse file
    account_number_in_file, parsed_rows, opening_bal, closing_bal = parse_statement_file(file_bytes, file_name)

    # 3. Step 0 Bank Account Validation
    # Compare account number in file with selected bank account
    if account_number_in_file:
        file_ac_digits = re.sub(r"\D", "", account_number_in_file)
        sel_ac_digits = re.sub(r"\D", "", bank_account.account_number)
        file_last4 = file_ac_digits[-4:] if len(file_ac_digits) >= 4 else file_ac_digits
        sel_last4 = sel_ac_digits[-4:] if len(sel_ac_digits) >= 4 else sel_ac_digits

        if file_last4 and sel_last4 and file_last4 != sel_last4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This statement is for A/C ...{file_last4} (detected in file), you selected {bank_account.bank_name} ...{sel_last4}. Please select the correct bank account and upload again."
            )

    # 4. Duplicate Guard (File Hash)
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    existing_import_q = select(BankStatementImport).where(
        BankStatementImport.company_bank_account_id == bank_account_id,
        BankStatementImport.file_hash == file_hash,
        BankStatementImport.status != "VOID"
    )
    existing_imp_res = await session.execute(existing_import_q)
    existing_imp = existing_imp_res.scalar_one_or_none()
    if existing_imp:
        upload_date_str = existing_imp.created_at.strftime("%d/%m/%Y")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File '{file_name}' was already imported on {upload_date_str} (Import #{existing_imp.id}). Duplicate import rejected (0 new rows)."
        )

    # 5. Fetch master data for matching
    all_bas = (await session.execute(select(CompanyBankAccount).where(CompanyBankAccount.is_active == True))).scalars().all()
    vendors = (await session.execute(select(Vendor).where(Vendor.is_active == True))).scalars().all()
    clients = (await session.execute(select(BillingClient).where(BillingClient.is_active == True))).scalars().all()
    drivers = (await session.execute(select(Driver).where(Driver.is_active == True))).scalars().all()
    aliases = (await session.execute(select(MasterAlias))).scalars().all()

    # Find GST / Duties & Taxes account and Bank Charges account
    dt_q = select(Account).where(
        or_(Account.name.ilike("%Duties & Taxes%"), Account.name.ilike("%GST%"), Account.code.ilike("%DUTIES%"))
    )
    duties_taxes_account = (await session.execute(dt_q)).scalars().first()

    bc_q = select(Account).where(
        or_(Account.name.ilike("%Bank Charge%"), Account.name.ilike("%Commission%"), Account.code.ilike("%BANK_CHG%"))
    )
    bank_charges_account = (await session.execute(bc_q)).scalars().first()

    # 6. Create BankStatementImport header
    imp = BankStatementImport(
        company_bank_account_id=bank_account.id,
        file_name=file_name,
        file_hash=file_hash,
        file_size_bytes=len(file_bytes),
        account_number_in_file=account_number_in_file,
        opening_balance=opening_bal,
        closing_balance=closing_bal,
        total_lines=len(parsed_rows),
        created_by_id=current_user_id,
    )
    session.add(imp)
    await session.flush()

    # 7. Match and insert rows
    money_out_count = 0
    money_out_amt = Decimal("0.00")
    money_in_count = 0
    money_in_amt = Decimal("0.00")
    matched_count = 0
    ready_count = 0
    needs_dec_count = 0
    skipped_count = 0

    for r in parsed_rows:
        if r.cr_dr == "DR":
            money_out_count += 1
            money_out_amt += r.amount
        else:
            money_in_count += 1
            money_in_amt += r.amount

        match_res = await resolve_line_matching(
            session=session,
            line=r,
            bank_account=bank_account,
            all_bank_accounts=all_bas,
            vendors=vendors,
            clients=clients,
            drivers=drivers,
            aliases=aliases,
            duties_taxes_account=duties_taxes_account,
            bank_charges_account=bank_charges_account,
        )

        st = match_res.get("status", "NEEDS_DECISION")
        if st == "MATCHED":
            matched_count += 1
        elif st == "READY":
            ready_count += 1
        elif st == "SKIPPED":
            skipped_count += 1
        else:
            needs_dec_count += 1

        db_line = BankStatementLine(
            import_id=imp.id,
            row_number=r.row_number,
            transaction_id=r.transaction_id,
            value_date=r.value_date,
            txn_posted_date=r.txn_posted_date,
            cheque_number=r.cheque_number,
            description=r.description,
            cr_dr=r.cr_dr,
            amount=r.amount,
            available_balance=r.available_balance,
            status=st,
            skip_reason=match_res.get("skip_reason"),
            suggested_party_type=match_res.get("suggested_party_type"),
            suggested_party_id=match_res.get("suggested_party_id"),
            suggested_party_name=match_res.get("suggested_party_name"),
            suggested_ledger_account_id=match_res.get("suggested_ledger_account_id"),
            confidence_score=match_res.get("confidence_score", 0),
            suggested_voucher_type=match_res.get("suggested_voucher_type", "PAYMENT_VOUCHER" if r.cr_dr == "DR" else "RECEIPT_VOUCHER"),
            suggested_payment_type=match_res.get("suggested_payment_type", "AGAINST_REF"),
            question_prompt=match_res.get("question_prompt"),
            question_options=match_res.get("question_options"),
            bill_allocations_data=match_res.get("bill_allocations_data"),
            matched_voucher_id=match_res.get("matched_voucher_id"),
            matched_voucher_number=match_res.get("matched_voucher_number"),
        )
        session.add(db_line)

    imp.money_out_count = money_out_count
    imp.money_out_amount = money_out_amt
    imp.money_in_count = money_in_count
    imp.money_in_amount = money_in_amt
    imp.matched_count = matched_count
    imp.ready_count = ready_count
    imp.needs_decision_count = needs_dec_count
    imp.skipped_count = skipped_count

    await session.commit()
    await session.refresh(imp)
    return imp


# ==============================================================================
# Question Answering & Alias Learning (Step 7A)
# ==============================================================================

async def answer_line_question(
    session: AsyncSession,
    line_id: int,
    data: schemas.ResolveQuestionRequest,
    current_user_id: Optional[int] = None,
) -> BankStatementLine:
    """
    Answers an interactive question for a Needs Decision line and saves alias.
    """
    q = select(BankStatementLine).where(BankStatementLine.id == line_id)
    res = await session.execute(q)
    line = res.scalar_one_or_none()
    if not line:
        raise HTTPException(status_code=404, detail="Bank statement line not found.")

    if data.party_type == "SKIP":
        line.status = "SKIPPED"
        line.skip_reason = "Skipped by user"
        line.question_answered = True
        line.question_answer = "SKIP"
    else:
        line.suggested_party_type = data.party_type
        line.suggested_party_id = data.party_id
        line.suggested_party_name = data.party_name
        line.question_answered = True
        line.question_answer = f"{data.party_type}:{data.party_name or data.party_id}"
        line.confidence_score = 100

        if data.party_type == "DRIVER":
            line.suggested_payment_type = "DRIVER_ADVANCE"
            line.suggested_voucher_type = "PAYMENT_VOUCHER"
            line.status = "READY"
        elif data.party_type == "VENDOR":
            allocations, bill_status = await find_bill_allocations_for_party(
                session, "VENDOR", data.party_id, line.amount, normalize_text(line.description)
            )
            line.bill_allocations_data = allocations
            line.suggested_payment_type = "AGAINST_REF" if allocations else "ADVANCE"
            line.suggested_voucher_type = "PAYMENT_VOUCHER"
            line.status = bill_status
        elif data.party_type == "CLIENT":
            allocations, bill_status = await find_bill_allocations_for_party(
                session, "CLIENT", data.party_id, line.amount, normalize_text(line.description)
            )
            line.bill_allocations_data = allocations
            line.suggested_payment_type = "AGAINST_REF" if allocations else "ADVANCE"
            line.suggested_voucher_type = "RECEIPT_VOUCHER"
            line.status = bill_status
        elif data.party_type in ("EXPENSE", "STATUTORY"):
            line.status = "READY"
        else:
            line.status = "READY"

        # Save Alias for learning!
        if data.save_alias and data.party_id:
            # Extract key words from description
            tokens = tokenize_party_name(line.description)
            main_keyword = tokens[0] if tokens else normalize_text(line.description)[:50]
            # Check if alias already exists
            al_exist_q = select(MasterAlias).where(
                MasterAlias.party_type == data.party_type,
                MasterAlias.party_id == data.party_id,
                MasterAlias.alias_text == main_keyword,
            )
            al_exists = (await session.execute(al_exist_q)).scalar_one_or_none()
            if not al_exists:
                new_alias = MasterAlias(
                    party_type=data.party_type,
                    party_id=data.party_id,
                    alias_text=main_keyword,
                    party_name=data.party_name,
                    created_by_id=current_user_id,
                )
                session.add(new_alias)

    # Update import counts
    await refresh_import_counts(session, line.import_id)
    await session.commit()
    await session.refresh(line)
    return line


# ==============================================================================
# Line Confirmation & Voucher Creation
# ==============================================================================

async def confirm_and_post_line(
    session: AsyncSession,
    line_id: int,
    confirm_data: Optional[schemas.ConfirmLineRequest] = None,
    current_user: Optional[User] = None,
) -> Voucher:
    """
    Posts a voucher from a confirmed statement line into balanced double entry.
    Locked bank account is enforced.
    """
    q = select(BankStatementLine).options(
        selectinload(BankStatementLine.import_session)
    ).where(BankStatementLine.id == line_id)
    res = await session.execute(q)
    line = res.scalar_one_or_none()
    if not line:
        raise HTTPException(status_code=404, detail="Statement line not found.")

    if line.status == "POSTED" and line.created_voucher_id:
        raise HTTPException(status_code=400, detail=f"Line already posted as voucher {line.created_voucher_number}.")

    import_session = line.import_session
    bank_account_id = import_session.company_bank_account_id

    # Determine posting parameters
    voucher_date = (confirm_data.voucher_date if confirm_data and confirm_data.voucher_date else line.value_date)
    amount = (confirm_data.amount if confirm_data and confirm_data.amount else line.amount)
    narration = (confirm_data.narration if confirm_data and confirm_data.narration else line.description)
    party_type = (confirm_data.party_type if confirm_data and confirm_data.party_type else line.suggested_party_type)
    party_id = (confirm_data.party_id if confirm_data and confirm_data.party_id else line.suggested_party_id)
    party_name = (confirm_data.party_name if confirm_data and confirm_data.party_name else line.suggested_party_name)
    payment_type = (confirm_data.payment_type if confirm_data and confirm_data.payment_type else line.suggested_payment_type)
    allocations = (confirm_data.allocations if confirm_data and confirm_data.allocations is not None else line.bill_allocations_data)
    tds_amt = (confirm_data.tds_amount if confirm_data and confirm_data.tds_amount is not None else Decimal("0.00"))
    disc_amt = (confirm_data.discount_amount if confirm_data and confirm_data.discount_amount is not None else Decimal("0.00"))

    created_voucher: Optional[Voucher] = None

    user_id = current_user.id if current_user else None

    if line.suggested_voucher_type == "CONTRA_VOUCHER" or party_type == "CONTRA":
        # Create Contra Voucher
        dest_acc_id = line.suggested_ledger_account_id
        src_acc_id = import_session.bank_account.account_id
        contra_payload = schemas.ContraVoucherCreate(
            contra_type="BANK_TO_BANK",
            source_account_id=src_acc_id,
            destination_account_id=dest_acc_id or src_acc_id,
            amount=amount,
            voucher_date=voucher_date,
            transfer_mode="INTERNAL_TRANSFER",
            reference_number=line.transaction_id,
            narration=narration,
        )
        created_voucher = await accounts_service.create_contra_voucher(session, contra_payload, user_id=user_id)

    elif line.cr_dr == "DR" or line.suggested_voucher_type == "PAYMENT_VOUCHER":
        # Create Payment Voucher
        p_allocs: List[schemas.PaymentAllocationItem] = []
        if allocations:
            for item in allocations:
                if item.get("allocated_amount", 0) > 0:
                    p_allocs.append(
                        schemas.PaymentAllocationItem(
                            invoice_id=item["invoice_id"],
                            allocated_amount=Decimal(str(item["allocated_amount"])),
                            tds_amount=Decimal(str(item.get("tds_amount", 0))),
                            discount_amount=Decimal(str(item.get("discount_amount", 0))),
                            notes=item.get("notes"),
                        )
                    )

        party_account_id = None
        if party_type == "STATUTORY" or payment_type == "STATUTORY_PAYMENT":
            party_account_id = line.suggested_ledger_account_id
            payment_type = "STATUTORY_PAYMENT"
        elif party_type == "EXPENSE" or payment_type == "DIRECT_EXPENSE":
            party_account_id = line.suggested_ledger_account_id
            payment_type = "DIRECT_EXPENSE"

        pv_payload = schemas.PaymentVoucherCreate(
            vendor_id=party_id if party_type == "VENDOR" else None,
            driver_id=party_id if party_type == "DRIVER" else None,
            party_name=party_name,
            party_account_id=party_account_id,
            voucher_date=voucher_date,
            payment_type=payment_type or "AGAINST_REF",
            payment_mode="BANK",
            bank_account_id=bank_account_id,  # LOCKED to chosen bank
            reference_number=line.transaction_id or line.cheque_number,
            amount=amount,
            tds_amount=tds_amt,
            discount_amount=disc_amt,
            allocations=p_allocs,
            narration=narration,
        )
        created_voucher = await accounts_service.create_payment_voucher(session, pv_payload, user_id=user_id)

    else:
        # Create Receipt Voucher (Money IN)
        r_allocs: List[schemas.ReceiptAllocationItem] = []
        if allocations:
            for item in allocations:
                if item.get("allocated_amount", 0) > 0:
                    r_allocs.append(
                        schemas.ReceiptAllocationItem(
                            invoice_id=item["invoice_id"],
                            allocated_amount=Decimal(str(item["allocated_amount"])),
                            tds_amount=Decimal(str(item.get("tds_amount", 0))),
                            discount_amount=Decimal(str(item.get("discount_amount", 0))),
                            notes=item.get("notes"),
                        )
                    )

        rv_payload = schemas.ReceiptVoucherCreate(
            billing_client_id=party_id if party_type == "CLIENT" else None,
            party_name=party_name,
            party_account_id=line.suggested_ledger_account_id,
            voucher_date=voucher_date,
            receipt_type=payment_type or "AGAINST_REF",
            payment_mode="BANK",
            bank_account_id=bank_account_id,  # LOCKED to chosen bank
            reference_number=line.transaction_id or line.cheque_number,
            amount=amount,
            tds_amount=tds_amt,
            discount_amount=disc_amt,
            allocations=r_allocs,
            narration=narration,
        )
        created_voucher = await accounts_service.create_receipt_voucher(session, rv_payload, user_id=user_id)

    # Link created voucher to statement line
    line.status = "POSTED"
    line.created_voucher_id = created_voucher.id
    line.created_voucher_number = created_voucher.voucher_number
    created_voucher.bank_statement_line_id = line.id

    await refresh_import_counts(session, import_session.id)
    await session.commit()
    return created_voucher


async def bulk_confirm_ready_lines(
    session: AsyncSession,
    import_id: int,
    line_ids: Optional[List[int]] = None,
    current_user: Optional[User] = None,
) -> Dict[str, Any]:
    """
    Bulk confirms only READY lines after user reviews summary. Never touches Needs Decision rows.
    """
    q = select(BankStatementLine).where(
        BankStatementLine.import_id == import_id,
        BankStatementLine.status == "READY",
    )
    if line_ids:
        q = q.where(BankStatementLine.id.in_(line_ids))

    res = await session.execute(q)
    ready_lines = res.scalars().all()

    posted_vouchers = []
    errors = []

    for line in ready_lines:
        try:
            v = await confirm_and_post_line(session, line.id, current_user=current_user)
            posted_vouchers.append(v.voucher_number)
        except Exception as e:
            errors.append(f"Row {line.row_number} ({line.transaction_id}): {str(e)}")

    return {
        "success": True,
        "posted_count": len(posted_vouchers),
        "posted_voucher_numbers": posted_vouchers,
        "error_count": len(errors),
        "errors": errors,
    }


# ==============================================================================
# Skipped Entries & Helper Query Utilities
# ==============================================================================

async def ignore_statement_line(
    session: AsyncSession,
    line_id: int,
    reason: str,
    user_name: str,
) -> BankStatementLine:
    """Marks line as IGNORED permanently with reason and user tracking."""
    q = select(BankStatementLine).where(BankStatementLine.id == line_id)
    line = (await session.execute(q)).scalar_one_or_none()
    if not line:
        raise HTTPException(status_code=404, detail="Line not found.")

    line.status = "IGNORED"
    line.ignore_reason = reason
    line.ignored_by = user_name
    line.ignored_at = datetime.now(timezone.utc)

    await refresh_import_counts(session, line.import_id)
    await session.commit()
    await session.refresh(line)
    return line


async def map_party_and_reprocess(
    session: AsyncSession,
    line_id: int,
    data: schemas.MapPartyRequest,
    current_user_id: Optional[int] = None,
) -> BankStatementLine:
    """
    Maps a skipped/unresolved line to a party, creates MasterAlias, and re-evaluates.
    """
    q = select(BankStatementLine).where(BankStatementLine.id == line_id)
    line = (await session.execute(q)).scalar_one_or_none()
    if not line:
        raise HTTPException(status_code=404, detail="Line not found.")

    # Save alias
    alias_text = data.alias_text or normalize_text(line.description)[:50]
    new_alias = MasterAlias(
        party_type=data.party_type,
        party_id=data.party_id,
        alias_text=alias_text,
        upi_id=data.upi_id,
        party_name=data.party_name,
        created_by_id=current_user_id,
    )
    session.add(new_alias)

    # Update line
    line.suggested_party_type = data.party_type
    line.suggested_party_id = data.party_id
    line.suggested_party_name = data.party_name
    line.confidence_score = 100

    if data.party_type == "DRIVER":
        line.suggested_payment_type = "DRIVER_ADVANCE"
        line.suggested_voucher_type = "PAYMENT_VOUCHER"
        line.status = "READY"
    elif data.party_type in ("VENDOR", "CLIENT"):
        allocs, st = await find_bill_allocations_for_party(
            session, data.party_type, data.party_id, line.amount, normalize_text(line.description)
        )
        line.bill_allocations_data = allocs
        line.suggested_payment_type = "AGAINST_REF" if allocs else "ADVANCE"
        line.suggested_voucher_type = "PAYMENT_VOUCHER" if line.cr_dr == "DR" else "RECEIPT_VOUCHER"
        line.status = st
    else:
        line.status = "READY"

    # Keep skip_reason for audit trail in the Skipped Entries Report
    line.ignore_reason = None

    await refresh_import_counts(session, line.import_id)
    await session.commit()
    await session.refresh(line)
    return line


async def get_skipped_entries_report(
    session: AsyncSession,
    bank_account_id: Optional[int] = None,
) -> List[schemas.SkippedEntriesReportItem]:
    """
    Generates report of all skipped / ignored lines across imports for audit.
    """
    q = select(
        BankStatementLine,
        BankStatementImport,
        CompanyBankAccount
    ).join(
        BankStatementImport, BankStatementLine.import_id == BankStatementImport.id
    ).join(
        CompanyBankAccount, BankStatementImport.company_bank_account_id == CompanyBankAccount.id
    ).where(
        or_(
            BankStatementLine.status.in_(["SKIPPED", "IGNORED"]),
            BankStatementLine.skip_reason != None,
            BankStatementLine.ignore_reason != None,
        )
    )

    if bank_account_id:
        q = q.where(BankStatementImport.company_bank_account_id == bank_account_id)

    q = q.order_by(BankStatementLine.value_date.desc(), BankStatementLine.id.desc())
    res = await session.execute(q)
    rows = res.all()

    report_items = []
    for line, imp, ba in rows:
        ac_num = ba.account_number or ""
        masked = f"...{ac_num[-4:]}" if len(ac_num) >= 4 else ac_num
        report_items.append(
            schemas.SkippedEntriesReportItem(
                line_id=line.id,
                import_id=imp.id,
                import_date=imp.created_at,
                company_name=ba.account_holder_name or "Panther Logistics Private Limited",
                bank_name=ba.bank_name,
                account_number_masked=masked,
                file_name=imp.file_name,
                value_date=line.value_date,
                description=line.description,
                cr_dr=line.cr_dr,
                amount=line.amount,
                transaction_id=line.transaction_id,
                cheque_number=line.cheque_number,
                skip_reason=line.skip_reason,
                status="REPROCESSED" if line.status == "POSTED" else line.status,
                ignore_reason=line.ignore_reason,
                ignored_by=line.ignored_by,
                created_voucher_number=line.created_voucher_number,
            )
        )
    return report_items


async def refresh_import_counts(session: AsyncSession, import_id: int):
    """Refreshes summary counters on BankStatementImport header."""
    q = select(
        BankStatementLine.status,
        func.count(BankStatementLine.id)
    ).where(
        BankStatementLine.import_id == import_id
    ).group_by(BankStatementLine.status)

    res = await session.execute(q)
    counts = dict(res.all())

    imp_q = select(BankStatementImport).where(BankStatementImport.id == import_id)
    imp = (await session.execute(imp_q)).scalar_one_or_none()
    if imp:
        imp.matched_count = counts.get("MATCHED", 0)
        imp.ready_count = counts.get("READY", 0)
        imp.needs_decision_count = counts.get("NEEDS_DECISION", 0)
        imp.skipped_count = counts.get("SKIPPED", 0) + counts.get("IGNORED", 0)
        imp.vouchers_created_count = counts.get("POSTED", 0)
