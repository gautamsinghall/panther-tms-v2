"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStoredAuth } from "@/lib/auth";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderAction {
  label: string;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "destructive";
  disabled?: boolean;
}

function renderActionIcon(icon?: React.ReactNode | React.ComponentType<{ className?: string }>) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === "function" || typeof icon === "object") {
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className="w-4 h-4" />;
  }
  return null;
}

function cleanActionLabel(label?: string): string {
  if (!label) return "";
  return label.replace(/^\+\s*/, "").trim();
}

const MODULE_TITLES: Record<string, { label: string; defaultHref: string }> = {
  transport: { label: "Transport", defaultHref: "/transport" },
  "transport-reports": { label: "Transport Reports", defaultHref: "/transport-reports/lr-register" },
  accounts: { label: "Accounts", defaultHref: "/accounts" },
  einvoicing: { label: "E-Invoicing", defaultHref: "/einvoicing/generate-irn" },
  misc: { label: "Misc (Masters)", defaultHref: "/misc/primary-group" },
  reports: { label: "Financial Reports", defaultHref: "/reports/daybook" },
  statements: { label: "Statements", defaultHref: "/statements/gst-output" },
  fleet: { label: "Fleet Management", defaultHref: "/fleet/trip-expense" },
  settings: { label: "Settings", defaultHref: "/settings/users" },
  general: { label: "General", defaultHref: "/general/billing-client" },
  company: { label: "Company", defaultHref: "/company/details" },
  profile: { label: "Profile", defaultHref: "/profile/account" },
};

