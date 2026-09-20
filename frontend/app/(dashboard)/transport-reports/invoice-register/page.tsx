"use client";

import React, { useState, useEffect } from "react";
import { Receipt, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
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
          <span className="font-mono font-semibold text-[#101828]">
            {row.invoice_number}
          </span>
          <span className="block text-[11px] text-[#667085]">
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
        <span className="font-mono text-xs font-semibold text-[#344054]">
          {row.lr_number || "-"}
        </span>
      ),
    },
    {
      key: "client_name",
      header: "Billed Client",
      sortable: true,
      cell: (row) => (
        <span className="font-medium text-[#101828]">
          {row.client_name}
        </span>
      ),
    },
    {
      key: "taxable_amount",
      header: "Taxable Freight (₹)",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono tabular-nums text-[#344054]">
          ₹{parseFloat(String(row.taxable_amount)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "gst_amount",
      header: "GST (5% GTA)",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono tabular-nums text-[#667085]">
          ₹{parseFloat(String(row.gst_amount)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "total_invoice_amount",
      header: "Total Billed (₹)",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-bold tabular-nums text-[#027A48]">
          ₹{parseFloat(String(row.total_invoice_amount)).toLocaleString()}
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
          { label: "Invoice Register" },
        ]}
        title="Invoice Register"
        description="Transport invoice billing register generated from delivered and verified consignments (PRD §7.4)."
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
        searchPlaceholder="Filter by invoice number, LR, or client..."
      />
    </div>
  );
}
