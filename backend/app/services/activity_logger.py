import contextvars
from datetime import datetime, timezone, date, time, timedelta
from typing import Optional, List, Dict, Any, Union, Tuple
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request

from app.core.errors import ForbiddenException, AppException
from app.tenant_db.models import User, Branch, UserActivity, UserOfficeAssignment

# Context variables to automatically carry request context across async calls
current_request_ip: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_request_ip", default=None)
current_request_user: contextvars.ContextVar[Optional[Any]] = contextvars.ContextVar("current_request_user", default=None)
current_request_office_id: contextvars.ContextVar[Optional[int]] = contextvars.ContextVar("current_request_office_id", default=None)


def extract_client_ip(request: Optional[Request]) -> Optional[str]:
    """Safely extracts client IP address accounting for proxies/load balancers."""
    if not request:
        return current_request_ip.get()
    
    # Check standard proxy headers
    x_forwarded = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
    if x_forwarded:
        parts = [p.strip() for p in x_forwarded.split(",") if p.strip()]
        if parts:
            return parts[0]
            
    x_real_ip = request.headers.get("x-real-ip") or request.headers.get("X-Real-IP")
    if x_real_ip:
        return x_real_ip.strip()

    if request.client and request.client.host:
        return request.client.host

    return current_request_ip.get()


def build_readable_details(
    action: str,
    entity_type: Optional[str],
    entity_identifier: Optional[str],
    details_json: Optional[Dict[str, Any]]
) -> str:
    """Builds a polished human-readable activity description from structured details."""
    if not details_json:
        ident_str = f" {entity_identifier}" if entity_identifier else ""
        type_str = f" {entity_type}" if entity_type else ""
        return f"{action.replace('_', ' ').title()}{type_str}{ident_str}"

    parts = []
    
    # Check for specific entity types
    ent_lower = (entity_type or "").lower()
    
    if ent_lower == "lr" or "lr" in action.lower():
        lr_no = entity_identifier or details_json.get("lr_number") or ""
        cons = details_json.get("consigner_name") or details_json.get("consigner")
        dest = details_json.get("consignee_name") or details_json.get("consignee")
        veh = details_json.get("vehicle_number")
        amt = details_json.get("total_freight_amount") or details_json.get("freight_amount")
        route_from = details_json.get("origin") or details_json.get("from_city")
        route_to = details_json.get("destination") or details_json.get("to_city")

        base = f"LR {lr_no}" if lr_no else "LR"
        extra = []
        if route_from and route_to:
            extra.append(f"{route_from} -> {route_to}")
        if cons:
            extra.append(f"Consigner: {cons}")
        if dest:
            extra.append(f"Consignee: {dest}")
        if veh:
            extra.append(f"Vehicle: {veh}")
        if amt is not None:
            try:
                extra.append(f"Freight: ₹{float(amt):,.2f}")
            except Exception:
                extra.append(f"Freight: ₹{amt}")
        if details_json.get("status"):
            extra.append(f"Status: {details_json['status']}")
            
        desc = f"{action.replace('_', ' ').title()} - {base}"
        if extra:
            desc += f" ({', '.join(extra)})"
        return desc

    elif ent_lower == "job" or "job" in action.lower():
        job_no = entity_identifier or details_json.get("job_number") or ""
        client = details_json.get("client_name") or details_json.get("billing_client")
        rf = details_json.get("origin")
        rt = details_json.get("destination")
        st = details_json.get("status")
        
        base = f"Job {job_no}" if job_no else "Job"
        extra = []
        if client:
            extra.append(f"Client: {client}")
        if rf and rt:
            extra.append(f"{rf} -> {rt}")
        if st:
            extra.append(f"Status: {st}")
            
        desc = f"{action.replace('_', ' ').title()} - {base}"
        if extra:
            desc += f" ({', '.join(extra)})"
        return desc

    elif ent_lower in ("hire_challan", "hirechallan") or "challan" in action.lower():
        hc_no = entity_identifier or details_json.get("challan_number") or ""
        veh = details_json.get("vehicle_number")
        drv = details_json.get("driver_name")
        rate = details_json.get("hire_rate")
        
        base = f"Hire Challan {hc_no}" if hc_no else "Hire Challan"
        extra = []
        if veh:
            extra.append(f"Vehicle: {veh}")
        if drv:
            extra.append(f"Driver: {drv}")
        if rate is not None:
            extra.append(f"Rate: ₹{float(rate):,.2f}")
            
        desc = f"{action.replace('_', ' ').title()} - {base}"
        if extra:
            desc += f" ({', '.join(extra)})"
        return desc

    elif ent_lower == "voucher" or "voucher" in action.lower():
        vch_no = entity_identifier or details_json.get("voucher_number") or ""
        vch_type = details_json.get("voucher_type") or "Voucher"
        amt = details_json.get("total_amount") or details_json.get("amount")
        party = details_json.get("party_name")
        
        base = f"{vch_type} {vch_no}".strip()
        extra = []
        if party:
            extra.append(f"Party: {party}")
        if amt is not None:
            try:
                extra.append(f"Amount: ₹{float(amt):,.2f}")
            except Exception:
                extra.append(f"Amount: ₹{amt}")
                
        desc = f"{action.replace('_', ' ').title()} - {base}"
        if extra:
            desc += f" ({', '.join(extra)})"
        return desc

    # Generic formatter with key fields
    ident = entity_identifier or details_json.get("name") or details_json.get("code") or details_json.get("email") or ""
    label = f"{entity_type or 'Record'} {ident}".strip()
    
    # Show diff if changed_fields are present
    if "changed_fields" in details_json:
        changes = details_json["changed_fields"]
        if isinstance(changes, dict):
            change_strs = [f"{k}: '{v.get('old')}' -> '{v.get('new')}'" if isinstance(v, dict) and 'old' in v and 'new' in v else f"{k}={v}" for k, v in list(changes.items())[:5]]
            return f"{action.replace('_', ' ').title()} - {label} (Changes: {', '.join(change_strs)})"

    # Summarize top attributes
    attrs = []
    for k, v in list(details_json.items())[:4]:
        if k not in ("id", "password", "password_hash", "token", "auth_token") and v is not None:
            attrs.append(f"{k}: {v}")
    
    if attrs:
        return f"{action.replace('_', ' ').title()} - {label} ({', '.join(attrs)})"
    return f"{action.replace('_', ' ').title()} - {label}"


