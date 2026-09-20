"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface TDSPayableItem {
  voucher_id: number;
  voucher_number: string;
  voucher_date: string;
  party_name?: string;
  pan?: string;
  section: string;
  gross_amount: number;
  tds_rate: number;
  tds_amount: number;
  is_deposited: boolean;
  challan_number?: string;
  deposit_date?: string;
}

interface TDSPayableResponse {
  records: TDSPayableItem[];
  total_gross_amount: number;
  total_tds_deducted: number;
  total_tds_deposited: number;
  total_tds_pending: number;
  record_count: number;
}

export default function TDSPayablePage() {
  const [data, setData] = useState<TDSPayableResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTDSPayable() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<TDSPayableResponse>("/api/v1/statements/tds-payable");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load TDS Payable report");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTDSPayable();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const job = await apiClient<any>("/api/v1/reports/export", {
        method: "POST",
        body: JSON.stringify({ report_name: "daybook", format: "csv" }),
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

  const columns: ColumnDef<TDSPayableItem>[] = [
    {
      key: "voucher_number",
      header: "Voucher #",
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
      header: "Deductee / Vendor",
      cell: (row) => (
        <div>
          <span className="font-semibold text-xs text-[#172033] block">{row.party_name || "Vehicle Owner"}</span>
          <span className="text-[10px] font-mono text-[#667085]">{row.pan ? `PAN: ${row.pan}` : "PAN Not Quoted"}</span>
        </div>
      ),
    },
    {
      key: "section",
      header: "Section",
      cell: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
          Sec {row.section}
        </span>
      ),
    },
    {
      key: "gross_amount",
      header: "Gross Amount (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-[#172033]">
          {formatCurrency(Number(row.gross_amount))}
        </span>
      ),
    },
    {
      key: "tds_amount",
      header: "TDS Deducted (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-amber-700">
          {formatCurrency(Number(row.tds_amount))} ({Number(row.tds_rate)}%)
        </span>
      ),
    },
    {
      key: "is_deposited",
      header: "Status",
      cell: (row) => (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          row.is_deposited
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}>
          {row.is_deposited ? "Deposited" : "Pending Deposit"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="TDS Payable Report"
        description="Tax Deducted at Source schedule tracking Section 194C (Transporters) and 194J deductions pending government deposit."
        breadcrumbs={[
          { label: "Statements", href: "/statements/gst-output" },
          { label: "TDS Payable" },
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
            onClick: loadTDSPayable,
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
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Gross Contract Value</span>
            <div className="text-xl font-bold font-mono text-[#172033] mt-1">
              ₹{Number(data.total_gross_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">{data.record_count} deductions</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Total TDS Deducted</span>
            <div className="text-xl font-bold font-mono text-amber-700 mt-1">
              ₹{Number(data.total_tds_deducted).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">Under Sec 194C / 194J</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">TDS Deposited</span>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
              ₹{Number(data.total_tds_deposited).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">Challan deposited</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Pending Deposit</span>
            <div className="text-xl font-bold font-mono text-rose-700 mt-1">
              ₹{Number(data.total_tds_pending).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-rose-700 block mt-1 font-medium">Due by 7th of next month</span>
          </Card>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.records || []}
        isLoading={isLoading}
        searchPlaceholder="Filter deductions by deductee name..."
        searchColumn="party_name"
        emptyMessage="No TDS deductions recorded."
      />
    </div>
  );
}
