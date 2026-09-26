"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  Table,
  PlusCircle,
  X,
  Truck,
  FileText,
  FileSpreadsheet,
  Users,
  Car,
  Key,
  CalendarCheck,
  CheckSquare,
  FileSignature,
  QrCode,
  Navigation,
  Building2,
  MapPin,
  Factory,
  Briefcase,
  Scale,
  Package,
  Receipt,
  Calculator,
  Layers,
  BarChart3,
  ShieldCheck,
  UserCog,
  Sliders,
  History,
  Coins,
  ShoppingBag,
  Zap,
  ListOrdered,
  LayoutDashboard,
  LucideIcon,
} from "lucide-react";
import { useWorkspaceTabs } from "@/lib/workspace-tabs-context";
import { cn } from "@/lib/utils";

interface RouteInfo {
  title: string;
  icon: LucideIcon;
}

const ROUTE_INFO_MAP: Record<string, RouteInfo> = {
  "/": { title: "Overview Dashboard", icon: LayoutDashboard },
  "/components-demo": { title: "Components Demo", icon: Layers },

  // General
  "/general/consignee": { title: "Consignee", icon: Users },
  "/general/consigner": { title: "Consigner", icon: Building2 },
  "/general/location": { title: "Location", icon: MapPin },
  "/general/industry": { title: "Industry", icon: Factory },
  "/general/designation": { title: "Designation", icon: Briefcase },
  "/general/group-company": { title: "Group Company", icon: Building2 },
  "/general/unit": { title: "Unit", icon: Scale },
  "/general/packing-method": { title: "Method of Packing", icon: Package },

  // Transport
  "/transport/jobs": { title: "Job Creation", icon: FileText },
  "/transport/lr-booking": { title: "Lorry Receipts (GR / LR)", icon: FileText },
  "/transport/hire-challan": { title: "Hire Challans", icon: FileSpreadsheet },
  "/transport/drivers": { title: "Manage Driver", icon: Users },
  "/transport/company-vehicles": { title: "Company Vehicle", icon: Truck },
  "/transport/market-vehicles": { title: "Market Vehicle", icon: Car },
  "/transport/vehicle-owners": { title: "Vehicle Owner", icon: Key },
  "/transport/arrival-reports": { title: "Arrival Report", icon: CalendarCheck },
  "/transport/pod-records": { title: "POD Records", icon: CheckSquare },
  "/transport/truck-hiring-note": { title: "Truck Hiring Note", icon: FileSignature },
  "/transport/eway-bill": { title: "Update E-Way", icon: QrCode },
  "/transport/tracking": { title: "Tracking (FASTag/GPS)", icon: Navigation },

  // Transport Reports
  "/transport-reports/lr-register": { title: "LR Booking Register", icon: FileSpreadsheet },
  "/transport-reports/invoice-register": { title: "Invoice Register", icon: Receipt },
  "/transport-reports/lr-client-wise": { title: "LR Client-Wise", icon: Users },
  "/transport-reports/hc-register": { title: "Hire Challan Register", icon: FileSpreadsheet },
  "/transport-reports/pending-hc": { title: "Pending HC Report", icon: FileSpreadsheet },
  "/transport-reports/unbilled": { title: "Unbilled Reports", icon: FileSpreadsheet },
  "/transport-reports/arrival-register": { title: "Arrival Report Register", icon: CalendarCheck },
  "/transport-reports/unused-series": { title: "Unused GR/LR Series", icon: Layers },

  // E-Invoicing
  "/einvoicing/generate-irn": { title: "Generate IRN", icon: Zap },
  "/einvoicing/irn-list": { title: "IRN Generated List", icon: ListOrdered },
  "/einvoicing/cancel-irn": { title: "Cancel IRN", icon: Layers },
  "/einvoicing/taxpayer": { title: "Taxpayer Details", icon: Building2 },

  // Accounts
  "/accounts/transport-invoice": { title: "Transport Invoice", icon: Receipt },
  "/accounts/general-invoice": { title: "General Invoice", icon: Receipt },
  "/accounts/proforma-invoice": { title: "Proforma Invoice", icon: Receipt },
  "/accounts/purchases": { title: "Purchase Register", icon: ShoppingBag },
  "/accounts/receipt-voucher": { title: "Receipt Voucher", icon: Calculator },
  "/accounts/payment-voucher": { title: "Payment Voucher", icon: Calculator },
  "/accounts/contra-voucher": { title: "Contra Voucher", icon: Calculator },
  "/accounts/credit-debit-notes": { title: "Credit / Debit Note", icon: Coins },

  // Misc Masters
  "/misc/primary-group": { title: "Primary Group", icon: Layers },
  "/misc/group-in-primary": { title: "Group in Primary", icon: Layers },
  "/misc/subgroup": { title: "Subgroup in Group", icon: Layers },
  "/misc/employee-master": { title: "Employee Master", icon: Users },
  "/misc/charge-head": { title: "Charge Head", icon: Layers },
  "/misc/tax-category": { title: "Tax Category", icon: Layers },

  // Reports
  "/reports/daybook": { title: "Daybook", icon: BarChart3 },
  "/reports/ledger": { title: "Ledger", icon: BarChart3 },
  "/reports/trial-balance": { title: "Trial Balance", icon: BarChart3 },
  "/reports/balance-sheet": { title: "Balance Sheet", icon: BarChart3 },
  "/reports/profit-loss": { title: "Profit & Loss", icon: BarChart3 },
  "/reports/sales-register": { title: "Sales Register", icon: BarChart3 },
  "/reports/purchase-register": { title: "Purchase Register", icon: BarChart3 },
  "/reports/bank-reconciliation": { title: "Bank Reconciliation", icon: BarChart3 },
  "/reports/special-report": { title: "Special Report", icon: BarChart3 },

  // Statements
  "/statements/gst-output": { title: "GST Output", icon: FileSpreadsheet },
  "/statements/gst-input": { title: "GST Input", icon: FileSpreadsheet },
  "/statements/os-debtor": { title: "O/S Debtor", icon: Users },
  "/statements/os-creditor": { title: "O/S Creditor", icon: Users },
  "/statements/tds-payable": { title: "TDS Payable", icon: Calculator },
  "/statements/tds-return": { title: "TDS Return", icon: Calculator },
  "/statements/opening-balance": { title: "Opening Balance Details", icon: Calculator },

  // Settings
  "/settings/users": { title: "User Management", icon: UserCog },
  "/settings/roles": { title: "Roles & Permissions", icon: ShieldCheck },
  "/settings/series-master": { title: "Series Master", icon: Layers },
  "/settings/admin": { title: "Admin Setting", icon: Sliders },
  "/settings/activity": { title: "User Activity Log", icon: History },
};

