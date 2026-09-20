"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface SpecialReportTripItem {
  lr_id: number;
  lr_number: string;
  booking_date: string;
  consigner_name?: string;
  origin?: string;
  destination?: string;
  vehicle_number?: string;
  vehicle_source?: string;
  freight_revenue: number;
  vehicle_hire_cost: number;
  other_direct_cost: number;
  gross_margin: number;
  margin_percentage: number;
}

interface SpecialReportResponse {
  trips: SpecialReportTripItem[];
  total_revenue: number;
  total_hire_cost: number;
  total_other_cost: number;
  total_margin: number;
  average_margin_percent: number;
  trip_count: number;
}

export default function SpecialReportPage() {
  const [data, setData] = useState<SpecialReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSpecialReport() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<SpecialReportResponse>("/api/v1/reports/special-report");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load Special Report");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSpecialReport();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const job = await apiClient<any>("/api/v1/reports/export", {
        method: "POST",
        body: JSON.stringify({ report_name: "special-report", format: "csv" }),
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

  const columns: ColumnDef<SpecialReportTripItem>[] = [
    {
      key: "lr_number",
      header: "LR #",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-semibold text-xs text-[#172033]">
          {row.lr_number}
        </span>
      ),
    },
    {
      key: "booking_date",
      header: "Date",
      sortable: true,
      cell: (row) => <span className="text-xs text-[#475467]">{formatDate(row.booking_date)}</span>,
    },
    {
      key: "consigner_name",
      header: "Consigner / Route",
      cell: (row) => (
        <div>
          <div className="font-semibold text-xs text-[#172033]">{row.consigner_name || "Unassigned"}</div>
          <div className="text-[11px] text-[#667085]">
            {row.origin || "-"} → {row.destination || "-"}
          </div>
        </div>
      ),
    },
    {
      key: "vehicle_number",
      header: "Vehicle",
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-semibold text-[#172033] block">
            {row.vehicle_number || "-"}
          </span>
          <span className="text-[10px] text-[#667085] uppercase">{row.vehicle_source}</span>
        </div>
      ),
    },
    {
      key: "freight_revenue",
      header: "Revenue (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-[#172033] font-medium">
          {formatCurrency(Number(row.freight_revenue))}
        </span>
      ),
    },
    {
      key: "vehicle_hire_cost",
      header: "Hire Cost (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-rose-600 font-medium">
          {formatCurrency(Number(row.vehicle_hire_cost))}
        </span>
      ),
    },
    {
      key: "gross_margin",
      header: "Gross Margin (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <div className="text-right">
          <span className={`font-mono text-xs font-bold block ${Number(row.gross_margin) >= 0 ? "text-[#027A48]" : "text-[#B42318]"}`}>
            {formatCurrency(Number(row.gross_margin))}
          </span>
          <span className="text-[10px] text-[#667085]">
            {Number(row.margin_percentage).toFixed(1)}% margin
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Special Report (Trip P&L Drilldown)"
        description="Comprehensive operational drilldown tracking trip-by-trip freight revenue, market hire cost, and gross margin percentage."
        breadcrumbs={[
          { label: "Reports", href: "/reports/daybook" },
          { label: "Special Report" },
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
            onClick: loadSpecialReport,
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
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Total Trip Revenue</span>
            <div className="text-xl font-bold font-mono text-[#172033] mt-1">
              ₹{Number(data.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">{data.trip_count} trips tracked</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Total Truck Hire Cost</span>
            <div className="text-xl font-bold font-mono text-rose-600 mt-1">
              ₹{Number(data.total_hire_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">Market vehicles & ATH/BTH</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Gross Operating Margin</span>
            <div className="text-xl font-bold font-mono text-[#027A48] mt-1">
              ₹{Number(data.total_margin).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#027A48] block mt-1 font-medium">Trip-level net contribution</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Average Margin %</span>
            <div className="text-xl font-bold font-mono text-[#172033] mt-1">
              {Number(data.average_margin_percent).toFixed(1)}%
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">Average profitability</span>
          </Card>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.trips || []}
        isLoading={isLoading}
        searchPlaceholder="Filter trips by LR number or consigner..."
        searchColumn="lr_number"
        emptyMessage="No trip profitability data found."
      />
    </div>
  );
}
