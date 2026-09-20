"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface AccountOption {
  id: number;
  code: string;
  name: string;
}

interface LedgerTransaction {
  id: number;
  entry_date: string;
  voucher_id: number;
  voucher_number: string;
  voucher_type: string;
  party_name?: string;
  debit_amount: number;
  credit_amount: number;
  narration?: string;
  running_balance: number;
  running_balance_type: string;
}

interface LedgerResponse {
  account_id: number;
  account_name: string;
  account_code: string;
  group_name: string;
  primary_group_name: string;
  opening_balance: number;
  opening_balance_type: string;
  transactions: LedgerTransaction[];
  period_debit: number;
  period_credit: number;
  closing_balance: number;
  closing_balance_type: string;
}

export default function LedgerReportPage() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [ledgerData, setLedgerData] = useState<LedgerResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load account masters
  useEffect(() => {
    async function loadAccounts() {
      try {
        const accs = await apiClient<AccountOption[]>("/api/v1/misc/accounts");
        setAccounts(accs);
        if (accs.length > 0) {
          setSelectedAccountId(accs[0].id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load accounts list");
      }
    }
    loadAccounts();
  }, []);

  // Load ledger for selected account
  async function loadLedger(accId: number) {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<LedgerResponse>(`/api/v1/reports/ledger?account_id=${accId}`);
      setLedgerData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load ledger for this account");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (selectedAccountId) {
      loadLedger(selectedAccountId);
    }
  }, [selectedAccountId]);

  async function handleExport() {
    if (!selectedAccountId) return;
    setIsExporting(true);
    try {
      const job = await apiClient<any>("/api/v1/reports/export", {
        method: "POST",
        body: JSON.stringify({
          report_name: "ledger",
          format: "csv",
          filters: { account_id: selectedAccountId },
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

  const columns: ColumnDef<LedgerTransaction>[] = [
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
      header: "Particulars / Narration",
      cell: (row) => (
        <div>
          {row.party_name && (
            <div className="font-semibold text-xs text-[#172033]">{row.party_name}</div>
          )}
          <div className="text-[11px] text-[#667085] truncate max-w-xs">
            {row.narration || "No narration"}
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
    {
      key: "running_balance",
      header: "Balance (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <div className="text-right">
          <span className="font-mono text-xs font-bold text-[#172033] block">
            {formatCurrency(Number(row.running_balance))}
          </span>
          <span className="text-[10px] font-semibold text-[#667085] uppercase">
            {row.running_balance_type}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Ledger"
        description="Comprehensive account statement showing opening balance, debit/credit entries, and running balance."
        breadcrumbs={[
          { label: "Reports", href: "/reports/daybook" },
          { label: "Ledger" },
        ]}
        primaryAction={{
          label: isExporting ? "Exporting..." : "Export CSV",
          icon: <Download className="w-4 h-4" />,
          onClick: handleExport,
          disabled: isExporting || !selectedAccountId,
        }}
        secondaryActions={[
          {
            label: "Refresh",
            icon: <RefreshCw className="w-4 h-4" />,
            variant: "outline",
            onClick: () => selectedAccountId && loadLedger(selectedAccountId),
          },
          {
            label: "Print",
            icon: <Printer className="w-4 h-4" />,
            variant: "outline",
            onClick: () => window.print(),
          },
        ]}
      />

      {/* Account Selector Bar */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-4 bg-white border border-[#E4E7EC]">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-[#344054] uppercase tracking-wider">
            Select Account Head:
          </label>
          <select
            value={selectedAccountId || ""}
            onChange={(e) => setSelectedAccountId(Number(e.target.value))}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-[#D0D5DD] bg-white text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#172033]"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.code} — {acc.name}
              </option>
            ))}
          </select>
        </div>

        {ledgerData && (
          <div className="flex items-center gap-6 text-xs font-semibold">
            <div>
              <span className="text-[#667085] mr-1.5">Group:</span>
              <span className="text-[#172033]">{ledgerData.group_name}</span>
            </div>
            <div>
              <span className="text-[#667085] mr-1.5">Opening Balance:</span>
              <span className="font-mono text-[#172033]">
                ₹{Number(ledgerData.opening_balance).toLocaleString()} {ledgerData.opening_balance_type}
              </span>
            </div>
            <div>
              <span className="text-[#667085] mr-1.5">Closing Balance:</span>
              <span className="font-mono text-[#027A48]">
                ₹{Number(ledgerData.closing_balance).toLocaleString()} {ledgerData.closing_balance_type}
              </span>
            </div>
          </div>
        )}
      </Card>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={ledgerData?.transactions || []}
        isLoading={isLoading}
        searchPlaceholder="Filter transactions by voucher number..."
        searchColumn="voucher_number"
        emptyMessage="No transactions found for this account in the specified period."
      />

      {/* Period Totals Summary */}
      {ledgerData && (
        <div className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#E4E7EC] rounded-xl text-sm font-semibold text-[#172033]">
          <span>Account Statement Summary</span>
          <div className="flex items-center gap-8 font-mono">
            <div>
              <span className="text-xs text-[#667085] mr-2">Period Debits:</span>
              <span className="text-[#172033]">₹{Number(ledgerData.period_debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-xs text-[#667085] mr-2">Period Credits:</span>
              <span className="text-emerald-600">₹{Number(ledgerData.period_credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-xs text-[#667085] mr-2">Net Closing:</span>
              <span className="text-[#027A48]">
                ₹{Number(ledgerData.closing_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })} {ledgerData.closing_balance_type}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
