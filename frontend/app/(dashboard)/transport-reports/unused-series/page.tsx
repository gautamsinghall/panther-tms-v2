"use client";

import React, { useState, useEffect } from "react";
import { Hash, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ColumnDef } from "@/types/table";
import { apiClient } from "@/lib/api-client";

interface UnusedSeriesRow {
  series_name: string;
  prefix: string;
  allocated_start: number;
  allocated_end: number;
  last_used_number: number;
  unused_count: number;
}

export default function UnusedSeriesPage() {
  const [data, setData] = useState<UnusedSeriesRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<UnusedSeriesRow[]>("/api/v1/transport-reports/unused-series");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load series report.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<UnusedSeriesRow>[] = [
    {
      key: "series_name",
      header: "Document Series",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-[#101828]">
          {row.series_name}
        </span>
      ),
    },
    {
      key: "prefix",
      header: "Sequence Prefix",
      cell: (row) => (
        <span className="font-mono text-xs uppercase bg-[#F2F4F7] text-[#344054] px-2 py-0.5 rounded font-semibold border border-[#E4E7EC]">
          {row.prefix}
        </span>
      ),
    },
    {
      key: "range",
      header: "Allocated Range",
      cell: (row) => (
        <span className="font-mono text-xs tabular-nums text-[#667085]">
          {row.allocated_start} — {row.allocated_end}
        </span>
      ),
    },
    {
      key: "last_used_number",
      header: "Last Consumed Sequence",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-semibold tabular-nums text-[#101828]">
          #{row.last_used_number}
        </span>
      ),
    },
    {
      key: "unused_count",
      header: "Available Unused Range",
      isNumeric: true,
      cell: (row) => (
        <Badge variant="success" dot className="font-mono font-semibold tabular-nums">
          {row.unused_count.toLocaleString()} available
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Transport Reports", href: "/transport-reports" },
          { label: "Unused Series Audit" },
        ]}
        title="Unused GR/LR Series Report"
        description="Audit sequence gap analysis tracking consumed and available document series allocations (PRD §7.4)."
        primaryAction={{
          label: "Refresh Report",
          icon: RefreshCw,
          onClick: loadData,
        }}
      />

      {errorMessage && (
        <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs rounded-lg font-medium">
          {errorMessage}
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Filter series by name or prefix..."
      />
    </div>
  );
}
