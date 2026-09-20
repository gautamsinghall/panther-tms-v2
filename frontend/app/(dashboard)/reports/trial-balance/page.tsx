"use client";

import React, { useState, useEffect } from "react";
import { Scale, Download, Printer, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { formatCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface TrialBalanceAccount {
  account_id: number;
  account_code: string;
  account_name: string;
  debit_balance: number;
  credit_balance: number;
  group_name?: string;
  primary_group_name?: string;
}

interface TrialBalanceGroup {
  group_id: number;
  group_name: string;
  group_code: string;
  accounts: TrialBalanceAccount[];
  group_debit: number;
  group_credit: number;
}

interface TrialBalancePrimaryGroup {
  primary_group_id: number;
  primary_group_name: string;
  primary_group_code: string;
  nature: string;
  groups: TrialBalanceGroup[];
  primary_debit: number;
  primary_credit: number;
}

interface TrialBalanceResponse {
  as_of_date: string;
  primary_groups: TrialBalancePrimaryGroup[];
  total_debit: number;
  total_credit: number;
  difference: number;
  is_balanced: boolean;
}

export default function TrialBalancePage() {
  const [tbData, setTbData] = useState<TrialBalanceResponse | null>(null);
  const [flatAccounts, setFlatAccounts] = useState<TrialBalanceAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTrialBalance() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<TrialBalanceResponse>("/api/v1/reports/trial-balance");
      setTbData(data);

      // Flatten for the table view
      const flat: TrialBalanceAccount[] = [];
      data.primary_groups?.forEach((pg: TrialBalancePrimaryGroup) => {
        pg.groups?.forEach((g: TrialBalanceGroup) => {
          g.accounts?.forEach((a: TrialBalanceAccount) => {
            flat.push({
              ...a,
              group_name: g.group_name,
              primary_group_name: pg.primary_group_name,
            });
          });
        });
      });
      setFlatAccounts(flat);
    } catch (err: any) {
      setError(err?.message || "Failed to load Trial Balance from server");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTrialBalance();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const job = await apiClient<any>("/api/v1/reports/export", {
        method: "POST",
        body: JSON.stringify({
          report_name: "trial-balance",
          format: "csv",
        }),
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

  const columns: ColumnDef<TrialBalanceAccount>[] = [
    {
      key: "primary_group_name",
      header: "Primary Group",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-semibold text-[#344054] tracking-tight">
          {row.primary_group_name}
        </span>
      ),
    },
    {
      key: "group_name",
      header: "Group",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-[#667085] font-medium">
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
      key: "debit_balance",
      header: "Debit (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-[#172033] font-medium">
          {Number(row.debit_balance) > 0 ? formatCurrency(Number(row.debit_balance)) : "-"}
        </span>
      ),
    },
    {
      key: "credit_balance",
      header: "Credit (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-[#172033] font-medium">
          {Number(row.credit_balance) > 0 ? formatCurrency(Number(row.credit_balance)) : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trial Balance"
        description="Verify strict financial equilibrium across all ledger accounts computed from real double-entry postings."
        breadcrumbs={[
          { label: "Reports", href: "/reports/daybook" },
          { label: "Trial Balance" },
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
            onClick: loadTrialBalance,
          },
          {
            label: "Print",
            icon: <Printer className="w-4 h-4" />,
            variant: "outline",
            onClick: () => window.print(),
          },
        ]}
      />

      {/* Equilibrium Status Banner */}
      {tbData && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          tbData.is_balanced
            ? "bg-[#ECFDF3] border-[#A6F4C5] text-[#027A48]"
            : "bg-[#FEF3F2] border-[#FECDCA] text-[#B42318]"
        }`}>
          <div className="flex items-center gap-3">
            {tbData.is_balanced ? (
              <CheckCircle2 className="w-5 h-5 text-[#12B76A] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[#F04438] shrink-0" />
            )}
            <div>
              <h4 className="text-sm font-semibold">
                {tbData.is_balanced
                  ? "Books are in Perfect Equilibrium (Zero Variance)"
                  : "Books Unbalanced — Audit Difference Detected"}
              </h4>
              <p className="text-xs opacity-90">
                {tbData.is_balanced
                  ? `Total Debits ₹${Number(tbData.total_debit).toLocaleString()} exactly tie out with Total Credits ₹${Number(tbData.total_credit).toLocaleString()} as of ${tbData.as_of_date}.`
                  : `Discrepancy of ₹${Number(tbData.difference).toLocaleString()} between Debits and Credits.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span>Total DR: ₹{Number(tbData.total_debit).toLocaleString()}</span>
            <span>Total CR: ₹{Number(tbData.total_credit).toLocaleString()}</span>
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
        data={flatAccounts}
        isLoading={isLoading}
        searchPlaceholder="Filter accounts by name or code..."
        searchColumn="account_name"
        emptyMessage="No ledger transactions recorded yet. Vouchers created will appear here."
      />

      {/* Bottom Summary Bar */}
      {tbData && (
        <div className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#E4E7EC] rounded-xl text-sm font-semibold text-[#172033]">
          <span>Equilibrium Summary</span>
          <div className="flex items-center gap-8 font-mono">
            <div>
              <span className="text-xs text-[#667085] mr-2">Total Debits:</span>
              <span className="text-[#027A48]">₹{Number(tbData.total_debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-xs text-[#667085] mr-2">Total Credits:</span>
              <span className="text-[#027A48]">₹{Number(tbData.total_credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-xs text-[#667085] mr-2">Difference:</span>
              <span className={tbData.difference === 0 ? "text-[#027A48]" : "text-[#B42318]"}>
                ₹{Number(tbData.difference).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
