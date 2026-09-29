import pytest
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, or_, and_

from app.core.errors import ForbiddenException, AppException
from app.tenant_db.models import (
    TenantBase,
    User,
    Branch,
    UserOfficeAssignment,
    Consigner,
    Consignee,
    Location,
    LR,
    Job,
    HireChallan,
    Voucher,
    SeriesMaster,
)
from app.auth.service import get_user_office_context
from app.auth.schemas import OfficeSummary
from app.modules.settings.series_service import (
    allocate_or_validate_voucher_number,
    check_series_status,
)


@pytest.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with async_session() as session:
        # Seed 3 distinct issuing offices
        delhi = Branch(
            id=1,
            code="DEL",
            name="Delhi Regional Office",
            city="New Delhi",
            state="Delhi",
            address="A-45, Okhla Industrial Area, Phase II",
            pincode="110020",
            phone="+91-11-26384910",
            email="delhi@panthertms.com",
            gstin="07AAAAA0000A1Z5",
            pan="AAAAA0000A",
            bank_name="HDFC Bank",
            bank_account_no="50200012345678",
            bank_ifsc="HDFC0000123",
            bank_branch="Okhla Phase II",
            document_notes="Subject to Delhi Jurisdiction only",
            is_head_office=True,
            is_active=True,
        )
        mumbai = Branch(
            id=2,
            code="BOM",
            name="Mumbai Hub Office",
            city="Navi Mumbai",
            state="Maharashtra",
            address="Plot 18, MIDC Industrial Area, Turbhe",
            pincode="400705",
            phone="+91-22-27891234",
            email="mumbai@panthertms.com",
            gstin="27AAAAA0000A1Z1",
            pan="AAAAA0000A",
            bank_name="ICICI Bank",
            bank_account_no="001105001234",
            bank_ifsc="ICIC0000011",
            bank_branch="Vashi Turbhe",
            document_notes="Subject to Mumbai Jurisdiction only",
            is_head_office=False,
            is_active=True,
        )
        haryana = Branch(
            id=3,
            code="HAR",
            name="Haryana Central Depot",
            city="Gurugram",
            state="Haryana",
            address="Sector 37, Pace City II",
            pincode="122001",
            phone="+91-124-4567890",
            email="haryana@panthertms.com",
            gstin="06AAAAA0000A1Z7",
            pan="AAAAA0000A",
            bank_name="Axis Bank",
            bank_account_no="912010012345678",
            bank_ifsc="UTIB0000912",
            bank_branch="Gurugram Pace City",
            document_notes="Subject to Gurugram Jurisdiction only",
            is_head_office=False,
            is_active=True,
        )
        session.add_all([delhi, mumbai, haryana])

        # Seed Common Master Data for Consignments
        consigner = Consigner(id=1, name="Acme Manufacturing Ltd", city="Delhi", is_active=True)
        consignee = Consignee(id=1, name="Global Distributors Inc", city="Mumbai", is_active=True)
        loc_del = Location(id=1, city_name="Delhi", state="Delhi", is_active=True)
        loc_bom = Location(id=2, city_name="Mumbai", state="Maharashtra", is_active=True)
        session.add_all([consigner, consignee, loc_del, loc_bom])

        await session.commit()
        yield session

    await engine.dispose()


