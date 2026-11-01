import pytest
from decimal import Decimal
from datetime import date
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.tenant_db.models import (
    TenantBase,
    PrimaryGroup,
    GroupInPrimary,
    SubgroupInGroup,
    Account,
    Branch,
    BillingClient,
    Vendor,
    Driver,
    SeriesMaster,
    TaxCategory,
)
from app.modules.accounts import master_ledger_service, service as accounts_service, schemas
from app.modules.misc.tally_chart_of_accounts import seed_indian_accounting_chart_of_accounts


@pytest.fixture
async def hier_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        # Seed branch
        branch = Branch(
            id=1,
            code="DEL-01",
            name="Delhi Central Logistics Hub",
            city="New Delhi",
            state="Delhi",
            is_head_office=True,
            is_active=True,
        )
        session.add(branch)

        # Seed series for general invoice
        s_gi = SeriesMaster(id=1, document_type="GENERAL_INVOICE", prefix="GI-2026-", current_number=1, is_active=True)
        session.add(s_gi)

        # Seed 18% tax category
        tax_18 = TaxCategory(
            id=1,
            code="GST_18",
            name="GST 18%",
            igst_rate=Decimal("18.00"),
            cgst_rate=Decimal("9.00"),
            sgst_rate=Decimal("9.00"),
            is_rcm=False,
        )
        session.add(tax_18)

        await session.commit()
        yield session


@pytest.mark.asyncio
async def test_chart_of_accounts_hierarchy_structure(hier_session: AsyncSession):
    session = hier_session

    # Run synchronization
    res = await seed_indian_accounting_chart_of_accounts(session)
    assert res["status"] == "SUCCESS"
    assert res["total_primary_groups"] == 5

    # 1. Verify Primary Groups
    pg_res = await session.execute(select(PrimaryGroup))
    pgs = {pg.code: pg for pg in pg_res.scalars().all()}
    assert "ASSET" in pgs
    assert "LIABILITY" in pgs
    assert "EQUITY" in pgs
    assert "INCOME" in pgs
    assert "EXPENSE" in pgs
    assert pgs["ASSET"].nature == "DEBIT"
    assert pgs["LIABILITY"].nature == "CREDIT"
    assert pgs["EQUITY"].nature == "CREDIT"
    assert pgs["INCOME"].nature == "CREDIT"
    assert pgs["EXPENSE"].nature == "DEBIT"

    # 2. Verify Groups in Primary
    grp_res = await session.execute(select(GroupInPrimary))
    grps = {g.code: g for g in grp_res.scalars().all()}
    assert grps["TAX"].primary_group_id == pgs["LIABILITY"].id
    assert grps["DEBTORS"].primary_group_id == pgs["ASSET"].id
    assert grps["CREDITORS"].primary_group_id == pgs["LIABILITY"].id
    assert grps["BANK"].primary_group_id == pgs["ASSET"].id
    assert grps["CASH"].primary_group_id == pgs["ASSET"].id
    assert grps["LOANS_ADV_ASSET"].primary_group_id == pgs["ASSET"].id
    assert grps["REV_DIRECT"].primary_group_id == pgs["INCOME"].id
    assert grps["EXP_DIRECT"].primary_group_id == pgs["EXPENSE"].id

    # 3. Verify Subgroups in Groups
    sub_res = await session.execute(select(SubgroupInGroup))
    subgrps = {sg.code: sg for sg in sub_res.scalars().all()}
    assert subgrps["TAX_GST_OUTPUT"].group_id == grps["TAX"].id
    assert subgrps["TAX_GST_INPUT"].group_id == grps["TAX"].id
    assert subgrps["TAX_GST_RCM"].group_id == grps["TAX"].id
    assert subgrps["TAX_TDS_PAYABLE"].group_id == grps["TAX"].id
    assert subgrps["DEBTORS_CORP"].group_id == grps["DEBTORS"].id
    assert subgrps["CRED_MARKET_VEHICLES"].group_id == grps["CREDITORS"].id
    assert subgrps["ADV_DRIVER_TRIP"].group_id == grps["LOANS_ADV_ASSET"].id
    assert subgrps["BANK_CURRENT"].group_id == grps["BANK"].id

    # 4. Verify Default Core Ledgers are bound to Group and Subgroup
    acc_res = await session.execute(select(Account))
    accs = {a.code: a for a in acc_res.scalars().all()}

    # Duties & Taxes
    assert accs["ACC_GST_OUT_CGST"].group_id == grps["TAX"].id
    assert accs["ACC_GST_OUT_CGST"].subgroup_id == subgrps["TAX_GST_OUTPUT"].id
    assert accs["ACC_GST_OUT_SGST"].group_id == grps["TAX"].id
    assert accs["ACC_GST_OUT_SGST"].subgroup_id == subgrps["TAX_GST_OUTPUT"].id
    assert accs["ACC_GST_OUT_IGST"].group_id == grps["TAX"].id
    assert accs["ACC_GST_OUT_IGST"].subgroup_id == subgrps["TAX_GST_OUTPUT"].id
    assert accs["ACC_GST_IN_CGST"].group_id == grps["TAX"].id
    assert accs["ACC_GST_IN_CGST"].subgroup_id == subgrps["TAX_GST_INPUT"].id
    assert accs["ACC_GST_RCM_LIABILITY"].group_id == grps["TAX"].id
    assert accs["ACC_GST_RCM_LIABILITY"].subgroup_id == subgrps["TAX_GST_RCM"].id
    assert accs["ACC_TDS_PAYABLE_194C"].group_id == grps["TAX"].id
    assert accs["ACC_TDS_PAYABLE_194C"].subgroup_id == subgrps["TAX_TDS_PAYABLE"].id


