"""
Navigation and Plan Tier configuration.
Decoupled from database connections to allow fast imports and unit testing.
"""

PLAN_TIERS = {
    "FREE": 1,
    "PRO": 2,
    "BUSINESS": 3,
    "ENTERPRISE": 4,
}

MODULE_MIN_TIERS = {
    "home": 1,
    "general": 1,
    "transport": 1,
    "accounts": 1,
    "misc": 1,
    "profile": 1,
    "settings": 1,
    "company": 1,
    "api_center": 1,
    "tracking": 2,           # PRO, BUSINESS, ENTERPRISE
    "transport_reports": 2,   # PRO, BUSINESS, ENTERPRISE
    "reports": 2,             # PRO, BUSINESS, ENTERPRISE
    "einvoicing": 3,          # BUSINESS, ENTERPRISE
    "fleet": 3,               # BUSINESS, ENTERPRISE
    "statements": 3,          # BUSINESS, ENTERPRISE
}

FEATURE_MIN_TIERS = {
    "eway_bill": 2,
    "eway_alerts": 2,
    "tracking": 2,
    "fastag_tracking": 2,
    "api_access": 3,
}

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
            {"feature": "billing_client", "title": "Billing Client", "href": "/general/billing-client"},
            {"feature": "consignee", "title": "Consignee", "href": "/general/consignee"},
            {"feature": "consigner", "title": "Consigner", "href": "/general/consigner"},
            {"feature": "location", "title": "Location", "href": "/general/location"},
            {"feature": "industry", "title": "Industry", "href": "/general/industry"},
            {"feature": "designation", "title": "Designation", "href": "/general/designation"},
            {"feature": "group_company", "title": "Group Company", "href": "/general/group-company"},
            {"feature": "unit", "title": "Unit", "href": "/general/unit"},
            {"feature": "method_of_packing", "title": "Method of Packing", "href": "/general/packing-method"},
            {"feature": "load_type", "title": "Load Type", "href": "/general/load-type"},
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
        ],
    },
    {
        "id": "tracking",
        "title": "Tracking",
        "items": [
            {"feature": "fastag_tracking", "title": "FASTag Tracking", "href": "/tracking/fastag"},
            {"feature": "tracking", "title": "Sim Based Tracking", "href": "/tracking/sim"},
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
        "id": "api_center",
        "title": "API Center",
        "items": [
            {"feature": "eway_bill_api", "title": "E-Way Bill API", "href": "/api-center/eway-bill"},
            {"feature": "fastag_tracking_api", "title": "FASTag Tracking API", "href": "/api-center/fastag"},
            {"feature": "sim_tracking_api", "title": "SIM Based Tracking API", "href": "/api-center/sim"},
        ],
    },
    {
        "id": "company",
        "title": "Company Settings",
        "items": [
            {"feature": "company_details", "title": "Company Details", "href": "/company/details"},
            {"feature": "branch", "title": "Issuing Offices / Branches", "href": "/company/branches"},
            {"feature": "users", "title": "User Management", "href": "/company/users"},
            {"feature": "roles", "title": "Roles & Permissions", "href": "/company/roles"},
        ],
    },
    {
        "id": "settings",
        "title": "Settings",
        "items": [
            {"feature": "series_master", "title": "Series Master", "href": "/settings/series-master"},
            {"feature": "admin_setting", "title": "Admin Setting", "href": "/settings/admin"},
            {"feature": "activity", "title": "User Activity Log", "href": "/settings/activity"},
        ],
    },
    {
        "id": "profile",
        "title": "Profile",
        "items": [
            {"feature": "account", "title": "User Account", "href": "/profile/account"},
            {"feature": "change_password", "title": "Change Password", "href": "/profile/change-password"},
            {"feature": "email", "title": "Email Settings", "href": "/profile/email"},
            {"feature": "monthly_pnl", "title": "Monthly P&L", "href": "/profile/monthly-pnl"},
        ],
    },
]