# ---------------------------------------------------------------------------
# 1. User Office Assignment & Context Resolution
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_user_office_assignment_and_payload(async_db: AsyncSession):
    session = async_db

    # 1. Company Admin User
    admin = User(
        id=1,
        email="admin@company.com",
        password_hash="hash",
        full_name="Rajesh Admin",
        role="COMPANY_ADMIN",
        is_active=True,
    )
    session.add(admin)

    # 2. Employee Akash - Assigned ONLY to Delhi (Office 1)
    akash = User(
        id=2,
        email="akash@company.com",
        password_hash="hash",
        full_name="Akash Delhi",
        role="EMPLOYEE",
        is_active=True,
    )
    session.add(akash)
    session.add(UserOfficeAssignment(user_id=2, office_id=1, is_default=True))

    # 3. Employee Priya - Assigned to Mumbai (Office 2) and Haryana (Office 3)
    priya = User(
        id=3,
        email="priya@company.com",
        password_hash="hash",
        full_name="Priya Multi",
        role="EMPLOYEE",
        is_active=True,
    )
    session.add(priya)
    session.add(UserOfficeAssignment(user_id=3, office_id=2, is_default=True))
    session.add(UserOfficeAssignment(user_id=3, office_id=3, is_default=False))

    await session.commit()

    # Test Admin Context: Universal access across all offices
    admin_offices, admin_active = await get_user_office_context(session, admin)
    assert len(admin_offices) == 3
    assert {o.code for o in admin_offices} == {"DEL", "BOM", "HAR"}
    assert admin_active is not None
    assert admin_active.is_head_office is True
    assert admin_active.code == "DEL"

    # Test Akash Context: Only Delhi
    akash_offices, akash_active = await get_user_office_context(session, akash)
    assert len(akash_offices) == 1
    assert akash_offices[0].code == "DEL"
    assert akash_offices[0].id == 1
    assert akash_active is not None
    assert akash_active.id == 1

    # Test Priya Context: Mumbai and Haryana
    priya_offices, priya_active = await get_user_office_context(session, priya)
    assert len(priya_offices) == 2
    assert {o.code for o in priya_offices} == {"BOM", "HAR"}
    assert priya_active is not None
    assert priya_active.id == 2  # Default office is Mumbai


# ---------------------------------------------------------------------------
# 2. API Tampering & Security Enforcement
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_api_tampering_and_cross_office_forbidden(async_db: AsyncSession):
    session = async_db

    akash = User(
        id=20,
        email="akash_sec@company.com",
        password_hash="hash",
        full_name="Akash Security",
        role="EMPLOYEE",
        is_active=True,
    )
    session.add(akash)
    session.add(UserOfficeAssignment(user_id=20, office_id=1, is_default=True))
    await session.commit()

    # Helper simulating the exact get_current_office dependency logic
    async def resolve_office(user: User, requested_office_id: int | None):
        if user.role == "COMPANY_ADMIN":
            if requested_office_id:
                branch = (await session.execute(select(Branch).where(Branch.id == requested_office_id))).scalar_one_or_none()
                if not branch:
                    raise AppException(status_code=404, error_code="OFFICE_NOT_FOUND", message="Office not found")
                return branch
            # Default to HO
            return (await session.execute(select(Branch).where(Branch.is_head_office == True))).scalar_one_or_none()

        # Employee: verify assigned offices
        assignments = (await session.execute(
            select(UserOfficeAssignment).where(UserOfficeAssignment.user_id == user.id)
        )).scalars().all()
        assigned_ids = {a.office_id for a in assignments}

        if requested_office_id is not None:
            if requested_office_id not in assigned_ids:
                raise ForbiddenException(f"Access to issuing office ID {requested_office_id} is forbidden for this user.")
            branch = (await session.execute(select(Branch).where(Branch.id == requested_office_id))).scalar_one_or_none()
            return branch

        # Fallback to default or first assigned
        default_assignment = next((a for a in assignments if a.is_default), None)
        target_id = default_assignment.office_id if default_assignment else (next(iter(assigned_ids)) if assigned_ids else None)
        if target_id:
            return (await session.execute(select(Branch).where(Branch.id == target_id))).scalar_one_or_none()
        raise ForbiddenException("User has no authorized issuing office assigned.")

    # 1. Akash legitimately requests his assigned office (Office 1 - Delhi)
    office = await resolve_office(akash, requested_office_id=1)
    assert office is not None
    assert office.code == "DEL"

    # 2. Tampering Attack: Akash maliciously tries to inject X-Office-ID = 2 (Mumbai)
    with pytest.raises(ForbiddenException) as exc_info:
        await resolve_office(akash, requested_office_id=2)
    assert "forbidden" in exc_info.value.message.lower()
    assert exc_info.value.status_code == 403

    # 3. Tampering Attack: Akash maliciously tries to inject X-Office-ID = 3 (Haryana)
    with pytest.raises(ForbiddenException) as exc_info:
        await resolve_office(akash, requested_office_id=3)
    assert exc_info.value.status_code == 403

    # 4. Tampering Attack: Akash injects arbitrary ID (999)
    with pytest.raises(ForbiddenException) as exc_info:
        await resolve_office(akash, requested_office_id=999)
    assert exc_info.value.status_code == 403

    # 5. Company Admin legitimate cross-office access (universal access)
    admin = User(id=21, email="admin_sec@company.com", password_hash="h", full_name="Admin Sec", role="COMPANY_ADMIN")
    session.add(admin)
    await session.commit()

    admin_delhi = await resolve_office(admin, requested_office_id=1)
    assert admin_delhi.code == "DEL"
    admin_mumbai = await resolve_office(admin, requested_office_id=2)
    assert admin_mumbai.code == "BOM"
    admin_haryana = await resolve_office(admin, requested_office_id=3)
    assert admin_haryana.code == "HAR"


