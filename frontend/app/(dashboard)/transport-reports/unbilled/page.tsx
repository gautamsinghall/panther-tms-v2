"use client";

import React, { useState, useEffect } from "react";
import { Receipt, RefreshCw, FileText } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ColumnDef } from "@/types/table";
import { apiClient } from "@/lib/api-client";

interface UnbilledLRRow {
  id: number;
  lr_number: string;
  lr_date: string;
  consigner_name?: string;
  consignee_name?: string;
  destination_city?: string;
  total_freight_amount: string | number;
  delivery_date?: string;
  pod_verification_status?: string;
  status: string;
}

export default function UnbilledReportsPage() {
  const [data, setData] = useState<UnbilledLRRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<UnbilledLRRow[]>("/api/v1/transport-reports/unbilled");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load unbilled LRs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<UnbilledLRRow>[] = [
    {
      key: "lr_number",
      header: "Consignment LR",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-[#101828]">
            {row.lr_number}
          </span>
          <span className="block text-[11px] text-[#667085]">
            Booked: {row.lr_date}
          </span>
        </div>
      ),
    },
    {
      key: "consigner",
      header: "Billing Party / Consigner",
      cell: (row) => (
        <span className="text-[#344054]">
          {row.consigner_name || "N/A"}
        </span>
      ),
    },
    {
      key: "consignee",
      header: "Consignee / Destination",
      cell: (row) => (
        <div>
          <div className="font-medium text-[#344054]">
            {row.consignee_name || "N/A"}
          </div>
          <div className="text-xs text-[#667085]">
            {row.destination_city || "Destination Hub"}
          </div>
        </div>
      ),
    },
    {
      key: "freight",
      header: "Unbilled Freight Amount",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-bold tabular-nums text-[#027A48]">
          ₹{parseFloat(String(row.total_freight_amount)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "delivery",
      header: "Delivery Date",
      cell: (row) => (
        <span className="text-xs text-[#667085]">
          {row.delivery_date || "Delivered"}
        </span>
      ),
    },
    {
      key: "pod_status",
      header: "POD Verification",
      cell: (row) => {
        if (!row.pod_verification_status) {
          return <Badge variant="neutral">Not Received</Badge>;
        }
        return <StatusBadge status={row.pod_verification_status} />;
      },
    },
    {
      key: "status",
      header: "LR Lifecycle",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Transport Reports", href: "/transport-reports" },
          { label: "Unbilled Consignments" },
        ]}
        title="Unbilled Consignments Report"
        description="Operational backlog of completed deliveries and verified PODs awaiting customer invoicing (PRD §7.4)."
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
        searchPlaceholder="Filter by LR number, client, or destination..."
      />
    </div>
  );
}
