from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.control.models import Tenant
from app.tenant_db.models import User
from app.tenant_db.session import get_current_tenant, get_tenant_db
from app.auth.dependencies import get_current_user
from app.auth.schemas import (
    LoginRequest, TokenResponse, RefreshTokenRequest,
    UserResponse, TenantContextResponse
)
from app.auth.service import authenticate_user, refresh_user_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

ALL_NAVIGATION_MODULES = [
    {
        "id": "home",
        "title": "Home",
        "items": [
            {"feature": "overview", "title": "Overview Dashboard", "href": "/"},
            {"feature": "components_demo", "title": "Components Demo", "href": "/components-demo"},
        ],
    },
    {
        "id": "general",
        "title": "General",
        "items": [
            {"feature": "consignee", "title": "Consignee", "href": "/general/consignee"},
            {"feature": "consigner", "title": "Consigner", "href": "/general/consigner"},
            {"feature": "location", "title": "Location", "href": "/general/location"},
            {"feature": "industry", "title": "Industry", "href": "/general/industry"},
            {"feature": "designation", "title": "Designation", "href": "/general/designation"},
            {"feature": "group_company", "title": "Group Company", "href": "/general/group-company"},
            {"feature": "unit", "title": "Unit", "href": "/general/unit"},
            {"feature": "method_of_packing", "title": "Method of Packing", "href": "/general/packing-method"},
        ],
    },
    {
        "id": "transport",
        "title": "Transport",
        "items": [
            {"feature": "jobs", "title": "Job Creation", "href": "/transport/jobs"},
            {"feature": "lr_booking", "title": "GR/LR Booking", "href": "/transport/lr-booking"},
            {"feature": "hire_challan", "title": "Hire Challan", "href": "/transport/hire-challan"},
            {"feature": "drivers", "title": "Manage Driver", "href": "/transport/drivers"},
            {"feature": "company_vehicles", "title": "Company Vehicle", "href": "/transport/company-vehicles"},
            {"feature": "market_vehicles", "title": "Market Vehicle", "href": "/transport/market-vehicles"},
            {"feature": "vehicle_owners", "title": "Vehicle Owner", "href": "/transport/vehicle-owners"},
            {"feature": "arrival_reports", "title": "Arrival Report", "href": "/transport/arrival-reports"},
            {"feature": "pod_records", "title": "POD Records", "href": "/transport/pod-records"},
            {"feature": "truck_hiring_note", "title": "Truck Hiring Note", "href": "/transport/truck-hiring-note"},
            {"feature": "eway_bill", "title": "Update E-Way", "href": "/transport/eway-bill"},
            {"feature": "tracking", "title": "Tracking (FASTag/GPS/SIM)", "href": "/transport/tracking"},
        ],
    },
    {
        "id": "transport-reports",
        "title": "Transport Reports",
        "items": [
            {"feature": "lr_register", "title": "LR Booking Register", "href": "/transport-reports/lr-register"},
            {"feature": "invoice_register", "title": "Invoice Register", "href": "/transport-reports/invoice-register"},
            {"feature": "lr_client_wise", "title": "LR Client-Wise", "href": "/transport-reports/lr-client-wise"},
            {"feature": "hc_register", "title": "Hire Challan Register", "href": "/transport-reports/hc-register"},
            {"feature": "pending_hc", "title": "Pending HC Report", "href": "/transport-reports/pending-hc"},
            {"feature": "unbilled", "title": "Unbilled Reports", "href": "/transport-reports/unbilled"},
            {"feature": "arrival_register", "title": "Arrival Report Register", "href": "/transport-reports/arrival-register"},
            {"feature": "unused_series", "title": "Unused GR/LR Series", "href": "/transport-reports/unused-series"},
        ],
    },
    {
        "id": "einvoicing",
        "title": "E-Invoicing",
        "items": [
            {"feature": "generate_irn", "title": "Generate IRN", "href": "/einvoicing/generate-irn"},
            {"feature": "irn_list", "title": "IRN Generated List", "href": "/einvoicing/irn-list"},
            {"feature": "cancel_irn", "title": "Cancel IRN", "href": "/einvoicing/cancel-irn"},
            {"feature": "taxpayer", "title": "Taxpayer Details", "href": "/einvoicing/taxpayer"},
        ],
    },
    {
        "id": "accounts",
        "title": "Accounts",
        "items": [
            {"feature": "transport_invoice", "title": "Transport Invoice", "href": "/accounts/transport-invoice"},
            {"feature": "general_invoice", "title": "General Invoice", "href": "/accounts/general-invoice"},
            {"feature": "proforma_invoice", "title": "Proforma Invoice", "href": "/accounts/proforma-invoice"},
            {"feature": "purchases", "title": "Purchase Register", "href": "/accounts/purchases"},
            {"feature": "receipt_voucher", "title": "Receipt Voucher", "href": "/accounts/receipt-voucher"},
            {"feature": "payment_voucher", "title": "Payment Voucher", "href": "/accounts/payment-voucher"},
            {"feature": "contra_voucher", "title": "Contra Voucher", "href": "/accounts/contra-voucher"},
            {"feature": "credit_debit_notes", "title": "Credit / Debit Note", "href": "/accounts/credit-debit-notes"},
        ],
    },
    {
        "id": "misc",
        "title": "Misc (Masters)",
        "items": [
            {"feature": "primary_group", "title": "Primary Group", "href": "/misc/primary-group"},
            {"feature": "group_in_primary", "title": "Group in Primary", "href": "/misc/group-in-primary"},
            {"feature": "subgroup", "title": "Subgroup in Group", "href": "/misc/subgroup"},
            {"feature": "employee_master", "title": "Employee Master", "href": "/misc/employee-master"},
            {"feature": "charge_head", "title": "Charge Head", "href": "/misc/charge-head"},
            {"feature": "tax_category", "title": "Tax Category", "href": "/misc/tax-category"},
        ],
    },
    {
        "id": "reports",
        "title": "Reports (Financial)",
        "items": [
            {"feature": "daybook", "title": "Daybook", "href": "/reports/daybook"},
            {"feature": "ledger", "title": "Ledger", "href": "/reports/ledger"},
            {"feature": "trial_balance", "title": "Trial Balance", "href": "/reports/trial-balance"},
            {"feature": "balance_sheet", "title": "Balance Sheet", "href": "/reports/balance-sheet"},
            {"feature": "profit_loss", "title": "Profit & Loss", "href": "/reports/profit-loss"},
            {"feature": "sales_register", "title": "Sales Register", "href": "/reports/sales-register"},
            {"feature": "purchase_register", "title": "Purchase Register", "href": "/reports/purchase-register"},
            {"feature": "bank_reconciliation", "title": "Bank Reconciliation", "href": "/reports/bank-reconciliation"},
            {"feature": "special_report", "title": "Special Report", "href": "/reports/special-report"},
        ],
    },
    {
        "id": "statements",
        "title": "Statements",
        "items": [
            {"feature": "gst_output", "title": "GST Output", "href": "/statements/gst-output"},
            {"feature": "gst_input", "title": "GST Input", "href": "/statements/gst-input"},
            {"feature": "os_debtor", "title": "O/S Debtor", "href": "/statements/os-debtor"},
            {"feature": "os_creditor", "title": "O/S Creditor", "href": "/statements/os-creditor"},
            {"feature": "tds_payable", "title": "TDS Payable", "href": "/statements/tds-payable"},
            {"feature": "tds_return", "title": "TDS Return", "href": "/statements/tds-return"},
            {"feature": "opening_balance", "title": "Opening Balance Details", "href": "/statements/opening-balance"},
        ],
    },
    {
        "id": "fleet",
        "title": "Fleet Management",
        "items": [
            {"feature": "trip_expense", "title": "Trip Expense", "href": "/fleet/trip-expense"},
            {"feature": "trip_advance", "title": "Trip Advance", "href": "/fleet/trip-advance"},
            {"feature": "expense_register", "title": "Trip Expense Register", "href": "/fleet/trip-expense-register"},
            {"feature": "truck_pnl", "title": "Truck-Wise P&L", "href": "/fleet/truck-pnl"},
            {"feature": "vehicle_health", "title": "Vehicle Health", "href": "/fleet/vehicle-health"},
            {"feature": "documents", "title": "Vehicle Documents", "href": "/fleet/documents"},
            {"feature": "tyre", "title": "Tyre Management", "href": "/fleet/tyre"},
            {"feature": "service", "title": "Repair & Service", "href": "/fleet/service"},
        ],
    },
    {
        "id": "settings",
        "title": "Settings",
        "items": [
            {"feature": "users", "title": "User Management", "href": "/settings/users"},
            {"feature": "roles", "title": "Roles & Permissions", "href": "/settings/roles"},
            {"feature": "series_master", "title": "Series Master", "href": "/settings/series-master"},
            {"feature": "admin_setting", "title": "Admin Setting", "href": "/settings/admin"},
            {"feature": "activity", "title": "User Activity Log", "href": "/settings/activity"},
        ],
    },
    {
        "id": "profile",
        "title": "Profile",
        "items": [
            {"feature": "company", "title": "Company Setting", "href": "/profile/company"},
            {"feature": "account", "title": "User Account", "href": "/profile/account"},
            {"feature": "branch", "title": "Branch", "href": "/profile/branch"},
            {"feature": "change_password", "title": "Change Password", "href": "/profile/change-password"},
            {"feature": "email", "title": "Email Settings", "href": "/profile/email"},
            {"feature": "monthly_pnl", "title": "Monthly P&L", "href": "/profile/monthly-pnl"},
        ],
    },
]

