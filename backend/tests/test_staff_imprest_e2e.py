import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.tenant_db.models import (
    TenantBase,
    Account,
    PrimaryGroup,
    GroupInPrimary,
    SubgroupInGroup,
    EmployeeMaster,
    LedgerEntry,
    Voucher,
    VoucherType,
    Branch,
)
from app.modules.accounts import master_ledger_service
from app.modules.misc import service as misc_service


@pytest.fixture
async def test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with async_session() as session:
        # Hierarchy: Assets -> Current Assets -> Staff Imprest & Operating Float
        pg_asset = PrimaryGroup(id=1, name="Assets", code="ASSET", nature="ASSET")
        session.add(pg_asset)
        await session.flush()

        grp_ca = GroupInPrimary(id=1, name="Current Assets", code="CA", primary_group_id=pg_asset.id)
        session.add(grp_ca)
        await session.flush()

        subgrp_imp = SubgroupInGroup(
            id=1,
            name="Staff Imprest & Operating Float",
            code="CA_STAFF_IMPREST",
            group_id=grp_ca.id,
        )
        session.add(subgrp_imp)
        await session.flush()

        # Create branch
        br = Branch(id=1, code="HO", name="Head Office", is_head_office=True)
        session.add(br)
        await session.flush()

        # Create an employee
        emp = EmployeeMaster(
            id=1,
            name="Rajesh Sharma",
            employee_code="EMP-001",
            department="Operations",
            salary=Decimal("45000.00"),
            is_imprest_active=False,
            imprest_limit=Decimal("0.00"),
            is_active=True,
        )
        session.add(emp)
        await session.commit()

        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_staff_imprest_activation_and_ledger_creation(test_session: AsyncSession):
    # 1. Activate imprest for Rajesh Sharma
    updated_emp = await misc_service.activate_employee_imprest(
        test_session,
        item_id=1,
        imprest_limit=Decimal("15000.00"),
        opening_balance=Decimal("0.00"),
    )
    assert updated_emp.is_imprest_active is True
    assert updated_emp.imprest_limit == Decimal("15000.00")
    assert updated_emp.imprest_account_id is not None
    assert updated_emp.imprest_account.name == "Imprest - Rajesh Sharma"
    assert updated_emp.imprest_account.code == "EMP_IMP_0001"

    # Verify Account record in DB
    acc = await test_session.get(Account, updated_emp.imprest_account_id)
    assert acc is not None
    assert acc.name == "Imprest - Rajesh Sharma"
    assert acc.code == "EMP_IMP_0001"
    assert acc.subgroup_id == 1

    # 2. Add an advance transaction (debit) to the employee's imprest account
    v = Voucher(
        id=1,
        voucher_number="PV-2026-0001",
        voucher_type=VoucherType.PAYMENT_VOUCHER,
        voucher_date=date.today(),
        party_name="Rajesh Sharma",
        party_type="EMPLOYEE",
        account_id=acc.id,
        net_amount=Decimal("5000.00"),
        payment_status="PAID",
    )
    test_session.add(v)
    await test_session.flush()

    le = LedgerEntry(
        voucher_id=v.id,
        account_id=acc.id,
        entry_date=date.today(),
        debit_amount=Decimal("5000.00"),
        credit_amount=Decimal("0.00"),
        narration="Advance float for field operation",
    )
    test_session.add(le)
    await test_session.commit()

    # 3. Check live imprest balance in Employee Master
    employees = await misc_service.get_employees(test_session)
    assert len(employees) == 1
    e_res = employees[0]
    assert e_res.current_imprest_balance == Decimal("5000.00")
    assert e_res.imprest_balance_type == "DR"

    # 4. Check list_staff_imprest_ledgers
    ledgers = await master_ledger_service.list_staff_imprest_ledgers(test_session)
    assert len(ledgers) == 1
    l_item = ledgers[0]
    assert l_item.id == 1
    assert l_item.account_name == "Imprest - Rajesh Sharma"
    assert l_item.total_advances == Decimal("5000.00")
    assert l_item.total_expenses == Decimal("0.00")
    assert l_item.current_balance == Decimal("5000.00")
    assert l_item.balance_type == "DR"
    assert l_item.subgroup_name == "Staff Imprest & Operating Float"
    assert l_item.group_name == "Current Assets"
    assert l_item.primary_group_name == "Assets"

    # 5. Check detailed ledger statement
    detail = await master_ledger_service.get_staff_imprest_ledger_detail(test_session, employee_id=1)
    assert detail is not None
    assert detail.category == "STAFF_IMPREST"
    assert detail.closing_balance == Decimal("5000.00")
    assert detail.closing_balance_type == "DR"
    assert len(detail.transactions) == 1
    assert detail.transactions[0].debit_amount == Decimal("5000.00")

    # 6. Check summary metrics
    summary = await master_ledger_service.get_master_ledger_summary(test_session)
    assert summary.staff_imprest is not None
    assert summary.staff_imprest.total_accounts == 1
    assert summary.staff_imprest.total_outstanding == Decimal("5000.00")
    assert summary.staff_imprest.total_debit == Decimal("5000.00")
    assert summary.staff_imprest.pending_count == 1


@pytest.mark.asyncio
async def test_create_employee_with_banking_and_auto_code(test_session: AsyncSession):
    from app.modules.misc.schemas import EmployeeMasterCreate

    # Test creating employee without code (as sent by frontend form) and with banking details
    emp_payload = EmployeeMasterCreate(
        name="Vikram Verma",
        department="Operations",
        salary=Decimal("35000.00"),
        bank_name="HDFC Bank",
        bank_account_number="50100234567890",
        ifsc_code="HDFC0001234",
        pan="ABCDE1234F",
        aadhaar_number="123456789012",
        is_active=True,
    )
    created = await misc_service.create_employee(test_session, emp_payload)
    assert created.id is not None
    assert created.name == "Vikram Verma"
    assert created.employee_code.startswith("EMP-")
    assert created.bank_name == "HDFC Bank"
    assert created.bank_account_number == "50100234567890"
    assert created.ifsc_code == "HDFC0001234"
    assert created.salary == Decimal("35000.00")

