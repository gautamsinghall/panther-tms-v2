"use client";

import React, { useState, useEffect } from "react";
import { Download, AlertCircle, FilterX } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FormFieldLabel } from "@/components/ui/form-field";

interface ActivityLog {
  id: number;
  user_id?: number | null;
  user_email: string;
  user_role: string;
  action: string;
  module: string;
  ip_address?: string | null;
  details?: string | Record<string, any> | null;
  created_at: string;
}

export default function UserActivityLogPage() {
  const [data, setData] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userOptions, setUserOptions] = useState<string[]>([]);
  const [actionOptions, setActionOptions] = useState<string[]>([]);

  const humanizeCode = (value?: string | null) =>
    (value || "Unknown")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const roleLabels: Record<string, string> = {
    COMPANY_ADMIN: "Company Administrator",
    SUPER_ADMIN: "Platform Administrator",
    ADMIN: "Administrator",
    OWNER: "Owner",
    DISPATCHER: "Dispatcher",
    ACCOUNTANT: "Accountant",
    SYSTEM: "System",
  };

  const fetchActivity = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (userFilter) params.set("user_email", userFilter);
      if (actionFilter) params.set("action", actionFilter);
      const logs = await apiClient<ActivityLog[]>(`/api/v1/settings/activity?${params.toString()}`);
      setData(Array.isArray(logs) ? logs : []);
      if (!dateFrom && !dateTo && !userFilter && !actionFilter) {
        setUserOptions(Array.from(new Set(logs.map((log) => log.user_email))).sort());
        setActionOptions(Array.from(new Set(logs.map((log) => log.action))).sort());
      }
    } catch (err: any) {
      setError(err.message || "Failed to retrieve activity audit logs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchActivity, 200);
    return () => window.clearTimeout(timer);
  }, [dateFrom, dateTo, userFilter, actionFilter]);

  const handleExportCSV = () => {
    if (data.length === 0) return;
    const headers = ["ID,Timestamp,User Email,User Role,Action,Module,IP Address"];
    const rows = data.map(
      (r) =>
        `"${r.id}","${r.created_at}","${r.user_email}","${r.user_role}","${r.action.replace(/"/g, '""')}","${r.module}","${r.ip_address || ""}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `panther_activity_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnDef<ActivityLog>[] = [
    {
      key: "created_at",
      header: "Timestamp (IST)",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs text-[#667085]">
          {formatDateTime(row.created_at)}
        </span>
      ),
    },
    {
      key: "user_email",
      header: "User & Role",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium text-xs text-[#172033]">{row.user_email}</div>
          <div className="text-[11px] text-[#667085]">{roleLabels[row.user_role] || humanizeCode(row.user_role)}</div>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action Performed",
      cell: (row) => (
        <div>
          <span className="text-xs text-[#172033] font-medium block">{humanizeCode(row.action)}</span>
          {row.details && (typeof row.details === "string" ? row.details.trim() : Object.keys(row.details).length > 0) && (
            <span className="text-[10px] text-slate-500 line-clamp-2">
              {typeof row.details === "string" ? row.details : JSON.stringify(row.details)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "module",
      header: "Module",
      cell: (row) => (
        <span className="px-2 py-0.5 rounded bg-[#F2F4F7] text-[#172033] text-xs font-mono">
          {humanizeCode(row.module)}
        </span>
      ),
    },
    {
      key: "ip_address",
      header: "IP Address",
      cell: (row) => (
        <span className="font-mono text-xs text-[#667085]">{row.ip_address || "Not recorded"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Activity & Audit Trail"
        description="Immutable chronological security log tracking system actions, user logins, records created, and financial postings."
        breadcrumbs={[
          { label: "Settings", href: "/settings/users" },
          { label: "Activity Log" },
        ]}
        primaryAction={{
          label: "Export Audit Log (CSV)",
          icon: <Download className="w-4 h-4" />,
          onClick: handleExportCSV,
        }}
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:grid-cols-2 lg:grid-cols-5" aria-label="Activity log filters">
        <div>
          <FormFieldLabel htmlFor="activity-date-from">From date</FormFieldLabel>
          <input id="activity-date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <FormFieldLabel htmlFor="activity-date-to">To date</FormFieldLabel>
          <input id="activity-date-to" type="date" min={dateFrom || undefined} value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <FormFieldLabel htmlFor="activity-user">User</FormFieldLabel>
          <SearchableSelect id="activity-user" value={userFilter} onChange={(value) => setUserFilter(String(value))} options={userOptions.map((email) => ({ value: email, label: email }))} placeholder="All users" searchPlaceholder="Search users…" />
        </div>
        <div>
          <FormFieldLabel htmlFor="activity-action">Action</FormFieldLabel>
          <SearchableSelect id="activity-action" value={actionFilter} onChange={(value) => setActionFilter(String(value))} options={actionOptions.map((action) => ({ value: action, label: humanizeCode(action) }))} placeholder="All actions" searchPlaceholder="Search actions…" />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="secondary" className="h-10 w-full gap-2" onClick={() => { setDateFrom(""); setDateTo(""); setUserFilter(""); setActionFilter(""); }} disabled={!dateFrom && !dateTo && !userFilter && !actionFilter}>
            <FilterX className="h-4 w-4" /> Clear filters
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={Boolean(error)}
        errorMessage={error}
        onRetry={fetchActivity}
        searchable={false}
        emptyMessage={dateFrom || dateTo || userFilter || actionFilter ? "No activity matches these filters" : "No activity recorded"}
        emptySubtext={dateFrom || dateTo || userFilter || actionFilter ? "Clear or adjust the date, user, and action filters." : "Audited user and system actions will appear here."}
      />
    </div>
  );
}
