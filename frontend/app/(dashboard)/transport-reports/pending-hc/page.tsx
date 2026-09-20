"use client";

import React, { useState, useEffect } from "react";
import { Clock, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ColumnDef } from "@/types/table";
import { apiClient } from "@/lib/api-client";

interface PendingHCRow {
  id: number;
  challan_number: string;
  challan_date: string;
  vehicle_number: string;
  owner_name?: string;
  driver_name?: string;
  hire_rate: string | number;
  advance_amount: string | number;
  balance_due: string | number;
  status: string;
}

export default function PendingHCPage() {
  const [data, setData] = useState<PendingHCRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<PendingHCRow[]>("/api/v1/transport-reports/pending-hc");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load pending hire challans.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<PendingHCRow>[] = [
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
      key: "owner_name",
      header: "Owner / Transporter",
      cell: (row) => (
        <span className="text-[#344054]">
          {row.owner_name || "Direct Driver"}
        </span>
      ),
    },
    {
      key: "driver_name",
      header: "Driver",
      cell: (row) => (
        <span className="text-[#667085]">
          {row.driver_name || "Unassigned"}
        </span>
      ),
    },
    {
      key: "hire_rate",
      header: "Agreed Rate",
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
      key: "balance_due",
      header: "Outstanding Balance",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-semibold tabular-nums text-[#B42318]">
          ₹{parseFloat(String(row.balance_due)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Transit Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Transport Reports", href: "/transport-reports" },
          { label: "Pending Hire Challans" },
        ]}
        title="Pending Hire Challan Report"
        description="Audit report of hired market vehicles with unsettled outstanding balances (PRD §7.4)."
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
        searchPlaceholder="Filter by challan number, vehicle, or owner..."
      />
    </div>
  );
}