# ---------------------------------------------------------------------------
# 3. Office Switching for Multi-Office Users
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_office_switching_multi_office(async_db: AsyncSession):
    session = async_db

    # User Priya is assigned to Mumbai (2) and Haryana (3)
    priya = User(
        id=30,
        email="priya_switch@company.com",
        password_hash="hash",
        full_name="Priya Switch",
        role="EMPLOYEE",
        is_active=True,
    )
    session.add(priya)
    session.add(UserOfficeAssignment(user_id=30, office_id=2, is_default=True))
    session.add(UserOfficeAssignment(user_id=30, office_id=3, is_default=False))
    await session.commit()

    # Active office with no override -> Mumbai (ID 2)
    _, active_default = await get_user_office_context(session, priya)
    assert active_default.id == 2
    assert active_default.code == "BOM"

    # Switching to Haryana (ID 3) -> Allowed because 3 is in assigned offices
    haryana_branch = (await session.execute(
        select(Branch).join(UserOfficeAssignment, UserOfficeAssignment.office_id == Branch.id)
        .where(UserOfficeAssignment.user_id == priya.id, Branch.id == 3)
    )).scalar_one_or_none()
    assert haryana_branch is not None
    assert haryana_branch.code == "HAR"

    # Switching to Delhi (ID 1) -> Blocked because Priya is not assigned to Delhi
    delhi_for_priya = (await session.execute(
        select(Branch).join(UserOfficeAssignment, UserOfficeAssignment.office_id == Branch.id)
        .where(UserOfficeAssignment.user_id == priya.id, Branch.id == 1)
    )).scalar_one_or_none()
    assert delhi_for_priya is None


# ---------------------------------------------------------------------------
# 4. LR Creation & Minimal FK Scoping
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_lr_creation_office_scoping(async_db: AsyncSession):
    session = async_db

    # Create Delhi LR
    lr_delhi = LR(
        lr_number="LR-DEL-001",
        lr_date=date.today(),
        consigner_id=1,
        consignee_id=1,
        origin_location_id=1,
        destination_location_id=2,
        vehicle_source="MARKET",
        vehicle_number="DL01AB1234",
        package_count=50,
        chargeable_weight_mt=Decimal("12.500"),
        total_freight_amount=Decimal("45000.00"),
        balance_amount=Decimal("45000.00"),
        status="BOOKED",
        issuing_office_id=1,  # Delhi office FK reference only
    )
    # Create Mumbai LR
    lr_mumbai = LR(
        lr_number="LR-BOM-001",
        lr_date=date.today(),
        consigner_id=1,
        consignee_id=1,
        origin_location_id=2,
        destination_location_id=1,
        vehicle_source="MARKET",
        vehicle_number="MH04XY5678",
        package_count=80,
        chargeable_weight_mt=Decimal("20.000"),
        total_freight_amount=Decimal("72000.00"),
        balance_amount=Decimal("72000.00"),
        status="BOOKED",
        issuing_office_id=2,  # Mumbai office FK reference only
    )
    session.add_all([lr_delhi, lr_mumbai])
    await session.commit()

    # Verify that transport_lrs minimal schema has ONLY issuing_office_id FK
    # and does NOT duplicate branch address/GSTIN columns
    lr_table_columns = {col.name for col in LR.__table__.columns}
    assert "issuing_office_id" in lr_table_columns
    assert "office_gstin" not in lr_table_columns
    assert "office_address" not in lr_table_columns
    assert "office_bank_details" not in lr_table_columns


