import pytest
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.tenant_db.models import (
    TenantBase,
    Voucher,
    VoucherItem,
    LedgerEntry,
    VoucherType,
    Account,
    Branch,
    Vendor,
    TaxCategory,
    BillAllocation,
    HireChallan,
    LR,
    SeriesMaster,
)
from app.modules.accounts import service as accounts_service
from app.modules.accounts.schemas import (
    PurchaseBillCreate,
    PurchaseBillItemCreate,
    PurchasePaymentCreate,
    VoidVoucherRequest,
)
from app.modules.accounts import master_ledger_service
from app.modules.reports import service as reports_service


@pytest.fixture
async def e2e_session():
    """Isolated in-memory SQLite database configured with complete test fixtures."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        # 1. Seed branches
        ho = Branch(id=1, name="Mumbai Central Hub", code="MUM-HO", is_head_office=True, state="Maharashtra")
        ahmedabad = Branch(id=2, name="Ahmedabad Branch", code="ADI-BR", is_head_office=False, state="Gujarat")
        session.add_all([ho, ahmedabad])

        # 2. Seed series
        s_np = SeriesMaster(
            id=1,
            document_type="NORMAL_PURCHASE",
            prefix="NP-2026-",
            suffix="",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default Normal Purchase Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        s_gp = SeriesMaster(
            id=2,
            document_type="GENERAL_PURCHASE",
            prefix="GP-2026-",
            suffix="",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default General Purchase Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        s_pv = SeriesMaster(
            id=3,
            document_type="PAYMENT_VOUCHER",
            prefix="PV-2026-",
            suffix="",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default Payment Voucher Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        session.add_all([s_np, s_gp, s_pv])

        # 3. Seed vendors (Suppliers)
        v1 = Vendor(
            id=1,
            name="MRF Tyres & Rubber Ltd",
            gstin="27AAACM1234F1Z5",
            state="Maharashtra",
            pan="AAACM1234F",
            issuing_office_id=1,
        )
        v2 = Vendor(
            id=2,
            name="Gujarat Auto Spares & Engineering",
            gstin="24AABCG9876E1Z2",
            state="Gujarat",
            pan="AABCG9876E",
            issuing_office_id=1,
        )
        v3 = Vendor(
            id=3,
            name="Highway Fleet Transporters",
            gstin="27AABCH5555M1Z8",
            state="Maharashtra",
            pan="AABCH5555M",
            issuing_office_id=1,
        )
        session.add_all([v1, v2, v3])

        # 4. Seed tax categories
        t_18 = TaxCategory(id=1, name="GST 18%", code="GST_18", cgst_rate=Decimal("9.00"), sgst_rate=Decimal("9.00"), igst_rate=Decimal("18.00"))
        t_28 = TaxCategory(id=2, name="GST 28%", code="GST_28", cgst_rate=Decimal("14.00"), sgst_rate=Decimal("14.00"), igst_rate=Decimal("28.00"))
        t_5 = TaxCategory(id=3, name="GST 5%", code="GST_5", cgst_rate=Decimal("2.50"), sgst_rate=Decimal("2.50"), igst_rate=Decimal("5.00"))
        session.add_all([t_18, t_28, t_5])

        await session.commit()
        await accounts_service.ensure_standard_accounts(session)
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_intra_state_purchase_bill_fcm(e2e_session: AsyncSession):
    """
    Scenario 1: Intra-state Operational Purchase Bill (Maharashtra -> Maharashtra)
    - 4 x MRF Radial Tyres @ 15,000 = 60,000. Less 2,000 trade discount = 58,000 taxable.
    - 28% GST: CGST @ 14% (8,120) + SGST @ 14% (8,120) = 16,240 tax.
    - Total Net Bill: 74,240.
    - Double-Entry Posting:
      Dr. Tyres Expense (ACC_TYRE_EXP): 58,000.00
      Dr. Input CGST (ACC_GST_IN_CGST): 8,120.00
      Dr. Input SGST (ACC_GST_IN_SGST): 8,120.00
      Cr. Vendor Account (Sundry Creditors): 74,240.00
    """
    session = e2e_session

    bill_create = PurchaseBillCreate(
        vendor_id=1,
        purchase_category="TYRES",
        purchase_type="NORMAL_PURCHASE",
        voucher_number="NP-2026-0001",
        voucher_date=date(2026, 4, 15),
        credit_period_days=30,
        bill_number="MRF-INV-9901",
        bill_date=date(2026, 4, 14),
        gst_treatment="FCM",
        itc_eligibility="ELIGIBLE",
        place_of_supply="Maharashtra",
        vehicle_number="MH-04-AB-1234",
        cost_center="FLEET-TYRES-WEST",
        items=[
            PurchaseBillItemCreate(
                description="MRF Steel Muscle 295/80 R22.5 Commercial Tyres",
                hsn_sac="40112000",
                quantity=Decimal("4.00"),
                rate=Decimal("15000.00"),
                discount_amount=Decimal("2000.00"),
                tax_category_id=2,  # 28%
            )
        ],
        narration="Set of 4 steer tyres purchased for vehicle MH-04-AB-1234",
    )

    voucher = await accounts_service.create_purchase_bill(session, bill_create, office_id=1)

    assert voucher.voucher_number == "NP-2026-0001"
    assert voucher.total_amount == Decimal("58000.00")
    assert voucher.tax_amount == Decimal("16240.00")
    assert voucher.net_amount == Decimal("74240.00")
    assert voucher.balance_amount == Decimal("74240.00")
    assert voucher.paid_amount == Decimal("0.00")
    assert voucher.payment_status == "UNPAID"

    # Verify ledger entries
    entries = voucher.ledger_entries
    assert len(entries) == 4

    tot_dr = sum(e.debit_amount for e in entries)
    tot_cr = sum(e.credit_amount for e in entries)
    assert tot_dr == Decimal("74240.00")
    assert tot_cr == Decimal("74240.00")

    # Verify specific accounts
    tyre_entry = next(e for e in entries if e.debit_amount == Decimal("58000.00"))
    assert tyre_entry.account.code == "ACC_TYRE_EXP"

    cgst_entry = next(e for e in entries if e.debit_amount == Decimal("8120.00") and "CGST" in e.narration)
    assert cgst_entry.account.code == "ACC_GST_IN_CGST"

    sgst_entry = next(e for e in entries if e.debit_amount == Decimal("8120.00") and "SGST" in e.narration)
    assert sgst_entry.account.code == "ACC_GST_IN_SGST"

    vendor_entry = next(e for e in entries if e.credit_amount == Decimal("74240.00"))
    assert vendor_entry.account.vendor_id == 1


@pytest.mark.asyncio
async def test_inter_state_purchase_bill_and_payment_settlement(e2e_session: AsyncSession):
    """
    Scenario 2: Inter-state Purchase Bill (Maharashtra branch buying from Gujarat vendor)
    - 10 x Brake Liners @ 3,000 = 30,000 taxable. 18% IGST = 5,400. Total = 35,400.
    - Double-Entry Posting:
      Dr. Spares Expense (ACC_SPARES_EXP): 30,000.00
      Dr. Input IGST (ACC_GST_IN_IGST): 5,400.00
      Cr. Vendor Account (Sundry Creditors): 35,400.00
    Followed by supplier payment:
    - Partial Payment: 20,000 Bank + 400 Cash Discount = 20,400 settled -> Balance 15,000
    - Final Payment: 15,000 Bank -> Balance 0.00, status PAID
    """
    session = e2e_session

    bill_create = PurchaseBillCreate(
        vendor_id=2,  # Gujarat vendor
        purchase_category="SPARES",
        purchase_type="NORMAL_PURCHASE",
        voucher_number="NP-2026-0002",
        voucher_date=date(2026, 4, 16),
        credit_period_days=30,
        bill_number="GAS-INV-4411",
        bill_date=date(2026, 4, 15),
        gst_treatment="FCM",
        itc_eligibility="ELIGIBLE",
        place_of_supply="Gujarat",
        items=[
            PurchaseBillItemCreate(
                description="Heavy Commercial Vehicle Brake Liners Set",
                hsn_sac="87083000",
                quantity=Decimal("10.00"),
                rate=Decimal("3000.00"),
                discount_amount=Decimal("0.00"),
                tax_category_id=1,  # 18%
            )
        ],
        narration="Workshop brake spares from Gujarat supplier",
    )

    voucher = await accounts_service.create_purchase_bill(session, bill_create, office_id=1)

    assert voucher.total_amount == Decimal("30000.00")
    assert voucher.tax_amount == Decimal("5400.00")
    assert voucher.net_amount == Decimal("35400.00")
    assert voucher.balance_amount == Decimal("35400.00")

    # Verify IGST entry
    igst_entry = next(e for e in voucher.ledger_entries if e.debit_amount == Decimal("5400.00"))
    assert igst_entry.account.code == "ACC_GST_IN_IGST"

    # Step 2: Record Partial Payment
    # 20,000 Bank + 400 Cash Discount = 20,400 settled
    pmt1 = await accounts_service.create_payment_against_purchase(
        session,
        purchase_id=voucher.id,
        data=PurchasePaymentCreate(
            amount=Decimal("20000.00"),
            payment_date=date(2026, 4, 25),
            payment_mode="BANK",
            discount_amount=Decimal("400.00"),
            reference_number="NEFT-HDFC-9912",
            narration="Part payment for brake liners invoice",
        ),
        office_id=1,
    )

    # Check updated bill
    refreshed_bill = await accounts_service.get_voucher_by_id(session, voucher.id)
    assert refreshed_bill.paid_amount == Decimal("20400.00")
    assert refreshed_bill.balance_amount == Decimal("15000.00")
    assert refreshed_bill.payment_status == "PARTIALLY_PAID"

    # Verify payment voucher entries
    p_entries = pmt1.ledger_entries
    p_tot_dr = sum(e.debit_amount for e in p_entries)
    p_tot_cr = sum(e.credit_amount for e in p_entries)
    assert p_tot_dr == Decimal("20400.00")
    assert p_tot_cr == Decimal("20400.00")

    # Step 3: Record Final Payment (15,000 balance)
    pmt2 = await accounts_service.create_payment_against_purchase(
        session,
        purchase_id=voucher.id,
        data=PurchasePaymentCreate(
            amount=Decimal("15000.00"),
            payment_date=date(2026, 5, 2),
            payment_mode="BANK",
            reference_number="NEFT-HDFC-9988",
            narration="Final settlement of brake liners bill",
        ),
        office_id=1,
    )

    final_bill = await accounts_service.get_voucher_by_id(session, voucher.id)
    assert final_bill.paid_amount == Decimal("35400.00")
    assert final_bill.balance_amount == Decimal("0.00")
    assert final_bill.payment_status == "PAID"


@pytest.mark.asyncio
async def test_ineligible_blocked_itc_section_17_5(e2e_session: AsyncSession):
    """
    Scenario 3: Ineligible / Blocked ITC under Section 17(5) CGST Act
    - Office catering / employee welfare or non-qualifying motor accessories:
      Taxable: 10,000. 18% GST: 1,800.
    - Since ITC is blocked, GST is added to the expense cost!
      Dr. Office Admin Expense: 11,800.00
      Cr. Vendor Account: 11,800.00
      (No input GST account debited)
    """
    session = e2e_session

    bill_create = PurchaseBillCreate(
        party_name="Grand Office Cafeteria",
        purchase_category="OFFICE_ADMIN",
        purchase_type="GENERAL_PURCHASE",
        voucher_number="GP-2026-0001",
        voucher_date=date(2026, 4, 20),
        bill_number="CAFE-8812",
        gst_treatment="FCM",
        itc_eligibility="INELIGIBLE",
        place_of_supply="Maharashtra",
        items=[
            PurchaseBillItemCreate(
                description="Annual Office Refreshments and Catering",
                hsn_sac="996331",
                quantity=Decimal("1.00"),
                rate=Decimal("10000.00"),
                tax_category_id=1,  # 18%
            )
        ],
        narration="Staff annual meeting catering expense (ITC Ineligible u/s 17(5))",
    )

    voucher = await accounts_service.create_purchase_bill(session, bill_create, office_id=1)

    assert voucher.total_amount == Decimal("10000.00")
    assert voucher.tax_amount == Decimal("1800.00")
    assert voucher.net_amount == Decimal("11800.00")

    # Verify ledger entries: GST should be capitalized in expense
    entries = voucher.ledger_entries
    assert len(entries) == 2  # 1 Debit Exp, 1 Credit Creditor

    exp_entry = entries[0]
    assert exp_entry.debit_amount == Decimal("11800.00")
    assert exp_entry.account.code == "ACC_OFFICE_EXP"

    creditor_entry = entries[1]
    assert creditor_entry.credit_amount == Decimal("11800.00")


@pytest.mark.asyncio
async def test_reverse_charge_mechanism_rcm_purchase(e2e_session: AsyncSession):
    """
    Scenario 4: Reverse Charge Mechanism (RCM)
    - Inward service subject to RCM (e.g., advocate / legal charges or security service):
      Taxable: 25,000. 5% GST: 1,250.
    - Supplier is paid taxable ONLY (25,000).
    - Company pays 1,250 GST directly to Government.
    - Double-Entry Posting:
      Dr. Maintenance Expense / Professional: 25,000.00
      Dr. Input CGST: 625.00
      Dr. Input SGST: 625.00
      Cr. Vendor Account: 25,000.00
      Cr. GST RCM Output Liability: 1,250.00
      Sum Debits (26,250) == Sum Credits (26,250).
    """
    session = e2e_session

    bill_create = PurchaseBillCreate(
        party_name="Advocate S. Sharma Legal Firm",
        purchase_category="MAINTENANCE",
        purchase_type="GENERAL_PURCHASE",
        voucher_number="GP-2026-0002",
        voucher_date=date(2026, 4, 22),
        bill_number="LEGAL-2026-04",
        gst_treatment="RCM",
        itc_eligibility="ELIGIBLE",
        place_of_supply="Maharashtra",
        items=[
            PurchaseBillItemCreate(
                description="Transport Regulatory Compliance & Legal Consultation",
                hsn_sac="998211",
                quantity=Decimal("1.00"),
                rate=Decimal("25000.00"),
                tax_category_id=3,  # 5%
            )
        ],
        narration="Legal retainer fee subject to RCM",
    )

    voucher = await accounts_service.create_purchase_bill(session, bill_create, office_id=1)

    assert voucher.total_amount == Decimal("25000.00")
    assert voucher.tax_amount == Decimal("1250.00")
    assert voucher.net_amount == Decimal("25000.00")  # Vendor payable is taxable only

    entries = voucher.ledger_entries
    tot_dr = sum(e.debit_amount for e in entries)
    tot_cr = sum(e.credit_amount for e in entries)
    assert tot_dr == Decimal("26250.00")
    assert tot_cr == Decimal("26250.00")

    # Verify RCM liability credit
    rcm_entry = next(e for e in entries if e.account.code == "ACC_GST_RCM_LIABILITY")
    assert rcm_entry.credit_amount == Decimal("1250.00")

    # Verify Vendor credit is only 25,000
    vendor_entry = next(e for e in entries if e.account.code == "ACC_SUNDRY_CREDITORS")
    assert vendor_entry.credit_amount == Decimal("25000.00")


@pytest.mark.asyncio
async def test_hire_challan_integration_and_duplicate_prevention(e2e_session: AsyncSession):
    """
    Scenario 5: Hire Challan Integration & Duplicate Prevention
    - A market vehicle was hired (Hire Challan #HC-001) for 45,000.
    - Vendor submits formal invoice (INV-HC-900) for this trip.
    - Purchase Bill links to hire_challan_id=1.
    - Verify that Master Ledger suppresses duplicate unbilled liability.
    - Duplicate Check: Attempt to record same bill_number for same vendor must be rejected.
    """
    session = e2e_session

    # Seed Hire Challan
    hc = HireChallan(
        id=1,
        challan_number="HC-2026-0001",
        challan_date=date(2026, 4, 10),
        vendor_ref_no="Highway Fleet Transporters",
        vehicle_number="MH-12-PQ-9090",
        from_location="Mumbai",
        to_location="Nagpur",
        hire_rate=Decimal("45000.00"),
        net_payable_amount=Decimal("45000.00"),
        status="CONFIRMED",
        issuing_office_id=1,
    )
    session.add(hc)
    await session.commit()

    # Before posting voucher, check Master Ledger vendor detail:
    # It should have 1 synthetic transaction for HIRE_CHALLAN_LIABILITY
    detail_before = await master_ledger_service.get_vendor_ledger_detail(session, vendor_id=3, office_id=1)
    assert any(tx.voucher_type == "HIRE_CHALLAN_LIABILITY" for tx in detail_before.transactions)

    # Now record formal Purchase Bill linked to Hire Challan
    bill_create = PurchaseBillCreate(
        vendor_id=3,
        purchase_category="TRUCK_HIRE",
        purchase_type="NORMAL_PURCHASE",
        voucher_number="NP-2026-0003",
        voucher_date=date(2026, 4, 18),
        bill_number="HFT-INV-900",
        bill_date=date(2026, 4, 17),
        gst_treatment="EXEMPT",  # GTA transport under exempt or FCM
        hire_challan_id=1,
        vehicle_number="MH-12-PQ-9090",
        items=[
            PurchaseBillItemCreate(
                description="Truck Freight Charges for Mumbai to Nagpur Trip",
                hsn_sac="996511",
                quantity=Decimal("1.00"),
                rate=Decimal("45000.00"),
            )
        ],
        narration="Freight bill for HC-2026-0001",
    )

    voucher = await accounts_service.create_purchase_bill(session, bill_create, office_id=1)
    assert voucher.hire_challan_id == 1

    # Now verify Master Ledger vendor detail again:
    # The synthetic HIRE_CHALLAN_LIABILITY must NOT exist, preventing double-counting!
    detail_after = await master_ledger_service.get_vendor_ledger_detail(session, vendor_id=3, office_id=1)
    hc_synthetic = [tx for tx in detail_after.transactions if tx.voucher_type == "HIRE_CHALLAN_LIABILITY"]
    assert len(hc_synthetic) == 0  # Successfully suppressed duplicate liability!

    # Duplicate Prevention Test: Try to enter the exact same bill number for vendor 3
    with pytest.raises(Exception) as excinfo:
        await accounts_service.create_purchase_bill(session, bill_create, office_id=1)
    assert "already been recorded" in str(excinfo.value)
    assert "MRF-INV" not in str(excinfo.value)


@pytest.mark.asyncio
async def test_purchase_voiding_safety_and_reversal(e2e_session: AsyncSession):
    """
    Scenario 6: Voiding Safety & Audit Trail
    - Cannot void purchase bill with active payment voucher.
    - Voiding payment unallocates from purchase bill and restores balance.
    - Voiding purchase bill produces balanced reversal ledger entries.
    """
    session = e2e_session

    bill_create = PurchaseBillCreate(
        party_name="Quick Car Care Workshop",
        purchase_category="MAINTENANCE",
        voucher_number="NP-2026-0004",
        voucher_date=date(2026, 4, 26),
        bill_number="QCC-7711",
        items=[
            PurchaseBillItemCreate(
                description="Radiator Flush and Coolant Replacement",
                hsn_sac="998729",
                quantity=Decimal("1.00"),
                rate=Decimal("5000.00"),
            )
        ],
        narration="Workshop job",
    )
    voucher = await accounts_service.create_purchase_bill(session, bill_create, office_id=1)

    # Make a payment of 2,000
    pmt = await accounts_service.create_payment_against_purchase(
        session,
        purchase_id=voucher.id,
        data=PurchasePaymentCreate(
            amount=Decimal("2000.00"),
            payment_mode="CASH",
            narration="Advance cash payment",
        ),
        office_id=1,
    )

    # Attempt to void purchase bill while payment exists -> Must be blocked!
    with pytest.raises(Exception) as excinfo:
        await accounts_service.void_voucher(session, voucher.id, VoidVoucherRequest(void_reason="Mistake in bill"))
    assert "active receipts / payments" in str(excinfo.value) or "active" in str(excinfo.value)

    # Void the payment voucher first
    voided_pmt = await accounts_service.void_voucher(session, pmt.id, VoidVoucherRequest(void_reason="Returned cash"))
    assert voided_pmt.is_void is True

    # Check purchase bill balance is restored
    refreshed = await accounts_service.get_voucher_by_id(session, voucher.id)
    assert refreshed.paid_amount == Decimal("0.00")
    assert refreshed.balance_amount == Decimal("5000.00")
    assert refreshed.payment_status == "UNPAID"

    # Now void the purchase bill -> Should succeed
    voided_bill = await accounts_service.void_voucher(session, voucher.id, VoidVoucherRequest(void_reason="Cancelled bill"))
    assert voided_bill.is_void is True
    assert voided_bill.payment_status == "VOID"

    # Verify reversing entries
    reversals = [e for e in voided_bill.ledger_entries if e.is_reversal]
    assert len(reversals) > 0
    tot_rev_dr = sum(e.debit_amount for e in reversals)
    tot_rev_cr = sum(e.credit_amount for e in reversals)
    assert tot_rev_dr == tot_rev_cr
