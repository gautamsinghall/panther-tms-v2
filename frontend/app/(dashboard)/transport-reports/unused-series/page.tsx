"use client";

import React, { useState, useEffect } from "react";
import { Hash, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.series_name}
        </span>
      ),
    },
    {
      key: "prefix",
      header: "Sequence Prefix",
      cell: (row) => (
        <span className="font-mono text-xs uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold">
          {row.prefix}
        </span>
      ),
    },
    {
      key: "range",
      header: "Allocated Range",
      cell: (row) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {row.allocated_start} — {row.allocated_end}
        </span>
      ),
    },
    {
      key: "last_used_number",
      header: "Last Consumed Sequence",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
          #{row.last_used_number}
        </span>
      ),
    },
    {
      key: "unused_count",
      header: "Available Unused Range",
      isNumeric: true,
      cell: (row) => (
        <Badge variant="success" className="font-mono font-semibold">
          {row.unused_count.toLocaleString()} available
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Unused GR/LR Series Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit sequence gap analysis tracking consumed and available document series allocations (PRD §7.4).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Report
        </Button>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
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
