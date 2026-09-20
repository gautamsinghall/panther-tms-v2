"use client";

import React, { useState, useEffect } from "react";
import { Receipt, RefreshCw, FileText } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {row.lr_number}
          </span>
          <span className="block text-[11px] text-slate-400">
            Booked: {row.lr_date}
          </span>
        </div>
      ),
    },
    {
      key: "consigner",
      header: "Billing Party / Consigner",
      cell: (row) => row.consigner_name || "N/A",
    },
    {
      key: "consignee",
      header: "Consignee / Destination",
      cell: (row) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200">
            {row.consignee_name || "N/A"}
          </div>
          <div className="text-xs text-slate-500">
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
        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
          ₹{parseFloat(String(row.total_freight_amount)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "delivery",
      header: "Delivery Date",
      cell: (row) => row.delivery_date || "Delivered",
    },
    {
      key: "pod_status",
      header: "POD Verification",
      align: "center",
      cell: (row) => {
        let variant: "success" | "warning" | "neutral" = "neutral";
        if (row.pod_verification_status === "VERIFIED") variant = "success";
        if (row.pod_verification_status === "PENDING") variant = "warning";
        return (
          <Badge variant={variant}>
            {row.pod_verification_status || "Not Received"}
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: "LR Lifecycle",
      align: "center",
      cell: (row) => <Badge variant="primary">{row.status}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Unbilled Consignments Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational backlog of completed deliveries and verified PODs awaiting Phase 3 customer invoicing (PRD §7.4).
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
        searchPlaceholder="Filter by LR number, client, or destination..."
      />
    </div>
  );
}
