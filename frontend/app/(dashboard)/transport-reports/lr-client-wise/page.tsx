"use client";

import React, { useState, useEffect } from "react";
import { Users, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
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
        <span className="font-semibold text-[#101828]">
          {row.client_name}
        </span>
      ),
    },
    {
      key: "client_type",
      header: "Client Type",
      cell: (row) => <Badge variant="primary" className="text-xs">{row.client_type}</Badge>,
    },
    {
      key: "total_lrs",
      header: "Total LRs Booked",
      isNumeric: true,
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-semibold tabular-nums text-[#101828]">
          {row.total_lrs} LRs
        </span>
      ),
    },
    {
      key: "total_weight_mt",
      header: "Total Freight Volume (MT)",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono tabular-nums text-[#344054]">
          {parseFloat(String(row.total_weight_mt)).toFixed(2)} MT
        </span>
      ),
    },
    {
      key: "total_freight_amount",
      header: "Total Freight Turnover (₹)",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-bold tabular-nums text-[#027A48]">
          ₹{parseFloat(String(row.total_freight_amount)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "delivered_count",
      header: "Delivered",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono tabular-nums text-[#344054]">
          {row.delivered_count} LRs
        </span>
      ),
    },
    {
      key: "in_transit_count",
      header: "In Transit",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono tabular-nums text-[#B54708] font-semibold">
          {row.in_transit_count} active
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
          { label: "Client-Wise Summary" },
        ]}
        title="LR Client-Wise Report"
        description="Aggregated consignment volume, freight turnover, and delivery performance by client (PRD §7.4)."
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
        searchPlaceholder="Filter report by client name..."
      />
    </div>
  );
}
