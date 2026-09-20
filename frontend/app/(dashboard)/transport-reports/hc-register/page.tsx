"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, RefreshCw, Truck } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
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
          <span className="font-mono font-semibold text-[#101828]">
            {row.challan_number}
          </span>
          <span className="block text-[11px] text-[#667085]">
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
        <span className="font-mono font-semibold uppercase text-[#101828]">
          {row.vehicle_number}
        </span>
      ),
    },
    {
      key: "owner_driver",
      header: "Owner / Driver",
      cell: (row) => (
        <div>
          <div className="font-medium text-[#344054] text-xs">
            {row.owner_name || "Direct Driver"}
          </div>
          <div className="text-[11px] text-[#667085]">
            {row.driver_name || "Unassigned"}
          </div>
        </div>
      ),
    },
    {
      key: "route",
      header: "Trip Route",
      cell: (row) => (
        <span className="text-xs text-[#475467] flex items-center gap-1.5">
          {row.from_location || "Origin"} <ArrowRight className="w-3 h-3 text-[#98A2B3]" /> {row.to_location || "Dest"}
        </span>
      ),
    },
    {
      key: "hire_rate",
      header: "Hire Rate",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono tabular-nums text-[#344054]">
          ₹{parseFloat(String(row.hire_rate)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "advance_amount",
      header: "Advance Paid",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono tabular-nums text-[#344054]">
          ₹{parseFloat(String(row.advance_amount)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "balance_amount",
      header: "Balance Due",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-semibold tabular-nums text-[#B42318]">
          ₹{parseFloat(String(row.balance_amount)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Transport Reports", href: "/transport-reports" },
          { label: "Hire Challan Register" },
        ]}
        title="Hire Challan Register"
        description="Operational register of all hired market vehicle challans and settlements (PRD §7.4)."
        primaryAction={{
          label: "Refresh Register",
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
        searchPlaceholder="Filter register by challan number, vehicle, or owner..."
      />
    </div>
  );
}
