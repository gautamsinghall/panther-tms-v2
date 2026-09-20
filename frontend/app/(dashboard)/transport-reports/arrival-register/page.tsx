"use client";

import React, { useState, useEffect } from "react";
import { PackageCheck, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
          <span className="font-mono font-semibold text-[#101828]">
            {row.report_number}
          </span>
          <span className="block text-[11px] text-[#667085]">
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
        <span className="font-mono text-xs font-semibold text-[#101828]">
          {row.lr_number}
        </span>
      ),
    },
    {
      key: "destination_hub",
      header: "Destination Hub",
      cell: (row) => (
        <span className="text-[#344054]">
          {row.destination_hub || "Hub Warehouse"}
        </span>
      ),
    },
    {
      key: "packages",
      header: "Received / Discrepancy",
      cell: (row) => {
        const hasIssue = row.packages_damaged > 0 || row.packages_short > 0;
        return (
          <div className="text-xs">
            <span className="font-medium text-[#344054] tabular-nums">
              {row.packages_received} pkgs received
            </span>
            {hasIssue && (
              <span className="block text-[11px] text-[#B42318] font-medium">
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
      cell: (row) => (
        <span className="text-[#667085]">
          {row.receiver_name || "Warehouse Staff"}
        </span>
      ),
    },
    {
      key: "condition_remarks",
      header: "Unloading Observations",
      cell: (row) => (
        <span className="text-xs text-[#667085] line-clamp-1">
          {row.condition_remarks || "Normal delivery condition"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Transport Reports", href: "/transport-reports" },
          { label: "Arrival Register" },
        ]}
        title="Arrival Report Register"
        description="Destination hub arrival audit register tracking cargo unloading and shortage discrepancies (PRD §7.4)."
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
        searchPlaceholder="Filter by report number, LR, or hub..."
      />
    </div>
  );
}
