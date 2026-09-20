import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple, Dict
from sqlalchemy import select, func, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppException
import app.tenant_db.models as models
from app.modules.fleet.schemas import (
    TripExpenseCreate,
    TripExpenseUpdate,
    TripAdvanceCreate,
    TripAdvanceSettle,
    VehicleDocumentCreate,
    VehicleDocumentUpdate,
    VehicleHealthUpdate,
    TyreCreate,
    TyreUpdate,
    RepairServiceCreate,
    RepairServiceUpdate,
    TruckPnLResponse,
    TruckPnLSummary,
    TruckPnLVehicleItem,
    TruckPnLTripDrilldownItem,
    TripExpenseRegisterResponse,
    TripExpenseRegisterItem,
    TripExpenseCategorySubtotal,
)

# ==============================================================================
# Helper for Unique Identifiers
# ==============================================================================

async def _generate_expense_number(session: AsyncSession) -> str:
    today = date.today()
    prefix = f"EXP-{today.year}-"
    stmt = select(func.count(models.TripExpense.id))
    res = await session.execute(stmt)
    count = res.scalar() or 0
    return f"{prefix}{count + 1:04d}"


async def _generate_advance_number(session: AsyncSession) -> str:
    today = date.today()
    prefix = f"ADV-{today.year}-"
    stmt = select(func.count(models.TripAdvance.id))
    res = await session.execute(stmt)
    count = res.scalar() or 0
    return f"{prefix}{count + 1:04d}"


async def _generate_job_card_number(session: AsyncSession) -> str:
    today = date.today()
    prefix = f"JC-{today.year}-"
    stmt = select(func.count(models.RepairServiceRecord.id))
    res = await session.execute(stmt)
    count = res.scalar() or 0
    return f"{prefix}{count + 1:04d}"


# ==============================================================================
# 1. Trip Expense Service
# ==============================================================================

async def create_trip_expense(session: AsyncSession, data: TripExpenseCreate) -> models.TripExpense:
    exp_no = data.expense_number or await _generate_expense_number(session)
    
    # Check uniqueness
    chk_stmt = select(models.TripExpense).where(models.TripExpense.expense_number == exp_no)
    chk_res = await session.execute(chk_stmt)
    if chk_res.scalar_one_or_none():
        exp_no = f"{exp_no}-{uuid.uuid4().hex[:4].upper()}"

    expense = models.TripExpense(
        expense_number=exp_no,
        lr_id=data.lr_id,
        job_id=data.job_id,
        vehicle_number=data.vehicle_number.strip().upper(),
        driver_id=data.driver_id,
        driver_name=data.driver_name,
        expense_category=data.expense_category.strip().upper(),
        amount=data.amount,
        payment_mode=data.payment_mode.strip().upper(),
        expense_date=data.expense_date,
        receipt_number=data.receipt_number,
        odometer_km=data.odometer_km,
        fuel_liters=data.fuel_liters,
        plaza_name=data.plaza_name,
        status=data.status.strip().upper(),
        remarks=data.remarks,
    )
    session.add(expense)

    # If odometer is reported, update vehicle health odometer if greater
    if data.odometer_km:
        vh_stmt = select(models.VehicleHealthRecord).where(
            models.VehicleHealthRecord.vehicle_number == data.vehicle_number.strip().upper()
        )
        vh_res = await session.execute(vh_stmt)
        vh = vh_res.scalar_one_or_none()
        if vh and data.odometer_km > vh.odometer_km:
            vh.odometer_km = data.odometer_km

    await session.commit()
    await session.refresh(expense)
    return expense