# ---------------------------------------------------------------------------
# 5. Cross-Office Data Isolation (Query Scoping)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_cross_office_data_isolation(async_db: AsyncSession):
    session = async_db

    # Create Delhi LR
    lr_delhi = LR(
        lr_number="LR-DEL-101",
        lr_date=date.today(),
        consigner_id=1,
        consignee_id=1,
        origin_location_id=1,
        destination_location_id=2,
        vehicle_source="MARKET",
        vehicle_number="DL01AB1111",
        package_count=50,
        chargeable_weight_mt=Decimal("10.000"),
        total_freight_amount=Decimal("30000.00"),
        balance_amount=Decimal("30000.00"),
        status="BOOKED",
        issuing_office_id=1,
    )
    # Create Mumbai LR
    lr_mumbai = LR(
        lr_number="LR-BOM-101",
        lr_date=date.today(),
        consigner_id=1,
        consignee_id=1,
        origin_location_id=2,
        destination_location_id=1,
        vehicle_source="MARKET",
        vehicle_number="MH04XY2222",
        package_count=60,
        chargeable_weight_mt=Decimal("15.000"),
        total_freight_amount=Decimal("45000.00"),
        balance_amount=Decimal("45000.00"),
        status="BOOKED",
        issuing_office_id=2,
    )
    session.add_all([lr_delhi, lr_mumbai])
    await session.commit()

    # Query for Delhi (Office 1)
    delhi_stmt = select(LR).where(or_(LR.issuing_office_id == 1, LR.issuing_office_id.is_(None)))
    delhi_lrs = (await session.execute(delhi_stmt)).scalars().all()
    delhi_numbers = [l.lr_number for l in delhi_lrs]

    assert "LR-DEL-101" in delhi_numbers
    assert "LR-BOM-101" not in delhi_numbers  # Strict cross-office isolation

    # Query for Mumbai (Office 2)
    bom_stmt = select(LR).where(or_(LR.issuing_office_id == 2, LR.issuing_office_id.is_(None)))
    bom_lrs = (await session.execute(bom_stmt)).scalars().all()
    bom_numbers = [l.lr_number for l in bom_lrs]

    assert "LR-BOM-101" in bom_numbers
    assert "LR-DEL-101" not in bom_numbers  # Strict cross-office isolation


# ---------------------------------------------------------------------------
# 6. Legacy Data Coexistence (Zero Data Loss)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_legacy_data_coexistence(async_db: AsyncSession):
    session = async_db

    # Create unassigned legacy LR record (issuing_office_id IS NULL)
    legacy_lr = LR(
        lr_number="LR-LEGACY-999",
        lr_date=date.today(),
        consigner_id=1,
        consignee_id=1,
        origin_location_id=1,
        destination_location_id=2,
        vehicle_source="MARKET",
        vehicle_number="DL01ZZ0000",
        package_count=10,
        chargeable_weight_mt=Decimal("5.000"),
        total_freight_amount=Decimal("15000.00"),
        balance_amount=Decimal("15000.00"),
        status="DELIVERED",
        issuing_office_id=None,  # Pre-migration unassigned legacy record
    )
    session.add(legacy_lr)
    await session.commit()

    # Query with active office Delhi: legacy records co-exist and remain visible
    delhi_stmt = select(LR).where(or_(LR.issuing_office_id == 1, LR.issuing_office_id.is_(None)))
    delhi_lrs = (await session.execute(delhi_stmt)).scalars().all()
    delhi_numbers = [l.lr_number for l in delhi_lrs]

    assert "LR-LEGACY-999" in delhi_numbers, "Legacy record without office ID must remain accessible"

    # Query with active office Mumbai: legacy record also co-exists
    bom_stmt = select(LR).where(or_(LR.issuing_office_id == 2, LR.issuing_office_id.is_(None)))
    bom_lrs = (await session.execute(bom_stmt)).scalars().all()
    bom_numbers = [l.lr_number for l in bom_lrs]

    assert "LR-LEGACY-999" in bom_numbers


