import logging
import httpx
from typing import List, Optional
from datetime import datetime, timezone, date
from decimal import Decimal
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.errors import AppException
from app.core.security import verify_password, get_password_hash
from app.tenant_db.models import (
    User, Branch, CompanySetting, EmailSetting,
    Voucher, TripExpense, VoucherType
)
from app.modules.profile.schemas import (
    ChangePasswordRequest, UserProfileUpdate,
    BranchCreate, BranchUpdate,
    CompanySettingUpdate, EmailSettingUpdate,
    MonthlyPnLResponse, MonthlyPnLItem,
    ApiCenterSettingResponse, ApiCenterSettingUpdate,
    ApiCenterTestRequest, ApiCenterTestResponse
)

logger = logging.getLogger("panther.profile.service")


# --- Change Password ---

async def change_password(db: AsyncSession, user: User, data: ChangePasswordRequest) -> None:
    if not verify_password(data.current_password, user.password_hash):
        raise AppException(
            status_code=400,
            error_code="INVALID_CURRENT_PASSWORD",
            message="Current password is incorrect.",
        )

    user.password_hash = get_password_hash(data.new_password)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    logger.info(f"Password successfully changed for user: {user.email}")


# --- User Profile ---

async def update_user_profile(db: AsyncSession, user: User, data: UserProfileUpdate) -> User:
    if data.full_name:
        user.full_name = data.full_name.strip()
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


# --- Branches ---

