"use client";

import React, { useState, useEffect } from "react";
import { Receipt, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@/types/table";
import { apiClient } from "@/lib/api-client";

interface InvoiceRegisterRow {
  id: number;
  invoice_number: string;
  lr_number?: string;
  billing_date: string;
  client_name: string;
  taxable_amount: string | number;
  gst_amount: string | number;
  total_invoice_amount: string | number;
  status: string;
}

export default function InvoiceRegisterPage() {
  const [data, setData] = useState<InvoiceRegisterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<InvoiceRegisterRow[]>("/api/v1/transport-reports/invoice-register");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load invoice register.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<InvoiceRegisterRow>[] = [
    {
      key: "invoice_number",
      header: "Invoice Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {row.invoice_number}
          </span>
          <span className="block text-[11px] text-slate-400">
            {row.billing_date}
          </span>
        </div>
      ),
    },
    {
      key: "lr_number",
      header: "Consignment LR",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
          {row.lr_number || "-"}
        </span>
      ),
    },
    {
      key: "client_name",
      header: "Billed Client",
      sortable: true,
      cell: (row) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {row.client_name}
        </span>
      ),
    },
    {
      key: "taxable_amount",
      header: "Taxable Freight (₹)",
      isNumeric: true,
      cell: (row) => `₹${parseFloat(String(row.taxable_amount)).toLocaleString()}`,
    },
    {
      key: "gst_amount",
      header: "GST (5% GTA)",
      isNumeric: true,
      cell: (row) => `₹${parseFloat(String(row.gst_amount)).toLocaleString()}`,
    },
    {
      key: "total_invoice_amount",
      header: "Total Billed (₹)",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
          ₹{parseFloat(String(row.total_invoice_amount)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => <Badge variant="success">{row.status}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Invoice Register
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Transport invoice billing register generated from delivered and verified consignments (PRD §7.4).
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
        searchPlaceholder="Filter by invoice number, LR, or client..."
      />
    </div>
  );
}
