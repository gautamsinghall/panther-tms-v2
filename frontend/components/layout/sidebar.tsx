"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Truck,
  FileSpreadsheet,
  FileCheck2,
  Calculator,
  Layers,
  BarChart3,
  Receipt,
  Gauge,
  Settings,
  UserCircle,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface NavSubItem {
  feature?: string;
  title: string;
  href: string;
  category?: string;
}

interface NavGroup {
  id: string;
  title: string;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
  is_locked?: boolean;
  required_plan?: string | null;
  items: NavSubItem[];
}

/**
 * Navigation modules per docs/design.md §4 & docs/architecture.md §5
 */
const ALL_NAVIGATION_MODULES: NavGroup[] = [
  {
    id: "home",
    title: "Home",
    items: [
      { feature: "overview", title: "Overview Dashboard", href: "/" },
      { feature: "components_demo", title: "Components Demo", href: "/components-demo" },
    ],
  },
  {
    id: "general",
    title: "General",
    items: [
      { feature: "consignee", title: "Consignee", href: "/general/consignee" },
      { feature: "consigner", title: "Consigner", href: "/general/consigner" },
      { feature: "location", title: "Location", href: "/general/location" },
      { feature: "industry", title: "Industry", href: "/general/industry" },
      { feature: "designation", title: "Designation", href: "/general/designation" },
      { feature: "group_company", title: "Group Company", href: "/general/group-company" },
      { feature: "unit", title: "Unit", href: "/general/unit" },
      { feature: "method_of_packing", title: "Method of Packing", href: "/general/packing-method" },
    ],
  },
  {
    id: "transport",
    title: "Transport",
    items: [
      { category: "Dispatch", feature: "jobs", title: "Job Creation", href: "/transport/jobs" },
      { category: "Dispatch", feature: "lr_booking", title: "GR/LR Booking", href: "/transport/lr-booking" },
      { category: "Dispatch", feature: "hire_challan", title: "Hire Challan", href: "/transport/hire-challan" },
      { category: "Fleet", feature: "drivers", title: "Manage Driver", href: "/transport/drivers" },
      { category: "Fleet", feature: "company_vehicles", title: "Company Vehicle", href: "/transport/company-vehicles" },
      { category: "Fleet", feature: "market_vehicles", title: "Market Vehicle", href: "/transport/market-vehicles" },
      { category: "Fleet", feature: "vehicle_owners", title: "Vehicle Owner", href: "/transport/vehicle-owners" },
      { category: "Tracking & POD", feature: "arrival_reports", title: "Arrival Report", href: "/transport/arrival-reports" },
      { category: "Tracking & POD", feature: "pod_records", title: "POD Records", href: "/transport/pod-records" },
      { category: "Tracking & POD", feature: "truck_hiring_note", title: "Truck Hiring Note", href: "/transport/truck-hiring-note" },
      { category: "Tracking & POD", feature: "eway_bill", title: "Update E-Way", href: "/transport/eway-bill" },
      { category: "Tracking & POD", feature: "tracking", title: "Tracking (FASTag/GPS)", href: "/transport/tracking" },
    ],
  },
  {
    id: "transport-reports",
    title: "Transport Reports",
    items: [
      { feature: "lr_register", title: "LR Booking Register", href: "/transport-reports/lr-register" },
      { feature: "invoice_register", title: "Invoice Register", href: "/transport-reports/invoice-register" },
      { feature: "lr_client_wise", title: "LR Client-Wise", href: "/transport-reports/lr-client-wise" },
      { feature: "hc_register", title: "Hire Challan Register", href: "/transport-reports/hc-register" },
      { feature: "pending_hc", title: "Pending HC Report", href: "/transport-reports/pending-hc" },
      { feature: "unbilled", title: "Unbilled Reports", href: "/transport-reports/unbilled" },
      { feature: "arrival_register", title: "Arrival Report Register", href: "/transport-reports/arrival-register" },
      { feature: "unused_series", title: "Unused GR/LR Series", href: "/transport-reports/unused-series" },
    ],
  },
  {
    id: "einvoicing",
    title: "E-Invoicing",
    items: [
      { feature: "generate_irn", title: "Generate IRN", href: "/einvoicing/generate-irn" },
      { feature: "irn_list", title: "IRN Generated List", href: "/einvoicing/irn-list" },
      { feature: "cancel_irn", title: "Cancel IRN", href: "/einvoicing/cancel-irn" },
      { feature: "taxpayer", title: "Taxpayer Details", href: "/einvoicing/taxpayer" },
    ],
  },
  {
    id: "accounts",
    title: "Accounts",
    items: [
      { feature: "transport_invoice", title: "Transport Invoice", href: "/accounts/transport-invoice" },
      { feature: "general_invoice", title: "General Invoice", href: "/accounts/general-invoice" },
      { feature: "proforma_invoice", title: "Proforma Invoice", href: "/accounts/proforma-invoice" },
      { feature: "purchases", title: "Purchase Register", href: "/accounts/purchases" },
      { feature: "receipt_voucher", title: "Receipt Voucher", href: "/accounts/receipt-voucher" },
      { feature: "payment_voucher", title: "Payment Voucher", href: "/accounts/payment-voucher" },
      { feature: "contra_voucher", title: "Contra Voucher", href: "/accounts/contra-voucher" },
      { feature: "credit_debit_notes", title: "Credit / Debit Note", href: "/accounts/credit-debit-notes" },
    ],
  },
  {
    id: "misc",
    title: "Misc (Masters)",
    items: [
      { feature: "primary_group", title: "Primary Group", href: "/misc/primary-group" },
      { feature: "group_in_primary", title: "Group in Primary", href: "/misc/group-in-primary" },
      { feature: "subgroup", title: "Subgroup in Group", href: "/misc/subgroup" },
      { feature: "employee_master", title: "Employee Master", href: "/misc/employee-master" },
      { feature: "charge_head", title: "Charge Head", href: "/misc/charge-head" },
      { feature: "tax_category", title: "Tax Category", href: "/misc/tax-category" },
    ],
  },
  {
    id: "reports",
    title: "Reports (Financial)",
    items: [
      { feature: "daybook", title: "Daybook", href: "/reports/daybook" },
      { feature: "ledger", title: "Ledger", href: "/reports/ledger" },
      { feature: "trial_balance", title: "Trial Balance", href: "/reports/trial-balance" },
      { feature: "balance_sheet", title: "Balance Sheet", href: "/reports/balance-sheet" },
      { feature: "profit_loss", title: "Profit & Loss", href: "/reports/profit-loss" },
      { feature: "sales_register", title: "Sales Register", href: "/reports/sales-register" },
      { feature: "purchase_register", title: "Purchase Register", href: "/reports/purchase-register" },
      { feature: "bank_reconciliation", title: "Bank Reconciliation", href: "/reports/bank-reconciliation" },
      { feature: "special_report", title: "Special Report", href: "/reports/special-report" },
    ],
  },
  {
    id: "statements",
    title: "Statements",
    items: [
      { feature: "gst_output", title: "GST Output", href: "/statements/gst-output" },
      { feature: "gst_input", title: "GST Input", href: "/statements/gst-input" },
      { feature: "os_debtor", title: "O/S Debtor", href: "/statements/os-debtor" },
      { feature: "os_creditor", title: "O/S Creditor", href: "/statements/os-creditor" },
      { feature: "tds_payable", title: "TDS Payable", href: "/statements/tds-payable" },
      { feature: "tds_return", title: "TDS Return", href: "/statements/tds-return" },
      { feature: "opening_balance", title: "Opening Balance Details", href: "/statements/opening-balance" },
    ],
  },
  {
    id: "fleet",
    title: "Fleet Management",
    items: [
      { feature: "trip_expense", title: "Trip Expense", href: "/fleet/trip-expense" },
      { feature: "trip_advance", title: "Trip Advance", href: "/fleet/trip-advance" },
      { feature: "expense_register", title: "Trip Expense Register", href: "/fleet/trip-expense-register" },
      { feature: "truck_pnl", title: "Truck-Wise P&L", href: "/fleet/truck-pnl" },
      { feature: "vehicle_health", title: "Vehicle Health", href: "/fleet/vehicle-health" },
      { feature: "documents", title: "Vehicle Documents", href: "/fleet/documents" },
      { feature: "tyre", title: "Tyre Management", href: "/fleet/tyre" },
      { feature: "service", title: "Repair & Service", href: "/fleet/service" },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    items: [
      { feature: "users", title: "User Management", href: "/settings/users" },
      { feature: "roles", title: "Roles & Permissions", href: "/settings/roles" },
      { feature: "series_master", title: "Series Master", href: "/settings/series-master" },
      { feature: "admin_setting", title: "Admin Setting", href: "/settings/admin" },
      { feature: "activity", title: "User Activity Log", href: "/settings/activity" },
    ],
  },
  {
    id: "profile",
    title: "Profile",
    items: [
      { feature: "company", title: "Company Setting", href: "/profile/company" },
      { feature: "account", title: "User Account", href: "/profile/account" },
      { feature: "branch", title: "Branch", href: "/profile/branch" },
      { feature: "change_password", title: "Change Password", href: "/profile/change-password" },
      { feature: "email", title: "Email Settings", href: "/profile/email" },
      { feature: "monthly_pnl", title: "Monthly P&L", href: "/profile/monthly-pnl" },
    ],
  },
];

// Consistent 20px Lucide icons per docs/design.md §4 & §6
const MODULE_ICONS: Record<string, React.ReactNode> = {
  home: <LayoutDashboard className="w-5 h-5" />,
  general: <Building2 className="w-5 h-5" />,
  transport: <Truck className="w-5 h-5" />,
  "transport-reports": <FileSpreadsheet className="w-5 h-5" />,
  einvoicing: <FileCheck2 className="w-5 h-5" />,
  accounts: <Calculator className="w-5 h-5" />,
  misc: <Layers className="w-5 h-5" />,
  reports: <BarChart3 className="w-5 h-5" />,
  statements: <Receipt className="w-5 h-5" />,
  fleet: <Gauge className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
  profile: <UserCircle className="w-5 h-5" />,
};

export function Sidebar() {
  const pathname = usePathname();
  const [navGroups, setNavGroups] = useState<NavGroup[]>(ALL_NAVIGATION_MODULES);
  
  // Usability Issue 6 Fix: Only keep the active route's group expanded by default (Hick's Law)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    home: true,
  });
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    async function loadNavigation() {
      try {
        const data = await apiClient<NavGroup[]>("/api/v1/auth/navigation");
        if (Array.isArray(data) && data.length > 0) {
          setNavGroups(data);
          const expanded: Record<string, boolean> = {};
          data.forEach((g) => {
            if (g.items?.some((it) => it.href === pathname || pathname.startsWith(`/${g.id}`))) {
              expanded[g.id] = true;
            }
          });
          if (Object.keys(expanded).length > 0) {
            setExpandedGroups(expanded);
          }
        }
      } catch (err) {
        // Fallback retained
      }
    }
    loadNavigation();
  }, [pathname]);

  // Keep only the active module group open when navigating
  useEffect(() => {
    if (pathname && navGroups.length > 0) {
      navGroups.forEach((g) => {
        if (g.items?.some((it) => it.href === pathname || pathname.startsWith(`/${g.id}`))) {
          setExpandedGroups((prev) => ({ ...prev, [g.id]: true }));
        }
      });
    }
  }, [pathname, navGroups]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-slate-200/80 bg-white transition-all duration-200 select-none z-30 shrink-0",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header — Clean Transparent Enterprise Logo & Workspace Identity */}
      <div className="flex h-16 items-center justify-between px-3.5 border-b border-slate-200/80 bg-white">
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-3 group min-w-0">
            <img
              src="/panther-logo.png"
              alt="PantherTMS Logo"
              className="h-9 w-auto max-w-[56px] object-contain shrink-0 drop-shadow-xs"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                  Panther<span className="text-indigo-600">TMS</span>
                </span>
                <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                  v2.0
                </span>
              </div>
              <span className="block text-xs text-slate-500 font-medium tracking-tight truncate">
                Panther Digital Solutions
              </span>
            </div>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/" className="mx-auto flex items-center justify-center" title="PantherTMS">
            <img
              src="/panther-logo.png"
              alt="PantherTMS Logo"
              className="h-8 w-auto max-w-[36px] object-contain drop-shadow-xs"
            />
          </Link>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 mx-auto" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation List — Linear-style Inset Item Hierarchy */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1.5">
        {navGroups.map((group) => {
          const isExpanded = expandedGroups[group.id] ?? false;
          const hasActiveChild = group.items?.some((item) => item.href === pathname);
          const icon = MODULE_ICONS[group.id] || <Layers className="w-4 h-4" />;

          return (
            <div key={group.id} className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  if (isCollapsed) setIsCollapsed(false);
                  toggleGroup(group.id);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer select-none",
                  hasActiveChild
                    ? "text-slate-900 font-semibold bg-slate-50 border border-slate-200/60"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                )}
                title={isCollapsed ? group.title : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cn("shrink-0", hasActiveChild ? "text-indigo-600" : "text-slate-400")}>
                    {icon}
                  </span>
                  {!isCollapsed && (
                    <span className="text-xs font-medium truncate flex items-center gap-1.5">
                      {group.title}
                      {group.is_locked && (
                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 uppercase tracking-tight">
                          <Lock className="w-3 h-3" />
                          {group.required_plan || "LOCKED"}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <span className="text-slate-400 shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                )}
              </button>

              {/* Sub items — Linear Inset Pill Active State */}
              {!isCollapsed && isExpanded && (
                <div className="pl-5 pr-1 space-y-0.5 pt-0.5 border-l border-slate-100 ml-4 my-0.5">
                  {group.items?.map((sub, idx) => {
                    const isActive = pathname === sub.href;
                    const prevCategory = idx > 0 ? group.items[idx - 1].category : undefined;
                    const showCategoryHeader = sub.category && sub.category !== prevCategory;

                    return (
                      <React.Fragment key={sub.href}>
                        {showCategoryHeader && (
                          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider pt-2 pb-0.5 px-2">
                            {sub.category}
                          </span>
                        )}
                        <Link
                          href={sub.href}
                          className={cn(
                            "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs sm:text-[13px] transition-all duration-150 select-none",
                            isActive
                              ? "bg-indigo-50/90 text-indigo-700 font-semibold border border-indigo-200/60 shadow-2xs"
                              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/60"
                          )}
                        >
                          <span className="truncate">{sub.title}</span>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 shadow-xs" />
                          )}
                        </Link>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* RBAC Active Footer — Linear/Stripe Enterprise Status */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50">
          <div className="rounded-lg bg-white border border-slate-200/80 p-2.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <div className="leading-tight truncate">
                <span className="text-xs font-semibold text-slate-800 block truncate">
                  Tenant RBAC Active
                </span>
                <span className="text-xs text-slate-500 block truncate">
                  Multi-tenant isolated
                </span>
              </div>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
        </div>
      )}
    </aside>
  );
}
