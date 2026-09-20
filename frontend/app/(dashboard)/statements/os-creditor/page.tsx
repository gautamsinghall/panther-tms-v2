"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface OSCreditorItem {
  account_id: number;
  creditor_name: string;
  creditor_code: string;
  phone?: string;
  gstin?: string;
  current_balance: number;
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_over_90: number;
  latest_bill_date?: string;
  days_overdue: number;
}

interface OSCreditorResponse {
  as_of_date: string;
  creditors: OSCreditorItem[];
  total_outstanding: number;
  total_bucket_0_30: number;
  total_bucket_31_60: number;
  total_bucket_61_90: number;
  total_bucket_over_90: number;
  creditor_count: number;
}

export default function OutstandingCreditorsPage() {
  const [data, setData] = useState<OSCreditorResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCreditors() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<OSCreditorResponse>("/api/v1/statements/os-creditor");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load Outstanding Creditors statement");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCreditors();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const job = await apiClient<any>("/api/v1/reports/export", {
        method: "POST",
        body: JSON.stringify({ report_name: "os-creditor", format: "csv" }),
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

  const columns: ColumnDef<OSCreditorItem>[] = [
    {
      key: "creditor_name",
      header: "Creditor / Supplier / Owner",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-xs text-[#172033] block">
            {row.creditor_name}
          </span>
          <span className="text-[10px] text-[#98A2B3] font-mono">
            {row.creditor_code}
          </span>
        </div>
      ),
    },
    {
      key: "current_balance",
      header: "Total Payable (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-[#172033]">
          {formatCurrency(Number(row.current_balance))}
        </span>
      ),
    },
    {
      key: "bucket_0_30",
      header: "0-30 Days (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-emerald-700">
          {Number(row.bucket_0_30) > 0 ? formatCurrency(Number(row.bucket_0_30)) : "-"}
        </span>
      ),
    },
    {
      key: "bucket_31_60",
      header: "31-60 Days (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-blue-700">
          {Number(row.bucket_31_60) > 0 ? formatCurrency(Number(row.bucket_31_60)) : "-"}
        </span>
      ),
    },
    {
      key: "bucket_61_90",
      header: "61-90 Days (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-amber-700">
          {Number(row.bucket_61_90) > 0 ? formatCurrency(Number(row.bucket_61_90)) : "-"}
        </span>
      ),
    },
    {
      key: "bucket_over_90",
      header: "90+ Days (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-rose-700 font-bold">
          {Number(row.bucket_over_90) > 0 ? formatCurrency(Number(row.bucket_over_90)) : "-"}
        </span>
      ),
    },
    {
      key: "days_overdue",
      header: "Overdue",
      align: "center",
      cell: (row) => (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          row.days_overdue > 60
            ? "bg-rose-50 text-rose-700 border border-rose-200"
            : row.days_overdue > 30
            ? "bg-amber-50 text-amber-700 border border-amber-200"
            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
        }`}>
          {row.days_overdue} days
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outstanding Creditors (Accounts Payable)"
        description="Aged payables schedule tracking obligations to truck owners, fuel pumps, and maintenance vendors."
        breadcrumbs={[
          { label: "Statements", href: "/statements/gst-output" },
          { label: "O/S Creditor" },
        ]}
        primaryAction={{
          label: isExporting ? "Exporting..." : "Export Aging CSV",
          icon: <Download className="w-4 h-4" />,
          onClick: handleExport,
          disabled: isExporting,
        }}
        secondaryActions={[
          {
            label: "Refresh",
            icon: <RefreshCw className="w-4 h-4" />,
            variant: "outline",
            onClick: loadCreditors,
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Total Payable</span>
            <div className="text-lg font-bold font-mono text-[#172033] mt-1">
              ₹{Number(data.total_outstanding).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-[#667085] block mt-0.5">{data.creditor_count} creditors</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">0-30 Days</span>
            <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
              ₹{Number(data.total_bucket_0_30).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-[#667085] block mt-0.5">Current due</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">31-60 Days</span>
            <div className="text-lg font-bold font-mono text-blue-700 mt-1">
              ₹{Number(data.total_bucket_31_60).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-[#667085] block mt-0.5">30+ days due</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">61-90 Days</span>
            <div className="text-lg font-bold font-mono text-amber-700 mt-1">
              ₹{Number(data.total_bucket_61_90).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-[#667085] block mt-0.5">Overdue</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">90+ Days</span>
            <div className="text-lg font-bold font-mono text-rose-700 mt-1">
              ₹{Number(data.total_bucket_over_90).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-[#667085] block mt-0.5">Critical pending</span>
          </Card>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.creditors || []}
        isLoading={isLoading}
        searchPlaceholder="Filter creditors by name or code..."
        searchColumn="creditor_name"
        emptyMessage="No outstanding payables found."
      />
    </div>
  );
}