# ---------------------------------------------------------------------------
# 7. Office-Specific Numbering Series Allocation
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_office_specific_numbering_series(async_db: AsyncSession):
    session = async_db

    # 1. Configure office-specific series for Delhi (office_id=1)
    delhi_series = SeriesMaster(
        document_type="LR",
        series_name="Delhi Office Series",
        prefix="LR-DEL-26-",
        suffix="",
        starting_number=1,
        end_number=5000,
        current_number=0,
        financial_year="2026-2027",
        series_mode="MANUAL",
        is_default=True,
        is_active=True,
        issuing_office_id=1,
    )
    # 2. Configure office-specific series for Mumbai (office_id=2)
    mumbai_series = SeriesMaster(
        document_type="LR",
        series_name="Mumbai Hub Series",
        prefix="LR-BOM-26-",
        suffix="",
        starting_number=1,
        end_number=5000,
        current_number=0,
        financial_year="2026-2027",
        series_mode="MANUAL",
        is_default=True,
        is_active=True,
        issuing_office_id=2,
    )
    # 3. Configure company-wide fallback series (issuing_office_id IS NULL)
    company_series = SeriesMaster(
        document_type="LR",
        series_name="Corporate Global Series",
        prefix="LR-PAN-26-",
        suffix="",
        starting_number=1,
        end_number=5000,
        current_number=0,
        financial_year="2026-2027",
        series_mode="MANUAL",
        is_default=True,
        is_active=True,
        issuing_office_id=None,
    )
    session.add_all([delhi_series, mumbai_series, company_series])
    await session.commit()

    # Allocate LR for Delhi Office (1)
    delhi_allocated = await allocate_or_validate_voucher_number(
        db=session,
        document_type="LR",
        issuing_office_id=1,
    )
    assert delhi_allocated == "LR-DEL-26-0001"

    # Allocate LR for Mumbai Office (2)
    mumbai_allocated = await allocate_or_validate_voucher_number(
        db=session,
        document_type="LR",
        issuing_office_id=2,
    )
    assert mumbai_allocated == "LR-BOM-26-0001"

    # Allocate LR for Haryana Office (3) -> Has no office-specific series, falls back to corporate series
    haryana_allocated = await allocate_or_validate_voucher_number(
        db=session,
        document_type="LR",
        issuing_office_id=3,
    )
    assert haryana_allocated == "LR-PAN-26-0001"


# ---------------------------------------------------------------------------
# 8. Accounting & Financial Vouchers Office Scoping
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_accounting_voucher_office_scoping(async_db: AsyncSession):
    session = async_db

    # Create Delhi Voucher
    v_delhi = Voucher(
        voucher_number="PV-DEL-001",
        voucher_type="PAYMENT_VOUCHER",
        voucher_date=date.today(),
        total_amount=Decimal("15000.00"),
        net_amount=Decimal("15000.00"),
        issuing_office_id=1,
    )
    # Create Mumbai Voucher
    v_mumbai = Voucher(
        voucher_number="PV-BOM-001",
        voucher_type="PAYMENT_VOUCHER",
        voucher_date=date.today(),
        total_amount=Decimal("25000.00"),
        net_amount=Decimal("25000.00"),
        issuing_office_id=2,
    )
    session.add_all([v_delhi, v_mumbai])
    await session.commit()

    # Check Delhi Vouchers
    delhi_stmt = select(Voucher).where(or_(Voucher.issuing_office_id == 1, Voucher.issuing_office_id.is_(None)))
    delhi_vs = (await session.execute(delhi_stmt)).scalars().all()
    delhi_v_numbers = [v.voucher_number for v in delhi_vs]

    assert "PV-DEL-001" in delhi_v_numbers
    assert "PV-BOM-001" not in delhi_v_numbers

    # Check Mumbai Vouchers
    bom_stmt = select(Voucher).where(or_(Voucher.issuing_office_id == 2, Voucher.issuing_office_id.is_(None)))
    bom_vs = (await session.execute(bom_stmt)).scalars().all()
    bom_v_numbers = [v.voucher_number for v in bom_vs]

    assert "PV-BOM-001" in bom_v_numbers
    assert "PV-DEL-001" not in bom_v_numbers