async def log_activity(
    db: AsyncSession,
    user: Optional[User] = None,
    action: str = "",
    module: str = "",
    entity_type: Optional[str] = None,
    entity_id: Optional[Union[str, int]] = None,
    entity_identifier: Optional[str] = None,
    office_id: Optional[int] = None,
    office_name: Optional[str] = None,
    office_code: Optional[str] = None,
    details: Optional[str] = None,
    details_json: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    status: str = "SUCCESS",
    request: Optional[Request] = None,
    commit: bool = True,
) -> Optional[UserActivity]:
    """
    Core activity logging engine for PantherTMS.
    Records every user action with complete, traceable details, issuing office context, and security attribution.
    """
    try:
        # 1. Resolve Actor
        resolved_user = user or current_request_user.get()
        user_id = resolved_user.id if resolved_user else None
        user_email = resolved_user.email if resolved_user else "system"
        user_name = getattr(resolved_user, "full_name", None) or (resolved_user.email if resolved_user else "System Service")
        user_role = getattr(resolved_user, "role", "SYSTEM") or "SYSTEM"

        # 2. Resolve Client IP
        resolved_ip = ip_address or extract_client_ip(request)

        # 3. Resolve Issuing Office
        eff_office_id = office_id
        if eff_office_id is None:
            eff_office_id = current_request_office_id.get()

        eff_office_name = office_name
        eff_office_code = office_code

        # If office_id is known but name/code missing, fetch from Branch table
        if eff_office_id is not None and (eff_office_name is None or eff_office_code is None):
            try:
                br_stmt = select(Branch).where(Branch.id == eff_office_id)
                br_res = await db.execute(br_stmt)
                branch = br_res.scalar_one_or_none()
                if branch:
                    eff_office_name = branch.name
                    eff_office_code = branch.code
            except Exception:
                pass

        # If office is still None and user is an employee, fallback to employee's default office
        if eff_office_id is None and resolved_user and getattr(resolved_user, "office_assignments", None):
            assignments = resolved_user.office_assignments
            def_assignment = next((a for a in assignments if a.is_default and a.office), None) or (assignments[0] if assignments and assignments[0].office else None)
            if def_assignment and def_assignment.office:
                eff_office_id = def_assignment.office.id
                eff_office_name = def_assignment.office.name
                eff_office_code = def_assignment.office.code

        # 4. Format Human-Readable Details Summary
        final_details = details
        if not final_details:
            final_details = build_readable_details(action, entity_type, entity_identifier, details_json)

        # 5. Build and Persist Activity Record
        activity = UserActivity(
            user_id=user_id,
            user_email=user_email,
            user_name=user_name,
            user_role=user_role,
            action=action.upper().strip(),
            module=module.lower().strip(),
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            entity_identifier=str(entity_identifier) if entity_identifier is not None else None,
            office_id=eff_office_id,
            office_name=eff_office_name,
            office_code=eff_office_code,
            status=status.upper(),
            details=final_details,
            details_json=details_json,
            ip_address=resolved_ip,
        )

        db.add(activity)
        if commit:
            await db.commit()
            await db.refresh(activity)
        return activity

    except Exception as err:
        # Non-fatal: Never abort the primary business transaction due to logging failure
        print(f"Warning: Failed to record user activity log: {err}")
        return None


