"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface GSTInputItem {
  voucher_id: number;
  voucher_number: string;
  voucher_date: string;
  supplier_name?: string;
  supplier_gstin?: string;
  reference_number?: string;
  reference_date?: string;
  taxable_value: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  total_amount: number;
  itc_eligible: boolean;
  itc_remarks?: string;
}

interface GSTInputResponse {
  records: GSTInputItem[];
  total_taxable: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_tax: number;
  total_amount: number;
  total_itc_eligible: number;
  record_count: number;
}

export default function GSTInputStatementPage() {
  const [data, setData] = useState<GSTInputResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadGSTInput() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<GSTInputResponse>("/api/v1/statements/gst-input");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load GST Input statement");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadGSTInput();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const job = await apiClient<any>("/api/v1/reports/export", {
        method: "POST",
        body: JSON.stringify({ report_name: "purchase-register", format: "csv" }),
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

  const columns: ColumnDef<GSTInputItem>[] = [
    {
      key: "voucher_number",
      header: "Bill #",
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
      key: "supplier_name",
      header: "Supplier / Vendor",
      cell: (row) => (
        <div>
          <div className="font-semibold text-xs text-[#172033]">{row.supplier_name || "Vendor"}</div>
          {row.reference_number && (
            <div className="text-[10px] text-[#667085]">Ref: {row.reference_number}</div>
          )}
        </div>
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
      header: "ITC Claimable (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-[#027A48]">
          {formatCurrency(Number(row.total_tax))}
        </span>
      ),
    },
    {
      key: "total_amount",
      header: "Total Bill (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-medium text-[#172033]">
          {formatCurrency(Number(row.total_amount))}
        </span>
      ),
    },
    {
      key: "itc_eligible",
      header: "Status",
      cell: (row) => (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]">
          {row.itc_remarks || "Eligible ITC"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="GST Input Statement (GSTR-2B)"
        description="Inward taxable supplies statement for reconciliation and Input Tax Credit (ITC) claim audit."
        breadcrumbs={[
          { label: "Statements", href: "/statements/gst-output" },
          { label: "GST Input" },
        ]}
        primaryAction={{
          label: isExporting ? "Exporting..." : "Export GSTR-2B CSV",
          icon: <Download className="w-4 h-4" />,
          onClick: handleExport,
          disabled: isExporting,
        }}
        secondaryActions={[
          {
            label: "Refresh",
            icon: <RefreshCw className="w-4 h-4" />,
            variant: "outline",
            onClick: loadGSTInput,
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Total Taxable Value</span>
            <div className="text-xl font-bold font-mono text-[#172033] mt-1">
              ₹{Number(data.total_taxable).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">{data.record_count} purchase invoices</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Eligible Input Tax Credit (ITC)</span>
            <div className="text-xl font-bold font-mono text-[#027A48] mt-1">
              ₹{Number(data.total_itc_eligible).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#027A48] block mt-1 font-medium">Claimable against GST output</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Total Inward Billing</span>
            <div className="text-xl font-bold font-mono text-[#172033] mt-1">
              ₹{Number(data.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">Gross inward expenses</span>
          </Card>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.records || []}
        isLoading={isLoading}
        searchPlaceholder="Filter bills by supplier name or bill number..."
        searchColumn="supplier_name"
        emptyMessage="No inward GST bills recorded."
      />
    </div>
  );
}