@pytest.mark.asyncio
async def test_party_accounts_hierarchical_binding(hier_session: AsyncSession):
    session = hier_session
    await seed_indian_accounting_chart_of_accounts(session)

    # 1. Billing Client
    bc = BillingClient(
        id=10,
        name="Tata Steel Ltd",
        code="BC-TATA",
        company_name="Tata Steel Limited",
        gstin="07AAAAA0000A1Z5",
        pan="AAAAA0000A",
        phone="9876543210",
        is_active=True,
    )
    session.add(bc)
    await session.commit()

    bc_acc = await master_ledger_service.get_or_create_party_account(session, "BILLING_CLIENT", 10, "Tata Steel Ltd")
    # Reload with relations
    q = select(Account).options(
        selectinload(Account.group).selectinload(GroupInPrimary.primary_group),
        selectinload(Account.subgroup)
    ).where(Account.id == bc_acc.id)
    loaded_bc = (await session.execute(q)).scalar_one()

    assert loaded_bc.billing_client_id == 10
    assert loaded_bc.group.code == "DEBTORS"
    assert loaded_bc.subgroup.code == "DEBTORS_CORP"
    assert loaded_bc.group.primary_group.code == "ASSET"
    assert loaded_bc.opening_balance_type == "DR"

    # 2. Vendor
    vend = Vendor(
        id=20,
        name="Singhal Transport Co",
        gstin="07BBBBB0000B1Z6",
        pan="BBBBB0000B",
        phone="9876543211",
        is_active=True,
    )
    session.add(vend)
    await session.commit()

    vend_acc = await master_ledger_service.get_or_create_party_account(session, "VENDOR", 20, "Singhal Transport Co")
    q = select(Account).options(
        selectinload(Account.group).selectinload(GroupInPrimary.primary_group),
        selectinload(Account.subgroup)
    ).where(Account.id == vend_acc.id)
    loaded_vend = (await session.execute(q)).scalar_one()

    assert loaded_vend.vendor_id == 20
    assert loaded_vend.group.code == "CREDITORS"
    assert loaded_vend.subgroup.code in ("CRED_MARKET_VEHICLES", "CRED_GENERAL")
    assert loaded_vend.group.primary_group.code == "LIABILITY"
    assert loaded_vend.opening_balance_type == "CR"

    # 3. Driver
    driver = Driver(
        id=30,
        name="Rajesh Kumar",
        phone="9876543212",
        is_active=True,
    )
    session.add(driver)
    await session.commit()

    drv_acc = await master_ledger_service.get_or_create_party_account(session, "DRIVER", 30, "Rajesh Kumar")
    q = select(Account).options(
        selectinload(Account.group).selectinload(GroupInPrimary.primary_group),
        selectinload(Account.subgroup)
    ).where(Account.id == drv_acc.id)
    loaded_drv = (await session.execute(q)).scalar_one()

    assert loaded_drv.driver_id == 30
    assert loaded_drv.group.code in ("LOANS_ADV_ASSET", "CA")
    assert loaded_drv.subgroup.code == "ADV_DRIVER_TRIP"
    assert loaded_drv.group.primary_group.code == "ASSET"
    assert loaded_drv.opening_balance_type == "DR"


