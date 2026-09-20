"use client";

import React, { useState, useEffect } from "react";
import { History, Shield, User, Download, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface ActivityLog {
  id: number;
  user_id?: number | null;
  user_email: string;
  user_role: string;
  action: string;
  module: string;
  ip_address?: string | null;
  details?: Record<string, any> | null;
  created_at: string;
}

export default function UserActivityLogPage() {
  const [data, setData] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const logs = await apiClient<ActivityLog[]>("/api/v1/settings/activity?limit=100");
      setData(Array.isArray(logs) ? logs : []);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve activity audit logs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

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
          <div className="text-[11px] font-mono text-[#667085]">{row.user_role}</div>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action Performed",
      cell: (row) => (
        <div>
          <span className="text-xs text-[#172033] font-medium block">{row.action}</span>
          {row.details && Object.keys(row.details).length > 0 && (
            <span className="text-[10px] font-mono text-slate-400">
              {JSON.stringify(row.details)}
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
          {row.module}
        </span>
      ),
    },
    {
      key: "ip_address",
      header: "IP Address",
      cell: (row) => (
        <span className="font-mono text-xs text-[#667085]">{row.ip_address || "127.0.0.1"}</span>
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

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-xs">Querying audit trail records...</span>
        </div>
      ) : (
        <DataTable columns={columns} data={data} />
      )}
    </div>
  );
}
