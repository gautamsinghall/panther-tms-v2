"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw, Landmark, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface BankReconTransaction {
  id: number;
  entry_date: string;
  voucher_id: number;
  voucher_number: string;
  voucher_type: string;
  party_name?: string;
  deposit_amount: number;
  withdrawal_amount: number;
  narration?: string;
  is_cleared: boolean;
  clearance_date?: string;
}

interface BankReconciliationResponse {
  account_id: number;
  account_name: string;
  as_of_date: string;
  balance_as_per_books: number;
  unpresented_cheques: number;
  uncredited_cheques: number;
  computed_bank_statement_balance: number;
  transactions: BankReconTransaction[];
}

export default function BankReconciliationPage() {
  const [data, setData] = useState<BankReconciliationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadBankRecon() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<BankReconciliationResponse>("/api/v1/reports/bank-reconciliation");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load Bank Reconciliation");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBankRecon();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const job = await apiClient<any>("/api/v1/reports/export", {
        method: "POST",
        body: JSON.stringify({ report_name: "ledger", format: "csv" }),
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

  const columns: ColumnDef<BankReconTransaction>[] = [
    {
      key: "entry_date",
      header: "Date",
      sortable: true,
      cell: (row) => <span className="text-xs text-[#475467]">{formatDate(row.entry_date)}</span>,
    },
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
      key: "voucher_type",
      header: "Type",
      cell: (row) => (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F2F4F7] text-[#172033] font-medium border border-[#E4E7EC]">
          {row.voucher_type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "narration",
      header: "Particulars / Party",
      cell: (row) => (
        <div>
          {row.party_name && (
            <div className="font-semibold text-xs text-[#172033]">{row.party_name}</div>
          )}
          <div className="text-[11px] text-[#667085] truncate max-w-xs">{row.narration || "Bank posting"}</div>
        </div>
      ),
    },
    {
      key: "deposit_amount",
      header: "Deposit (Dr) (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-emerald-600 font-medium">
          {Number(row.deposit_amount) > 0 ? formatCurrency(Number(row.deposit_amount)) : "-"}
        </span>
      ),
    },
    {
      key: "withdrawal_amount",
      header: "Withdrawal (Cr) (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-rose-600 font-medium">
          {Number(row.withdrawal_amount) > 0 ? formatCurrency(Number(row.withdrawal_amount)) : "-"}
        </span>
      ),
    },
    {
      key: "is_cleared",
      header: "Clearance Status",
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#027A48] bg-[#ECFDF3] border border-[#A6F4C5] px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" /> Cleared
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Reconciliation"
        description="Verify company bank ledger postings against bank statement with unpresented and uncredited adjustment schedule."
        breadcrumbs={[
          { label: "Reports", href: "/reports/daybook" },
          { label: "Bank Reconciliation" },
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
            onClick: loadBankRecon,
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
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Balance as per Books</span>
            <div className="text-xl font-bold font-mono text-[#172033] mt-1">
              ₹{Number(data.balance_as_per_books).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">{data.account_name}</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Unpresented / In-Transit</span>
            <div className="text-xl font-bold font-mono text-[#344054] mt-1">
              ₹{Number(data.unpresented_cheques - data.uncredited_cheques).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#667085] block mt-1">Uncleared cheques adjustment</span>
          </Card>

          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Computed Bank Statement</span>
            <div className="text-xl font-bold font-mono text-[#027A48] mt-1">
              ₹{Number(data.computed_bank_statement_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#027A48] block mt-1 font-medium">Reconciled as of {data.as_of_date}</span>
          </Card>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.transactions || []}
        isLoading={isLoading}
        searchPlaceholder="Filter bank transactions by voucher number..."
        searchColumn="voucher_number"
        emptyMessage="No bank transactions found."
      />
    </div>
  );
}
