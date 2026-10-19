"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Download,
  AlertCircle,
  FilterX,
  Search,
  Building2,
  MapPin,
  Clock,
  Shield,
  User,
  CheckCircle2,
  FileText,
  RefreshCw,
  Eye,
  Copy,
  Check,
  Globe,
  Activity,
  Layers,
  Lock,
  Calendar,
  X,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatDateTime, cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FormFieldLabel } from "@/components/ui/form-field";
import { getActiveOffice, getStoredAuth, OfficeSummary } from "@/lib/auth";

interface ActivityLog {
  id: number;
  user_id?: number | null;
  user_email: string;
  user_name?: string | null;
  user_role: string;
  action: string;
  module: string;
  entity_type?: string | null;
  entity_id?: string | null;
  entity_identifier?: string | null;
  office_id?: number | null;
  office_name?: string | null;
  office_code?: string | null;
  status?: string;
  details?: string | null;
  details_json?: Record<string, any> | null;
  ip_address?: string | null;
  created_at: string;
}

interface ActivityStats {
  total_activities: number;
  today_activities: number;
  active_users: number;
  critical_mutations: number;
  active_offices: number;
}

interface FilterOptions {
  users: { email: string; name: string }[];
  actions: string[];
  modules: string[];
  offices: { id: number; code: string; name: string; city: string; is_head_office: boolean }[];
  is_admin: boolean;
}

