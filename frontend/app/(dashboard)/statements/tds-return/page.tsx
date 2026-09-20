"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface TDSReturnSectionSummary {
  section: string;
  description: string;
  deductee_count: number;
  total_amount_paid: number;
  total_tds_deducted: number;
  total_tds_deposited: number;
}

interface TDSReturnResponse {
  financial_year: string;
  quarter: string;
  sections: TDSReturnSectionSummary[];
  total_deductees: number;
  total_amount_paid: number;
  total_tax_deducted: number;
  total_tax_deposited: number;
}

export default function TDSReturnPage() {
  const [data, setData] = useState<TDSReturnResponse | null>(null);
  const [quarter, setQuarter] = useState<string>("Q1");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTDSReturn() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<TDSReturnResponse>(`/api/v1/statements/tds-return?quarter=${quarter}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load TDS Return report");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTDSReturn();
  }, [quarter]);

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

  const columns: ColumnDef<TDSReturnSectionSummary>[] = [
    {
      key: "section",
      header: "Section",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-xs text-[#172033] bg-[#F2F4F7] px-2.5 py-1 rounded">
          Sec {row.section}
        </span>
      ),
    },
    {
      key: "description",
      header: "Nature of Payment",
      cell: (row) => (
        <span className="text-xs font-semibold text-[#344054]">
          {row.description}
        </span>
      ),
    },
    {
      key: "deductee_count",
      header: "Deductees",
      align: "center",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-[#172033]">
          {row.deductee_count}
        </span>
      ),
    },
    {
      key: "total_amount_paid",
      header: "Gross Paid (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-[#172033]">
          {formatCurrency(Number(row.total_amount_paid))}
        </span>
      ),
    },
    {
      key: "total_tds_deducted",
      header: "TDS Deducted (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-amber-700">
          {formatCurrency(Number(row.total_tds_deducted))}
        </span>
      ),
    },
    {
      key: "total_tds_deposited",
      header: "TDS Deposited (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-[#027A48]">
          {formatCurrency(Number(row.total_tds_deposited))}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="TDS Return Report (Form 26Q)"
        description="Quarterly summary schedule of tax deducted at source under Chapter XVII-B of the Income Tax Act."
        breadcrumbs={[
          { label: "Statements", href: "/statements/gst-output" },
          { label: "TDS Return" },
        ]}
        primaryAction={{
          label: isExporting ? "Exporting..." : "Export Form 26Q",
          icon: <Download className="w-4 h-4" />,
          onClick: handleExport,
          disabled: isExporting,
        }}
        secondaryActions={[
          {
            label: "Refresh",
            icon: <RefreshCw className="w-4 h-4" />,
            variant: "outline",
            onClick: loadTDSReturn,
          },
          {
            label: "Print",
            icon: <Printer className="w-4 h-4" />,
            variant: "outline",
            onClick: () => window.print(),
          },
        ]}
      />

      {/* Quarter Selector */}
      <Card className="p-4 flex items-center justify-between bg-white border border-[#E4E7EC]">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-[#344054] uppercase tracking-wider">
            Quarter (Form 26Q):
          </label>
          <select
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#D0D5DD] bg-white text-[#172033]"
          >
            <option value="Q1">Q1 (Apr - Jun)</option>
            <option value="Q2">Q2 (Jul - Sep)</option>
            <option value="Q3">Q3 (Oct - Dec)</option>
            <option value="Q4">Q4 (Jan - Mar)</option>
          </select>
        </div>

        {data && (
          <div className="text-xs font-semibold text-[#667085]">
            FY: <span className="text-[#172033] font-bold">{data.financial_year}</span>
          </div>
        )}
      </Card>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Total Deductees</span>
            <div className="text-xl font-bold font-mono text-[#172033] mt-1">
              {data.total_deductees}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">Transporters & vendors</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Gross Amount Credited</span>
            <div className="text-xl font-bold font-mono text-[#172033] mt-1">
              ₹{Number(data.total_amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">Subject to deduction</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Total Tax Deducted</span>
            <div className="text-xl font-bold font-mono text-amber-700 mt-1">
              ₹{Number(data.total_tax_deducted).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">Under 194C / 194J</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Total Tax Deposited</span>
            <div className="text-xl font-bold font-mono text-[#027A48] mt-1">
              ₹{Number(data.total_tax_deposited).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#027A48] block mt-1 font-medium">Challan verified</span>
          </Card>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.sections || []}
        isLoading={isLoading}
        searchPlaceholder="Filter sections..."
        searchColumn="description"
        emptyMessage="No TDS data found for this quarter."
      />
    </div>
  );
}