# ---------------------------------------------------------------------------
# 9. LR Print & Master Data Dynamic Resolution
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_lr_print_master_data_resolution(async_db: AsyncSession):
    session = async_db

    lr_delhi = LR(
        lr_number="LR-PRINT-DEL-001",
        lr_date=date.today(),
        consigner_id=1,
        consignee_id=1,
        origin_location_id=1,
        destination_location_id=2,
        vehicle_source="COMPANY",
        vehicle_number="DL01AA9999",
        package_count=100,
        chargeable_weight_mt=Decimal("25.000"),
        total_freight_amount=Decimal("85000.00"),
        balance_amount=Decimal("85000.00"),
        status="BOOKED",
        issuing_office_id=1,
    )
    session.add(lr_delhi)
    await session.commit()

    # Fetch Delhi LR with relationship
    stmt = select(LR).where(LR.lr_number == "LR-PRINT-DEL-001")
    lr = (await session.execute(stmt)).scalar_one_or_none()
    assert lr is not None
    assert lr.issuing_office_id == 1

    # Fetch branch master data via issuing_office_id
    branch = (await session.execute(select(Branch).where(Branch.id == lr.issuing_office_id))).scalar_one_or_none()
    assert branch is not None

    # Verify all printable fields exist dynamically on branch master
    assert branch.code == "DEL"
    assert branch.name == "Delhi Regional Office"
    assert branch.gstin == "07AAAAA0000A1Z5"
    assert branch.pan == "AAAAA0000A"
    assert branch.city == "New Delhi"
    assert branch.state == "Delhi"
    assert branch.bank_name == "HDFC Bank"
    assert branch.bank_account_no == "50200012345678"
    assert branch.bank_ifsc == "HDFC0000123"
    assert branch.document_notes == "Subject to Delhi Jurisdiction only"


# ---------------------------------------------------------------------------
# 10. Audit: NULL Legacy-Data Visibility & Auto-Fallback
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_null_legacy_data_visibility_audit(async_db: AsyncSession):
    session = async_db
    from app.modules.transport.service import get_all_lrs, get_all_jobs, create_lr
    from app.modules.transport.schemas import LRCreate

    # 1. Insert unassigned legacy records (issuing_office_id = None)
    legacy_lr = LR(
        lr_number="LR-LEGACY-001",
        lr_date=date.today(),
        consigner_id=1,
        consignee_id=1,
        origin_location_id=1,
        destination_location_id=2,
        vehicle_source="COMPANY",
        vehicle_number="DL01AA1111",
        package_count=50,
        chargeable_weight_mt=Decimal("10.000"),
        total_freight_amount=Decimal("30000.00"),
        balance_amount=Decimal("30000.00"),
        status="BOOKED",
        issuing_office_id=None,  # Pre-migration legacy record
    )
    legacy_job = Job(
        job_number="JOB-LEGACY-001",
        job_date=date.today(),
        billing_client_id=1,
        consigner_id=1,
        consignee_id=1,
        origin_location_id=1,
        destination_location_id=2,
        status="OPEN",
        issuing_office_id=None,
    )
    session.add_all([legacy_lr, legacy_job])
    await session.commit()

    # 2. Regional Branch (Mumbai, id=2, is_head_office=False):
    # include_unassigned MUST be False. Legacy NULL records MUST NOT be visible!
    mumbai_lrs = await get_all_lrs(session, office_id=2, include_unassigned=False)
    mumbai_lr_numbers = [lr.lr_number for lr in mumbai_lrs]
    assert "LR-LEGACY-001" not in mumbai_lr_numbers

    mumbai_jobs = await get_all_jobs(session, office_id=2, include_unassigned=False)
    mumbai_job_numbers = [j.job_number for j in mumbai_jobs]
    assert "JOB-LEGACY-001" not in mumbai_job_numbers

    # 3. Head Office (Delhi, id=1, is_head_office=True):
    # include_unassigned MUST be True. Legacy NULL records MUST be visible!
    hq_lrs = await get_all_lrs(session, office_id=1, include_unassigned=True)
    hq_lr_numbers = [lr.lr_number for lr in hq_lrs]
    assert "LR-LEGACY-001" in hq_lr_numbers

    hq_jobs = await get_all_jobs(session, office_id=1, include_unassigned=True)
    hq_job_numbers = [j.job_number for j in hq_jobs]
    assert "JOB-LEGACY-001" in hq_job_numbers

    # Seed series for LR creation
    lr_series = SeriesMaster(
        document_type="LR",
        series_name="Default LR Series",
        prefix="LR-",
        starting_number=1,
        end_number=9999,
        current_number=0,
        financial_year="2026-2027",
        series_mode="MANUAL",
        is_default=True,
        is_active=True,
        issuing_office_id=1,
    )
    session.add(lr_series)
    await session.commit()

    # 4. Creating a new LR with no explicit office_id:
    # Must NEVER produce NULL issuing_office_id. Must resolve to active Head Office (id=1).
    new_lr_data = LRCreate(
        lr_number="LR-AUTO-HQ-001",
        lr_date=date.today(),
        consigner_id=1,
        consignee_id=1,
        origin_location_id=1,
        destination_location_id=2,
        vehicle_source="COMPANY",
        vehicle_number="DL01AA2222",
        package_count=20,
        chargeable_weight_mt=Decimal("5.000"),
        freight_rate=Decimal("1000.00"),
        freight_amount=Decimal("5000.00"),
        issuing_office_id=None,
    )
    created_lr = await create_lr(session, new_lr_data, user_id=1, office_id=None)
    assert created_lr.issuing_office_id is not None
    assert created_lr.issuing_office_id == 1  # Automatically defaulted to HQ


