"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface OpeningBalanceAccount {
  account_id: number;
  account_code: string;
  account_name: string;
  group_name: string;
  primary_group_name: string;
  opening_balance: number;
  opening_balance_type: string;
}

interface OpeningBalanceResponse {
  accounts: OpeningBalanceAccount[];
  total_debit: number;
  total_credit: number;
  difference: number;
  is_balanced: boolean;
  account_count: number;
}

export default function OpeningBalanceDetailsPage() {
  const [data, setData] = useState<OpeningBalanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOpeningBalances() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<OpeningBalanceResponse>("/api/v1/statements/opening-balance");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load Opening Balance schedule");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOpeningBalances();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const job = await apiClient<any>("/api/v1/reports/export", {
        method: "POST",
        body: JSON.stringify({ report_name: "trial-balance", format: "csv" }),
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

  const columns: ColumnDef<OpeningBalanceAccount>[] = [
    {
      key: "primary_group_name",
      header: "Primary Group",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-semibold text-[#344054]">
          {row.primary_group_name}
        </span>
      ),
    },
    {
      key: "group_name",
      header: "Group",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-[#667085]">
          {row.group_name}
        </span>
      ),
    },
    {
      key: "account_name",
      header: "Account Head",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-xs text-[#172033] block">
            {row.account_name}
          </span>
          <span className="text-[10px] text-[#98A2B3] font-mono">
            {row.account_code}
          </span>
        </div>
      ),
    },
    {
      key: "opening_balance",
      header: "Opening Balance (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-[#172033]">
          {formatCurrency(Number(row.opening_balance))}
        </span>
      ),
    },
    {
      key: "opening_balance_type",
      header: "Dr / Cr",
      align: "center",
      cell: (row) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
          row.opening_balance_type === "DR"
            ? "bg-blue-50 text-blue-700 border border-blue-200"
            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
        }`}>
          {row.opening_balance_type}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opening Balance Details"
        description="Schedule of initial account balances brought forward into the system and verification of double-entry opening balance equality."
        breadcrumbs={[
          { label: "Statements", href: "/statements/gst-output" },
          { label: "Opening Balance Details" },
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
            onClick: loadOpeningBalances,
          },
          {
            label: "Print",
            icon: <Printer className="w-4 h-4" />,
            variant: "outline",
            onClick: () => window.print(),
          },
        ]}
      />

      {/* Opening Balance Equilibrium Banner */}
      {data && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          data.is_balanced
            ? "bg-[#ECFDF3] border-[#A6F4C5] text-[#027A48]"
            : "bg-[#FEF3F2] border-[#FECDCA] text-[#B42318]"
        }`}>
          <div className="flex items-center gap-3">
            {data.is_balanced ? (
              <CheckCircle2 className="w-5 h-5 text-[#12B76A] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[#F04438] shrink-0" />
            )}
            <div>
              <h4 className="text-sm font-semibold">
                {data.is_balanced
                  ? "Opening Balances Balanced (Total Debit == Total Credit)"
                  : "Opening Balances Out of Balance"}
              </h4>
              <p className="text-xs opacity-90">
                Total Opening Debits ₹{Number(data.total_debit).toLocaleString()} vs Credits ₹{Number(data.total_credit).toLocaleString()}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs font-semibold">
            <span>Total Dr: ₹{Number(data.total_debit).toLocaleString()}</span>
            <span>Total Cr: ₹{Number(data.total_credit).toLocaleString()}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.accounts || []}
        isLoading={isLoading}
        searchPlaceholder="Filter accounts by name or code..."
        searchColumn="account_name"
        emptyMessage="No opening balances found."
      />
    </div>
  );
}
