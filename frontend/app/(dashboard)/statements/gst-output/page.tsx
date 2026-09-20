"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface GSTOutputItem {
  voucher_id: number;
  voucher_number: string;
  voucher_date: string;
  customer_name?: string;
  customer_gstin?: string;
  place_of_supply?: string;
  invoice_type: string;
  is_rcm: boolean;
  taxable_value: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total_tax: number;
  total_invoice_value: number;
  irn?: string;
}

interface GSTOutputResponse {
  records: GSTOutputItem[];
  b2b_count: number;
  b2b_taxable: number;
  b2b_tax: number;
  rcm_count: number;
  rcm_taxable: number;
  rcm_tax: number;
  total_taxable: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_tax: number;
  total_invoice_value: number;
}

export default function GSTOutputStatementPage() {
  const [data, setData] = useState<GSTOutputResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadGSTOutput() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<GSTOutputResponse>("/api/v1/statements/gst-output");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load GST Output statement");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadGSTOutput();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const job = await apiClient<any>("/api/v1/reports/export", {
        method: "POST",
        body: JSON.stringify({ report_name: "gst-output", format: "csv" }),
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

  const columns: ColumnDef<GSTOutputItem>[] = [
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
      key: "customer_name",
      header: "Recipient / GSTIN",
      cell: (row) => (
        <div>
          <div className="font-semibold text-xs text-[#172033]">{row.customer_name || "Unassigned"}</div>
          <div className="text-[10px] font-mono text-[#667085]">
            {row.customer_gstin ? `GSTIN: ${row.customer_gstin}` : "Unregistered (B2C)"}
          </div>
        </div>
      ),
    },
    {
      key: "invoice_type",
      header: "Category",
      cell: (row) => (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          row.is_rcm
            ? "bg-purple-50 text-purple-700 border border-purple-200"
            : row.invoice_type === "B2B"
            ? "bg-blue-50 text-blue-700 border border-blue-200"
            : "bg-gray-50 text-gray-700 border border-gray-200"
        }`}>
          {row.invoice_type}
        </span>
      ),
    },
    {
      key: "taxable_value",
      header: "Taxable Value (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-[#172033]">
          {formatCurrency(Number(row.taxable_value))}
        </span>
      ),
    },
    {
      key: "total_tax",
      header: "Total GST (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-amber-700 font-medium">
          {formatCurrency(Number(row.total_tax))}
        </span>
      ),
    },
    {
      key: "total_invoice_value",
      header: "Invoice Value (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-[#027A48]">
          {formatCurrency(Number(row.total_invoice_value))}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="GST Output Statement (GSTR-1)"
        description="Statutory statement of outward taxable supplies, B2B invoices, and GTA reverse charge (RCM) liabilities."
        breadcrumbs={[
          { label: "Statements", href: "/statements/gst-output" },
          { label: "GST Output" },
        ]}
        primaryAction={{
          label: isExporting ? "Exporting..." : "Export GSTR-1 CSV",
          icon: <Download className="w-4 h-4" />,
          onClick: handleExport,
          disabled: isExporting,
        }}
        secondaryActions={[
          {
            label: "Refresh",
            icon: <RefreshCw className="w-4 h-4" />,
            variant: "outline",
            onClick: loadGSTOutput,
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

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Total Taxable Value</span>
            <div className="text-xl font-bold font-mono text-[#172033] mt-1">
              ₹{Number(data.total_taxable).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">{data.records?.length || 0} tax invoices</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">B2B Supplies</span>
            <div className="text-xl font-bold font-mono text-blue-700 mt-1">
              ₹{Number(data.b2b_taxable).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">{data.b2b_count} registered clients</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">RCM Reverse Charge</span>
            <div className="text-xl font-bold font-mono text-purple-700 mt-1">
              ₹{Number(data.rcm_taxable).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">{data.rcm_count} RCM invoices</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Total Output GST</span>
            <div className="text-xl font-bold font-mono text-amber-700 mt-1">
              ₹{Number(data.total_tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">Payable output tax</span>
          </Card>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.records || []}
        isLoading={isLoading}
        searchPlaceholder="Filter invoices by customer name or voucher number..."
        searchColumn="customer_name"
        emptyMessage="No outward GST supplies recorded."
      />
    </div>
  );
}
