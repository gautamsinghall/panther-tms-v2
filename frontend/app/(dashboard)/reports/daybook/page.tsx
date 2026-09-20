"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface DaybookEntry {
  id: number;
  voucher_id: number;
  voucher_number: string;
  voucher_type: string;
  entry_date: string;
  account_id: number;
  account_name: string;
  account_code: string;
  party_name?: string;
  debit_amount: number;
  credit_amount: number;
  narration?: string;
  is_reversal: boolean;
}

interface DaybookResponse {
  entries: DaybookEntry[];
  total_debit: number;
  total_credit: number;
  total_entries: number;
  from_date?: string;
  to_date?: string;
}

export default function DaybookReportPage() {
  const [entries, setEntries] = useState<DaybookEntry[]>([]);
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDaybook() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<DaybookResponse>("/api/v1/reports/daybook");
      setEntries(data.entries || []);
      setTotalDebit(Number(data.total_debit || 0));
      setTotalCredit(Number(data.total_credit || 0));
    } catch (err: any) {
      setError(err?.message || "Failed to load Daybook transactions");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDaybook();
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

  const columns: ColumnDef<DaybookEntry>[] = [
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
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F2F4F7] text-[#172033] font-medium border border-[#E4E7EC]">
          {row.voucher_type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "entry_date",
      header: "Date",
      sortable: true,
      cell: (row) => <span className="text-xs text-[#475467]">{formatDate(row.entry_date)}</span>,
    },
    {
      key: "account_name",
      header: "Account / Particulars",
      cell: (row) => (
        <div>
          <div className="font-semibold text-xs text-[#172033]">{row.account_name}</div>
          <div className="text-[11px] text-[#667085] flex items-center gap-1.5 mt-0.5">
            {row.party_name && (
              <span className="font-medium text-[#344054]">Party: {row.party_name} •</span>
            )}
            <span className="truncate max-w-xs">{row.narration || "No narration"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "debit_amount",
      header: "Debit (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-medium text-[#172033]">
          {Number(row.debit_amount) > 0 ? formatCurrency(Number(row.debit_amount)) : "-"}
        </span>
      ),
    },
    {
      key: "credit_amount",
      header: "Credit (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-medium text-emerald-600">
          {Number(row.credit_amount) > 0 ? formatCurrency(Number(row.credit_amount)) : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daybook"
        description="Chronological record of all daily debit and credit transactions across all voucher types."
        breadcrumbs={[
          { label: "Reports", href: "/reports/daybook" },
          { label: "Daybook" },
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
            onClick: loadDaybook,
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
        data={entries}
        isLoading={isLoading}
        searchPlaceholder="Search by voucher number or account name..."
        searchColumn="account_name"
        emptyMessage="No daybook transactions found for the selected period."
      />

      {/* Summary Footer */}
      <div className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#E4E7EC] rounded-xl text-sm font-semibold text-[#172033]">
        <span>Total Postings ({entries.length} records)</span>
        <div className="flex items-center gap-8 font-mono">
          <div>
            <span className="text-xs text-[#667085] mr-2">Total Debit:</span>
            <span className="text-[#172033]">₹{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-xs text-[#667085] mr-2">Total Credit:</span>
            <span className="text-emerald-600">₹{totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-xs text-[#667085] mr-2">Net Variance:</span>
            <span className={Math.abs(totalDebit - totalCredit) === 0 ? "text-[#027A48]" : "text-[#B42318]"}>
              ₹{Math.abs(totalDebit - totalCredit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
