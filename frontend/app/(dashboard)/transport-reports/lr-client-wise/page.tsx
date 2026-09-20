"use client";

import React, { useState, useEffect } from "react";
import { Users, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@/types/table";
import { apiClient } from "@/lib/api-client";

interface LRClientWiseRow {
  client_name: string;
  client_type: string;
  total_lrs: number;
  total_weight_mt: string | number;
  total_freight_amount: string | number;
  delivered_count: number;
  in_transit_count: number;
}

export default function LRClientWisePage() {
  const [data, setData] = useState<LRClientWiseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<LRClientWiseRow[]>("/api/v1/transport-reports/lr-client-wise");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load client-wise report.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<LRClientWiseRow>[] = [
    {
      key: "client_name",
      header: "Client / Customer Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.client_name}
        </span>
      ),
    },
    {
      key: "client_type",
      header: "Client Type",
      align: "center",
      cell: (row) => <Badge variant="primary">{row.client_type}</Badge>,
    },
    {
      key: "total_lrs",
      header: "Total LRs Booked",
      isNumeric: true,
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
          {row.total_lrs} LRs
        </span>
      ),
    },
    {
      key: "total_weight_mt",
      header: "Total Freight Volume (MT)",
      isNumeric: true,
      cell: (row) => `${parseFloat(String(row.total_weight_mt)).toFixed(2)} MT`,
    },
    {
      key: "total_freight_amount",
      header: "Total Freight Turnover (₹)",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
          ₹{parseFloat(String(row.total_freight_amount)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "delivered_count",
      header: "Delivered",
      isNumeric: true,
      cell: (row) => `${row.delivered_count} LRs`,
    },
    {
      key: "in_transit_count",
      header: "In Transit",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
          {row.in_transit_count} active
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            LR Client-Wise Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Aggregated consignment volume, freight turnover, and delivery performance by client (PRD §7.4).
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
        searchPlaceholder="Filter report by client name..."
      />
    </div>
  );
}