# ---------------------------------------------------------------------------
# 11. Audit: Real API Authorization & Query-Param Tampering
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_real_api_authorization_tampering_audit(async_db: AsyncSession):
    session = async_db
    from app.auth.dependencies import get_current_office
    from starlette.requests import Request

    def build_mock_request(headers=None, query_params=None):
        scope = {
            "type": "http",
            "headers": [(k.lower().encode("latin-1"), v.encode("latin-1")) for k, v in (headers or {}).items()],
            "query_string": "&".join(f"{k}={v}" for k, v in (query_params or {}).items()).encode("latin-1"),
        }
        req = Request(scope)
        req.state.office = None
        req.state.office_id = None
        return req

    # Create an employee user assigned ONLY to Mumbai (id=2)
    emp_user = User(
        id=10,
        email="audit_emp@panthertms.com",
        password_hash="fakehash",
        full_name="Audit Employee",
        role="EMPLOYEE",
        is_active=True,
    )
    assignment = UserOfficeAssignment(user_id=10, office_id=2, is_default=True)
    emp_user.office_assignments = [assignment]

    # Populate assignment.office relationship
    mumbai_office = (await session.execute(select(Branch).where(Branch.id == 2))).scalar_one()
    assignment.office = mumbai_office

    # TAMPER 1: Employee sends authorized header X-Office-ID: 2, but queries unauthorized ?office_id=1 (Delhi)
    tamper_req1 = build_mock_request(
        headers={"X-Office-ID": "2"},
        query_params={"office_id": "1"},
    )
    with pytest.raises(ForbiddenException) as exc_info:
        await get_current_office(request=tamper_req1, user=emp_user, db=session)
    assert "forbidden" in str(exc_info.value.message).lower()

    # TAMPER 2: Employee attempts to request consolidated view ?office_id=all
    tamper_req2 = build_mock_request(query_params={"office_id": "all"})
    with pytest.raises(ForbiddenException) as exc_info:
        await get_current_office(request=tamper_req2, user=emp_user, db=session)
    assert "consolidated" in str(exc_info.value.message).lower()

    # TAMPER 3: Employee queries non-existent office ID ?office_id=9999
    tamper_req3 = build_mock_request(query_params={"office_id": "9999"})
    with pytest.raises(ForbiddenException):
        await get_current_office(request=tamper_req3, user=emp_user, db=session)

    # LEGITIMATE: Employee requests their authorized office (id=2)
    legit_req = build_mock_request(headers={"X-Office-ID": "2"})
    resolved_office = await get_current_office(request=legit_req, user=emp_user, db=session)
    assert resolved_office is not None
    assert resolved_office.id == 2

    # COMPANY ADMIN: Authorized for office switching and consolidated access
    admin_user = User(
        id=99,
        email="audit_admin@panthertms.com",
        password_hash="fakehash",
        full_name="Audit Admin",
        role="COMPANY_ADMIN",
        is_active=True,
    )
    # Admin requests consolidated
    admin_all_req = build_mock_request(query_params={"office_id": "all"})
    admin_all_res = await get_current_office(request=admin_all_req, user=admin_user, db=session)
    assert admin_all_res is None  # None signifies consolidated access

    # Admin requests invalid office -> 404
    admin_bad_req = build_mock_request(query_params={"office_id": "9999"})
    with pytest.raises(AppException) as exc_404:
        await get_current_office(request=admin_bad_req, user=admin_user, db=session)
    assert exc_404.value.status_code == 404


