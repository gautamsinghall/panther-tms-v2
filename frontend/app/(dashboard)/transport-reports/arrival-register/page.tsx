"use client";

import React, { useState, useEffect } from "react";
import { PackageCheck, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@/types/table";
import { apiClient } from "@/lib/api-client";

interface ArrivalRegisterRow {
  id: number;
  report_number: string;
  arrival_date: string;
  lr_number: string;
  destination_hub?: string;
  packages_received: number;
  packages_damaged: number;
  packages_short: number;
  receiver_name?: string;
  condition_remarks?: string;
}

export default function ArrivalRegisterPage() {
  const [data, setData] = useState<ArrivalRegisterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<ArrivalRegisterRow[]>("/api/v1/transport-reports/arrival-register");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load arrival register.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<ArrivalRegisterRow>[] = [
    {
      key: "report_number",
      header: "Report Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {row.report_number}
          </span>
          <span className="block text-[11px] text-slate-400">
            {new Date(row.arrival_date).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: "lr_number",
      header: "Consignment LR",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
          {row.lr_number}
        </span>
      ),
    },
    {
      key: "destination_hub",
      header: "Destination Hub",
      cell: (row) => row.destination_hub || "Hub Warehouse",
    },
    {
      key: "packages",
      header: "Received / Discrepancy",
      cell: (row) => {
        const hasIssue = row.packages_damaged > 0 || row.packages_short > 0;
        return (
          <div className="text-xs">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {row.packages_received} pkgs received
            </span>
            {hasIssue && (
              <span className="block text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                {row.packages_damaged > 0 ? `${row.packages_damaged} damaged ` : ""}
                {row.packages_short > 0 ? `${row.packages_short} shortage` : ""}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "receiver_name",
      header: "Inspector / Receiver",
      cell: (row) => row.receiver_name || "Warehouse Staff",
    },
    {
      key: "condition_remarks",
      header: "Unloading Observations",
      cell: (row) => (
        <span className="text-xs text-slate-500 line-clamp-1">
          {row.condition_remarks || "Normal delivery condition"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Arrival Report Register
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Destination hub arrival audit register tracking cargo unloading and shortage discrepancies (PRD §7.4).
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
        searchPlaceholder="Filter by report number, LR, or hub..."
      />
    </div>
  );
}