function formatRouteTitle(pathname: string): RouteInfo {
  if (ROUTE_INFO_MAP[pathname]) {
    return ROUTE_INFO_MAP[pathname];
  }
  const clean = pathname.replace(/^\//, "").split("/").pop() || "Records";
  const formatted = clean
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return { title: formatted, icon: Table };
}

export function WorkspaceTabBar() {
  const pathname = usePathname();
  const { activeTab, setActiveTab, formTabInfo, closeFormTab, isFormOpen } = useWorkspaceTabs();

  const routeInfo = formatRouteTitle(pathname);
  const ListIcon = routeInfo.icon;

  return (
    <div className="h-11 border-b border-slate-200/90 bg-[#F1F5F9]/80 px-4 pt-1.5 flex items-center justify-between select-none shrink-0 min-w-0">
      {/* Tab Items List */}
      <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar">
        {/* Tab 1: Module Records / List Tab */}
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={cn(
            "group relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-t-lg transition-all border-t border-l border-r cursor-pointer shrink-0",
            activeTab === "list"
              ? "bg-[#F8FAFC] text-slate-900 border-slate-200/90 shadow-2xs -mb-px z-10 font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border-transparent"
          )}
          title={`View ${routeInfo.title} records`}
        >
          <ListIcon className={cn("w-3.5 h-3.5 shrink-0", activeTab === "list" ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
          <span className="truncate max-w-[200px]">{routeInfo.title}</span>

          {/* Indicator dot if form draft is active in background */}
          {isFormOpen && activeTab === "list" && (
            <span
              className="flex h-2 w-2 relative ml-0.5"
              title="Form draft is open in background"
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
            </span>
          )}
        </button>

        {/* Tab 2: Full Screen Creation / Form Tab (displayed when user opens New / Add) */}
        {isFormOpen && (
          <div
            onClick={() => setActiveTab("form")}
            className={cn(
              "group relative flex items-center gap-2 pl-3.5 pr-2 py-1.5 text-xs font-semibold rounded-t-lg transition-all border-t border-l border-r cursor-pointer shrink-0 animate-in fade-in slide-in-from-left-2 duration-150",
              activeTab === "form"
                ? "bg-[#F8FAFC] text-indigo-700 border-slate-200/90 shadow-2xs -mb-px z-10 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border-transparent"
            )}
            title={formTabInfo?.title || "New Entry Form"}
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="max-w-[220px] truncate">
              {formTabInfo?.title || "New Entry Form"}
            </span>

            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/70 uppercase tracking-wider font-bold shrink-0">
              Form Tab
            </span>

            {/* Close Form Tab Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeFormTab();
              }}
              title="Close tab (Esc)"
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-0.5 cursor-pointer shrink-0"
              aria-label="Close tab"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Right: Quick Context Actions / Status */}
      <div className="flex items-center gap-2.5 shrink-0 pl-2">
        {isFormOpen && activeTab === "form" && (
          <span className="text-[11px] font-medium text-slate-500 hidden sm:flex items-center gap-1.5">
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-600 border border-slate-300 font-semibold shadow-2xs">
              Esc
            </kbd>
            <span>to close</span>
          </span>
        )}

        {isFormOpen && activeTab === "list" && (
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/90 px-2.5 py-1 rounded-lg border border-indigo-200/70 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
          >
            <span>Resume Form Tab →</span>
          </button>
        )}
      </div>
    </div>
  );
}
