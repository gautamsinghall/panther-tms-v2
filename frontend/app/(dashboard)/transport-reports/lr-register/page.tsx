"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, FileSpreadsheet, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@/types/table";
import { apiClient } from "@/lib/api-client";

interface LRRegisterRow {
  id: number;
  lr_number: string;
  lr_date: string;
  consigner_name?: string;
  consignee_name?: string;
  origin_city?: string;
  destination_city?: string;
  vehicle_number: string;
  package_count: number;
  actual_weight_mt: string | number;
  total_freight_amount: string | number;
  advance_amount: string | number;
  balance_amount: string | number;
  status: string;
}

export default function LRRegisterPage() {
  const [data, setData] = useState<LRRegisterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<LRRegisterRow[]>("/api/v1/transport-reports/lr-register");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load LR register.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<LRRegisterRow>[] = [
    {
      key: "lr_number",
      header: "LR / GR Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {row.lr_number}
          </span>
          <span className="block text-[11px] text-slate-400">
            {row.lr_date}
          </span>
        </div>
      ),
    },
    {
      key: "consigner_name",
      header: "Consigner",
      sortable: true,
      cell: (row) => row.consigner_name || "N/A",
    },
    {
      key: "consignee_name",
      header: "Consignee",
      sortable: true,
      cell: (row) => row.consignee_name || "N/A",
    },
    {
      key: "route",
      header: "Route",
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
          {row.origin_city || "Origin"} <ArrowRight className="w-3 h-3 text-slate-400" /> {row.destination_city || "Dest"}
        </span>
      ),
    },
    {
      key: "vehicle_number",
      header: "Vehicle No",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold uppercase text-slate-900 dark:text-slate-100">
          {row.vehicle_number}
        </span>
      ),
    },
    {
      key: "weight",
      header: "Weight (MT) / Pkgs",
      isNumeric: true,
      cell: (row) => `${parseFloat(String(row.actual_weight_mt)).toFixed(2)} MT (${row.package_count} pkgs)`,
    },
    {
      key: "freight",
      header: "Freight / Balance",
      isNumeric: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
            ₹{parseFloat(String(row.total_freight_amount)).toLocaleString()}
          </span>
          <span className="block text-[11px] font-mono text-amber-600 dark:text-amber-400">
            Bal: ₹{parseFloat(String(row.balance_amount)).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => <Badge variant="neutral">{row.status}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            LR Booking Register
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational register of all booked and in-transit lorry receipts (PRD §7.4).
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
        searchPlaceholder="Filter register by LR number, client, or vehicle..."
      />
    </div>
  );
}