# ---------------------------------------------------------------------------
# 12. Audit: Office-Scoped Transport Reports and Accounts
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_office_scoped_transport_reports_and_accounts(async_db: AsyncSession):
    session = async_db
    from app.modules.transport_reports.service import (
        get_lr_booking_register,
        get_hire_challan_register,
        get_unbilled_lrs,
    )
    from app.modules.accounts.service import get_vouchers

    # Create distinct LRs and HCs for Office 1 (Delhi) and Office 2 (Mumbai)
    lr_delhi = LR(
        lr_number="LR-REP-DEL-001",
        lr_date=date.today(),
        consigner_id=1,
        consignee_id=1,
        origin_location_id=1,
        destination_location_id=2,
        vehicle_source="COMPANY",
        vehicle_number="DL01AA3333",
        package_count=10,
        chargeable_weight_mt=Decimal("2.000"),
        total_freight_amount=Decimal("12000.00"),
        balance_amount=Decimal("12000.00"),
        status="DELIVERED",
        issuing_office_id=1,
    )
    lr_mumbai = LR(
        lr_number="LR-REP-BOM-001",
        lr_date=date.today(),
        consigner_id=1,
        consignee_id=1,
        origin_location_id=1,
        destination_location_id=2,
        vehicle_source="COMPANY",
        vehicle_number="MH04BB4444",
        package_count=20,
        chargeable_weight_mt=Decimal("4.000"),
        total_freight_amount=Decimal("24000.00"),
        balance_amount=Decimal("24000.00"),
        status="DELIVERED",
        issuing_office_id=2,
    )
    hc_delhi = HireChallan(
        challan_number="HC-REP-DEL-001",
        challan_date=date.today(),
        vehicle_number="DL01AA3333",
        hire_rate=Decimal("10000.00"),
        net_payable_amount=Decimal("10000.00"),
        balance_amount=Decimal("10000.00"),
        status="ISSUED",
        issuing_office_id=1,
    )
    hc_mumbai = HireChallan(
        challan_number="HC-REP-BOM-001",
        challan_date=date.today(),
        vehicle_number="MH04BB4444",
        hire_rate=Decimal("20000.00"),
        net_payable_amount=Decimal("20000.00"),
        balance_amount=Decimal("20000.00"),
        status="ISSUED",
        issuing_office_id=2,
    )
    v_delhi = Voucher(
        voucher_number="PV-DEL-REP-001",
        voucher_type="PAYMENT_VOUCHER",
        voucher_date=date.today(),
        total_amount=Decimal("15000.00"),
        net_amount=Decimal("15000.00"),
        issuing_office_id=1,
    )
    v_mumbai = Voucher(
        voucher_number="PV-BOM-REP-001",
        voucher_type="PAYMENT_VOUCHER",
        voucher_date=date.today(),
        total_amount=Decimal("25000.00"),
        net_amount=Decimal("25000.00"),
        issuing_office_id=2,
    )
    session.add_all([lr_delhi, lr_mumbai, hc_delhi, hc_mumbai, v_delhi, v_mumbai])
    await session.commit()

    # 1. LR Register filtered for Mumbai (office_id=2)
    bom_lr_rep = await get_lr_booking_register(session, office_id=2, include_unassigned=False)
    bom_rep_numbers = [r.lr_number for r in bom_lr_rep]
    assert "LR-REP-BOM-001" in bom_rep_numbers
    assert "LR-REP-DEL-001" not in bom_rep_numbers

    # 2. HC Register filtered for Mumbai (office_id=2)
    bom_hc_rep = await get_hire_challan_register(session, office_id=2, include_unassigned=False)
    bom_hc_numbers = [r.challan_number for r in bom_hc_rep]
    assert "HC-REP-BOM-001" in bom_hc_numbers
    assert "HC-REP-DEL-001" not in bom_hc_numbers

    # 3. Unbilled LRs Report filtered for Mumbai (office_id=2)
    bom_unbilled = await get_unbilled_lrs(session, office_id=2, include_unassigned=False)
    bom_unbilled_numbers = [r.lr_number for r in bom_unbilled]
    assert "LR-REP-BOM-001" in bom_unbilled_numbers
    assert "LR-REP-DEL-001" not in bom_unbilled_numbers

    # 4. Accounts Vouchers filtered for Mumbai (office_id=2)
    bom_vouchers = await get_vouchers(session, office_id=2, include_unassigned=False)
    bom_v_numbers = [v.voucher_number for v in bom_vouchers]
    assert "PV-BOM-REP-001" in bom_v_numbers
    assert "PV-DEL-REP-001" not in bom_v_numbers