const SUBROUTE_TITLES: Record<string, string> = {
  "lr-booking": "Lorry Receipts (GR / LR)",
  jobs: "Trip Orders & Jobs",
  "hire-challan": "Hire Challans",
  "market-vehicles": "Market Vehicles",
  "company-vehicles": "Company Vehicles",
  drivers: "Manage Drivers",
  "vehicle-owners": "Vehicle Owners",
  "arrival-reports": "Arrival Reports",
  "pod-records": "POD Records",
  "truck-hiring-note": "Truck Hiring Note",
  "eway-bill": "E-Way Bills",
  tracking: "Fleet Telemetry & Tracking",
  "transport-invoice": "Transport Invoices",
  "general-invoice": "General Invoices",
  "proforma-invoice": "Proforma Invoices",
  purchases: "Purchase Register",
  "receipt-voucher": "Receipt Vouchers",
  "payment-voucher": "Payment Vouchers",
  "contra-voucher": "Contra Vouchers",
  "credit-debit-notes": "Credit / Debit Notes",
  "lr-register": "LR Register",
  "invoice-register": "Invoice Register",
  "hc-register": "Hire Challan Register",
  "pending-hc": "Pending HC Report",
  unbilled: "Unbilled Reports",
  "arrival-register": "Arrival Register",
  "unused-series": "Unused Series",
  "generate-irn": "Generate IRN",
  "irn-list": "IRN Generated List",
  "cancel-irn": "Cancel IRN",
  taxpayer: "Taxpayer Verification",
  "primary-group": "Primary Groups",
  "group-in-primary": "Groups in Primary",
  subgroup: "Subgroups",
  "employee-master": "Employee Master",
  "charge-head": "Charge Heads",
  "tax-category": "Tax Categories",
  daybook: "Daybook",
  ledger: "Ledger",
  "trial-balance": "Trial Balance",
  "balance-sheet": "Balance Sheet",
  "profit-loss": "Profit & Loss",
  "sales-register": "Sales Register",
  "purchase-register": "Purchase Register",
  "bank-reconciliation": "Bank Reconciliation",
  "special-report": "Special Report",
  "gst-output": "GST Output",
  "gst-input": "GST Input",
  "os-debtor": "O/S Debtor",
  "os-creditor": "O/S Creditor",
  "tds-payable": "TDS Payable",
  "tds-return": "TDS Return",
  "opening-balance": "Opening Balance",
  "trip-expense": "Trip Expense",
  "trip-advance": "Trip Advance",
  "trip-expense-register": "Trip Expense Register",
  "truck-pnl": "Truck-Wise P&L",
  "vehicle-health": "Vehicle Health",
  documents: "Vehicle Documents",
  tyre: "Tyre Management",
  service: "Repair & Service",
  users: "Users",
  roles: "Roles & Permissions",
  "series-master": "Series Master",
  activity: "Activity Log",
  "billing-client": "Billing Clients",
  consignee: "Consignees",
  consigner: "Consignors",
  location: "Locations",
  industry: "Industries",
  designation: "Designations",
  "group-company": "Group Companies",
  unit: "Units",
  "packing-method": "Methods of Packing",
  "load-type": "Load Types",
  details: "Company Details",
  branches: "Branches & Offices",
  "api-center": "API Center",
  account: "Account Profile",
  email: "Email Settings",
  "change-password": "Change Password",
  "monthly-pnl": "Monthly P&L",
};

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  badge?: React.ReactNode;
  primaryAction?: PageHeaderAction;
  secondaryActions?: PageHeaderAction[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standardized Enterprise Header Pattern:
 * Shared route-driven breadcrumbs + Page Title + Status Badge + Action CTAs
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  badge,
  primaryAction,
  secondaryActions = [],
  actions,
  children,
  className,
}: PageHeaderProps) {
  const pathname = usePathname();

  // Compute standard, consistent route-driven breadcrumbs if omitted or incomplete
  const resolvedBreadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    let tenantPrefix = "";
    if (typeof window !== "undefined") {
      const auth = getStoredAuth();
      if (auth?.tenantId) {
        tenantPrefix = `/${auth.tenantId}`;
      } else {
        const parts = window.location.pathname.split("/").filter(Boolean);
        if (parts.length > 0 && (/^[a-z0-9]{10}$/.test(parts[0]) || parts[0] === "demo123456" || parts[0] === "demo")) {
          tenantPrefix = `/${parts[0]}`;
        }
      }
    }

    const withPrefix = (href: string) => {
      if (!href || href === "#") return href;
      if (tenantPrefix && !href.startsWith(tenantPrefix)) {
        return `${tenantPrefix}${href === "/" ? "" : href}`;
      }
      return href;
    };

    // If caller provided full breadcrumbs (with at least 2 segments), use them with prefix normalization
    if (breadcrumbs && breadcrumbs.length >= 2) {
      return breadcrumbs.map((b) => ({
        ...b,
        href: b.href ? withPrefix(b.href) : undefined,
      }));
    }

    // Otherwise, generate route-driven breadcrumbs from pathname
    const cleanPath = (pathname || "")
      .replace(/^\/[a-z0-9]{10}/, "")
      .replace(/^\/demo123456/, "")
      .replace(/^\/demo/, "") || "/";

    const segments = cleanPath.split("/").filter(Boolean);
    if (segments.length === 0) {
      return [
        { label: "Dashboard", href: withPrefix("/") },
        { label: typeof title === "string" ? title : "Overview" },
      ];
    }

    const items: BreadcrumbItem[] = [
      { label: "Dashboard", href: withPrefix("/") },
    ];

    const moduleKey = segments[0];
    const moduleInfo = MODULE_TITLES[moduleKey];
    if (moduleInfo) {
      items.push({
        label: moduleInfo.label,
        href: withPrefix(moduleInfo.defaultHref),
      });
    } else {
      items.push({
        label: moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1),
        href: withPrefix(`/${moduleKey}`),
      });
    }

    if (segments.length > 1) {
      const subKey = segments[1];
      const pageName = typeof title === "string"
        ? title
        : SUBROUTE_TITLES[subKey] || subKey.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      items.push({ label: pageName });
    } else if (typeof title === "string") {
      // If single level route e.g. /transport
      items[items.length - 1] = { label: title };
    }

    return items;
  }, [breadcrumbs, pathname, title]);
  return (
    <div className={cn("space-y-2.5 pb-4 border-b border-slate-200/80", className)}>
      {/* Breadcrumb Row */}
      {resolvedBreadcrumbs && resolvedBreadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
          {resolvedBreadcrumbs.map((crumb, idx) => {
            const isLast = idx === resolvedBreadcrumbs.length - 1;
            return (
              <React.Fragment key={`${crumb.label}-${idx}`}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-slate-800 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "font-semibold text-slate-700" : ""}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Main Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-xs sm:text-sm leading-relaxed text-slate-600 mt-1 max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {(primaryAction || secondaryActions.length > 0 || actions) && (
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {secondaryActions.map((action, idx) => (
              <Button
                key={idx}
                variant={action.variant || "secondary"}
                size="md"
                disabled={action.disabled}
                onClick={action.onClick}
                className="shadow-2xs text-xs font-semibold h-9 px-3.5 rounded-xl hover:border-slate-300"
              >
                {action.href ? (
                  <Link href={action.href} className="inline-flex items-center gap-2">
                    {renderActionIcon(action.icon)}
                    <span>{cleanActionLabel(action.label)}</span>
                  </Link>
                ) : (
                  <>
                    {renderActionIcon(action.icon)}
                    <span>{cleanActionLabel(action.label)}</span>
                  </>
                )}
              </Button>
            ))}

            {primaryAction && (
              <Button
                variant={primaryAction.variant || "primary"}
                size="md"
                disabled={primaryAction.disabled}
                onClick={primaryAction.onClick}
                className="shadow-xs text-xs font-semibold h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all flex items-center gap-2 group"
              >
                {primaryAction.href ? (
                  <Link href={primaryAction.href} className="inline-flex items-center gap-2">
                    {renderActionIcon(primaryAction.icon)}
                    <span>{cleanActionLabel(primaryAction.label)}</span>
                  </Link>
                ) : (
                  <>
                    {renderActionIcon(primaryAction.icon)}
                    <span>{cleanActionLabel(primaryAction.label)}</span>
                  </>
                )}
              </Button>
            )}

            {actions}
          </div>
        )}
      </div>

      {children && <div className="pt-2">{children}</div>}
    </div>
  );
}
