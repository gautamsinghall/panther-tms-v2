"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@/types/table";
import { apiClient } from "@/lib/api-client";

interface HireChallanRegisterRow {
  id: number;
  challan_number: string;
  challan_date: string;
  vehicle_number: string;
  owner_name?: string;
  driver_name?: string;
  from_location?: string;
  to_location?: string;
  hire_rate: string | number;
  advance_amount: string | number;
  balance_amount: string | number;
  status: string;
}

export default function HCRegisterPage() {
  const [data, setData] = useState<HireChallanRegisterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<HireChallanRegisterRow[]>("/api/v1/transport-reports/hc-register");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load hire challan register.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<HireChallanRegisterRow>[] = [
    {
      key: "challan_number",
      header: "Challan Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {row.challan_number}
          </span>
          <span className="block text-[11px] text-slate-400">
            {row.challan_date}
          </span>
        </div>
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
      key: "owner_driver",
      header: "Owner / Driver",
      cell: (row) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
            {row.owner_name || "Direct Driver"}
          </div>
          <div className="text-[11px] text-slate-400">
            {row.driver_name || "Unassigned"}
          </div>
        </div>
      ),
    },
    {
      key: "route",
      header: "Trip Route",
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
          {row.from_location || "Origin"} <ArrowRight className="w-3 h-3 text-slate-400" /> {row.to_location || "Dest"}
        </span>
      ),
    },
    {
      key: "hire_rate",
      header: "Hire Rate",
      isNumeric: true,
      cell: (row) => `₹${parseFloat(String(row.hire_rate)).toLocaleString()}`,
    },
    {
      key: "advance_amount",
      header: "Advance Paid",
      isNumeric: true,
      cell: (row) => `₹${parseFloat(String(row.advance_amount)).toLocaleString()}`,
    },
    {
      key: "balance_amount",
      header: "Balance Due",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
          ₹{parseFloat(String(row.balance_amount)).toLocaleString()}
        </span>
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
            Hire Challan Register
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational register of all hired market vehicle challans and settlements (PRD §7.4).
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
        searchPlaceholder="Filter register by challan number, vehicle, or owner..."
      />
    </div>
  );
}
