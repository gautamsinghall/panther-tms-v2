from typing import List, Optional, Dict, Any
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.tenant_db.models import (
    PrimaryGroup,
    GroupInPrimary,
    SubgroupInGroup,
    Account,
    EmployeeMaster,
    LedgerEntry,
    ChargeHead,
    TaxCategory,
)
from app.modules.misc.schemas import (
    PrimaryGroupCreate, PrimaryGroupUpdate,
    GroupInPrimaryCreate, GroupInPrimaryUpdate,
    SubgroupInGroupCreate, SubgroupInGroupUpdate,
    AccountCreate, AccountUpdate,
    EmployeeMasterCreate, EmployeeMasterUpdate,
    ChargeHeadCreate, ChargeHeadUpdate,
    TaxCategoryCreate, TaxCategoryUpdate,
)

# ------------------------------------------------------------------------------
# Primary Group Service
# ------------------------------------------------------------------------------
async def get_primary_groups(session: AsyncSession) -> List[PrimaryGroup]:
    stmt = select(PrimaryGroup).order_by(PrimaryGroup.id)
    res = await session.execute(stmt)
    return list(res.scalars().all())

async def get_primary_group_by_id(session: AsyncSession, item_id: int) -> PrimaryGroup:
    stmt = select(PrimaryGroup).where(PrimaryGroup.id == item_id)
    res = await session.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Primary Group not found")
    return item

async def create_primary_group(session: AsyncSession, data: PrimaryGroupCreate) -> PrimaryGroup:
    stmt = select(PrimaryGroup).where(PrimaryGroup.code == data.code)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Primary Group with code '{data.code}' already exists")

    item = PrimaryGroup(**data.model_dump())
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item