async def query_activity_logs(
    db: AsyncSession,
    current_user: User,
    office_id: Optional[Union[int, str]] = None,
    header_office_id: Optional[str] = None,
    module: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_identifier: Optional[str] = None,
    user_email: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = 100,
    offset: int = 0,
) -> Tuple[List[UserActivity], int]:
    """
    Queries activity logs enforcing strict issuing-office-based access control:
    - Company Admin: Universal cross-office access. Can view 'All Issuing Offices' or filter to any specific office.
    - Employee: Strictly isolated to assigned issuing office(s). Cannot view logs from other offices or 'All Issuing Offices'.
    """
    is_admin = (current_user.role or "").upper().strip() in ("COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER")

    # Determine requested office parameter
    raw_target = office_id if office_id is not None else header_office_id
    is_all_requested = False
    target_office_id: Optional[int] = None

    if raw_target is not None:
        val_str = str(raw_target).strip().lower()
        if val_str in ("all", "0", "consolidated"):
            is_all_requested = True
        else:
            try:
                target_office_id = int(val_str)
            except ValueError:
                target_office_id = None

    # Base query
    stmt = select(UserActivity)

    # Apply Issuing Office Security Boundaries
    if is_admin:
        if is_all_requested or raw_target is None or val_str in ("all", "0"):
            # Universal consolidated view across all issuing offices and global actions
            pass
        elif target_office_id is not None:
            # Filter by specific office selected by admin
            stmt = stmt.where(UserActivity.office_id == target_office_id)
    else:
        # Employee authorization enforcement
        if is_all_requested:
            raise ForbiddenException("Consolidated multi-office access is restricted to Company Administrators.")

        # Load assigned active offices
        assigned_ids = []
        if current_user.office_assignments:
            assigned_ids = [
                a.office_id for a in current_user.office_assignments
                if a.office and a.office.is_active
            ]
        if not assigned_ids:
            # Direct query in case relationship is deferred
            res = await db.execute(
                select(UserOfficeAssignment.office_id)
                .join(Branch, Branch.id == UserOfficeAssignment.office_id)
                .where(UserOfficeAssignment.user_id == current_user.id, Branch.is_active == True)
            )
            assigned_ids = [r[0] for r in res.fetchall()]

        if not assigned_ids:
            # Employee without assigned active office has zero log visibility
            return [], 0

        if target_office_id is not None:
            if target_office_id not in assigned_ids:
                raise ForbiddenException(
                    message=f"Access to issuing office ID {target_office_id} is forbidden for this user.",
                    details={"attempted_office_id": target_office_id, "authorized_offices": assigned_ids}
                )
            stmt = stmt.where(UserActivity.office_id == target_office_id)
        else:
            # Strict isolation: only logs matching employee's assigned offices
            if len(assigned_ids) == 1:
                stmt = stmt.where(UserActivity.office_id == assigned_ids[0])
            else:
                stmt = stmt.where(UserActivity.office_id.in_(assigned_ids))

    # Apply Additional Search & Filter Criteria
    if module:
        stmt = stmt.where(func.lower(UserActivity.module) == module.lower().strip())
        
    if action:
        stmt = stmt.where(func.lower(UserActivity.action) == action.lower().strip())
        
    if entity_type:
        stmt = stmt.where(func.lower(UserActivity.entity_type) == entity_type.lower().strip())
        
    if entity_identifier:
        stmt = stmt.where(UserActivity.entity_identifier.ilike(f"%{entity_identifier.strip()}%"))
        
    if user_email:
        stmt = stmt.where(func.lower(UserActivity.user_email) == user_email.lower().strip())
        
    if date_from:
        stmt = stmt.where(UserActivity.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
        
    if date_to:
        next_day = date_to + timedelta(days=1)
        stmt = stmt.where(UserActivity.created_at < datetime.combine(next_day, time.min, tzinfo=timezone.utc))

    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                UserActivity.entity_identifier.ilike(term),
                UserActivity.details.ilike(term),
                UserActivity.user_email.ilike(term),
                UserActivity.user_name.ilike(term),
                UserActivity.action.ilike(term),
                UserActivity.office_name.ilike(term),
                UserActivity.office_code.ilike(term),
            )
        )

    # Total Count computation
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total_count = count_res.scalar() or 0

    # Pagination & Ordering (latest events first)
    stmt = stmt.order_by(UserActivity.created_at.desc(), UserActivity.id.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    records = list(result.scalars().all())

    return records, total_count


async def get_activity_stats(
    db: AsyncSession,
    current_user: User,
    office_id: Optional[Union[int, str]] = None,
    header_office_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes dashboard analytics for the activity log interface:
    Total events, today's events, active operators count, breakdown by module and office.
    """
    is_admin = (current_user.role or "").upper().strip() in ("COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER")
    raw_target = office_id if office_id is not None else header_office_id
    target_office_id: Optional[int] = None

    if raw_target is not None:
        val_str = str(raw_target).strip().lower()
        if val_str not in ("all", "0", "consolidated"):
            try:
                target_office_id = int(val_str)
            except ValueError:
                target_office_id = None

    # Base filter
    base_filter = []
    if is_admin:
        if target_office_id is not None:
            base_filter.append(UserActivity.office_id == target_office_id)
    else:
        assigned_ids = [
            a.office_id for a in (current_user.office_assignments or [])
            if a.office and a.office.is_active
        ]
        if not assigned_ids:
            res = await db.execute(
                select(UserOfficeAssignment.office_id)
                .join(Branch, Branch.id == UserOfficeAssignment.office_id)
                .where(UserOfficeAssignment.user_id == current_user.id, Branch.is_active == True)
            )
            assigned_ids = [r[0] for r in res.fetchall()]

        if target_office_id is not None:
            if target_office_id in assigned_ids:
                base_filter.append(UserActivity.office_id == target_office_id)
            else:
                base_filter.append(UserActivity.id == -1)
        else:
            base_filter.append(UserActivity.office_id.in_(assigned_ids))

    # Total activities
    tot_stmt = select(func.count(UserActivity.id))
    if base_filter:
        tot_stmt = tot_stmt.where(and_(*base_filter))
    total_count = (await db.execute(tot_stmt)).scalar() or 0

    # Today's activities
    today_start = datetime.combine(date.today(), time.min, tzinfo=timezone.utc)
    today_stmt = select(func.count(UserActivity.id)).where(UserActivity.created_at >= today_start)
    if base_filter:
        today_stmt = today_stmt.where(and_(*base_filter))
    today_count = (await db.execute(today_stmt)).scalar() or 0

    # Unique active operators
    users_stmt = select(func.count(func.distinct(UserActivity.user_email)))
    if base_filter:
        users_stmt = users_stmt.where(and_(*base_filter))
    users_count = (await db.execute(users_stmt)).scalar() or 0

    # Critical mutations (Create, Update, Delete)
    critical_stmt = select(func.count(UserActivity.id)).where(
        or_(
            UserActivity.action.like("%CREATE%"),
            UserActivity.action.like("%UPDATE%"),
            UserActivity.action.like("%DELETE%"),
            UserActivity.action.like("%CANCEL%"),
            UserActivity.action.like("%VOID%"),
        )
    )
    if base_filter:
        critical_stmt = critical_stmt.where(and_(*base_filter))
    critical_count = (await db.execute(critical_stmt)).scalar() or 0

    # Active issuing offices count
    offices_stmt = select(func.count(func.distinct(UserActivity.office_id)))
    if base_filter:
        offices_stmt = offices_stmt.where(and_(*base_filter))
    offices_count = (await db.execute(offices_stmt)).scalar() or 0

    return {
        "total_activities": total_count,
        "today_activities": today_count,
        "active_users": users_count,
        "critical_mutations": critical_count,
        "active_offices": offices_count,
    }


async def get_activity_filters(
    db: AsyncSession,
    current_user: User,
) -> Dict[str, Any]:
    """
    Returns populated filter options (users, actions, modules, branches) scoped to user authorization.
    """
    is_admin = (current_user.role or "").upper().strip() in ("COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER")

    base_filter = []
    if not is_admin:
        assigned_ids = [
            a.office_id for a in (current_user.office_assignments or [])
            if a.office and a.office.is_active
        ]
        if not assigned_ids:
            res = await db.execute(
                select(UserOfficeAssignment.office_id)
                .join(Branch, Branch.id == UserOfficeAssignment.office_id)
                .where(UserOfficeAssignment.user_id == current_user.id, Branch.is_active == True)
            )
            assigned_ids = [r[0] for r in res.fetchall()]
        base_filter.append(UserActivity.office_id.in_(assigned_ids))

    # Distinct users
    user_stmt = select(UserActivity.user_email, UserActivity.user_name).distinct()
    if base_filter:
        user_stmt = user_stmt.where(and_(*base_filter))
    user_rows = (await db.execute(user_stmt)).fetchall()
    users = [{"email": r[0], "name": r[1] or r[0]} for r in user_rows if r[0]]

    # Distinct actions
    act_stmt = select(UserActivity.action).distinct()
    if base_filter:
        act_stmt = act_stmt.where(and_(*base_filter))
    actions = [r[0] for r in (await db.execute(act_stmt)).fetchall() if r[0]]

    # Distinct modules
    mod_stmt = select(UserActivity.module).distinct()
    if base_filter:
        mod_stmt = mod_stmt.where(and_(*base_filter))
    modules = [r[0] for r in (await db.execute(mod_stmt)).fetchall() if r[0]]

    # Available Issuing Offices
    if is_admin:
        br_stmt = select(Branch.id, Branch.code, Branch.name, Branch.city, Branch.is_head_office).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.name.asc())
        branches = [
            {"id": r[0], "code": r[1], "name": r[2], "city": r[3], "is_head_office": r[4]}
            for r in (await db.execute(br_stmt)).fetchall()
        ]
    else:
        br_stmt = (
            select(Branch.id, Branch.code, Branch.name, Branch.city, Branch.is_head_office)
            .where(Branch.id.in_(assigned_ids), Branch.is_active == True)
            .order_by(Branch.is_head_office.desc(), Branch.name.asc())
        )
        branches = [
            {"id": r[0], "code": r[1], "name": r[2], "city": r[3], "is_head_office": r[4]}
            for r in (await db.execute(br_stmt)).fetchall()
        ]

    return {
        "users": sorted(users, key=lambda x: x["name"]),
        "actions": sorted(actions),
        "modules": sorted(modules),
        "offices": branches,
        "is_admin": is_admin,
    }
