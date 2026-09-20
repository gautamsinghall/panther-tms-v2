"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw, FileCheck2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface SalesRegisterItem {
  voucher_id: number;
  voucher_number: string;
  voucher_date: string;
  party_name?: string;
  party_gstin?: string;
  lr_number?: string;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  net_amount: number;
  irn?: string;
  irn_status?: string;
}

interface SalesRegisterResponse {
  invoices: SalesRegisterItem[];
  total_taxable: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_tax: number;
  total_net_amount: number;
  invoice_count: number;
}

export default function SalesRegisterPage() {
  const [data, setData] = useState<SalesRegisterResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSalesRegister() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<SalesRegisterResponse>("/api/v1/reports/sales-register");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load Sales Register");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSalesRegister();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const job = await apiClient<any>("/api/v1/reports/export", {
        method: "POST",
        body: JSON.stringify({ report_name: "sales-register", format: "csv" }),
      });
      if (job.download_url) {
        window.open(job.download_url, "_blank");
      }
    } catch (err: any) {
      alert("Export failed: " + err.message);
    } finally {
      setIsExporting(false);
    }
  }

  const columns: ColumnDef<SalesRegisterItem>[] = [
    {
      key: "voucher_number",
      header: "Invoice #",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-semibold text-xs text-[#172033]">
          {row.voucher_number}
        </span>
      ),
    },
    {
      key: "voucher_date",
      header: "Date",
      sortable: true,
      cell: (row) => <span className="text-xs text-[#475467]">{formatDate(row.voucher_date)}</span>,
    },
    {
      key: "party_name",
      header: "Client / Recipient",
      cell: (row) => (
        <div>
          <div className="font-semibold text-xs text-[#172033]">{row.party_name || "Unassigned"}</div>
          {row.party_gstin && (
            <div className="text-[10px] font-mono text-[#667085]">GSTIN: {row.party_gstin}</div>
          )}
        </div>
      ),
    },
    {
      key: "lr_number",
      header: "LR #",
      cell: (row) => (
        <span className="text-xs font-mono text-[#344054]">
          {row.lr_number || "-"}
        </span>
      ),
    },
    {
      key: "taxable_amount",
      header: "Taxable (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-[#172033]">
          {formatCurrency(Number(row.taxable_amount))}
        </span>
      ),
    },
    {
      key: "total_tax",
      header: "GST Tax (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-amber-700">
          {formatCurrency(Number(row.total_tax))}
        </span>
      ),
    },
    {
      key: "net_amount",
      header: "Total (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-[#027A48]">
          {formatCurrency(Number(row.net_amount))}
        </span>
      ),
    },
    {
      key: "irn_status",
      header: "IRN Status",
      cell: (row) => (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          row.irn_status === "GENERATED"
            ? "bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]"
            : "bg-[#F2F4F7] text-[#667085] border border-[#E4E7EC]"
        }`}>
          {row.irn_status || "PENDING"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Register"
        description="Comprehensive audit of all transport and general billing invoices with tax breakdown and IRN linkage."
        breadcrumbs={[
          { label: "Reports", href: "/reports/daybook" },
          { label: "Sales Register" },
        ]}
        primaryAction={{
          label: isExporting ? "Exporting..." : "Export CSV",
          icon: <Download className="w-4 h-4" />,
          onClick: handleExport,
          disabled: isExporting,
        }}
        secondaryActions={[
          {
            label: "Refresh",
            icon: <RefreshCw className="w-4 h-4" />,
            variant: "outline",
            onClick: loadSalesRegister,
          },
          {
            label: "Print",
            icon: <Printer className="w-4 h-4" />,
            variant: "outline",
            onClick: () => window.print(),
          },
        ]}
      />

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.invoices || []}
        isLoading={isLoading}
        searchPlaceholder="Search invoices by number or client name..."
        searchColumn="party_name"
        emptyMessage="No sales invoices found."
      />

      {data && (
        <div className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#E4E7EC] rounded-xl text-sm font-semibold text-[#172033]">
          <span>Sales Summary ({data.invoice_count} invoices)</span>
          <div className="flex items-center gap-8 font-mono">
            <div>
              <span className="text-xs text-[#667085] mr-2">Taxable:</span>
              <span>₹{Number(data.total_taxable).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-xs text-[#667085] mr-2">Total GST:</span>
              <span className="text-amber-700">₹{Number(data.total_tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-xs text-[#667085] mr-2">Total Invoiced:</span>
              <span className="text-[#027A48]">₹{Number(data.total_net_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
