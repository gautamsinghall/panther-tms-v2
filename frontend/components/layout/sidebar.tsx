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
        "relative flex flex-col border-r border-[#E4E7EC] bg-white transition-all duration-200 select-none z-30 shrink-0",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header — Thin 56px height per docs/design.md §4 */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-[#E4E7EC]">
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-control bg-[#4F46E5] flex items-center justify-center text-white font-bold tracking-wider relative shadow-xs">
              <span className="text-white text-sm">P</span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold tracking-tight text-[#101828]">
                  Panther<span className="text-[#4F46E5]">TMS</span>
                </span>
              </div>
              {/* Usability Issue 2 Fix: Increase font size from text-[10px] to text-xs (min ~12px) */}
              <span className="block text-xs text-[#667085] font-medium tracking-tight">
                Enterprise Logistics
              </span>
            </div>
          </Link>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 mx-auto rounded-control bg-[#4F46E5] flex items-center justify-center text-white font-bold tracking-wider relative">
            <span className="text-sm">P</span>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-control text-[#667085] hover:text-[#101828] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
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

      {/* Usability Issue 8 Fix: Increase vertical whitespace between module groups to prevent 'wall of text' */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-2">
        {navGroups.map((group) => {
          const isExpanded = expandedGroups[group.id] ?? false;
          const hasActiveChild = group.items?.some((item) => item.href === pathname);
          const icon = MODULE_ICONS[group.id] || <Layers className="w-5 h-5" />;

          return (
            <div key={group.id} className="space-y-1 mb-1">
              {/* Usability Issue 13 Fix: Consistent header background without arbitrary grey container box on Home */}
              <button
                type="button"
                onClick={() => {
                  if (isCollapsed) setIsCollapsed(false);
                  toggleGroup(group.id);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-2.5 py-1.5 rounded-control text-xs font-medium transition-colors cursor-pointer",
                  hasActiveChild
                    ? "text-[#101828] font-semibold"
                    : "text-[#667085] hover:bg-[#F8F9FB] hover:text-[#101828]"
                )}
                title={isCollapsed ? group.title : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn(hasActiveChild ? "text-[#4F46E5]" : "text-[#667085]")}>
                    {icon}
                  </span>
                  {!isCollapsed && <span className="text-xs">{group.title}</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-[#667085]">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                )}
              </button>

              {/* Sub items — Active state per docs/design.md §4 */}
              {!isCollapsed && isExpanded && (
                <div className="pl-7 pr-1 space-y-0.5 pt-0.5">
                  {group.items?.map((sub, idx) => {
                    const isActive = pathname === sub.href;
                    // Usability Issue 14 Fix: Subtle category groupings for high-density lists (e.g. Transport)
                    const prevCategory = idx > 0 ? group.items[idx - 1].category : undefined;
                    const showCategoryHeader = sub.category && sub.category !== prevCategory;

                    return (
                      <React.Fragment key={sub.href}>
                        {showCategoryHeader && (
                          <span className="block text-[10px] font-semibold text-[#98A2B3] uppercase tracking-wider pt-1.5 pb-0.5 px-2.5">
                            {sub.category}
                          </span>
                        )}
                        <Link
                          href={sub.href}
                          className={cn(
                            "block px-2.5 py-1.5 rounded-control text-xs transition-colors",
                            isActive
                              ? "bg-[#EEF2FF] text-[#4338CA] font-medium border-l-[3px] border-[#4F46E5] rounded-l-none"
                              : "text-[#667085] hover:text-[#101828] hover:bg-[#F8F9FB]"
                          )}
                        >
                          {sub.title}
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

      {/* RBAC Active Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#E4E7EC]">
          <div className="rounded-control bg-[#ECFDF3] border border-[#A6F4C5] p-2.5 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#027A48] shrink-0" />
            <div className="leading-tight">
              {/* Usability Issue 3 Fix: Increase font size from text-[11px] / text-[10px] to text-xs (min ~12px) */}
              <span className="text-xs font-semibold text-[#027A48] block">
                Tenant RBAC Enforced
              </span>
              <span className="text-xs text-[#475467] block mt-0.5">
                Dynamic permission-mapped
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
