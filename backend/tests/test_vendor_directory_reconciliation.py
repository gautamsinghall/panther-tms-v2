import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from app.tenant_db.models import (
    TenantBase,
    Account,
    Branch,
    Vendor,
    VehicleOwner,
    Voucher,
    SeriesMaster,
    GroupInPrimary,
    User,
    Role,
)
from app.control.models import ControlBase, Tenant, Plan
from app.modules.accounts import service as accounts_service
from app.modules.accounts.schemas import PurchaseBillCreate, PurchaseBillItemCreate
from app.modules.accounts import master_ledger_service
from app.modules.general import service as general_service
from app.modules.reports import service as reports_service
from app.modules.statements import service as statements_service
from app.modules.ai import tools as ai_tools
from app.modules.misc.tally_chart_of_accounts import seed_indian_accounting_chart_of_accounts


@pytest.fixture
async def vendor_recon_session():
    """Isolated in-memory database configured for Vendor Directory Reconciliation testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)
        await conn.run_sync(ControlBase.metadata.create_all)

    session_maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with session_maker() as session:
        # 1. Seed Chart of Accounts
        await seed_indian_accounting_chart_of_accounts(session)

        # 2. Seed Head Office Branch
        ho = Branch(id=1, name="Mumbai Central Hub", code="MUM-HO", is_head_office=True, state="Maharashtra")
        session.add(ho)

        # 3. Seed Purchase Series
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
        session.add(s_np)

        # 4. Seed preexisting vendor "sdcdsc" (VEND-0001) with zero balance (matching demo tenant)
        v_sdc = Vendor(
            id=1,
            name="sdcdsc",
            gstin=None,
            state="Maharashtra",
            pan=None,
            issuing_office_id=1,
            is_active=True,
        )
        session.add(v_sdc)

        # 5. Seed Vehicle Owner DSKNMCD (starts only as a VehicleOwner, not in general_vendors)
        vo_dsk = VehicleOwner(
            id=1,
            name="DSKNMCD",
            phone="9876543210",
            pan=None,  # No PAN (triggers 206AA 20% TDS)
            state="Maharashtra",
            city="Mumbai",
            address="Plot 42, Transport Nagar",
            is_active=True,
        )
        session.add(vo_dsk)

        # 6. Seed an existing creditor Account with code TRP-0001 (representing the transporter account)
        grp_res = await session.execute(select(GroupInPrimary).where(GroupInPrimary.code == "CREDITORS"))
        cred_grp = grp_res.scalars().first()

        trp_acc = Account(
            id=101,
            name="DSKNMCD",
            code="TRP-0001",
            group_id=cred_grp.id,
            opening_balance=Decimal("0.00"),
            opening_balance_type="CR",
            vehicle_owner_id=1,
            vendor_id=None,  # Intentionally unlinked initially
            is_active=True,
        )
        session.add(trp_acc)

        # 7. Seed Control Tenant and User for AI tools
        plan = Plan(id=1, name="Enterprise Pro", code="PRO")
        session.add(plan)
        t_ctrl = Tenant(id=1, company_name="Demo Logistics", company_code="DEMOLOGISTICS", tenant_id="demo123456", db_name="test_tenant_db", plan_id=1, admin_email="ops@panthertms.com")
        session.add(t_ctrl)
        from app.tenant_db.models import RolePermission
        perms = [
            RolePermission(module="accounts", feature="master_ledger", permission="view", is_allowed=True),
            RolePermission(module="general", feature="vendors", permission="view", is_allowed=True),
        ]
        role = Role(id=1, name="Company Admin", permissions=perms)
        session.add(role)
        user = User(id=1, full_name="Ops Manager", email="ops@panthertms.com", password_hash="dummy", role="COMPANY_ADMIN", is_active=True, custom_role=role)
        session.add(user)

        await session.commit()
        yield session


@pytest.mark.asyncio
async def test_vendor_directory_posting_and_reconciliation(vendor_recon_session: AsyncSession):
    session = vendor_recon_session

    # Base figures from source document NP-2026-0001 / HC-2026-0007
    gross_hire_expense = Decimal("97794241.00")
    tds_rate = Decimal("20.00")
    tds_amount = Decimal("19558848.20")
    expected_payable = Decimal("78235392.80")

    # 1. Post purchase bill NP-2026-0001 with NO vendor_id passed (only party_name and bill_number HC-2026-0007)
    # This tests the fixed posting path: auto-provisioning Vendor and linking account.vendor_id and voucher.vendor_id
    bill_data = PurchaseBillCreate(
        vendor_id=None,  # Note: NOT supplied by caller!
        party_name="DSKNMCD",
        party_account_id=101,  # Preexisting account TRP-0001
        purchase_category="TRUCK_HIRE",
        purchase_type="NORMAL_PURCHASE",
        voucher_number="NP-2026-0001",
        voucher_date=date(2026, 4, 10),
        credit_period_days=30,
        bill_number="HC-2026-0007",
        bill_date=date(2026, 4, 10),
        gst_treatment="EXEMPT",
        itc_eligibility="INELIGIBLE",
        tds_section="194C",
        tds_rate=tds_rate,
        tds_amount=tds_amount,
        items=[
            PurchaseBillItemCreate(
                description="Freight hire charges for HC-2026-0007",
                hsn_sac="996511",
                quantity=Decimal("1.00"),
                rate=gross_hire_expense,
                tax_amount=Decimal("0.00"),
            )
        ],
    )
    voucher = await accounts_service.create_purchase_bill(session, bill_data, office_id=1)

    # Verify posting path: voucher has vendor_id assigned and account is linked
    assert voucher.voucher_number == "NP-2026-0001"
    assert voucher.net_amount == expected_payable
    assert voucher.vendor_id is not None, "Voucher.vendor_id must be linked by the posting path"

    acc_101 = await session.get(Account, 101)
    assert acc_101.vendor_id == voucher.vendor_id, "Account.vendor_id must be linked to the provisioned Vendor"

    # 2. Acceptance Check 1: DSKNMCD appears in Vendor Master (list_vendors)
    vendors = await general_service.list_vendors(session, office_id=1, include_unassigned=True)
    vendor_names = [v.name for v in vendors]
    assert "DSKNMCD" in vendor_names, f"DSKNMCD must appear in Vendor Master. Found: {vendor_names}"
    assert "sdcdsc" in vendor_names, "sdcdsc must still be present in Vendor Master"

    dsk_vendor = next(v for v in vendors if v.name == "DSKNMCD")
    assert dsk_vendor.industry == "Transporter / Fleet Owner"
    assert dsk_vendor.account_status == "Active"

    # 3. Acceptance Check 2: DSKNMCD appears in Master Ledger Vendor Ledger at ₹7,82,35,392.80 payable
    vendor_ledgers = await master_ledger_service.list_vendor_ledgers(session, office_id=1, include_unassigned=True)
    vl_dsk = next((vl for vl in vendor_ledgers if vl.name == "DSKNMCD"), None)
    assert vl_dsk is not None, "DSKNMCD must appear in Master Ledger Vendor Ledger"
    assert vl_dsk.code == "TRP-0001", f"Code should reflect TRP-0001 from account master, got {vl_dsk.code}"
    assert vl_dsk.total_credit == expected_payable
    assert vl_dsk.total_debit == Decimal("0.00")
    assert vl_dsk.outstanding_payable == expected_payable
    assert vl_dsk.balance_type == "CR"

    # 4. Acceptance Check 3: Master Ledger Overview, Trial Balance, and O/S Creditor all agree
    overview = await master_ledger_service.get_master_ledger_summary(session, office_id=1, include_unassigned=True)
    tb_resp = await reports_service.get_trial_balance(session, as_of_date=date(2026, 4, 30))
    os_resp = await statements_service.get_os_creditor(session, as_of_date=date(2026, 4, 30))

    # A. Master Ledger Overview
    ml_vendors_payable = overview.vendors.total_outstanding
    assert ml_vendors_payable == expected_payable, f"Master Ledger Vendors Payable expected {expected_payable}, got {ml_vendors_payable}"

    # B. Trial Balance Creditors
    liab_pg = next((pg for pg in tb_resp.primary_groups if pg.primary_group_code in ["LIABILITY", "LIAB"]), None)
    assert liab_pg is not None, "Liability primary group missing in Trial Balance"
    cred_grp = next((g for g in liab_pg.groups if g.group_code == "CREDITORS"), None)
    assert cred_grp is not None, "CREDITORS group missing in Trial Balance"
    tb_creditors_total = cred_grp.group_credit
    assert tb_creditors_total == expected_payable, f"Trial Balance Creditors expected {expected_payable}, got {tb_creditors_total}"

    tb_dsk_acc = next((a for a in cred_grp.accounts if a.account_code == "TRP-0001" or a.account_name == "DSKNMCD"), None)
    assert tb_dsk_acc is not None
    assert tb_dsk_acc.credit_balance == expected_payable

    # C. O/S Creditor
    os_creditors_total = os_resp.total_outstanding
    assert os_creditors_total == expected_payable, f"O/S Creditor total expected {expected_payable}, got {os_creditors_total}"
    os_dsk_item = next((item for item in os_resp.creditors if item.creditor_code == "TRP-0001" or item.creditor_name == "DSKNMCD"), None)
    assert os_dsk_item is not None
    assert os_dsk_item.current_balance == expected_payable

    # Unified agreement assertion:
    assert ml_vendors_payable == tb_creditors_total == os_creditors_total == expected_payable, (
        f"Master Ledger ({ml_vendors_payable}), Trial Balance ({tb_creditors_total}), and O/S Creditor ({os_creditors_total}) MUST agree"
    )

    # 5. Acceptance Check 4: Chatbot "View Ledger" shows the same vendor payable
    from sqlalchemy.orm import selectinload
    user = (await session.execute(
        select(User).options(selectinload(User.custom_role).selectinload(Role.permissions)).where(User.id == 1)
    )).scalar_one()
    tenant = (await session.execute(
        select(Tenant).options(selectinload(Tenant.plan).selectinload(Plan.entitlements)).where(Tenant.id == 1)
    )).scalar_one()
    ho_branch = (await session.execute(select(Branch).where(Branch.id == 1))).scalar_one()

    # Chatbot general ledger overview ("View Ledger")
    msg, cards = await ai_tools.execute_accounting_tool(
        db=session,
        user=user,
        tenant=tenant,
        current_office=ho_branch,
        party_name=None,
        lang="en",
    )
    # Check that formatted figure ₹78,235,392.80 is present in the chatbot response
    assert "78,235,392.80" in msg, f"Chatbot message must show ₹78,235,392.80. Got: {msg}"
    assert len(cards) > 0
    metric_vendors = next((m for m in cards[0].metrics if "Vendors" in m["label"]), None)
    assert metric_vendors is not None
    assert "78,235,392.80" in metric_vendors["value"]

    # Chatbot specific party ledger inquiry ("DSKNMCD")
    party_msg, party_cards = await ai_tools.execute_accounting_tool(
        db=session,
        user=user,
        tenant=tenant,
        current_office=ho_branch,
        party_name="DSKNMCD",
        lang="en",
    )
    assert "78,235,392.80" in party_msg
    assert "DSKNMCD" in party_msg

    # Chatbot vendor directory query
    vend_msg, vend_cards = await ai_tools.execute_vendor_tool(
        db=session,
        user=user,
        tenant=tenant,
        current_office=ho_branch,
        query="DSKNMCD",
        lang="en",
    )
    assert "DSKNMCD" in str(vend_cards)


@pytest.mark.asyncio
async def test_vehicle_owner_and_hire_challan_auto_vendor_provisioning(vendor_recon_session: AsyncSession):
    session = vendor_recon_session
    from app.modules.transport.schemas import VehicleOwnerCreate, HireChallanCreate
    from app.modules.transport import service as transport_service

    # 1. Create a new Vehicle Owner via transport service
    owner_data = VehicleOwnerCreate(
        name="MAHALAXMI LOGISTICS",
        phone="9123456789",
        pan="ABCDE1234F",
        state="Gujarat",
        city="Surat",
        address="12 Ring Road",
    )
    owner = await transport_service.create_vehicle_owner(session, owner_data)

    # Verify Vendor was auto-provisioned in general_vendors
    vendors = await general_service.list_vendors(session, office_id=1, include_unassigned=True)
    m_vend = next((v for v in vendors if v.name == "MAHALAXMI LOGISTICS"), None)
    assert m_vend is not None, "Vehicle Owner must automatically exist in Vendor Master"
    assert m_vend.pan == "ABCDE1234F"
    assert m_vend.industry == "Transporter / Fleet Owner"

    # Verify dedicated Account was created in CREDITORS and linked to both vendor and vehicle owner
    acc_res = await session.execute(
        select(Account).where(Account.name == "MAHALAXMI LOGISTICS")
    )
    m_acc = acc_res.scalars().first()
    assert m_acc is not None
    assert m_acc.vendor_id == m_vend.id
    assert m_acc.vehicle_owner_id == owner.id

    # 2. Create Hire Challan for this owner
    hc_data = HireChallanCreate(
        challan_number="HC-2026-0099",
        challan_date=date(2026, 4, 15),
        owner_id=owner.id,
        vehicle_number="GJ-05-XX-1234",
        driver_name="Ramesh Kumar",
        driver_phone="9876543211",
        from_location="Surat",
        to_location="Mumbai",
        hire_rate=Decimal("50000.00"),
        advance_amount=Decimal("10000.00"),
        tds_rate=Decimal("1.00"),
        tds_amount=Decimal("500.00"),
        issuing_office_id=1,
    )
    hc = await transport_service.create_hire_challan(session, hc_data, office_id=1)
    assert hc.challan_number == "HC-2026-0099"
    assert hc.net_payable_amount == Decimal("49500.00")
    assert hc.balance_amount == Decimal("39500.00")

    # Verify Vendor Master and Master Ledger Vendor Ledger reflect MAHALAXMI LOGISTICS
    vl_list = await master_ledger_service.list_vendor_ledgers(session, office_id=1, include_unassigned=True)
    vl_m = next((vl for vl in vl_list if vl.name == "MAHALAXMI LOGISTICS"), None)
    assert vl_m is not None
    assert vl_m.outstanding_payable == Decimal("49500.00")


@pytest.mark.asyncio
async def test_preexisting_unlinked_creditor_auto_sync(vendor_recon_session: AsyncSession):
    session = vendor_recon_session

    # Seed an unlinked creditor account with code TRP-9999 (legacy imported data)
    grp_res = await session.execute(select(GroupInPrimary).where(GroupInPrimary.code == "CREDITORS"))
    cred_grp = grp_res.scalars().first()

    legacy_acc = Account(
        id=202,
        name="SHREE RAM TRANSPORTERS",
        code="TRP-9999",
        group_id=cred_grp.id,
        opening_balance=Decimal("250000.00"),
        opening_balance_type="CR",
        is_active=True,
    )
    session.add(legacy_acc)
    await session.commit()

    # Querying list_vendors must automatically sync SHREE RAM TRANSPORTERS into general_vendors
    vendors = await general_service.list_vendors(session, office_id=1, include_unassigned=True)
    srt_v = next((v for v in vendors if v.name == "SHREE RAM TRANSPORTERS"), None)
    assert srt_v is not None, "Legacy creditor must be synced into Vendor Master"

    # Querying list_vendor_ledgers must display SHREE RAM TRANSPORTERS with ₹2,50,000.00 CR
    vl_list = await master_ledger_service.list_vendor_ledgers(session, office_id=1, include_unassigned=True)
    vl_srt = next((vl for vl in vl_list if vl.name == "SHREE RAM TRANSPORTERS"), None)
    assert vl_srt is not None
    assert vl_srt.code == "TRP-9999"
    assert vl_srt.outstanding_payable == Decimal("250000.00")
    assert vl_srt.balance_type == "CR"