async def get_branches(db: AsyncSession) -> List[Branch]:
    stmt = select(Branch).order_by(Branch.is_head_office.desc(), Branch.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_branch(db: AsyncSession, data: BranchCreate) -> Branch:
    code = data.code.upper().strip()
    check_stmt = select(Branch).where(Branch.code == code)
    if (await db.execute(check_stmt)).scalar_one_or_none():
        raise AppException(
            status_code=409,
            error_code="BRANCH_EXISTS",
            message=f"Issuing office / branch with code '{code}' already exists.",
        )

    # If this branch is set as head office, unset all existing head offices
    if data.is_head_office:
        all_branches = await get_branches(db)
        for b in all_branches:
            if b.is_head_office:
                b.is_head_office = False

    branch = Branch(
        code=code,
        name=data.name.strip(),
        city=data.city.strip() if data.city else "Headquarters",
        state=data.state.strip() if data.state else "Default State",
        address=data.address.strip() if data.address else None,
        pincode=data.pincode.strip() if data.pincode else None,
        phone=data.phone.strip() if data.phone else None,
        email=str(data.email).strip() if data.email else None,
        gstin=data.gstin.strip().upper() if data.gstin else None,
        pan=data.pan.strip().upper() if data.pan else None,
        bank_name=data.bank_name.strip() if data.bank_name else None,
        bank_account_no=data.bank_account_no.strip() if data.bank_account_no else None,
        bank_ifsc=data.bank_ifsc.strip().upper() if data.bank_ifsc else None,
        bank_branch=data.bank_branch.strip() if data.bank_branch else None,
        document_notes=data.document_notes.strip() if data.document_notes else None,
        is_head_office=data.is_head_office,
        is_active=data.is_active,
    )
    db.add(branch)
    await db.flush()

    # Sync with CompanySetting
    company_setting = await get_company_setting(db)
    if data.is_head_office or not company_setting.default_issuing_office_id:
        company_setting.default_issuing_office_id = branch.id
        company_setting.issuing_office = branch.name

    await db.commit()
    await db.refresh(branch)
    return branch


async def update_branch(db: AsyncSession, branch_id: int, data: BranchUpdate) -> Branch:
    stmt = select(Branch).where(Branch.id == branch_id)
    branch = (await db.execute(stmt)).scalar_one_or_none()
    if not branch:
        raise AppException(status_code=404, error_code="BRANCH_NOT_FOUND", message="Issuing office / branch not found.")

    if data.name is not None:
        branch.name = data.name.strip()
    if data.city is not None:
        branch.city = data.city.strip()
    if data.state is not None:
        branch.state = data.state.strip()
    if data.address is not None:
        branch.address = data.address.strip() if data.address else None
    if data.pincode is not None:
        branch.pincode = data.pincode.strip() if data.pincode else None
    if data.phone is not None:
        branch.phone = data.phone.strip() if data.phone else None
    if data.email is not None:
        branch.email = str(data.email).strip() if data.email else None
    if data.gstin is not None:
        branch.gstin = data.gstin.strip().upper() if data.gstin else None
    if data.pan is not None:
        branch.pan = data.pan.strip().upper() if data.pan else None
    if data.bank_name is not None:
        branch.bank_name = data.bank_name.strip() if data.bank_name else None
    if data.bank_account_no is not None:
        branch.bank_account_no = data.bank_account_no.strip() if data.bank_account_no else None
    if data.bank_ifsc is not None:
        branch.bank_ifsc = data.bank_ifsc.strip().upper() if data.bank_ifsc else None
    if data.bank_branch is not None:
        branch.bank_branch = data.bank_branch.strip() if data.bank_branch else None
    if data.document_notes is not None:
        branch.document_notes = data.document_notes.strip() if data.document_notes else None
    if data.is_active is not None:
        branch.is_active = data.is_active

    if data.is_head_office is not None:
        if data.is_head_office:
            # Unset all other head offices
            all_branches = await get_branches(db)
            for b in all_branches:
                if b.id != branch.id and b.is_head_office:
                    b.is_head_office = False
            branch.is_head_office = True

            # Sync with CompanySetting
            company_setting = await get_company_setting(db)
            company_setting.default_issuing_office_id = branch.id
            company_setting.issuing_office = branch.name
        else:
            branch.is_head_office = False

    branch.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(branch)
    return branch


async def delete_branch(db: AsyncSession, branch_id: int) -> None:
    stmt = select(Branch).where(Branch.id == branch_id)
    branch = (await db.execute(stmt)).scalar_one_or_none()
    if not branch:
        raise AppException(status_code=404, error_code="BRANCH_NOT_FOUND", message="Issuing office / branch not found.")
    if branch.is_head_office:
        raise AppException(status_code=400, error_code="CANNOT_DELETE_HQ", message="Corporate Head Office / Primary Issuing Office cannot be deleted.")

    # If it was the default issuing office in CompanySetting, clear or fallback
    company_setting = await get_company_setting(db)
    if company_setting.default_issuing_office_id == branch_id:
        other_stmt = select(Branch).where(Branch.id != branch_id).order_by(Branch.is_head_office.desc())
        other_branch = (await db.execute(other_stmt)).scalars().first()
        if other_branch:
            company_setting.default_issuing_office_id = other_branch.id
            company_setting.issuing_office = other_branch.name
        else:
            company_setting.default_issuing_office_id = None
            company_setting.issuing_office = None

    await db.delete(branch)
    await db.commit()


# --- Company Settings ---

async def get_company_setting(db: AsyncSession) -> CompanySetting:
    stmt = select(CompanySetting).limit(1)
    setting = (await db.execute(stmt)).scalar_one_or_none()
    if not setting:
        setting = CompanySetting(company_name="PantherTMS Company", email="admin@demo.com")
        db.add(setting)
        await db.commit()
        await db.refresh(setting)
    return setting


async def update_company_setting(db: AsyncSession, data: CompanySettingUpdate) -> CompanySetting:
    setting = await get_company_setting(db)

    if data.company_name is not None:
        setting.company_name = data.company_name.strip()
    if data.gstin is not None:
        setting.gstin = data.gstin
    if data.pan is not None:
        setting.pan = data.pan
    if data.address is not None:
        setting.address = data.address
    if data.city is not None:
        setting.city = data.city
    if data.state is not None:
        setting.state = data.state
    if data.pincode is not None:
        setting.pincode = data.pincode
    if data.phone is not None:
        setting.phone = data.phone
    if data.email is not None:
        setting.email = str(data.email) if data.email else None
    if data.bank_name is not None:
        setting.bank_name = data.bank_name
    if data.bank_account_no is not None:
        setting.bank_account_no = data.bank_account_no
    if data.bank_ifsc is not None:
        setting.bank_ifsc = data.bank_ifsc
    if data.bank_branch is not None:
        setting.bank_branch = data.bank_branch
    if data.website is not None:
        setting.website = data.website
    if data.logo_url is not None:
        setting.logo_url = data.logo_url if data.logo_url.strip() else None
    if data.signature_url is not None:
        setting.signature_url = data.signature_url if data.signature_url.strip() else None
    if data.signing_authority_name is not None:
        setting.signing_authority_name = data.signing_authority_name
    if data.signing_authority_designation is not None:
        setting.signing_authority_designation = data.signing_authority_designation
    if data.issuing_office is not None:
        setting.issuing_office = data.issuing_office
    if data.default_issuing_office_id is not None:
        setting.default_issuing_office_id = data.default_issuing_office_id
        branch_stmt = select(Branch).where(Branch.id == data.default_issuing_office_id)
        selected_branch = (await db.execute(branch_stmt)).scalar_one_or_none()
        if selected_branch:
            setting.issuing_office = selected_branch.name

    setting.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(setting)
    return setting


# --- Email Settings ---

async def get_email_setting(db: AsyncSession) -> EmailSetting:
    stmt = select(EmailSetting).limit(1)
    setting = (await db.execute(stmt)).scalar_one_or_none()
    if not setting:
        setting = EmailSetting(
            smtp_host="smtp.mailgun.org",
            smtp_port=587,
            sender_email="notifications@panthertms.com",
            sender_name="PantherTMS Dispatch",
            use_tls=True,
            is_active=True,
        )
        db.add(setting)
        await db.commit()
        await db.refresh(setting)
    return setting


async def update_email_setting(db: AsyncSession, data: EmailSettingUpdate) -> EmailSetting:
    setting = await get_email_setting(db)

    setting.smtp_host = data.smtp_host.strip()
    setting.smtp_port = data.smtp_port
    if data.smtp_user is not None:
        setting.smtp_user = data.smtp_user
    if data.smtp_password is not None:
        setting.smtp_password = data.smtp_password
    setting.sender_email = str(data.sender_email)
    setting.sender_name = data.sender_name.strip()
    setting.use_tls = data.use_tls
    setting.is_active = data.is_active

    setting.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(setting)
    return setting


# --- Monthly P&L Aggregation ---

async def calculate_monthly_pnl(db: AsyncSession, month: Optional[str] = None) -> MonthlyPnLResponse:
    """
    Computes monthly multi-branch Profit & Loss statement per PRD §7.12.
    Derives revenue from invoice vouchers and expenses from purchase vouchers & trip expenses.
    """
    branches_stmt = select(Branch.name).where(Branch.is_active == True)
    branch_rows = (await db.execute(branches_stmt)).scalars().all()
    branch_names = [b for b in branch_rows] if branch_rows else ["Headquarters (HQ)", "Mumbai Transshipment Hub"]
    branch_count = len(branch_names)

    # Query all vouchers
    v_stmt = select(Voucher).where(Voucher.is_void == False)
    vouchers = (await db.execute(v_stmt)).scalars().all()

    # Query trip expenses
    te_stmt = select(TripExpense)
    trip_expenses = (await db.execute(te_stmt)).scalars().all()

    # Group by YYYY-MM
    months_map = {}
    month_rev_breakdown = {}
    month_exp_breakdown = {}

    for v in vouchers:
        m_key = v.voucher_date.strftime("%Y-%m")
        if m_key not in months_map:
            months_map[m_key] = {"revenue": Decimal("0.0"), "expenses": Decimal("0.0")}
            month_rev_breakdown[m_key] = {}
            month_exp_breakdown[m_key] = {}

        # Revenue vouchers
        if v.voucher_type in (VoucherType.TRANSPORT_INVOICE, VoucherType.GENERAL_INVOICE, VoucherType.PROFORMA_INVOICE):
            months_map[m_key]["revenue"] += v.total_amount
            stream = "Freight & Transport Invoicing" if v.voucher_type == VoucherType.TRANSPORT_INVOICE else (
                "General Commercial Invoicing" if v.voucher_type == VoucherType.GENERAL_INVOICE else "Proforma & Logistics Billing"
            )
            month_rev_breakdown[m_key][stream] = round(month_rev_breakdown[m_key].get(stream, 0.0) + float(v.total_amount), 2)
        elif v.voucher_type == VoucherType.CREDIT_NOTE:
            months_map[m_key]["revenue"] -= v.total_amount
            stream = "Credit Note Adjustments"
            month_rev_breakdown[m_key][stream] = round(month_rev_breakdown[m_key].get(stream, 0.0) - float(v.total_amount), 2)
        # Expense vouchers
        elif v.voucher_type in (
            VoucherType.NORMAL_PURCHASE,
            VoucherType.GENERAL_PURCHASE,
            VoucherType.PAYMENT_VOUCHER,
            VoucherType.PAYMENT_ATH,
            VoucherType.PAYMENT_BTH,
        ):
            months_map[m_key]["expenses"] += v.total_amount
            if v.voucher_type in (VoucherType.PAYMENT_ATH, VoucherType.PAYMENT_BTH):
                stream = "Hired Vehicle Advances & Balances (ATH/BTH)"
            elif v.voucher_type == VoucherType.NORMAL_PURCHASE:
                stream = "Direct Fleet Maintenance & Spares"
            elif v.voucher_type == VoucherType.GENERAL_PURCHASE:
                stream = "Branch Operating Purchases"
            else:
                stream = "Vendor & Direct Operational Payments"
            month_exp_breakdown[m_key][stream] = round(month_exp_breakdown[m_key].get(stream, 0.0) + float(v.total_amount), 2)
        elif v.voucher_type == VoucherType.DEBIT_NOTE:
            months_map[m_key]["expenses"] -= v.total_amount
            stream = "Debit Note Adjustments"
            month_exp_breakdown[m_key][stream] = round(month_exp_breakdown[m_key].get(stream, 0.0) - float(v.total_amount), 2)

    for te in trip_expenses:
        m_key = te.expense_date.strftime("%Y-%m")
        if m_key not in months_map:
            months_map[m_key] = {"revenue": Decimal("0.0"), "expenses": Decimal("0.0")}
            month_rev_breakdown[m_key] = {}
            month_exp_breakdown[m_key] = {}
        months_map[m_key]["expenses"] += te.amount
        stream = "Trip Direct Expenses (Diesel, Driver, Tolls)"
        month_exp_breakdown[m_key][stream] = round(month_exp_breakdown[m_key].get(stream, 0.0) + float(te.amount), 2)

    # If no historical records, do not fabricate numbers
    if not months_map:
        current_m = date.today().strftime("%Y-%m")
        months_map[current_m] = {"revenue": Decimal("0.0"), "expenses": Decimal("0.0")}
        month_rev_breakdown[current_m] = {}
        month_exp_breakdown[current_m] = {}

    items = []
    total_rev = Decimal("0.0")
    total_exp = Decimal("0.0")

    for m_key in sorted(months_map.keys()):
        rev = months_map[m_key]["revenue"]
        exp = months_map[m_key]["expenses"]
        np = rev - exp
        margin = float((np / rev * 100) if rev > 0 else 0)
        total_rev += rev
        total_exp += exp
        items.append(
            MonthlyPnLItem(
                month=m_key,
                revenue=float(rev),
                expenses=float(exp),
                net_profit=float(np),
                margin_percent=round(margin, 2),
            )
        )

    # Determine reporting metrics: either for the specific selected month or consolidated
    if month and month in months_map:
        selected_rev = float(months_map[month]["revenue"])
        selected_exp = float(months_map[month]["expenses"])
        selected_np = selected_rev - selected_exp
        selected_margin = round(float((selected_np / selected_rev * 100) if selected_rev > 0 else 0), 2)
        rev_breakdown = month_rev_breakdown.get(month, {})
        exp_breakdown = month_exp_breakdown.get(month, {})
        period_str = month
    elif month and month not in months_map:
        selected_rev = 0.0
        selected_exp = 0.0
        selected_np = 0.0
        selected_margin = 0.0
        rev_breakdown = {}
        exp_breakdown = {}
        period_str = month
    else:
        # Default to latest month if available, or totals
        latest_month = sorted(months_map.keys())[-1] if months_map else "2026-09"
        selected_rev = float(months_map[latest_month]["revenue"]) if latest_month in months_map else float(total_rev)
        selected_exp = float(months_map[latest_month]["expenses"]) if latest_month in months_map else float(total_exp)
        selected_np = selected_rev - selected_exp
        selected_margin = round(float((selected_np / selected_rev * 100) if selected_rev > 0 else 0), 2)
        rev_breakdown = month_rev_breakdown.get(latest_month, {})
        exp_breakdown = month_exp_breakdown.get(latest_month, {})
        period_str = latest_month

    return MonthlyPnLResponse(
        period=period_str,
        total_revenue=selected_rev,
        total_expenses=selected_exp,
        net_profit=selected_np,
        margin_percent=selected_margin,
        profit_margin_pct=selected_margin,
        revenue_breakdown=rev_breakdown,
        expense_breakdown=exp_breakdown,
        branches_included=branch_names,
        months=items,
        branch_count=branch_count,
    )


# --- API Center & E-Way Bill Integration ---

async def get_api_center_setting(db: AsyncSession) -> ApiCenterSettingResponse:
    company = await get_company_setting(db)
    return ApiCenterSettingResponse(
        ewb_username=company.ewb_username,
        ewb_password=None,  # Never leak password to the frontend or browser console
        has_ewb_password=bool(company.ewb_password),
        ewb_gstin=company.ewb_gstin or company.gstin,
        is_ewb_active=company.is_ewb_active if company.is_ewb_active is not None else True,
        gsp_client_id_override=company.gsp_client_id_override,
        gsp_base_url_override=company.gsp_base_url_override,
        has_gsp_secret_override=bool(company.gsp_client_secret_override),
        platform_gsp_configured=bool(settings.GSP_CLIENT_ID and settings.GSP_CLIENT_SECRET),
        platform_gsp_base_url=settings.GSP_BASE_URL,
        ft_base_url=company.ft_base_url or "https://api.freighttiger.com/api/tether",
        has_ft_auth_token=bool(company.ft_auth_token),
        is_ft_active=company.is_ft_active if company.is_ft_active is not None else True,
    )


async def update_api_center_setting(db: AsyncSession, data: ApiCenterSettingUpdate) -> ApiCenterSettingResponse:
    company = await get_company_setting(db)

    if data.ewb_username is not None:
        company.ewb_username = data.ewb_username.strip() if data.ewb_username else None
    if data.ewb_password is not None:
        pw = data.ewb_password.strip()
        # Only overwrite if user actually typed a new password, not the masked placeholder
        if pw and not pw.startswith("••"):
            company.ewb_password = pw
    if data.ewb_gstin is not None:
        company.ewb_gstin = data.ewb_gstin.strip().upper() if data.ewb_gstin else None
    if data.is_ewb_active is not None:
        company.is_ewb_active = data.is_ewb_active
    if data.gsp_client_id_override is not None:
        company.gsp_client_id_override = data.gsp_client_id_override.strip() if data.gsp_client_id_override else None
    if data.gsp_client_secret_override is not None:
        secret = data.gsp_client_secret_override.strip()
        if secret and not secret.startswith("••"):
            company.gsp_client_secret_override = secret
    if data.gsp_base_url_override is not None:
        company.gsp_base_url_override = data.gsp_base_url_override.strip() if data.gsp_base_url_override else None
    if data.ft_base_url is not None:
        company.ft_base_url = data.ft_base_url.strip() if data.ft_base_url else "https://api.freighttiger.com/api/tether"
    if data.ft_auth_token is not None:
        token = data.ft_auth_token.strip()
        if token and not token.startswith("••"):
            company.ft_auth_token = token
        elif not token:
            company.ft_auth_token = None
    if data.is_ft_active is not None:
        company.is_ft_active = data.is_ft_active

    company.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(company)

    return await get_api_center_setting(db)


async def test_ewb_connection(db: AsyncSession, req: ApiCenterTestRequest) -> ApiCenterTestResponse:
    company = await get_company_setting(db)

    client_id = (req.gsp_client_id or company.gsp_client_id_override or settings.GSP_CLIENT_ID or "").strip()
    client_secret = (req.gsp_client_secret or company.gsp_client_secret_override or settings.GSP_CLIENT_SECRET or "").strip()
    base_url = (req.gsp_base_url or company.gsp_base_url_override or settings.GSP_BASE_URL or "").rstrip("/")
    ewb_username = (req.ewb_username or company.ewb_username or "").strip()
    ewb_password = (req.ewb_password or company.ewb_password or "").strip()
    gstin = (req.ewb_gstin or company.ewb_gstin or company.gstin or "").strip()

    if not client_id or not client_secret:
        return ApiCenterTestResponse(
            success=False,
            message="GSP_CLIENT_ID or GSP_CLIENT_SECRET is missing. Please configure them in project environment (.env / Dokploy) or in API Center."
        )

    # Attempt token acquisition
    token_url = f"{base_url}/gsp/authenticate?grant_type=token"
    headers = {
        "gspappid": client_id,
        "gspappsecret": client_secret,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(token_url, headers=headers)
            if resp.status_code != 200:
                err_text = resp.text[:300] if resp.text else f"Status code {resp.status_code}"
                return ApiCenterTestResponse(
                    success=False,
                    message=f"GSP Authentication failed with HTTP {resp.status_code}: {err_text}"
                )
            
            token_json = resp.json()
            access_token = token_json.get("access_token")
            if not access_token:
                return ApiCenterTestResponse(
                    success=False,
                    message="GSP Authentication succeeded but did not return a valid access token."
                )

            return ApiCenterTestResponse(
                success=True,
                message="Authentication successful! Connection to GSP Gateway verified (200 OK).",
                details={
                    "base_url": base_url,
                    "gstin": gstin,
                    "ewb_username": ewb_username,
                    "token_type": token_json.get("token_type", "Bearer"),
                    "expires_in": token_json.get("expires_in"),
                }
            )
    except httpx.RequestError as e:
        return ApiCenterTestResponse(
            success=False,
            message=f"Network error connecting to GSP Gateway at {base_url}: {str(e)}"
        )
    except Exception as e:
        return ApiCenterTestResponse(
            success=False,
            message=f"Unexpected error during connection test: {str(e)}"
        )