async def list_trip_expenses(
    session: AsyncSession,
    lr_id: Optional[int] = None,
    vehicle_number: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    paid_by: Optional[str] = None,
    is_fastag: Optional[bool] = None,
    is_pending: Optional[bool] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> List[models.TripExpense]:
    stmt = select(models.TripExpense).order_by(desc(models.TripExpense.expense_date), desc(models.TripExpense.id))
    
    if lr_id:
        stmt = stmt.where(models.TripExpense.lr_id == lr_id)
    if vehicle_number:
        stmt = stmt.where(models.TripExpense.vehicle_number == vehicle_number.strip().upper())
    if category:
        stmt = stmt.where(models.TripExpense.expense_category == category.strip().upper())
    if status:
        stmt = stmt.where(models.TripExpense.status == status.strip().upper())
    if paid_by:
        stmt = stmt.where(models.TripExpense.payment_mode == paid_by.strip().upper())
    if is_fastag:
        stmt = stmt.where(or_(models.TripExpense.payment_mode == "FASTAG", models.TripExpense.expense_category == "TOLL"))
    if is_pending:
        stmt = stmt.where(models.TripExpense.status == "PENDING")
    if from_date:
        stmt = stmt.where(models.TripExpense.expense_date >= from_date)
    if to_date:
        stmt = stmt.where(models.TripExpense.expense_date <= to_date)

    res = await session.execute(stmt)
    return res.scalars().all()


async def get_trip_expense(session: AsyncSession, expense_id: int) -> models.TripExpense:
    stmt = select(models.TripExpense).where(models.TripExpense.id == expense_id)
    res = await session.execute(stmt)
    exp = res.scalar_one_or_none()
    if not exp:
        raise AppException(status_code=404, error_code="NOT_FOUND", message=f"Trip expense #{expense_id} not found.")
    return exp


async def update_trip_expense(session: AsyncSession, expense_id: int, data: TripExpenseUpdate) -> models.TripExpense:
    exp = await get_trip_expense(session, expense_id)
    for field, val in data.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(exp, field, val)
    await session.commit()
    await session.refresh(exp)
    return exp


async def delete_trip_expense(session: AsyncSession, expense_id: int) -> None:
    exp = await get_trip_expense(session, expense_id)
    await session.delete(exp)
    await session.commit()


# ==============================================================================
# 2. Trip Advance Service
# ==============================================================================

async def create_trip_advance(session: AsyncSession, data: TripAdvanceCreate) -> models.TripAdvance:
    adv_no = data.advance_number or await _generate_advance_number(session)
    
    advance = models.TripAdvance(
        advance_number=adv_no,
        lr_id=data.lr_id,
        vehicle_number=data.vehicle_number.strip().upper(),
        driver_id=data.driver_id,
        driver_name=data.driver_name,
        advance_amount=data.advance_amount,
        settled_amount=Decimal("0.00"),
        balance_due=data.advance_amount,
        payment_mode=data.payment_mode.strip().upper(),
        advance_date=data.advance_date,
        status="OPEN",
        remarks=data.remarks,
    )
    session.add(advance)
    await session.commit()
    await session.refresh(advance)
    return advance


async def list_trip_advances(
    session: AsyncSession,
    vehicle_number: Optional[str] = None,
    driver_id: Optional[int] = None,
    status: Optional[str] = None,
) -> List[models.TripAdvance]:
    stmt = select(models.TripAdvance).order_by(desc(models.TripAdvance.advance_date), desc(models.TripAdvance.id))
    if vehicle_number:
        stmt = stmt.where(models.TripAdvance.vehicle_number == vehicle_number.strip().upper())
    if driver_id:
        stmt = stmt.where(models.TripAdvance.driver_id == driver_id)
    if status:
        stmt = stmt.where(models.TripAdvance.status == status.strip().upper())
    
    res = await session.execute(stmt)
    return res.scalars().all()


async def settle_trip_advance(session: AsyncSession, advance_id: int, data: TripAdvanceSettle) -> models.TripAdvance:
    stmt = select(models.TripAdvance).where(models.TripAdvance.id == advance_id)
    res = await session.execute(stmt)
    adv = res.scalar_one_or_none()
    if not adv:
        raise AppException(status_code=404, error_code="NOT_FOUND", message=f"Trip advance #{advance_id} not found.")

    new_settled = adv.settled_amount + data.settled_amount
    if new_settled > adv.advance_amount:
        new_settled = adv.advance_amount

    adv.settled_amount = new_settled
    adv.balance_due = max(Decimal("0.00"), adv.advance_amount - new_settled)
    adv.settlement_date = data.settlement_date or date.today()

    if adv.balance_due <= Decimal("0.00"):
        adv.status = "SETTLED"
    else:
        adv.status = "PARTIALLY_SETTLED"

    if data.remarks:
        adv.remarks = f"{adv.remarks or ''}\n[Settlement]: {data.remarks}".strip()

    await session.commit()
    await session.refresh(adv)
    return adv


# ==============================================================================
# 3. Vehicle Documents & Compliance Service
# ==============================================================================

async def create_document(session: AsyncSession, data: VehicleDocumentCreate) -> models.VehicleDocument:
    doc = models.VehicleDocument(
        vehicle_number=data.vehicle_number.strip().upper(),
        vehicle_type=data.vehicle_type.strip().upper(),
        doc_type=data.doc_type.strip().upper(),
        document_number=data.document_number.strip(),
        issuing_authority=data.issuing_authority,
        valid_from=data.valid_from,
        valid_till=data.valid_till,
        file_url=data.file_url,
        status=data.status.strip().upper(),
        remarks=data.remarks,
    )
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return doc


async def list_documents(
    session: AsyncSession,
    vehicle_number: Optional[str] = None,
    doc_type: Optional[str] = None,
    status: Optional[str] = None,
) -> List[models.VehicleDocument]:
    stmt = select(models.VehicleDocument).order_by(models.VehicleDocument.valid_till.asc())
    if vehicle_number:
        stmt = stmt.where(models.VehicleDocument.vehicle_number == vehicle_number.strip().upper())
    if doc_type:
        stmt = stmt.where(models.VehicleDocument.doc_type == doc_type.strip().upper())
    if status:
        stmt = stmt.where(models.VehicleDocument.status == status.strip().upper())

    res = await session.execute(stmt)
    return res.scalars().all()


async def update_document(session: AsyncSession, doc_id: int, data: VehicleDocumentUpdate) -> models.VehicleDocument:
    stmt = select(models.VehicleDocument).where(models.VehicleDocument.id == doc_id)
    res = await session.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise AppException(status_code=404, error_code="NOT_FOUND", message=f"Vehicle document #{doc_id} not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(doc, field, val)

    await session.commit()
    await session.refresh(doc)
    return doc


async def delete_document(session: AsyncSession, doc_id: int) -> None:
    stmt = select(models.VehicleDocument).where(models.VehicleDocument.id == doc_id)
    res = await session.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise AppException(status_code=404, error_code="NOT_FOUND", message=f"Vehicle document #{doc_id} not found.")
    await session.delete(doc)
    await session.commit()


# ==============================================================================
# 4. Vehicle Health & Current Status Service
# ==============================================================================

async def get_vehicle_health(session: AsyncSession, vehicle_number: str) -> models.VehicleHealthRecord:
    v_clean = vehicle_number.strip().upper()
    stmt = select(models.VehicleHealthRecord).where(models.VehicleHealthRecord.vehicle_number == v_clean)
    res = await session.execute(stmt)
    vh = res.scalar_one_or_none()
    if not vh:
        # Create an initial health record if not found
        vh = models.VehicleHealthRecord(
            vehicle_number=v_clean,
            odometer_km=0,
            engine_health="GOOD",
            battery_status="HEALTHY",
            status="ROADWORTHY",
            current_status="AVAILABLE",
            last_inspected_at=datetime.now(timezone.utc),
        )
        session.add(vh)
        await session.commit()
        await session.refresh(vh)
    return vh


async def update_vehicle_health(
    session: AsyncSession,
    vehicle_number: str,
    data: VehicleHealthUpdate
) -> models.VehicleHealthRecord:
    vh = await get_vehicle_health(session, vehicle_number)
    for field, val in data.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(vh, field, val)
    vh.last_inspected_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(vh)
    return vh


async def list_all_vehicle_health(session: AsyncSession) -> List[models.VehicleHealthRecord]:
    stmt = select(models.VehicleHealthRecord).order_by(models.VehicleHealthRecord.vehicle_number.asc())
    res = await session.execute(stmt)
    return res.scalars().all()


async def get_all_vehicle_current_status(session: AsyncSession) -> List[dict]:
    # Query all company vehicles and market vehicles
    cv_stmt = select(models.CompanyVehicle).where(models.CompanyVehicle.is_active == True)
    cv_res = await session.execute(cv_stmt)
    company_vehicles = cv_res.scalars().all()

    mv_stmt = select(models.MarketVehicle).where(models.MarketVehicle.is_active == True)
    mv_res = await session.execute(mv_stmt)
    market_vehicles = mv_res.scalars().all()

    # Query health records map
    h_stmt = select(models.VehicleHealthRecord)
    h_res = await session.execute(h_stmt)
    health_map = {h.vehicle_number: h for h in h_res.scalars().all()}

    # Query recent active LRs map
    lr_stmt = select(models.LR).where(models.LR.status.in_(["BOOKED", "DISPATCHED", "IN_TRANSIT"]))
    lr_res = await session.execute(lr_stmt)
    active_lrs = lr_res.scalars().all()
    active_lr_map = {l.vehicle_number: l for l in active_lrs}

    result = []
    # 1. Company vehicles
    for cv in company_vehicles:
        v_num = cv.vehicle_number
        h = health_map.get(v_num)
        active_lr = active_lr_map.get(v_num)
        cur_stat = h.current_status if h else ("IN_TRANSIT" if active_lr else "AVAILABLE")
        health_stat = h.status if h else "ROADWORTHY"
        odo = h.odometer_km if h else cv.current_odometer_km
        loc = h.current_location if h else ("En route" if active_lr else "Depot Hub")

        result.append({
            "vehicle_number": v_num,
            "vehicle_type": "COMPANY",
            "model": cv.vehicle_type,
            "current_status": cur_stat,
            "health_status": health_stat,
            "odometer_km": odo,
            "current_location": loc,
            "active_driver_name": active_lr.driver_name if active_lr else None,
            "active_lr_number": active_lr.lr_number if active_lr else None,
        })

    # 2. Market vehicles
    for mv in market_vehicles:
        v_num = mv.vehicle_number
        h = health_map.get(v_num)
        active_lr = active_lr_map.get(v_num)
        cur_stat = h.current_status if h else ("IN_TRANSIT" if active_lr else "AVAILABLE")
        health_stat = h.status if h else "ROADWORTHY"
        odo = h.odometer_km if h else 0
        loc = h.current_location if h else ("En route" if active_lr else "Market Available")

        result.append({
            "vehicle_number": v_num,
            "vehicle_type": "MARKET",
            "model": mv.vehicle_type,
            "current_status": cur_stat,
            "health_status": health_stat,
            "odometer_km": odo,
            "current_location": loc,
            "active_driver_name": active_lr.driver_name if active_lr else None,
            "active_lr_number": active_lr.lr_number if active_lr else None,
        })

    return result


# ==============================================================================
# 5. Tyre Management Service
# ==============================================================================

async def create_tyre(session: AsyncSession, data: TyreCreate) -> models.TyreRecord:
    tyre = models.TyreRecord(
        serial_number=data.serial_number.strip().upper(),
        brand=data.brand.strip(),
        size=data.size.strip(),
        vehicle_number=data.vehicle_number.strip().upper() if data.vehicle_number else None,
        axle_position=data.axle_position,
        initial_tread_depth_mm=data.initial_tread_depth_mm,
        current_tread_depth_mm=data.current_tread_depth_mm,
        installed_date=data.installed_date,
        installed_odometer_km=data.installed_odometer_km,
        total_km_run=data.total_km_run,
        purchase_cost=data.purchase_cost,
        status=data.status.strip().upper(),
        remarks=data.remarks,
    )
    session.add(tyre)
    await session.commit()
    await session.refresh(tyre)
    return tyre


async def list_tyres(
    session: AsyncSession,
    vehicle_number: Optional[str] = None,
    status: Optional[str] = None,
) -> List[models.TyreRecord]:
    stmt = select(models.TyreRecord).order_by(models.TyreRecord.serial_number.asc())
    if vehicle_number:
        stmt = stmt.where(models.TyreRecord.vehicle_number == vehicle_number.strip().upper())
    if status:
        stmt = stmt.where(models.TyreRecord.status == status.strip().upper())
    res = await session.execute(stmt)
    return res.scalars().all()


async def update_tyre(session: AsyncSession, tyre_id: int, data: TyreUpdate) -> models.TyreRecord:
    stmt = select(models.TyreRecord).where(models.TyreRecord.id == tyre_id)
    res = await session.execute(stmt)
    tyre = res.scalar_one_or_none()
    if not tyre:
        raise AppException(status_code=404, error_code="NOT_FOUND", message=f"Tyre #{tyre_id} not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        if val is not None:
            if field == "vehicle_number" and val:
                val = val.strip().upper()
            setattr(tyre, field, val)

    await session.commit()
    await session.refresh(tyre)
    return tyre


async def delete_tyre(session: AsyncSession, tyre_id: int) -> None:
    stmt = select(models.TyreRecord).where(models.TyreRecord.id == tyre_id)
    res = await session.execute(stmt)
    tyre = res.scalar_one_or_none()
    if not tyre:
        raise AppException(status_code=404, error_code="NOT_FOUND", message=f"Tyre #{tyre_id} not found.")
    await session.delete(tyre)
    await session.commit()


# ==============================================================================
# 6. Workshop Repair & Service Service
# ==============================================================================

async def create_service(session: AsyncSession, data: RepairServiceCreate) -> models.RepairServiceRecord:
    jc_no = data.job_card_number or await _generate_job_card_number(session)
    tot = data.total_cost if data.total_cost > 0 else (data.parts_cost + data.labor_cost)

    srv = models.RepairServiceRecord(
        job_card_number=jc_no,
        vehicle_number=data.vehicle_number.strip().upper(),
        service_type=data.service_type.strip().upper(),
        workshop_name=data.workshop_name.strip(),
        service_date=data.service_date,
        completion_date=data.completion_date,
        odometer_km=data.odometer_km,
        description_of_work=data.description_of_work,
        parts_cost=data.parts_cost,
        labor_cost=data.labor_cost,
        total_cost=tot,
        invoice_number=data.invoice_number,
        status=data.status.strip().upper(),
        remarks=data.remarks,
    )
    session.add(srv)

    # Update vehicle health last service info
    vh_stmt = select(models.VehicleHealthRecord).where(
        models.VehicleHealthRecord.vehicle_number == data.vehicle_number.strip().upper()
    )
    vh_res = await session.execute(vh_stmt)
    vh = vh_res.scalar_one_or_none()
    if vh:
        vh.last_service_date = data.service_date
        if data.odometer_km > 0:
            vh.last_service_km = data.odometer_km
            vh.next_service_km = data.odometer_km + 15000

    await session.commit()
    await session.refresh(srv)
    return srv


async def list_services(
    session: AsyncSession,
    vehicle_number: Optional[str] = None,
    service_type: Optional[str] = None,
    status: Optional[str] = None,
) -> List[models.RepairServiceRecord]:
    stmt = select(models.RepairServiceRecord).order_by(desc(models.RepairServiceRecord.service_date))
    if vehicle_number:
        stmt = stmt.where(models.RepairServiceRecord.vehicle_number == vehicle_number.strip().upper())
    if service_type:
        stmt = stmt.where(models.RepairServiceRecord.service_type == service_type.strip().upper())
    if status:
        stmt = stmt.where(models.RepairServiceRecord.status == status.strip().upper())
    res = await session.execute(stmt)
    return res.scalars().all()


async def update_service(session: AsyncSession, service_id: int, data: RepairServiceUpdate) -> models.RepairServiceRecord:
    stmt = select(models.RepairServiceRecord).where(models.RepairServiceRecord.id == service_id)
    res = await session.execute(stmt)
    srv = res.scalar_one_or_none()
    if not srv:
        raise AppException(status_code=404, error_code="NOT_FOUND", message=f"Repair service #{service_id} not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(srv, field, val)

    if srv.total_cost == Decimal("0.00") and (srv.parts_cost > 0 or srv.labor_cost > 0):
        srv.total_cost = srv.parts_cost + srv.labor_cost

    await session.commit()
    await session.refresh(srv)
    return srv


# ==============================================================================
# 7. Derived Reporting Views (PRD §7.10, Architecture §9)
# ==============================================================================

async def get_truck_pnl(
    session: AsyncSession,
    vehicle_number: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> TruckPnLResponse:
    """
    DERIVED REPORTING VIEW:
    Truck-Wise Profit & Loss calculated dynamically across:
    - Transport Invoices (or LR freight revenue)
    - Trip Expenses (Diesel, Toll, Driver Allowance, Misc)
    - Workshop Repair & Services
    - Hire Challans (for Market Vehicles)
    Per architecture.md §9, this is strictly derived, never a source table.
    """
    v_filter = vehicle_number.strip().upper() if vehicle_number else None

    # 1. Fetch vehicles (Company + Market)
    cv_stmt = select(models.CompanyVehicle).where(models.CompanyVehicle.is_active == True)
    if v_filter:
        cv_stmt = cv_stmt.where(models.CompanyVehicle.vehicle_number == v_filter)
    cv_res = await session.execute(cv_stmt)
    company_vehicles = cv_res.scalars().all()

    mv_stmt = select(models.MarketVehicle).where(models.MarketVehicle.is_active == True)
    if v_filter:
        mv_stmt = mv_stmt.where(models.MarketVehicle.vehicle_number == v_filter)
    mv_res = await session.execute(mv_stmt)
    market_vehicles = mv_res.scalars().all()

    all_v_numbers = [v.vehicle_number for v in company_vehicles] + [v.vehicle_number for v in market_vehicles]
    if v_filter and v_filter not in all_v_numbers:
        all_v_numbers.append(v_filter)

    # 2. Fetch all LRs for these vehicles
    lr_stmt = (
        select(models.LR)
        .options(
            selectinload(models.LR.origin_location),
            selectinload(models.LR.destination_location),
        )
        .where(models.LR.vehicle_number.in_(all_v_numbers))
    )
    if from_date:
        lr_stmt = lr_stmt.where(models.LR.lr_date >= from_date)
    if to_date:
        lr_stmt = lr_stmt.where(models.LR.lr_date <= to_date)
    lr_stmt = lr_stmt.order_by(models.LR.lr_date.desc())
    lr_res = await session.execute(lr_stmt)
    lrs = lr_res.scalars().all()

    lr_ids = [l.id for l in lrs]

    # 3. Transport Invoices for these LRs
    vouchers_map: Dict[int, List[models.Voucher]] = {}
    if lr_ids:
        v_stmt = select(models.Voucher).where(
            models.Voucher.lr_id.in_(lr_ids),
            models.Voucher.voucher_type == models.VoucherType.TRANSPORT_INVOICE.value,
            models.Voucher.is_void == False,
        )
        v_res = await session.execute(v_stmt)
        for v in v_res.scalars().all():
            vouchers_map.setdefault(v.lr_id, []).append(v)

    # 4. Trip Expenses for these vehicles / LRs
    exp_stmt = select(models.TripExpense).where(
        or_(
            models.TripExpense.vehicle_number.in_(all_v_numbers),
            models.TripExpense.lr_id.in_(lr_ids) if lr_ids else False
        )
    )
    if from_date:
        exp_stmt = exp_stmt.where(models.TripExpense.expense_date >= from_date)
    if to_date:
        exp_stmt = exp_stmt.where(models.TripExpense.expense_date <= to_date)
    exp_res = await session.execute(exp_stmt)
    all_expenses = exp_res.scalars().all()

    # 5. Workshop Repairs for these vehicles
    srv_stmt = select(models.RepairServiceRecord).where(models.RepairServiceRecord.vehicle_number.in_(all_v_numbers))
    if from_date:
        srv_stmt = srv_stmt.where(models.RepairServiceRecord.service_date >= from_date)
    if to_date:
        srv_stmt = srv_stmt.where(models.RepairServiceRecord.service_date <= to_date)
    srv_res = await session.execute(srv_stmt)
    all_repairs = srv_res.scalars().all()

    # 6. Hire Challans for market vehicles
    hc_stmt = select(models.HireChallan).where(models.HireChallan.vehicle_number.in_(all_v_numbers))
    if from_date:
        hc_stmt = hc_stmt.where(models.HireChallan.challan_date >= from_date)
    if to_date:
        hc_stmt = hc_stmt.where(models.HireChallan.challan_date <= to_date)
    hc_res = await session.execute(hc_stmt)
    all_hire_challans = hc_res.scalars().all()

    # Index expenses by vehicle and by LR
    v_expenses: Dict[str, List[models.TripExpense]] = {}
    lr_expenses: Dict[int, List[models.TripExpense]] = {}
    for exp in all_expenses:
        v_expenses.setdefault(exp.vehicle_number, []).append(exp)
        if exp.lr_id:
            lr_expenses.setdefault(exp.lr_id, []).append(exp)

    # Index repairs by vehicle
    v_repairs: Dict[str, List[models.RepairServiceRecord]] = {}
    for rep in all_repairs:
        v_repairs.setdefault(rep.vehicle_number, []).append(rep)

    # Index hire challans by vehicle & LR
    v_hcs: Dict[str, List[models.HireChallan]] = {}
    lr_hcs: Dict[int, List[models.HireChallan]] = {}
    for hc in all_hire_challans:
        v_hcs.setdefault(hc.vehicle_number, []).append(hc)
        if hc.lr_id:
            lr_hcs.setdefault(hc.lr_id, []).append(hc)

    # Build Vehicle Items
    vehicle_items: List[TruckPnLVehicleItem] = []
    total_fleet_rev = Decimal("0.00")
    total_fleet_cost = Decimal("0.00")
    total_fleet_trips = 0

    all_v_metadata: Dict[str, Tuple[str, str]] = {}
    for cv in company_vehicles:
        all_v_metadata[cv.vehicle_number] = ("COMPANY", cv.vehicle_type)
    for mv in market_vehicles:
        all_v_metadata[mv.vehicle_number] = ("MARKET", mv.vehicle_type)

    for v_num in all_v_numbers:
        v_type, v_model = all_v_metadata.get(v_num, ("UNKNOWN", "Commercial Freight Vehicle"))
        v_lrs = [l for l in lrs if l.vehicle_number == v_num]

        # Trips drilldown
        trip_items: List[TruckPnLTripDrilldownItem] = []
        v_rev = Decimal("0.00")
        v_fuel = Decimal("0.00")
        v_toll = Decimal("0.00")
        v_driver = Decimal("0.00")
        v_maint_direct = Decimal("0.00")
        v_other = Decimal("0.00")
        v_hire = Decimal("0.00")

        for lr in v_lrs:
            # Revenue from Transport Invoice or LR Freight
            lr_vouchers = vouchers_map.get(lr.id, [])
            rev = sum(Decimal(str(v.total_amount or "0.00")) for v in lr_vouchers)
            if rev == Decimal("0.00") and lr.total_freight_amount:
                rev = Decimal(str(lr.total_freight_amount))
            elif rev == Decimal("0.00") and lr.freight_amount:
                rev = Decimal(str(lr.freight_amount))

            # Trip expenses specifically linked to this LR
            lr_exp_list = lr_expenses.get(lr.id, [])
            fuel = sum(e.amount for e in lr_exp_list if e.expense_category == "DIESEL")
            toll = sum(e.amount for e in lr_exp_list if e.expense_category in ("TOLL", "FASTAG"))
            driver = sum(e.amount for e in lr_exp_list if e.expense_category == "DRIVER_ALLOWANCE")
            maint = sum(e.amount for e in lr_exp_list if e.expense_category == "MAINTENANCE")
            other = sum(e.amount for e in lr_exp_list if e.expense_category not in ("DIESEL", "TOLL", "FASTAG", "DRIVER_ALLOWANCE", "MAINTENANCE"))

            # Hire challan for market vehicle
            hcs = lr_hcs.get(lr.id, [])
            hire = sum(Decimal(str(h.hire_rate or "0.00")) for h in hcs)

            trip_exp_tot = fuel + toll + driver + maint + other + hire
            trip_margin = rev - trip_exp_tot
            trip_margin_pct = (trip_margin / rev * Decimal("100.00")).quantize(Decimal("0.01")) if rev > 0 else Decimal("0.00")

            v_rev += rev
            v_fuel += fuel
            v_toll += toll
            v_driver += driver
            v_maint_direct += maint
            v_other += other
            v_hire += hire

            trip_items.append(
                TruckPnLTripDrilldownItem(
                    lr_id=lr.id,
                    lr_number=lr.lr_number,
                    lr_date=lr.lr_date,
                    origin_city=lr.origin_location.city_name if lr.origin_location else "Origin",
                    destination_city=lr.destination_location.city_name if lr.destination_location else "Destination",
                    freight_revenue=rev,
                    diesel_cost=fuel,
                    toll_cost=toll,
                    driver_cost=driver,
                    maintenance_cost=maint,
                    other_cost=other,
                    hire_challan_cost=hire,
                    total_expense=trip_exp_tot,
                    net_margin=trip_margin,
                    margin_pct=trip_margin_pct,
                )
            )

        # Add unlinked vehicle expenses (expenses without LR_ID)
        unlinked_expenses = [e for e in v_expenses.get(v_num, []) if not e.lr_id]
        v_fuel += sum(e.amount for e in unlinked_expenses if e.expense_category == "DIESEL")
        v_toll += sum(e.amount for e in unlinked_expenses if e.expense_category in ("TOLL", "FASTAG"))
        v_driver += sum(e.amount for e in unlinked_expenses if e.expense_category == "DRIVER_ALLOWANCE")
        v_maint_direct += sum(e.amount for e in unlinked_expenses if e.expense_category == "MAINTENANCE")
        v_other += sum(e.amount for e in unlinked_expenses if e.expense_category not in ("DIESEL", "TOLL", "FASTAG", "DRIVER_ALLOWANCE", "MAINTENANCE"))

        # Add workshop repairs for this vehicle
        workshop_repairs_total = sum(r.total_cost for r in v_repairs.get(v_num, []))
        total_maintenance = v_maint_direct + workshop_repairs_total

        # Add unlinked hire challans
        unlinked_hcs = [h for h in v_hcs.get(v_num, []) if not h.lr_id]
        v_hire += sum(Decimal(str(h.hire_rate or "0.00")) for h in unlinked_hcs)

        total_op_cost = v_fuel + v_toll + total_maintenance + v_driver + v_hire + v_other
        net_prof = v_rev - total_op_cost
        margin_pct = (net_prof / v_rev * Decimal("100.00")).quantize(Decimal("0.01")) if v_rev > 0 else Decimal("0.00")

        total_fleet_rev += v_rev
        total_fleet_cost += total_op_cost
        total_fleet_trips += len(v_lrs)

        vehicle_items.append(
            TruckPnLVehicleItem(
                vehicle_number=v_num,
                vehicle_type=v_type,
                model=v_model,
                total_trips=len(v_lrs),
                total_revenue=v_rev,
                fuel_cost=v_fuel,
                toll_cost=v_toll,
                maintenance_cost=total_maintenance,
                driver_cost=v_driver,
                hire_cost=v_hire,
                other_cost=v_other,
                total_operating_cost=total_op_cost,
                net_profit=net_prof,
                profit_margin_pct=margin_pct,
                trips=trip_items,
            )
        )

    fleet_net_profit = total_fleet_rev - total_fleet_cost
    avg_margin = (
        (fleet_net_profit / total_fleet_rev * Decimal("100.00")).quantize(Decimal("0.01"))
        if total_fleet_rev > 0
        else Decimal("0.00")
    )

    summary = TruckPnLSummary(
        total_vehicles=len(vehicle_items),
        total_trips=total_fleet_trips,
        total_revenue=total_fleet_rev,
        total_operating_costs=total_fleet_cost,
        total_net_profit=fleet_net_profit,
        avg_profit_margin_pct=avg_margin,
    )

    return TruckPnLResponse(
        summary=summary,
        vehicles=vehicle_items,
    )


async def get_trip_expense_register(
    session: AsyncSession,
    vehicle_number: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    paid_by: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> TripExpenseRegisterResponse:
    """
    DERIVED REPORTING VIEW:
    Comprehensive Trip Expense Register with category subtotals and individual audit records.
    """
    expenses = await list_trip_expenses(
        session=session,
        vehicle_number=vehicle_number,
        category=category,
        status=status,
        paid_by=paid_by,
        from_date=from_date,
        to_date=to_date,
    )

    # Fetch LR map for trip number
    lr_ids = [e.lr_id for e in expenses if e.lr_id]
    lr_map = {}
    if lr_ids:
        lr_stmt = select(models.LR).where(models.LR.id.in_(lr_ids))
        lr_res = await session.execute(lr_stmt)
        for l in lr_res.scalars().all():
            lr_map[l.id] = l.lr_number

    # Category subtotals
    cat_totals: Dict[str, Decimal] = {}
    cat_counts: Dict[str, int] = {}
    total_amt = Decimal("0.00")
    fuel_tot = Decimal("0.00")
    toll_tot = Decimal("0.00")
    maint_tot = Decimal("0.00")
    driver_tot = Decimal("0.00")
    other_tot = Decimal("0.00")

    items: List[TripExpenseRegisterItem] = []
    for e in expenses:
        cat = e.expense_category.upper()
        cat_totals[cat] = cat_totals.get(cat, Decimal("0.00")) + e.amount
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
        total_amt += e.amount

        if cat == "DIESEL":
            fuel_tot += e.amount
        elif cat in ("TOLL", "FASTAG"):
            toll_tot += e.amount
        elif cat == "MAINTENANCE":
            maint_tot += e.amount
        elif cat == "DRIVER_ALLOWANCE":
            driver_tot += e.amount
        else:
            other_tot += e.amount

        items.append(
            TripExpenseRegisterItem(
                id=e.id,
                expense_number=e.expense_number,
                expense_date=e.expense_date,
                vehicle_number=e.vehicle_number,
                vehicle_type="COMPANY",  # Default or derived
                trip_no=lr_map.get(e.lr_id),
                driver_name=e.driver_name,
                expense_category=e.expense_category,
                amount=e.amount,
                payment_mode=e.payment_mode,
                receipt_number=e.receipt_number,
                odometer_km=e.odometer_km,
                fuel_liters=e.fuel_liters,
                plaza_name=e.plaza_name,
                status=e.status,
                remarks=e.remarks,
            )
        )

    subtotals = [
        TripExpenseCategorySubtotal(category=c, total_amount=amt, voucher_count=cat_counts[c])
        for c, amt in sorted(cat_totals.items())
    ]

    return TripExpenseRegisterResponse(
        total_records=len(items),
        total_amount=total_amt,
        fuel_total=fuel_tot,
        toll_total=toll_tot,
        maintenance_total=maint_tot,
        driver_allowance_total=driver_tot,
        other_total=other_tot,
        category_subtotals=subtotals,
        items=items,
    )