async def update_primary_group(session: AsyncSession, item_id: int, data: PrimaryGroupUpdate) -> PrimaryGroup:
    item = await get_primary_group_by_id(session, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await session.commit()
    await session.refresh(item)
    return item

async def delete_primary_group(session: AsyncSession, item_id: int) -> bool:
    item = await get_primary_group_by_id(session, item_id)
    await session.delete(item)
    await session.commit()
    return True


# ------------------------------------------------------------------------------
# Group in Primary Service
# ------------------------------------------------------------------------------
async def get_groups_in_primary(session: AsyncSession) -> List[GroupInPrimary]:
    stmt = select(GroupInPrimary).options(selectinload(GroupInPrimary.primary_group)).order_by(GroupInPrimary.id)
    res = await session.execute(stmt)
    return list(res.scalars().all())

async def get_group_in_primary_by_id(session: AsyncSession, item_id: int) -> GroupInPrimary:
    stmt = select(GroupInPrimary).options(selectinload(GroupInPrimary.primary_group)).where(GroupInPrimary.id == item_id)
    res = await session.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group in Primary not found")
    return item

async def create_group_in_primary(session: AsyncSession, data: GroupInPrimaryCreate) -> GroupInPrimary:
    stmt = select(GroupInPrimary).where(GroupInPrimary.code == data.code)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Group with code '{data.code}' already exists")

    item = GroupInPrimary(**data.model_dump())
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return await get_group_in_primary_by_id(session, item.id)

async def update_group_in_primary(session: AsyncSession, item_id: int, data: GroupInPrimaryUpdate) -> GroupInPrimary:
    item = await get_group_in_primary_by_id(session, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await session.commit()
    return await get_group_in_primary_by_id(session, item.id)

async def delete_group_in_primary(session: AsyncSession, item_id: int) -> bool:
    item = await get_group_in_primary_by_id(session, item_id)
    await session.delete(item)
    await session.commit()
    return True


# ------------------------------------------------------------------------------
# Subgroup in Group Service
# ------------------------------------------------------------------------------
async def get_subgroups(session: AsyncSession) -> List[SubgroupInGroup]:
    stmt = select(SubgroupInGroup).options(selectinload(SubgroupInGroup.group)).order_by(SubgroupInGroup.id)
    res = await session.execute(stmt)
    return list(res.scalars().all())

async def get_subgroup_by_id(session: AsyncSession, item_id: int) -> SubgroupInGroup:
    stmt = select(SubgroupInGroup).options(selectinload(SubgroupInGroup.group)).where(SubgroupInGroup.id == item_id)
    res = await session.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subgroup not found")
    return item

async def create_subgroup(session: AsyncSession, data: SubgroupInGroupCreate) -> SubgroupInGroup:
    stmt = select(SubgroupInGroup).where(SubgroupInGroup.code == data.code)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Subgroup with code '{data.code}' already exists")

    item = SubgroupInGroup(**data.model_dump())
    session.add(item)
    await session.commit()
    return await get_subgroup_by_id(session, item.id)

async def update_subgroup(session: AsyncSession, item_id: int, data: SubgroupInGroupUpdate) -> SubgroupInGroup:
    item = await get_subgroup_by_id(session, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await session.commit()
    return await get_subgroup_by_id(session, item.id)

async def delete_subgroup(session: AsyncSession, item_id: int) -> bool:
    item = await get_subgroup_by_id(session, item_id)
    await session.delete(item)
    await session.commit()
    return True


# ------------------------------------------------------------------------------
# Account Service
# ------------------------------------------------------------------------------
async def get_accounts(session: AsyncSession) -> List[Account]:
    stmt = (
        select(Account)
        .options(
            selectinload(Account.group),
            selectinload(Account.subgroup),
            selectinload(Account.company_bank_account),
        )
        .where(
            Account.is_active == True,
            ~Account.code.in_(["ACC_HDFC_BANK", "ACC_ICICI_BANK", "ACC_SBI_BANK", "ACC_CHEQUE_CLEARING"]),
        )
        .order_by(Account.id)
    )
    res = await session.execute(stmt)
    accounts = list(res.scalars().all())

    # For accounts under BANK group, only include real active created CompanyBankAccount records
    filtered: List[Account] = []
    for a in accounts:
        grp_code = (a.group.code if a.group else "").upper()
        if grp_code in ("BANK", "BANK_OD", "BANK_OCC"):
            if a.company_bank_account and a.company_bank_account.is_active:
                filtered.append(a)
        else:
            filtered.append(a)

    return filtered

async def get_account_by_id(session: AsyncSession, item_id: int) -> Account:
    stmt = select(Account).options(
        selectinload(Account.group),
        selectinload(Account.subgroup)
    ).where(Account.id == item_id)
    res = await session.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return item

async def create_account(session: AsyncSession, data: AccountCreate) -> Account:
    stmt = select(Account).where(Account.code == data.code)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Account with code '{data.code}' already exists")

    item = Account(**data.model_dump())
    session.add(item)
    await session.commit()
    return await get_account_by_id(session, item.id)

async def update_account(session: AsyncSession, item_id: int, data: AccountUpdate) -> Account:
    item = await get_account_by_id(session, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await session.commit()
    return await get_account_by_id(session, item.id)

async def delete_account(session: AsyncSession, item_id: int) -> bool:
    item = await get_account_by_id(session, item_id)
    await session.delete(item)
    await session.commit()
    return True


# ------------------------------------------------------------------------------
# Employee Master Service
# ------------------------------------------------------------------------------
async def ensure_employee_schema(session: AsyncSession) -> None:
    """
    Idempotent schema healing for misc_employees table.
    Ensures missing columns on misc_employees are safely created without data loss.
    """
    from sqlalchemy import text
    try:
        await session.rollback()
    except Exception:
        pass

    ddl_statements = [
        """
        CREATE TABLE IF NOT EXISTS misc_employees (
            id SERIAL PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            employee_code VARCHAR(50),
            department VARCHAR(100),
            phone VARCHAR(50),
            email VARCHAR(255),
            pan VARCHAR(10),
            aadhaar_number VARCHAR(20),
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(100),
            pincode VARCHAR(20),
            emergency_contact_name VARCHAR(100),
            emergency_contact_phone VARCHAR(50),
            blood_group VARCHAR(10),
            bank_account_number VARCHAR(50),
            bank_name VARCHAR(100),
            ifsc_code VARCHAR(20),
            date_of_joining DATE,
            salary NUMERIC(12, 2) DEFAULT 0.00,
            is_imprest_active BOOLEAN DEFAULT FALSE,
            imprest_limit NUMERIC(12, 2) DEFAULT 0.00,
            imprest_account_id INTEGER,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """,
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS department VARCHAR(100);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS phone VARCHAR(50);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS email VARCHAR(255);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS pan VARCHAR(10);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS address TEXT;",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS city VARCHAR(100);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS state VARCHAR(100);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20);",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS date_of_joining DATE;",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS salary NUMERIC(12, 2) DEFAULT 0.00;",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS is_imprest_active BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS imprest_limit NUMERIC(12, 2) DEFAULT 0.00;",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS imprest_account_id INTEGER;",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE misc_employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE misc_accounts ADD COLUMN IF NOT EXISTS employee_id INTEGER;",
        "CREATE INDEX IF NOT EXISTS ix_misc_employees_employee_code ON misc_employees (employee_code);",
        "CREATE INDEX IF NOT EXISTS ix_misc_employees_is_imprest_active ON misc_employees (is_imprest_active);",
        "CREATE INDEX IF NOT EXISTS ix_misc_accounts_employee_id ON misc_accounts (employee_id);",
    ]

    for stmt in ddl_statements:
        try:
            await session.execute(text(stmt))
            await session.commit()
        except Exception:
            try:
                await session.rollback()
            except Exception:
                pass


async def get_employees(session: AsyncSession) -> List[EmployeeMaster]:
    stmt = (
        select(EmployeeMaster)
        .options(
            selectinload(EmployeeMaster.imprest_account),
        )
        .order_by(EmployeeMaster.id)
    )
    try:
        res = await session.execute(stmt)
        items = list(res.scalars().all())
    except Exception:
        await ensure_employee_schema(session)
        res = await session.execute(stmt)
        items = list(res.scalars().all())

    # Calculate live imprest balances for employees with an active imprest account
    account_ids = [e.imprest_account_id for e in items if e.imprest_account_id]
    ledger_totals: Dict[int, Dict[str, Any]] = {}
    if account_ids:
        le_stmt = (
            select(
                LedgerEntry.account_id,
                func.sum(LedgerEntry.debit_amount).label("total_debit"),
                func.sum(LedgerEntry.credit_amount).label("total_credit"),
            )
            .where(LedgerEntry.account_id.in_(account_ids))
            .group_by(LedgerEntry.account_id)
        )
        le_res = await session.execute(le_stmt)
        for row in le_res.all():
            ledger_totals[row[0]] = {
                "total_debit": Decimal(str(row[1] or "0.00")),
                "total_credit": Decimal(str(row[2] or "0.00")),
            }

    for emp in items:
        if emp.imprest_account:
            open_bal = Decimal(str(emp.imprest_account.opening_balance or "0.00"))
            open_type = emp.imprest_account.opening_balance_type or "DR"
            stats = ledger_totals.get(emp.imprest_account.id, {})
            tot_dr = stats.get("total_debit", Decimal("0.00"))
            tot_cr = stats.get("total_credit", Decimal("0.00"))
            init_net = open_bal if open_type == "DR" else -open_bal
            net = init_net + tot_dr - tot_cr
            if net > Decimal("0.00"):
                setattr(emp, "current_imprest_balance", net)
                setattr(emp, "imprest_balance_type", "DR")
            elif net < Decimal("0.00"):
                setattr(emp, "current_imprest_balance", abs(net))
                setattr(emp, "imprest_balance_type", "CR")
            else:
                setattr(emp, "current_imprest_balance", Decimal("0.00"))
                setattr(emp, "imprest_balance_type", "NIL")
        else:
            setattr(emp, "current_imprest_balance", Decimal("0.00"))
            setattr(emp, "imprest_balance_type", "NIL")

    return items

async def get_employee_by_id(session: AsyncSession, item_id: int) -> EmployeeMaster:
    stmt = (
        select(EmployeeMaster)
        .options(
            selectinload(EmployeeMaster.imprest_account),
        )
        .where(EmployeeMaster.id == item_id)
    )
    try:
        res = await session.execute(stmt)
        item = res.scalar_one_or_none()
    except Exception:
        await ensure_employee_schema(session)
        res = await session.execute(stmt)
        item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    if item.imprest_account:
        le_stmt = (
            select(
                func.sum(LedgerEntry.debit_amount).label("total_debit"),
                func.sum(LedgerEntry.credit_amount).label("total_credit"),
            )
            .where(LedgerEntry.account_id == item.imprest_account.id)
        )
        row = (await session.execute(le_stmt)).first()
        tot_dr = Decimal(str(row[0] or "0.00")) if row else Decimal("0.00")
        tot_cr = Decimal(str(row[1] or "0.00")) if row else Decimal("0.00")
        open_bal = Decimal(str(item.imprest_account.opening_balance or "0.00"))
        open_type = item.imprest_account.opening_balance_type or "DR"
        init_net = open_bal if open_type == "DR" else -open_bal
        net = init_net + tot_dr - tot_cr
        if net > Decimal("0.00"):
            setattr(item, "current_imprest_balance", net)
            setattr(item, "imprest_balance_type", "DR")
        elif net < Decimal("0.00"):
            setattr(item, "current_imprest_balance", abs(net))
            setattr(item, "imprest_balance_type", "CR")
        else:
            setattr(item, "current_imprest_balance", Decimal("0.00"))
            setattr(item, "imprest_balance_type", "NIL")
    else:
        setattr(item, "current_imprest_balance", Decimal("0.00"))
        setattr(item, "imprest_balance_type", "NIL")

    return item

async def create_employee(session: AsyncSession, data: EmployeeMasterCreate) -> EmployeeMaster:
    await ensure_employee_schema(session)
    emp_data = data.model_dump()
    if not emp_data.get("employee_code"):
        stmt = select(func.max(EmployeeMaster.id))
        try:
            max_id = (await session.execute(stmt)).scalar() or 0
        except Exception:
            await ensure_employee_schema(session)
            max_id = (await session.execute(stmt)).scalar() or 0
        emp_code = f"EMP-{(max_id + 1):04d}"
        chk_stmt = select(EmployeeMaster.id).where(EmployeeMaster.employee_code == emp_code)
        while (await session.execute(chk_stmt)).scalar_one_or_none():
            max_id += 1
            emp_code = f"EMP-{(max_id + 1):04d}"
            chk_stmt = select(EmployeeMaster.id).where(EmployeeMaster.employee_code == emp_code)
        emp_data["employee_code"] = emp_code
    else:
        stmt = select(EmployeeMaster).where(EmployeeMaster.employee_code == emp_data["employee_code"])
        try:
            existing = (await session.execute(stmt)).scalar_one_or_none()
        except Exception:
            await ensure_employee_schema(session)
            existing = (await session.execute(stmt)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Employee code '{emp_data['employee_code']}' already exists")

    item = EmployeeMaster(**emp_data)
    session.add(item)
    try:
        await session.commit()
    except Exception:
        await session.rollback()
        await ensure_employee_schema(session)
        session.add(item)
        await session.commit()

    return await get_employee_by_id(session, item.id)

async def update_employee(session: AsyncSession, item_id: int, data: EmployeeMasterUpdate) -> EmployeeMaster:
    item = await get_employee_by_id(session, item_id)
    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("employee_code"):
        stmt = select(EmployeeMaster).where(
            EmployeeMaster.employee_code == update_data["employee_code"],
            EmployeeMaster.id != item_id,
        )
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Employee code '{update_data['employee_code']}' already exists")

    for field, value in update_data.items():
        setattr(item, field, value)

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        await ensure_employee_schema(session)
        await session.commit()

    return await get_employee_by_id(session, item.id)

async def activate_employee_imprest(
    session: AsyncSession,
    item_id: int,
    imprest_limit: Decimal = Decimal("0.00"),
    opening_balance: Decimal = Decimal("0.00"),
) -> EmployeeMaster:
    employee = await get_employee_by_id(session, item_id)

    # 1. Check or create Account for employee imprest
    account = None
    if employee.imprest_account_id:
        account = (await session.execute(select(Account).where(Account.id == employee.imprest_account_id))).scalar_one_or_none()

    if not account:
        stmt = select(Account).where(
            or_(
                Account.employee_id == employee.id,
                Account.code == f"EMP_IMP_{employee.id:04d}",
                Account.name == f"Imprest - {employee.name}",
            )
        )
        res = await session.execute(stmt)
        account = res.scalar_one_or_none()

    # Find group LOANS_ADV_ASSET or CA
    grp_stmt = select(GroupInPrimary).where(GroupInPrimary.code.in_(["LOANS_ADV_ASSET", "CA"]))
    grp = (await session.execute(grp_stmt)).scalars().first()
    if not grp:
        grp = (await session.execute(select(GroupInPrimary).where(or_(GroupInPrimary.name.ilike("%Loans & Advances%"), GroupInPrimary.code == "CA")))).scalars().first()
    group_id = grp.id if grp else 1

    # Find or create Subgroup Staff Imprest
    subgrp_stmt = select(SubgroupInGroup).where(
        or_(
            SubgroupInGroup.code == "CA_STAFF_IMPREST",
            SubgroupInGroup.name.ilike("%Staff Imprest%"),
            SubgroupInGroup.name.ilike("%Imprest%"),
        )
    )
    subgrp = (await session.execute(subgrp_stmt)).scalars().first()
    if not subgrp:
        subgrp = SubgroupInGroup(
            name="Staff Imprest & Operating Float",
            code="CA_STAFF_IMPREST",
            group_id=group_id,
        )
        session.add(subgrp)
        await session.flush()
    subgroup_id = subgrp.id if subgrp else None

    if not account:
        account = Account(
            name=f"Imprest - {employee.name}",
            code=f"EMP_IMP_{employee.id:04d}",
            group_id=group_id,
            subgroup_id=subgroup_id,
            opening_balance=opening_balance,
            opening_balance_type="DR",
            employee_id=employee.id,
            is_active=True,
        )
        session.add(account)
        await session.flush()
    else:
        account.is_active = True
        account.employee_id = employee.id
        if opening_balance > Decimal("0.00"):
            account.opening_balance = opening_balance

    employee.is_imprest_active = True
    employee.imprest_limit = imprest_limit
    employee.imprest_account_id = account.id
    employee.imprest_account = account
    await session.commit()
    return await get_employee_by_id(session, employee.id)

async def deactivate_employee_imprest(session: AsyncSession, item_id: int) -> EmployeeMaster:
    employee = await get_employee_by_id(session, item_id)
    employee.is_imprest_active = False
    await session.commit()
    return await get_employee_by_id(session, employee.id)

async def delete_employee(session: AsyncSession, item_id: int) -> bool:
    item = await get_employee_by_id(session, item_id)
    await session.delete(item)
    await session.commit()
    return True


# ------------------------------------------------------------------------------
# Charge Head Service
# ------------------------------------------------------------------------------
async def get_charge_heads(session: AsyncSession) -> List[ChargeHead]:
    stmt = select(ChargeHead).options(selectinload(ChargeHead.tax_category)).order_by(ChargeHead.id)
    res = await session.execute(stmt)
    return list(res.scalars().all())

async def get_charge_head_by_id(session: AsyncSession, item_id: int) -> ChargeHead:
    stmt = select(ChargeHead).options(selectinload(ChargeHead.tax_category)).where(ChargeHead.id == item_id)
    res = await session.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charge Head not found")
    return item

async def create_charge_head(session: AsyncSession, data: ChargeHeadCreate) -> ChargeHead:
    stmt = select(ChargeHead).where(ChargeHead.code == data.code)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Charge Head with code '{data.code}' already exists")

    item = ChargeHead(**data.model_dump())
    session.add(item)
    await session.commit()
    return await get_charge_head_by_id(session, item.id)

async def update_charge_head(session: AsyncSession, item_id: int, data: ChargeHeadUpdate) -> ChargeHead:
    item = await get_charge_head_by_id(session, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await session.commit()
    return await get_charge_head_by_id(session, item.id)

async def delete_charge_head(session: AsyncSession, item_id: int) -> bool:
    item = await get_charge_head_by_id(session, item_id)
    await session.delete(item)
    await session.commit()
    return True


# ------------------------------------------------------------------------------
# Tax Category Service
# ------------------------------------------------------------------------------
async def get_tax_categories(session: AsyncSession) -> List[TaxCategory]:
    stmt = select(TaxCategory).order_by(TaxCategory.igst_rate.asc(), TaxCategory.id.asc())
    res = await session.execute(stmt)
    items = list(res.scalars().all())
    if not items:
        standard_categories = [
            {"code": "GST_0", "name": "GST 0% (Exempt / Nil Rated)", "igst_rate": Decimal("0.00"), "cgst_rate": Decimal("0.00"), "sgst_rate": Decimal("0.00"), "is_rcm": False},
            {"code": "GST_5", "name": "GST 5%", "igst_rate": Decimal("5.00"), "cgst_rate": Decimal("2.50"), "sgst_rate": Decimal("2.50"), "is_rcm": False},
            {"code": "GST_12", "name": "GST 12%", "igst_rate": Decimal("12.00"), "cgst_rate": Decimal("6.00"), "sgst_rate": Decimal("6.00"), "is_rcm": False},
            {"code": "GST_18", "name": "GST 18%", "igst_rate": Decimal("18.00"), "cgst_rate": Decimal("9.00"), "sgst_rate": Decimal("9.00"), "is_rcm": False},
            {"code": "GST_28", "name": "GST 28%", "igst_rate": Decimal("28.00"), "cgst_rate": Decimal("14.00"), "sgst_rate": Decimal("14.00"), "is_rcm": False},
            {"code": "GTA_RCM_5", "name": "GST 5% (GTA RCM)", "igst_rate": Decimal("5.00"), "cgst_rate": Decimal("2.50"), "sgst_rate": Decimal("2.50"), "is_rcm": True},
        ]
        for cat_data in standard_categories:
            session.add(TaxCategory(**cat_data))
        await session.commit()
        res = await session.execute(select(TaxCategory).order_by(TaxCategory.igst_rate.asc(), TaxCategory.id.asc()))
        items = list(res.scalars().all())
    else:
        existing_rates = {Decimal(str(c.igst_rate)) for c in items}
        existing_codes = {c.code for c in items}
        added = False
        needed = [
            {"code": "GST_0", "name": "GST 0% (Exempt / Nil Rated)", "igst_rate": Decimal("0.00"), "cgst_rate": Decimal("0.00"), "sgst_rate": Decimal("0.00"), "is_rcm": False},
            {"code": "GST_5", "name": "GST 5%", "igst_rate": Decimal("5.00"), "cgst_rate": Decimal("2.50"), "sgst_rate": Decimal("2.50"), "is_rcm": False},
            {"code": "GST_18", "name": "GST 18%", "igst_rate": Decimal("18.00"), "cgst_rate": Decimal("9.00"), "sgst_rate": Decimal("9.00"), "is_rcm": False},
        ]
        for n in needed:
            if n["igst_rate"] not in existing_rates and n["code"] not in existing_codes and not (n["code"] == "GST_0" and "EXEMPT" in existing_codes):
                session.add(TaxCategory(**n))
                added = True
        if added:
            await session.commit()
            res = await session.execute(select(TaxCategory).order_by(TaxCategory.igst_rate.asc(), TaxCategory.id.asc()))
            items = list(res.scalars().all())
    return items

async def get_tax_category_by_id(session: AsyncSession, item_id: int) -> TaxCategory:
    stmt = select(TaxCategory).where(TaxCategory.id == item_id)
    res = await session.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tax Category not found")
    return item

async def create_tax_category(session: AsyncSession, data: TaxCategoryCreate) -> TaxCategory:
    stmt = select(TaxCategory).where(TaxCategory.code == data.code)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tax Category with code '{data.code}' already exists")

    item = TaxCategory(**data.model_dump())
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item

async def update_tax_category(session: AsyncSession, item_id: int, data: TaxCategoryUpdate) -> TaxCategory:
    item = await get_tax_category_by_id(session, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await session.commit()
    await session.refresh(item)
    return item

async def delete_tax_category(session: AsyncSession, item_id: int) -> bool:
    item = await get_tax_category_by_id(session, item_id)
    await session.delete(item)
    await session.commit()
    return True
