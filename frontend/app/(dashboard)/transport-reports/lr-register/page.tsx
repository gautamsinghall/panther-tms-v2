"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, RefreshCw, FileSpreadsheet } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
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
          <span className="font-mono font-semibold text-[#101828]">
            {row.lr_number}
          </span>
          <span className="block text-[11px] text-[#667085]">
            {row.lr_date}
          </span>
        </div>
      ),
    },
    {
      key: "consigner_name",
      header: "Consigner",
      sortable: true,
      cell: (row) => (
        <span className="text-[#344054]">
          {row.consigner_name || "N/A"}
        </span>
      ),
    },
    {
      key: "consignee_name",
      header: "Consignee",
      sortable: true,
      cell: (row) => (
        <span className="text-[#344054]">
          {row.consignee_name || "N/A"}
        </span>
      ),
    },
    {
      key: "route",
      header: "Route",
      cell: (row) => (
        <span className="text-xs text-[#475467] flex items-center gap-1.5">
          {row.origin_city || "Origin"} <ArrowRight className="w-3 h-3 text-[#98A2B3]" /> {row.destination_city || "Dest"}
        </span>
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
      key: "weight",
      header: "Weight (MT) / Pkgs",
      isNumeric: true,
      cell: (row) => (
        <span className="tabular-nums font-mono text-[#344054]">
          {parseFloat(String(row.actual_weight_mt)).toFixed(2)} MT ({row.package_count} pkgs)
        </span>
      ),
    },
    {
      key: "freight",
      header: "Freight / Balance",
      isNumeric: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold tabular-nums text-[#101828]">
            ₹{parseFloat(String(row.total_freight_amount)).toLocaleString()}
          </span>
          <span className="block text-[11px] font-mono tabular-nums text-[#B54708]">
            Bal: ₹{parseFloat(String(row.balance_amount)).toLocaleString()}
          </span>
        </div>
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
          { label: "LR Booking Register" },
        ]}
        title="LR Booking Register"
        description="Comprehensive operational register of all booked and in-transit lorry receipts (PRD §7.4)."
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
        searchPlaceholder="Filter register by LR number, client, or vehicle..."
      />
    </div>
  );
}