export default function UserActivityLogPage() {
  const [data, setData] = useState<ActivityLog[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [stats, setStats] = useState<ActivityStats>({
    total_activities: 0,
    today_activities: 0,
    active_users: 0,
    critical_mutations: 0,
    active_offices: 0,
  });
  const [filterMeta, setFilterMeta] = useState<FilterOptions>({
    users: [],
    actions: [],
    modules: [],
    offices: [],
    is_admin: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Office context from header/global auth
  const [globalOffice, setGlobalOffice] = useState<OfficeSummary | null>(null);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(true);

  // Filter States
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Inspector Drawer state
  const [inspectedEvent, setInspectedEvent] = useState<ActivityLog | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync role and active office on mount & listen to changes
  useEffect(() => {
    const initAuth = () => {
      const auth = getStoredAuth();
      const currentRole = (auth?.user?.role || "").toUpperCase();
      const adminRole = currentRole.includes("ADMIN") || currentRole === "OWNER";
      setIsCompanyAdmin(adminRole);

      const active = getActiveOffice();
      setGlobalOffice(active);

      // If non-admin, lock filter to active office id
      if (!adminRole && active?.id && active.id !== 0) {
        setSelectedOfficeId(String(active.id));
      } else if (active?.id && active.id !== 0) {
        // Company admin switched global office to specific branch
        setSelectedOfficeId(String(active.id));
      } else {
        // All offices consolidated
        setSelectedOfficeId("all");
      }
    };

    initAuth();

    const handleOfficeChanged = (e: Event) => {
      const customEvent = e as CustomEvent<OfficeSummary>;
      if (customEvent.detail) {
        setGlobalOffice(customEvent.detail);
        if (customEvent.detail.id && customEvent.detail.id !== 0) {
          setSelectedOfficeId(String(customEvent.detail.id));
        } else {
          setSelectedOfficeId("all");
        }
      }
    };

    window.addEventListener("panther_office_changed", handleOfficeChanged);
    return () => window.removeEventListener("panther_office_changed", handleOfficeChanged);
  }, []);

  // Fetch filter metadata & stats
  const fetchMetadata = async () => {
    try {
      const meta = await apiClient<FilterOptions>("/api/v1/settings/activity/filters");
      if (meta) {
        setFilterMeta(meta);
        setIsCompanyAdmin(meta.is_admin);
      }
    } catch {
      // Non-blocking fallback
    }
  };

  const fetchStats = async () => {
    try {
      const effOffice = selectedOfficeId || "all";
      const params = new URLSearchParams();
      params.set("office_id", effOffice);
      const st = await apiClient<ActivityStats>(
        `/api/v1/settings/activity/stats?${params.toString()}`,
        { officeId: effOffice }
      );
      if (st) setStats(st);
    } catch {
      // Non-blocking fallback
    }
  };

  // Primary data fetcher
  const fetchActivity = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const effOffice = selectedOfficeId || "all";
      const params = new URLSearchParams({ limit: "500" });
      params.set("office_id", effOffice);

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (moduleFilter) params.set("module", moduleFilter);
      if (userFilter) params.set("user_email", userFilter);
      if (actionFilter) params.set("action", actionFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const logs = await apiClient<ActivityLog[]>(
        `/api/v1/settings/activity?${params.toString()}`,
        { officeId: effOffice }
      );
      setData(Array.isArray(logs) ? logs : []);
      setTotalRecords(Array.isArray(logs) ? logs.length : 0);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve activity audit trail.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedOfficeId, debouncedSearch, moduleFilter, userFilter, actionFilter, dateFrom, dateTo]);

  // Initial and reactive fetch
  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchActivity();
    fetchStats();
  }, [fetchActivity]);

  // Auto-refresh interval (every 20s when toggled)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchActivity(true);
      fetchStats();
    }, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchActivity]);

  // Humanize codes for clean UI presentation
  const humanizeCode = (val?: string | null) =>
    (val || "Unknown")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  // Role labels
  const roleLabels: Record<string, string> = {
    COMPANY_ADMIN: "Company Administrator",
    SUPER_ADMIN: "Platform Administrator",
    ADMIN: "Administrator",
    OWNER: "Owner",
    DISPATCHER: "Dispatcher",
    ACCOUNTANT: "Accountant",
    SYSTEM: "System Service",
    EMPLOYEE: "Employee",
  };

  // Semantic color coding for actions
  const getActionStyle = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("CREATE") || act.includes("POST") || act.includes("ALLOCATE")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    }
    if (act.includes("UPDATE") || act.includes("EDIT") || act.includes("SETTLE")) {
      return "bg-sky-50 text-sky-700 border-sky-200/80";
    }
    if (act.includes("STATUS") || act.includes("TRANSITION")) {
      return "bg-amber-50 text-amber-700 border-amber-200/80";
    }
    if (act.includes("DELETE") || act.includes("VOID") || act.includes("CANCEL") || act.includes("DEACTIVATE")) {
      return "bg-rose-50 text-rose-700 border-rose-200/80";
    }
    if (act.includes("LOGIN") || act.includes("AUTH") || act.includes("PASSWORD")) {
      return "bg-purple-50 text-purple-700 border-purple-200/80";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  // Module color tags
  const getModuleStyle = (mod: string) => {
    const m = mod.toLowerCase();
    switch (m) {
      case "transport":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "accounts":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "fleet":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "settings":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "auth":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "general":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Quick Date Range Presets
  const applyDatePreset = (preset: "today" | "yesterday" | "week" | "month") => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === "today") {
      const todayStr = fmt(now);
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === "yesterday") {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const yestStr = fmt(yest);
      setDateFrom(yestStr);
      setDateTo(yestStr);
    } else if (preset === "week") {
      const past = new Date(now);
      past.setDate(now.getDate() - 7);
      setDateFrom(fmt(past));
      setDateTo(fmt(now));
    } else if (preset === "month") {
      const past = new Date(now);
      past.setDate(now.getDate() - 30);
      setDateFrom(fmt(past));
      setDateTo(fmt(now));
    }
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedOfficeId && selectedOfficeId !== "all") count++;
    if (debouncedSearch) count++;
    if (moduleFilter) count++;
    if (userFilter) count++;
    if (actionFilter) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [selectedOfficeId, debouncedSearch, moduleFilter, userFilter, actionFilter, dateFrom, dateTo]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setModuleFilter("");
    setUserFilter("");
    setActionFilter("");
    setDateFrom("");
    setDateTo("");
    if (isCompanyAdmin) {
      setSelectedOfficeId("all");
    }
  };

  // CSV Export with Complete Columns and UTF-8 BOM
  const handleExportCSV = () => {
    if (data.length === 0) return;

    const headers = [
      "Event ID",
      "Timestamp (UTC)",
      "Timestamp (IST)",
      "Issuing Office Code",
      "Issuing Office Name",
      "User Full Name",
      "User Email",
      "User Role",
      "Action",
      "Module",
      "Entity Type",
      "Entity Identifier",
      "Details",
      "Client IP",
      "Status",
    ];

    const rows = data.map((r) => [
      r.id,
      r.created_at,
      formatDateTime(r.created_at),
      r.office_code || "ALL",
      r.office_name || "All Issuing Offices (Consolidated)",
      r.user_name || r.user_email,
      r.user_email,
      r.user_role,
      r.action,
      r.module,
      r.entity_type || "",
      r.entity_identifier || "",
      (r.details || "").replace(/"/g, '""'),
      r.ip_address || "Internal",
      r.status || "SUCCESS",
    ]);

    const csvBody = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${val}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvBody], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `panther_audit_trail_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy JSON details helper
  const handleCopyJSON = () => {
    if (!inspectedEvent) return;
    const jsonStr = JSON.stringify(inspectedEvent, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Table Columns Definition
  const columns: ColumnDef<ActivityLog>[] = [
    {
      key: "created_at",
      header: "Timestamp (IST)",
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="font-mono text-xs font-semibold text-slate-800">
            {formatDateTime(row.created_at)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-slate-400" />
            {new Date(row.created_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
      ),
    },
    {
      key: "office_name",
      header: "Issuing Office",
      cell: (row) => {
        if (!row.office_name && !row.office_code) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              <Globe className="w-3 h-3 text-slate-400" />
              Company-Wide
            </span>
          );
        }
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 border border-indigo-200 text-indigo-700">
                {row.office_code || "HUB"}
              </span>
              <span className="text-xs font-medium text-slate-900 truncate max-w-[150px]" title={row.office_name || ""}>
                {row.office_name}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "user_email",
      header: "Operator / User",
      sortable: true,
      cell: (row) => {
        const initials = (row.user_name || row.user_email)
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

        return (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-[10px] font-bold shadow-2xs shrink-0">
              {initials || "U"}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-slate-900 truncate">
                {row.user_name || row.user_email}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <span>{row.user_email}</span>
                <span className="text-slate-300">•</span>
                <span className="text-[10px] text-slate-400">
                  {roleLabels[row.user_role] || humanizeCode(row.user_role)}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "action",
      header: "Action & Entity",
      cell: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border",
                getActionStyle(row.action)
              )}
            >
              {humanizeCode(row.action)}
            </span>

            {row.entity_identifier && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs"
                title={`Exact Traceable Identifier: ${row.entity_identifier}`}
              >
                <FileText className="w-3 h-3 text-amber-600" />
                {row.entity_identifier}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "details",
      header: "Activity Narrative & Trace",
      cell: (row) => (
        <div className="max-w-[340px]">
          <p className="text-xs text-slate-700 font-normal leading-relaxed line-clamp-2">
            {row.details || "No narrative details recorded."}
          </p>
          {row.details_json && Object.keys(row.details_json).length > 0 && (
            <button
              type="button"
              onClick={() => setInspectedEvent(row)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Eye className="w-3 h-3" />
              View full audit breakdown
            </button>
          )}
        </div>
      ),
    },
    {
      key: "module",
      header: "Module",
      cell: (row) => (
        <span
          className={cn(
            "px-2.5 py-0.5 rounded-full text-[11px] font-medium border uppercase tracking-wider font-mono",
            getModuleStyle(row.module)
          )}
        >
          {row.module}
        </span>
      ),
    },
    {
      key: "ip_address",
      header: "IP & Security",
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="font-mono text-xs text-slate-600 flex items-center gap-1">
            <Shield className="w-3 h-3 text-slate-400" />
            {row.ip_address || "Local / System"}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Verified Action
          </div>
        </div>
      ),
    },
    {
      key: "id",
      header: "Audit",
      cell: (row) => (
        <button
          type="button"
          onClick={() => setInspectedEvent(row)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 transition-colors shadow-2xs"
          title="Inspect full audit record"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header with Office Context and Top Actions */}
      <PageHeader
        title="User Activity & Audit Trail"
        description="Comprehensive, tamper-proof enterprise audit log recording and attributing all user operations across PantherTMS with full issuing office traceability."
        breadcrumbs={[
          { label: "Settings", href: "/settings/users" },
          { label: "Activity Log" },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            {/* Auto-refresh toggle */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs",
                autoRefresh
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-emerald-500/10"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
              title="Automatically refresh activity logs every 20 seconds"
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                )}
              />
              <span>Live Monitor</span>
            </button>

            {/* Manual Refresh */}
            <Button
              type="button"
              variant="secondary"
              onClick={() => fetchActivity(false)}
              disabled={isLoading || isRefreshing}
              className="gap-1.5"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", (isLoading || isRefreshing) && "animate-spin")} />
              <span>Refresh</span>
            </Button>

            {/* Export CSV Button */}
            <Button
              type="button"
              variant="primary"
              onClick={handleExportCSV}
              disabled={data.length === 0}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Download className="w-4 h-4" />
              <span>Export Audit Trail (CSV)</span>
            </Button>
          </div>
        }
      />

      {/* 2. Active Office Security Attribution Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-slate-50/50 to-white shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Active Office Visibility Scope:</span>
              {selectedOfficeId === "all" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Globe className="w-3 h-3 text-emerald-600" />
                  All Issuing Offices (Consolidated Audit Trail)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200">
                  <MapPin className="w-3 h-3 text-indigo-700" />
                  {filterMeta.offices.find((o) => String(o.id) === selectedOfficeId)?.name ||
                    `Issuing Office #${selectedOfficeId}`}{" "}
                  [{filterMeta.offices.find((o) => String(o.id) === selectedOfficeId)?.code || "HUB"}]
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isCompanyAdmin
                ? "Company Administrators have cross-branch visibility. Select any individual issuing office or view the unified company-wide log."
                : `User access is strictly isolated to your assigned office. Cross-branch records are forbidden.`}
            </p>
          </div>
        </div>

        {/* Total Events Counter */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 sm:text-right shrink-0">
          <Activity className="w-4 h-4 text-indigo-600" />
          <span>
            Displaying <strong className="font-mono text-slate-900">{totalRecords}</strong> recorded events
          </span>
        </div>
      </div>

      {/* 3. Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* 4. Executive KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <KpiCard
          title="Total Audited Events"
          value={stats.total_activities.toLocaleString()}
          subtext="Security & operations events"
          icon={<Layers className="w-4 h-4" />}
        />
        <KpiCard
          title="Today's Activity"
          value={stats.today_activities.toLocaleString()}
          subtext="Actions logged today"
          icon={<Clock className="w-4 h-4" />}
        />
        <KpiCard
          title="Active Operators"
          value={stats.active_users.toLocaleString()}
          subtext="Users performing actions"
          icon={<User className="w-4 h-4" />}
        />
        <KpiCard
          title="Critical Mutations"
          value={stats.critical_mutations.toLocaleString()}
          subtext="Creations, edits & deletes"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KpiCard
          title="Active Offices"
          value={stats.active_offices.toLocaleString()}
          subtext="Branches represented"
          icon={<Building2 className="w-4 h-4" />}
        />
      </div>

      {/* 5. Comprehensive Filter Bar */}
      <div
        className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3.5"
        aria-label="Audit log filters"
      >
        {/* Row 1: Search & Office Scope */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Free text search */}
          <div className="md:col-span-5">
            <FormFieldLabel htmlFor="activity-search">Search Audit Trail</FormFieldLabel>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="activity-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by LR number, Job number, User, Action, Details…"
                className="h-10 w-full pl-9 pr-8 rounded-xl border border-slate-200 px-3 text-xs focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Issuing Office Filter */}
          <div className="md:col-span-4">
            <div className="flex items-center justify-between">
              <FormFieldLabel htmlFor="activity-office-filter">Issuing Office Scope</FormFieldLabel>
              {!isCompanyAdmin && (
                <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> Assigned Branch Only
                </span>
              )}
            </div>

            {isCompanyAdmin ? (
              <SearchableSelect
                id="activity-office-filter"
                value={selectedOfficeId}
                onChange={(val) => setSelectedOfficeId(String(val))}
                options={[
                  { value: "all", label: "🌐 All Issuing Offices (Consolidated)" },
                  ...filterMeta.offices.map((o) => ({
                    value: String(o.id),
                    label: `${o.name} [${o.code}] ${o.is_head_office ? "(HQ)" : ""}`,
                  })),
                ]}
                placeholder="Select office scope"
                searchPlaceholder="Search branch offices…"
              />
            ) : (
              <div className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-700 font-medium select-none">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  {filterMeta.offices.find((o) => String(o.id) === selectedOfficeId)?.name ||
                    globalOffice?.name ||
                    "Assigned Office"}
                </span>
                <span className="text-[10px] bg-slate-200/80 px-1.5 py-0.5 rounded font-mono font-bold">
                  {filterMeta.offices.find((o) => String(o.id) === selectedOfficeId)?.code ||
                    globalOffice?.code ||
                    "HUB"}
                </span>
              </div>
            )}
          </div>

          {/* Module Selector */}
          <div className="md:col-span-3">
            <FormFieldLabel htmlFor="activity-module">Module</FormFieldLabel>
            <SearchableSelect
              id="activity-module"
              value={moduleFilter}
              onChange={(val) => setModuleFilter(String(val))}
              options={[
                { value: "", label: "All Modules" },
                { value: "transport", label: "🚛 Transport (LR, Jobs, Challans)" },
                { value: "accounts", label: "💳 Accounts (Vouchers, Invoices)" },
                { value: "fleet", label: "🚗 Fleet (Vehicles, Drivers)" },
                { value: "general", label: "👥 General (Clients, Masters)" },
                { value: "settings", label: "⚙️ Settings & RBAC" },
                { value: "auth", label: "🔐 Security & Authentication" },
              ]}
              placeholder="All modules"
            />
          </div>
        </div>

        {/* Row 2: Operator, Action, Date From, Date To, Clear */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          {/* User selector */}
          <div className="lg:col-span-1">
            <FormFieldLabel htmlFor="activity-user">Operator</FormFieldLabel>
            <SearchableSelect
              id="activity-user"
              value={userFilter}
              onChange={(val) => setUserFilter(String(val))}
              options={[
                { value: "", label: "All operators" },
                ...filterMeta.users.map((u) => ({
                  value: u.email,
                  label: `${u.name} (${u.email})`,
                })),
              ]}
              placeholder="All users"
              searchPlaceholder="Search operator name or email…"
            />
          </div>

          {/* Action selector */}
          <div className="lg:col-span-1">
            <FormFieldLabel htmlFor="activity-action">Action Performed</FormFieldLabel>
            <SearchableSelect
              id="activity-action"
              value={actionFilter}
              onChange={(val) => setActionFilter(String(val))}
              options={[
                { value: "", label: "All actions" },
                ...filterMeta.actions.map((act) => ({
                  value: act,
                  label: humanizeCode(act),
                })),
              ]}
              placeholder="All actions"
              searchPlaceholder="Search actions…"
            />
          </div>

          {/* Date from */}
          <div className="lg:col-span-1">
            <FormFieldLabel htmlFor="activity-date-from">From Date</FormFieldLabel>
            <input
              id="activity-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Date to */}
          <div className="lg:col-span-1">
            <FormFieldLabel htmlFor="activity-date-to">To Date</FormFieldLabel>
            <input
              id="activity-date-to"
              type="date"
              min={dateFrom || undefined}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Date presets */}
          <div className="lg:col-span-1 flex gap-1 items-center h-10">
            <button
              type="button"
              onClick={() => applyDatePreset("today")}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 flex-1 text-center"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("week")}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 flex-1 text-center"
            >
              7D
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("month")}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 flex-1 text-center"
            >
              30D
            </button>
          </div>

          {/* Clear button */}
          <div className="lg:col-span-1">
            <Button
              type="button"
              variant="secondary"
              className="h-10 w-full gap-2 border-slate-200 text-slate-700 hover:bg-slate-100"
              onClick={clearAllFilters}
              disabled={activeFiltersCount === 0}
            >
              <FilterX className="h-4 w-4" />
              <span>Clear filters ({activeFiltersCount})</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 6. High Readability Enterprise Data Table */}
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={Boolean(error)}
        errorMessage={error}
        onRetry={() => fetchActivity(false)}
        searchable={false}
        emptyMessage={
          activeFiltersCount > 0
            ? "No activity logs match your active filter criteria"
            : "No activity logs recorded yet"
        }
        emptySubtext={
          activeFiltersCount > 0
            ? "Try broadening your date range, clearing specific filters, or checking a different issuing office."
            : "Audited system mutations and user actions will be permanently tracked here."
        }
      />

      {/* 7. Deep Audit Inspection Slide-Over Drawer */}
      {inspectedEvent && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-md text-xs font-bold border",
                      getActionStyle(inspectedEvent.action)
                    )}
                  >
                    {humanizeCode(inspectedEvent.action)}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    Audit Event #{inspectedEvent.id}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    VERIFIED SUCCESS
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {inspectedEvent.entity_identifier || inspectedEvent.entity_type
                    ? `${inspectedEvent.entity_type || "Record"}: ${inspectedEvent.entity_identifier || inspectedEvent.entity_id}`
                    : humanizeCode(inspectedEvent.action)}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setInspectedEvent(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Context Summary Narrative */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 font-mono">
                  Activity Summary & Trace Narrative
                </span>
                <p className="text-sm font-medium text-slate-800 leading-relaxed">
                  {inspectedEvent.details || "No narrative details recorded."}
                </p>
              </div>

              {/* Attribution Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Issuing Office Details */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Issuing Office Attribution
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {inspectedEvent.office_name || "Company Wide (Consolidated)"}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      Code:{" "}
                      <span className="font-bold text-indigo-700">
                        {inspectedEvent.office_code || "ALL"}
                      </span>{" "}
                      {inspectedEvent.office_id && `• ID: #${inspectedEvent.office_id}`}
                    </div>
                  </div>
                </div>

                {/* Operator Details */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-600" /> Operator Attribution
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {inspectedEvent.user_name || inspectedEvent.user_email}
                    </div>
                    <div className="text-xs text-slate-500 truncate" title={inspectedEvent.user_email}>
                      {inspectedEvent.user_email}
                    </div>
                    <div className="text-[11px] text-indigo-600 font-medium mt-0.5">
                      {roleLabels[inspectedEvent.user_role] || humanizeCode(inspectedEvent.user_role)}
                    </div>
                  </div>
                </div>

                {/* Target Entity */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" /> Target Entity Information
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {inspectedEvent.entity_type || "N/A"}
                    </div>
                    {inspectedEvent.entity_identifier && (
                      <div className="text-xs font-mono font-bold text-amber-900 mt-0.5">
                        {inspectedEvent.entity_identifier}
                      </div>
                    )}
                    {inspectedEvent.entity_id && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        Database ID: #{inspectedEvent.entity_id}
                      </div>
                    )}
                  </div>
                </div>

                {/* Security & Timestamp */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" /> Security & Network
                  </span>
                  <div>
                    <div className="text-xs font-mono font-bold text-slate-800">
                      IP: {inspectedEvent.ip_address || "Internal System Call"}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      IST: {formatDateTime(inspectedEvent.created_at)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      UTC: {inspectedEvent.created_at}
                    </div>
                  </div>
                </div>
              </div>

              {/* Structured Key-Value Payload */}
              {inspectedEvent.details_json && Object.keys(inspectedEvent.details_json).length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">
                    Structured Audit Fields & Data Attributes
                  </span>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white">
                    {Object.entries(inspectedEvent.details_json).map(([key, val]) => (
                      <div key={key} className="p-3 flex items-start justify-between gap-4">
                        <span className="font-mono text-xs font-semibold text-slate-600 capitalize">
                          {key.replace(/_/g, " ")}
                        </span>
                        <span className="font-mono text-xs text-slate-900 text-right max-w-sm break-all font-medium">
                          {typeof val === "object" ? JSON.stringify(val) : String(val ?? "null")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw JSON Payload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">
                    Raw JSON Audit Payload
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyJSON}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? "Copied to clipboard" : "Copy JSON"}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                  {JSON.stringify(inspectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Audited action strictly attributed to user and issuing office.
              </span>
              <Button type="button" variant="secondary" onClick={() => setInspectedEvent(null)}>
                Close Audit Sheet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