@router.post("/login", response_model=TokenResponse, summary="Login to tenant account")
async def login(
    login_data: LoginRequest,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await authenticate_user(db=db, tenant=tenant, login_data=login_data)

@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await refresh_user_token(db=db, tenant=tenant, refresh_data=refresh_data)

@router.get("/me", response_model=UserResponse, summary="Get current logged in user & tenant context")
async def get_me(
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        tenant=TenantContextResponse(
            subdomain=tenant.subdomain,
            company_name=tenant.company_name,
            status=tenant.status,
        ),
    )

@router.get("/navigation", summary="Get data-driven permitted navigation tree for current user")
async def get_user_navigation(
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """
    Returns data-driven sidebar navigation filtered by both tenant plan entitlements
    and user's active RBAC permissions per rules.md §5 and architecture.md §5–6.
    """
    entitled_modules = set()
    if tenant.plan and tenant.plan.entitlements:
        for ent in tenant.plan.entitlements:
            if ent.is_enabled and ent.limit_value.lower() in ("true", "1", "yes"):
                if ent.feature_key.startswith("module_"):
                    entitled_modules.add(ent.feature_key[len("module_"):])
                if ent.feature_key == "module_all":
                    entitled_modules.add("all")

    def is_module_entitled(mod_id: str) -> bool:
        norm = mod_id.replace("-", "_").lower()
        return "all" in entitled_modules or norm in entitled_modules

    result = []
    is_admin = current_user.role == "COMPANY_ADMIN"

    # Permitted employee features
    allowed_features = set()
    if not is_admin and current_user.custom_role and current_user.custom_role.permissions:
        for p in current_user.custom_role.permissions:
            if p.is_allowed and p.permission in ("view", "all"):
                allowed_features.add((p.module, p.feature))

    for mod in ALL_NAVIGATION_MODULES:
        entitled = is_module_entitled(mod["id"])

        # If module is not entitled on the plan
        if not entitled:
            if is_admin:
                # Company admin sees the module as locked with an upgrade CTA
                result.append({
                    "id": mod["id"],
                    "title": mod["title"],
                    "is_locked": True,
                    "required_plan": "Business" if mod["id"] in ("fleet", "einvoicing", "statements") else "Pro",
                    "items": [
                        {**it, "is_locked": True} for it in mod["items"]
                    ],
                })
            # Employees don't see unentitled modules at all
            continue

        # Module is entitled: filter items by role
        if is_admin:
            result.append({
                "id": mod["id"],
                "title": mod["title"],
                "is_locked": False,
                "items": [
                    {**it, "is_locked": False} for it in mod["items"]
                ],
            })
        else:
            # Employee role filtering
            if mod["id"] == "home":
                result.append({**mod, "is_locked": False})
            elif mod["id"] == "profile":
                # Employees only see personal account and change password
                allowed_items = [
                    {**it, "is_locked": False} for it in mod["items"]
                    if it["feature"] in ("account", "change_password") or (mod["id"], it["feature"]) in allowed_features
                ]
                if allowed_items:
                    result.append({"id": mod["id"], "title": mod["title"], "is_locked": False, "items": allowed_items})
            else:
                allowed_items = [
                    {**it, "is_locked": False} for it in mod["items"]
                    if (mod["id"], it["feature"]) in allowed_features
                ]
                if allowed_items:
                    result.append({"id": mod["id"], "title": mod["title"], "is_locked": False, "items": allowed_items})

    return result


@router.post("/logout", status_code=status.HTTP_200_OK, summary="Logout user")
async def logout(
    current_user: User = Depends(get_current_user)
):
    return {"message": "Successfully logged out"}
