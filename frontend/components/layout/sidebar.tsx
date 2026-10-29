"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Truck,
  Radio,
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
  Boxes,
  UserCheck,
  Send,
  MapPin,
  Factory,
  Briefcase,
  Building,
  Scale,
  Package,
  ClipboardList,
  FileText,
  Users,
  Car,
  Key,
  CalendarCheck,
  CheckSquare,
  FileSignature,
  QrCode,
  Navigation,
  BookOpen,
  Clock,
  FileMinus,
  Hash,
  Zap,
  ListOrdered,
  XCircle,
  FileClock,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Coins,
  Folder,
  FolderTree,
  GitBranch,
  BadgeCheck,
  Tag,
  BadgePercent,
  Calendar,
  BookMarked,
  TableProperties,
  TrendingUp,
  BarChart,
  PieChart,
  Landmark,
  Sparkles,
  FileUp,
  FileDown,
  UserMinus,
  UserPlus,
  Undo2,
  Wallet,
  Fuel,
  Banknote,
  ScrollText,
  LineChart,
  Activity,
  Files,
  CircleDot,
  Wrench,
  UserCog,
  Sliders,
  History,
  Network,
  KeyRound,
  Compass,
  Mail,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth, getStoredNavigation, updateStoredNavigation } from "@/lib/auth";
import { useWorkspaceTabs } from "@/lib/workspace-tabs-context";
import { PlanGateDialog, formatPlanName } from "@/components/ui/plan-gate";

export interface NavSubItem {
  feature?: string;
  title: string;
  href: string;
  category?: string;
  is_locked?: boolean;
  required_plan?: string | null;
}