@pytest.mark.asyncio
async def test_voucher_postings_reflect_in_duties_and_taxes_ledger(hier_session: AsyncSession):
    session = hier_session
    await seed_indian_accounting_chart_of_accounts(session)

    # 1. Create client
    client = BillingClient(id=1, name="Ambuja Cements", code="BC-AMBUJA", is_active=True, state="Delhi")
    session.add(client)
    await session.commit()

    # 2. Post General Invoice with 18% GST (Intra-state: 9% CGST = 900, 9% SGST = 900, Total = 11800)
    gi_create = schemas.GeneralInvoiceCreate(
        billing_client_id=1,
        party_name="Ambuja Cements",
        voucher_date=date(2026, 4, 10),
        gst_treatment="FCM",
        place_of_supply="Delhi",
        items=[
            schemas.GeneralInvoiceItemCreate(
                description="Consulting & Transportation Logistics",
                quantity=Decimal("1.00"),
                rate=Decimal("10000.00"),
                tax_category_id=1,
            )
        ],
    )
    invoice = await accounts_service.create_general_invoice(session, gi_create, office_id=1)
    assert invoice.id is not None
    assert invoice.net_amount == Decimal("11800.00")
    assert invoice.tax_amount == Decimal("1800.00")

    # 3. Check Duties & Taxes listing
    taxes = await master_ledger_service.list_duties_and_taxes_ledgers(session)
    tax_map = {t.code: t for t in taxes}

    assert "ACC_GST_OUT_CGST" in tax_map
    cgst_tax = tax_map["ACC_GST_OUT_CGST"]
    assert cgst_tax.total_credit == Decimal("900.00")
    assert cgst_tax.current_balance == Decimal("900.00")
    assert cgst_tax.balance_type == "CR"
    assert cgst_tax.primary_group_code == "LIABILITY"
    assert cgst_tax.group_code == "TAX"
    assert cgst_tax.subgroup_code == "TAX_GST_OUTPUT"
    assert cgst_tax.transaction_count >= 1

    sgst_tax = tax_map["ACC_GST_OUT_SGST"]
    assert sgst_tax.total_credit == Decimal("900.00")
    assert sgst_tax.current_balance == Decimal("900.00")
    assert sgst_tax.balance_type == "CR"

    # 4. Check detailed ledger statement for CGST Output ledger
    detail = await master_ledger_service.get_generic_account_ledger_detail(session, cgst_tax.id)
    assert detail.category == "DUTIES_AND_TAXES"
    assert detail.party.code == "ACC_GST_OUT_CGST"
    assert detail.total_credit == Decimal("900.00")
    assert detail.closing_balance == Decimal("900.00")
    assert detail.closing_balance_type == "CR"
    assert len(detail.transactions) >= 1
    tx = detail.transactions[0]
    assert tx.voucher_id == invoice.id
    assert tx.credit_amount == Decimal("900.00")
    assert tx.running_balance == Decimal("900.00")
    assert tx.balance_type == "CR"


@pytest.mark.asyncio
async def test_hierarchy_verify_endpoint(hier_session: AsyncSession):
    session = hier_session
    res = await master_ledger_service.verify_and_heal_chart_of_accounts(session)
    assert res.status == "SUCCESS"
    assert res.total_primary_groups == 5
    assert res.total_groups >= 20
    assert res.total_subgroups >= 30