export interface NavGroup {
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
export const ALL_NAVIGATION_MODULES: NavGroup[] = [
  {
    id: "home",
    title: "Home",
    items: [
      { feature: "overview", title: "Overview Dashboard", href: "/" },
    ],
  },
  {
    id: "general",
    title: "General",
    items: [
      { feature: "billing_client", title: "Billing Client", href: "/general/billing-client" },
      { feature: "consignee", title: "Consignee", href: "/general/consignee" },
      { feature: "consigner", title: "Consigner", href: "/general/consigner" },
      { feature: "vendor", title: "Vendor", href: "/general/vendor" },
      { feature: "location", title: "Location", href: "/general/location" },
      { feature: "industry", title: "Industry", href: "/general/industry" },
      { feature: "designation", title: "Designation", href: "/general/designation" },
      { feature: "group_company", title: "Group Company", href: "/general/group-company" },
      { feature: "unit", title: "Unit", href: "/general/unit" },
      { feature: "method_of_packing", title: "Method of Packing", href: "/general/packing-method" },
      { feature: "load_type", title: "Load Type", href: "/general/load-type" },
    ],
  },
  {
    id: "transport",
    title: "Transport",
    items: [
      { feature: "jobs", title: "Job Creation", href: "/transport/jobs" },
      { feature: "lr_booking", title: "GR/LR Booking", href: "/transport/lr-booking" },
      { feature: "hire_challan", title: "Hire Challan", href: "/transport/hire-challan" },
      { feature: "drivers", title: "Manage Driver", href: "/transport/drivers" },
      { feature: "company_vehicles", title: "Company Vehicle", href: "/transport/company-vehicles" },
      { feature: "market_vehicles", title: "Market Vehicle", href: "/transport/market-vehicles" },
      { feature: "vehicle_owners", title: "Vehicle Owner", href: "/transport/vehicle-owners" },
      { feature: "arrival_reports", title: "Arrival Report", href: "/transport/arrival-reports" },
      { feature: "pod_records", title: "POD Records", href: "/transport/pod-records" },
      { feature: "truck_hiring_note", title: "Truck Hiring Note", href: "/transport/truck-hiring-note" },
      { feature: "eway_bill", title: "Update E-Way", href: "/transport/eway-bill" },
    ],
  },
  {
    id: "tracking",
    title: "Tracking",
    items: [
      { feature: "gps_tracking", title: "GPS Tracking", href: "/tracking/gps" },
      { feature: "fastag_tracking", title: "FASTag Tracking", href: "/tracking/fastag" },
      { feature: "tracking", title: "Sim Based Tracking", href: "/tracking/sim" },
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
      { feature: "master_ledger", title: "Master Ledger", href: "/accounts/master-ledger" },
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
    id: "api_center",
    title: "API Center",
    items: [
      { feature: "eway_bill_api", title: "E-Way Bill API", href: "/api-center/eway-bill" },
      { feature: "gps_tracking_api", title: "GPS Tracking API", href: "/api-center/gps" },
      { feature: "fastag_tracking_api", title: "FASTag Tracking API", href: "/api-center/fastag" },
      { feature: "sim_tracking_api", title: "SIM Based Tracking API", href: "/api-center/sim" },
    ],
  },
  {
    id: "company",
    title: "Company Settings",
    items: [
      { feature: "company_details", title: "Company Details", href: "/company/details" },
      { feature: "branch", title: "Issuing Offices / Branches", href: "/company/branches" },
      { feature: "users", title: "User Management", href: "/company/users" },
      { feature: "roles", title: "Roles & Permissions", href: "/company/roles" },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    items: [
      { feature: "series_master", title: "Series Master", href: "/settings/series-master" },
      { feature: "admin_setting", title: "Admin Setting", href: "/settings/admin" },
      { feature: "activity", title: "User Activity Log", href: "/settings/activity" },
    ],
  },
  {
    id: "profile",
    title: "Profile",
    items: [
      { feature: "account", title: "User Account", href: "/profile/account" },
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
  company: <Building2 className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
  profile: <UserCircle className="w-5 h-5" />,
  tracking: <Navigation className="w-5 h-5" />,
  api_center: <KeyRound className="w-5 h-5" />,
  "api-center": <KeyRound className="w-5 h-5" />,
};

// Sub-item specific Lucide icons for all modules
const SUB_ITEM_ICONS_BY_HREF: Record<string, React.ComponentType<{ className?: string }>> = {
  // Home
  "/": LayoutDashboard,

  // General
  "/general/billing-client": Building2,
  "/general/consignee": UserCheck,
  "/general/consigner": Send,
  "/general/vendor": Users,
  "/general/location": MapPin,
  "/general/industry": Factory,
  "/general/designation": Briefcase,
  "/general/group-company": Building,
  "/general/unit": Scale,
  "/general/packing-method": Package,
  "/general/load-type": Layers,

  // Transport & Tracking
  "/transport/jobs": ClipboardList,
  "/transport/lr-booking": FileText,
  "/transport/hire-challan": FileSpreadsheet,
  "/transport/drivers": Users,
  "/transport/company-vehicles": Truck,
  "/transport/market-vehicles": Car,
  "/transport/vehicle-owners": Key,
  "/transport/arrival-reports": CalendarCheck,
  "/transport/pod-records": CheckSquare,
  "/transport/truck-hiring-note": FileSignature,
  "/transport/eway-bill": QrCode,
  "/tracking/gps": Compass,
  "/tracking/fastag": Navigation,
  "/tracking/sim": Radio,

  // Transport Reports
  "/transport-reports/lr-register": BookOpen,
  "/transport-reports/invoice-register": Receipt,
  "/transport-reports/lr-client-wise": Users,
  "/transport-reports/hc-register": FileSpreadsheet,
  "/transport-reports/pending-hc": Clock,
  "/transport-reports/unbilled": FileMinus,
  "/transport-reports/arrival-register": CalendarCheck,
  "/transport-reports/unused-series": Hash,

  // E-Invoicing
  "/einvoicing/generate-irn": Zap,
  "/einvoicing/irn-list": ListOrdered,
  "/einvoicing/cancel-irn": XCircle,
  "/einvoicing/taxpayer": Building2,

  // Accounts
  "/accounts/transport-invoice": FileText,
  "/accounts/general-invoice": Receipt,
  "/accounts/proforma-invoice": FileClock,
  "/accounts/purchases": ShoppingBag,
  "/accounts/receipt-voucher": ArrowDownLeft,
  "/accounts/payment-voucher": ArrowUpRight,
  "/accounts/contra-voucher": ArrowLeftRight,
  "/accounts/credit-debit-notes": Coins,
  "/accounts/master-ledger": BookOpen,

  // Misc
  "/misc/primary-group": Folder,
  "/misc/group-in-primary": FolderTree,
  "/misc/subgroup": GitBranch,
  "/misc/employee-master": BadgeCheck,
  "/misc/charge-head": Tag,
  "/misc/tax-category": BadgePercent,

  // Reports
  "/reports/daybook": Calendar,
  "/reports/ledger": BookMarked,
  "/reports/trial-balance": Scale,
  "/reports/balance-sheet": TableProperties,
  "/reports/profit-loss": TrendingUp,
  "/reports/sales-register": BarChart,
  "/reports/purchase-register": PieChart,
  "/reports/bank-reconciliation": Landmark,
  "/reports/special-report": Sparkles,

  // Statements
  "/statements/gst-output": FileUp,
  "/statements/gst-input": FileDown,
  "/statements/os-debtor": UserMinus,
  "/statements/os-creditor": UserPlus,
  "/statements/tds-payable": Receipt,
  "/statements/tds-return": Undo2,
  "/statements/opening-balance": Wallet,

  // Fleet
  "/fleet/trip-expense": Fuel,
  "/fleet/trip-advance": Banknote,
  "/fleet/trip-expense-register": ScrollText,
  "/fleet/truck-pnl": LineChart,
  "/fleet/vehicle-health": Activity,
  "/fleet/documents": Files,
  "/fleet/tyre": CircleDot,
  "/fleet/service": Wrench,

  // Company Settings
  "/company/details": Building2,
  "/company/branches": Network,
  "/company/users": UserCog,
  "/company/roles": ShieldCheck,

  // API Center
  "/api-center/eway-bill": FileSpreadsheet,
  "/api-center/gps": Compass,
  "/api-center/fastag": Navigation,
  "/api-center/sim": Radio,

  // Settings
  "/settings/users": UserCog,
  "/settings/roles": ShieldCheck,
  "/settings/series-master": Hash,
  "/settings/admin": Sliders,
  "/settings/activity": History,

  // Profile
  "/profile/company": Building2,
  "/profile/account": UserCircle,
  "/profile/branch": Network,
  "/profile/change-password": KeyRound,
  "/profile/email": Mail,
  "/profile/monthly-pnl": TrendingUp,
};

const SUB_ITEM_ICONS_BY_FEATURE: Record<string, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  components_demo: Boxes,
  consignee: UserCheck,
  consigner: Send,
  vendor: Users,
  location: MapPin,
  industry: Factory,
  designation: Briefcase,
  group_company: Building,
  unit: Scale,
  method_of_packing: Package,
  load_type: Layers,
  jobs: ClipboardList,
  lr_booking: FileText,
  hire_challan: FileSpreadsheet,
  drivers: Users,
  company_vehicles: Truck,
  market_vehicles: Car,
  vehicle_owners: Key,
  arrival_reports: CalendarCheck,
  pod_records: CheckSquare,
  truck_hiring_note: FileSignature,
  eway_bill: QrCode,
  tracking: Radio,
  fastag_tracking: Navigation,
  lr_register: BookOpen,
  invoice_register: Receipt,
  lr_client_wise: Users,
  hc_register: FileSpreadsheet,
  pending_hc: Clock,
  unbilled: FileMinus,
  arrival_register: CalendarCheck,
  unused_series: Hash,
  generate_irn: Zap,
  irn_list: ListOrdered,
  cancel_irn: XCircle,
  taxpayer: Building2,
  transport_invoice: FileText,
  general_invoice: Receipt,
  proforma_invoice: FileClock,
  purchases: ShoppingBag,
  receipt_voucher: ArrowDownLeft,
  payment_voucher: ArrowUpRight,
  contra_voucher: ArrowLeftRight,
  credit_debit_notes: Coins,
  master_ledger: BookOpen,
  primary_group: Folder,
  group_in_primary: FolderTree,
  subgroup: GitBranch,
  employee_master: BadgeCheck,
  charge_head: Tag,
  tax_category: BadgePercent,
  daybook: Calendar,
  ledger: BookMarked,
  trial_balance: Scale,
  balance_sheet: TableProperties,
  profit_loss: TrendingUp,
  sales_register: BarChart,
  purchase_register: PieChart,
  bank_reconciliation: Landmark,
  special_report: Sparkles,
  gst_output: FileUp,
  gst_input: FileDown,
  os_debtor: UserMinus,
  os_creditor: UserPlus,
  tds_payable: Receipt,
  tds_return: Undo2,
  opening_balance: Wallet,
  trip_expense: Fuel,
  trip_advance: Banknote,
  expense_register: ScrollText,
  truck_pnl: LineChart,
  vehicle_health: Activity,
  documents: Files,
  tyre: CircleDot,
  service: Wrench,
  users: UserCog,
  roles: ShieldCheck,
  series_master: Hash,
  admin_setting: Sliders,
  activity: History,
  company: Building2,
  company_details: Building2,
  api_center: KeyRound,
  eway_bill_api: FileSpreadsheet,
  fastag_api: Navigation,
  fastag_tracking_api: Navigation,
  gps_tracking: Compass,
  gps_tracking_api: Compass,
  sim_tracking: Radio,
  sim_tracking_api: Radio,
  account: UserCircle,
  branch: Network,
  change_password: KeyRound,
  email: Mail,
  monthly_pnl: TrendingUp,
};

function getSubItemIcon(sub: NavSubItem): React.ComponentType<{ className?: string }> {
  if (sub.href && SUB_ITEM_ICONS_BY_HREF[sub.href]) {
    return SUB_ITEM_ICONS_BY_HREF[sub.href];
  }
  if (sub.feature && SUB_ITEM_ICONS_BY_FEATURE[sub.feature]) {
    return SUB_ITEM_ICONS_BY_FEATURE[sub.feature];
  }
  return CircleDot;
}

function normalizeNavGroups(groups: NavGroup[]): NavGroup[] {
  return groups.map((g) => {
    let items = g.items?.map((it) => {
      if (it.href === "/tracking/sim" || it.href === "/transport/tracking" || it.feature === "tracking") {
        return { ...it, title: "Sim Based Tracking" };
      }
      if (it.href === "/tracking/fastag" || it.href === "/transport/tracking/fastag" || it.feature === "fastag_tracking") {
        return { ...it, title: "FASTag Tracking" };
      }
      return it;
    }) || [];

    // Ensure Master Ledger is always present under Accounts module
    if (g.id === "accounts" && !items.some((it) => it.href === "/accounts/master-ledger" || it.feature === "master_ledger")) {
      items = [
        ...items,
        { feature: "master_ledger", title: "Master Ledger", href: "/accounts/master-ledger" },
      ];
    }

    return { ...g, items };
  });
}

export function Sidebar() {
  const pathname = usePathname();
  const { isFormOpen, closeFormTab, setActiveTab } = useWorkspaceTabs();
  const [navGroups, setNavGroups] = useState<NavGroup[]>(() => {
    if (typeof window !== "undefined") {
      const cached = getStoredNavigation();
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return normalizeNavGroups(cached);
      }
    }
    return normalizeNavGroups(ALL_NAVIGATION_MODULES);
  });
  const [isLoadingNav, setIsLoadingNav] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const cached = getStoredNavigation();
      return !cached || cached.length === 0;
    }
    return true;
  });
  const [tenantPrefix, setTenantPrefix] = useState("");

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.tenantId) {
      setTenantPrefix(`/${auth.tenantId}`);
    } else if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      if (parts.length > 0 && (/^[a-z0-9]{10}$/.test(parts[0]) || parts[0] === "demo123456" || parts[0] === "demo")) {
        setTenantPrefix(`/${parts[0]}`);
      }
    }
  }, []);

  const normalizedPathname = pathname
    ? pathname.replace(/^\/[a-z0-9]{10}/, "").replace(/^\/demo123456/, "").replace(/^\/demo/, "") || "/"
    : "/";
  
  // Usability Issue 6 Fix: Only keep the active route's group expanded by default (Hick's Law)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    home: true,
  });
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("panther_sidebar_collapsed");
      if (stored !== null) return stored === "true";
      return window.innerWidth < 768;
    }
    return false;
  });
  const [planGate, setPlanGate] = useState<{ featureName: string; requiredPlan: string } | null>(null);

  // Motion accessibility & session-based entrance sequence (runs once per session / login)
  const shouldReduceMotion = useReducedMotion();
  const [hasEntered, setHasEntered] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("panther_sidebar_entrance_complete") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (!hasEntered && navGroups.length > 0) {
      const timer = setTimeout(() => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("panther_sidebar_entrance_complete", "true");
          setHasEntered(true);
        }
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [hasEntered, navGroups.length]);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("panther_sidebar_collapsed", next ? "true" : "false");
      }
      return next;
    });
  };

  useEffect(() => {
    const collapseForNarrowViewport = () => {
      if (window.innerWidth < 768) setIsCollapsed(true);
    };
    collapseForNarrowViewport();
    window.addEventListener("resize", collapseForNarrowViewport);
    return () => window.removeEventListener("resize", collapseForNarrowViewport);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadNavigation() {
      try {
        const data = await apiClient<NavGroup[]>("/api/v1/auth/navigation");
        if (isMounted && Array.isArray(data)) {
          const normalized = normalizeNavGroups(data);
          setNavGroups(normalized);
          updateStoredNavigation(normalized);
          const expanded: Record<string, boolean> = {};
          normalized.forEach((g) => {
            if (g.items?.some((it) => it.href === normalizedPathname || normalizedPathname.startsWith(`/${g.id}`))) {
              expanded[g.id] = true;
            }
          });
          if (Object.keys(expanded).length > 0) {
            setExpandedGroups(expanded);
          }
        }
      } catch (err: any) {
        if (err?.status === 401) {
          // Auth error: handled by apiClient / auth guard redirecting to /login
          return;
        }
        if (isMounted) {
          setNavGroups((prev) => (prev.length > 0 ? prev : normalizeNavGroups(ALL_NAVIGATION_MODULES)));
        }
      } finally {
        if (isMounted) {
          setIsLoadingNav(false);
        }
      }
    }
    loadNavigation();
    return () => {
      isMounted = false;
    };
  }, [normalizedPathname]);

  // Keep only the active module group open when navigating
  useEffect(() => {
    if (normalizedPathname && navGroups.length > 0) {
      navGroups.forEach((g) => {
        if (g.items?.some((it) => it.href === normalizedPathname || normalizedPathname.startsWith(`/${g.id}`))) {
          setExpandedGroups((prev) => ({ ...prev, [g.id]: true }));
        }
      });
    }
  }, [normalizedPathname, navGroups]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const EASE_CUBIC: [number, number, number, number] = [0.16, 1, 0.3, 1];

  // Motion variants for cascading stagger sequence
  const sidebarVariants: Variants = {
    hidden: { x: shouldReduceMotion ? 0 : -20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.28,
        ease: EASE_CUBIC,
      },
    },
  };

  const navListVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.038,
        delayChildren: shouldReduceMotion ? 0 : 0.08,
      },
    },
  };

  const navItemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.28,
        ease: EASE_CUBIC,
      },
    },
  };

  return (
    <>
    <motion.aside
      initial={hasEntered ? false : "hidden"}
      animate={{
        x: 0,
        opacity: 1,
        width: isCollapsed ? 68 : 288,
      }}
      variants={sidebarVariants}
      transition={{
        x: { duration: shouldReduceMotion ? 0 : 0.28, ease: EASE_CUBIC },
        opacity: { duration: shouldReduceMotion ? 0 : 0.28, ease: EASE_CUBIC },
        width: { duration: shouldReduceMotion ? 0 : 0.24, ease: EASE_CUBIC },
      }}
      className={cn(
        "relative flex flex-col border-r border-slate-200/80 bg-white select-none z-30 shrink-0 h-screen overflow-hidden",
        "will-change-[width]"
      )}
    >
      {/* Brand Header — Clean Transparent Enterprise Logo & Workspace Identity */}
      <div className="flex h-16 items-center justify-between px-3 border-b border-slate-200/80 bg-white shrink-0">
        <AnimatePresence mode="wait" initial={false}>
          {!isCollapsed ? (
            <motion.div
              key="brand-expanded"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.16 }}
              className="flex items-center min-w-0 flex-1 overflow-hidden"
            >
              <Link
                href={tenantPrefix || "/"}
                onClick={() => {
                  if (isFormOpen) closeFormTab(true);
                  setActiveTab("list");
                }}
                className="flex items-center gap-2.5 group min-w-0"
              >
                <img
                  src="/panther-logo.png"
                  alt="PantherTMS Logo"
                  className="h-9 w-auto max-w-[52px] object-contain shrink-0 drop-shadow-xs transition-transform duration-200"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold tracking-tight text-slate-900 transition-colors truncate">
                      Panther<span className="text-indigo-600">TMS</span>
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                      v2.0
                    </span>
                  </div>
                  <span className="block text-[11px] text-slate-500 font-medium tracking-tight truncate">
                    Panther Digital Solutions
                  </span>
                </div>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="brand-collapsed"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.16 }}
              className="mx-auto flex items-center justify-center"
            >
              <Tooltip content="PantherTMS v2.0" side="right">
                <Link
                  href={tenantPrefix || "/"}
                  onClick={() => {
                    if (isFormOpen) closeFormTab(true);
                    setActiveTab("list");
                  }}
                  className="flex items-center justify-center p-1"
                  title="PantherTMS"
                >
                  <img
                    src="/panther-logo.png"
                    alt="PantherTMS Logo"
                    className="h-8 w-auto max-w-[34px] object-contain drop-shadow-xs transition-transform duration-200"
                  />
                </Link>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={handleToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#F5F5F7] hover:bg-slate-100 dark:hover:bg-[#1C1C22] transition-colors cursor-pointer shrink-0 ml-1"
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
      <motion.div
        variants={navListVariants}
        initial={hasEntered ? false : "hidden"}
        animate="visible"
        className="flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-sidebar-scroll"
      >
        {isLoadingNav && navGroups.length === 0 ? (
          <div className="py-2 px-1 space-y-2 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-100",
                  isCollapsed ? "justify-center p-2.5" : "px-2.5 py-2.5"
                )}
              >
                <div className="w-4 h-4 rounded bg-slate-200 shrink-0" />
                {!isCollapsed && <div className="h-3 bg-slate-200 rounded w-28" />}
              </div>
            ))}
          </div>
        ) : navGroups.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-slate-400">
            {!isCollapsed && "No authorized modules found."}
          </div>
        ) : (
          navGroups.map((group) => {
            const isExpanded = expandedGroups[group.id] ?? false;
            const hasActiveChild = group.items?.some((item) => item.href === normalizedPathname);
            const icon = MODULE_ICONS[group.id] || <Layers className="w-5 h-5" />;

            return (
              <motion.div
                key={group.id}
                variants={navItemVariants}
                className="space-y-0.5"
              >
                {isCollapsed ? (
                  <Tooltip content={group.title} side="right">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCollapsed(false);
                        toggleGroup(group.id);
                      }}
                      className={cn(
                        "w-11 h-11 mx-auto flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer group select-none relative",
                        hasActiveChild
                          ? "bg-indigo-50/90 text-indigo-600 border border-indigo-200/80 shadow-2xs"
                          : "text-slate-600 dark:text-[#CACAD0] hover:bg-slate-100 dark:hover:bg-[#1C1C22] hover:text-slate-900 dark:hover:text-[#F5F5F7] active:bg-slate-200/50"
                      )}
                      title={group.title}
                      aria-label={group.title}
                    >
                      <span className={cn(
                        "transition-transform duration-150",
                        hasActiveChild ? "text-indigo-600" : "text-slate-500"
                      )}>
                        {icon}
                      </span>
                      {hasActiveChild && (
                        <span className="absolute -left-1 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]" />
                      )}
                    </button>
                  </Tooltip>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "group flex w-full items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer select-none",
                      hasActiveChild
                        ? "text-slate-900 dark:text-[#F5F5F7] font-semibold bg-slate-100/90 dark:bg-[#17171B] border border-slate-200/80 dark:border-[#303036] shadow-2xs"
                        : "text-slate-700 dark:text-[#CACAD0] hover:bg-slate-100 dark:hover:bg-[#1C1C22] hover:text-slate-900 dark:hover:text-[#F5F5F7] active:bg-slate-200/50"
                    )}
                    aria-label={group.title}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                      <span className={cn(
                        "shrink-0 transition-all duration-150",
                        hasActiveChild ? "text-indigo-600" : "text-slate-500"
                      )}>
                        {icon}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {group.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {group.is_locked && (
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-50 border border-amber-200/80 text-amber-700 shadow-2xs shrink-0"
                          title={`Requires ${formatPlanName(group.required_plan)} plan`}
                        >
                          <Lock className="w-2.5 h-2.5 shrink-0" />
                        </span>
                      )}
                      <motion.span
                        className="text-slate-400 shrink-0 inline-flex items-center justify-center"
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </motion.span>
                    </div>
                  </button>
                )}

                {/* Sub items — Accordion with Staggered Linear Inset Pill Active State */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && isExpanded && (
                    <motion.div
                      key={`submenu-${group.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: "auto",
                        opacity: 1,
                        transition: {
                          height: { duration: shouldReduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] },
                          opacity: { duration: shouldReduceMotion ? 0 : 0.18, delay: 0.04 },
                        },
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                        transition: {
                          height: { duration: shouldReduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] },
                          opacity: { duration: shouldReduceMotion ? 0 : 0.12 },
                        },
                      }}
                      className="overflow-hidden pl-3.5 pr-1 space-y-0.5 pt-0.5 border-l border-slate-100/90 ml-4 my-0.5 relative"
                    >
                      {group.items?.map((sub) => {
                        const isActive = normalizedPathname === sub.href;
                        const SubIcon = getSubItemIcon(sub);

                        return (
                          <Link
                            key={sub.href}
                            href={sub.is_locked ? "#" : `${tenantPrefix}${sub.href}`}
                            onClick={(e) => {
                              if (sub.is_locked) {
                                e.preventDefault();
                                setPlanGate({
                                  featureName: sub.title,
                                  requiredPlan: sub.required_plan || group.required_plan || "BUSINESS",
                                });
                                return;
                              }
                              if (isFormOpen) {
                                closeFormTab(true);
                              }
                              if (normalizedPathname === sub.href) {
                                setActiveTab("list");
                              }
                            }}
                            className={cn(
                              "group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs sm:text-[13px] transition-all duration-150 select-none",
                              sub.is_locked
                                ? "text-slate-400 opacity-80 cursor-not-allowed"
                                : isActive
                                ? "bg-indigo-50/90 text-indigo-700 font-semibold border border-indigo-200/60 shadow-2xs"
                                : "text-slate-600 dark:text-[#CACAD0] hover:bg-slate-100/80 dark:hover:bg-[#1C1C22] hover:text-slate-900 dark:hover:text-[#F5F5F7]"
                            )}
                          >
                            {/* Slim Animated Vertical Accent Indicator (Linear style) */}
                            {isActive && !sub.is_locked && (
                              <motion.span
                                layoutId="sidebarActiveIndicator"
                                className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.35)]"
                                transition={{
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 35,
                                }}
                              />
                            )}

                            <span className="truncate flex items-center gap-2 min-w-0">
                              <span
                                className={cn(
                                  "shrink-0 transition-all duration-150",
                                  sub.is_locked
                                    ? "text-slate-300"
                                    : isActive
                                    ? "text-indigo-600 scale-105"
                                    : "text-slate-400"
                                )}
                              >
                                <SubIcon className="w-3.5 h-3.5" />
                              </span>
                              <span className="truncate">{sub.title}</span>
                              {sub.is_locked && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 uppercase animate-in fade-in-0 duration-150">
                                  <Lock className="w-2 h-2" />
                                  {formatPlanName(sub.required_plan || group.required_plan)}
                                </span>
                              )}
                            </span>
                            {isActive && !sub.is_locked && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 shadow-xs"
                              />
                            )}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* RBAC Active Footer — Linear/Stripe Enterprise Status */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-slate-200/80 dark:border-[#303036] bg-slate-50/50 dark:bg-[#101013]">
          <div className="rounded-lg bg-white dark:bg-[#17171B] border border-slate-200/80 dark:border-[#303036] p-2.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <div className="leading-tight truncate">
                <span className="text-xs font-semibold text-slate-800 dark:text-[#F5F5F7] block truncate">
                  Tenant RBAC Active
                </span>
                <span className="text-xs text-slate-500 dark:text-[#898991] block truncate">
                  Multi-tenant isolated
                </span>
              </div>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-slate-200/80 dark:border-[#303036] bg-slate-50/50 dark:bg-[#101013] flex justify-center">
          <Tooltip content="Tenant RBAC Active (Multi-tenant isolated)" side="right">
            <div className="relative flex h-4 w-4 items-center justify-center cursor-default">
              <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </div>
          </Tooltip>
        </div>
      )}
    </motion.aside>
    <PlanGateDialog
      isOpen={Boolean(planGate)}
      onClose={() => setPlanGate(null)}
      featureName={planGate?.featureName}
      requiredPlan={planGate?.requiredPlan}
    />
    </>
  );
}
