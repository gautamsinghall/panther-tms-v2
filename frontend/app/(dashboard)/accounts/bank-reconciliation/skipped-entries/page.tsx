"use client";

import React, { useState, useEffect } from "react";
import {
  Ban,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  CreditCard,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

interface SkippedEntryItem {
  line_id: number;
  import_id: number;
  import_date: string;
  company_name: string;
  bank_name: string;
  account_number_masked: string;
  file_name: string;
  value_date: string;
  description: string;
  cr_dr: string;
  amount: number | string;
  transaction_id?: string;
  cheque_number?: string;
  skip_reason?: string;
  status: string; // SKIPPED, REPROCESSED, IGNORED
  ignore_reason?: string;
  ignored_by?: string;
  created_voucher_number?: string;
}

export default function SkippedEntriesReportPage() {
  const [data, setData] = useState<SkippedEntryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [mappingItem, setMappingItem] = useState<SkippedEntryItem | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setIsLoading(true);
    try {
      const res = await apiClient<SkippedEntryItem[]>("/api/v1/accounts/bank-statements/skipped-entries");
      setData(res);
    } catch (err: any) {
      toast.error(err?.detail || err?.message || "Failed to load skipped entries report.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleExportCSV() {
    if (data.length === 0) {
      toast.error("No entries to export.");
      return;
    }

    const headers = [
      "Import Date",
      "Bank Account",
      "File Name",
      "Value Date",
      "Transaction ID",
      "Description",
      "Cr/Dr",
      "Amount",
      "Reason for Skipping",
      "Status",
      "Created Voucher #",
      "Ignored By / Reason"
    ];

    const rows = filteredData.map((d) => [
      formatDate(d.import_date),
      `"${d.bank_name} (${d.account_number_masked})"`,
      `"${d.file_name}"`,
      d.value_date,
      d.transaction_id || "-",
      `"${d.description.replace(/"/g, '""')}"`,
      d.cr_dr,
      d.amount,
      `"${(d.skip_reason || "").replace(/"/g, '""')}"`,
      d.status,
      d.created_voucher_number || "-",
      `"${(d.ignore_reason || d.ignored_by || "").replace(/"/g, '""')}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Skipped_Bank_Entries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported Skipped Entries CSV successfully!");
  }

  function handlePrint() {
    window.print();
  }

  async function handleMapPartySubmit(partyType: string, partyId: number, partyName: string) {
    if (!mappingItem) return;
    try {
      await apiClient<any>(`/api/v1/accounts/bank-statements/lines/${mappingItem.line_id}/map-party`, {
        method: "POST",
        body: JSON.stringify({
          party_type: partyType,
          party_id: partyId,
          party_name: partyName,
          alias_text: mappingItem.description.slice(0, 50),
        }),
      });
      toast.success("Mapped party & saved alias! Line moved to review.");
      setMappingItem(null);
      loadReport();
    } catch (err: any) {
      toast.error(err?.detail || err?.message || "Failed to map party.");
    }
  }

  const filteredData = data.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.transaction_id && item.transaction_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.skip_reason && item.skip_reason.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "SKIPPED" && item.status === "SKIPPED") ||
      (statusFilter === "REPROCESSED" && item.status === "REPROCESSED") ||
      (statusFilter === "IGNORED" && item.status === "IGNORED");

    return matchesSearch && matchesStatus;
  });

  const totalSkippedCount = data.filter((d) => d.status === "SKIPPED").length;
  const moneyOutSkippedAmt = data
    .filter((d) => d.cr_dr === "DR" && d.status === "SKIPPED")
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const moneyInSkippedAmt = data
    .filter((d) => d.cr_dr === "CR" && d.status === "SKIPPED")
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const reprocessedCount = data.filter((d) => d.status === "REPROCESSED").length;

  const columns: ColumnDef<SkippedEntryItem>[] = [
    {
      key: "value_date",
      header: "Value Date",
      sortable: true,
      cell: (row) => <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{formatDate(row.value_date)}</span>,
    },
    {
      key: "bank_name",
      header: "Bank & File",
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-slate-900 dark:text-white">
            {row.bank_name} ({row.account_number_masked})
          </p>
          <p className="text-[11px] text-slate-400 font-mono">{row.file_name}</p>
        </div>
      ),
    },
    {
      key: "transaction_id",
      header: "Txn / Ref ID",
      cell: (row) => (
        <span className="text-xs font-mono bg-slate-100 dark:bg-[#202024] px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
          {row.transaction_id || "-"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Full Description",
      cell: (row) => (
        <div className="max-w-xs sm:max-w-md text-xs font-mono text-slate-600 dark:text-slate-300 truncate" title={row.description}>
          {row.description}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      cell: (row) => (
        <div className="text-right">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {formatCurrency(Number(row.amount))}
          </span>
          <span className="block text-[10px] text-slate-400">
            {row.cr_dr === "DR" ? "Withdrawal (DR)" : "Deposit (CR)"}
          </span>
        </div>
      ),
    },
    {
      key: "skip_reason",
      header: "Reason for Skipping",
      cell: (row) => (
        <div className="space-y-0.5">
          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-800 dark:text-amber-300">
            {row.skip_reason || row.ignore_reason || "Skipped"}
          </Badge>
          {row.ignored_by && (
            <p className="text-[10px] text-slate-400">Ignored by {row.ignored_by}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => {
        if (row.status === "REPROCESSED") {
          return (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
              Voucher #{row.created_voucher_number}
            </Badge>
          );
        }
        if (row.status === "IGNORED") {
          return (
            <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
              Ignored
            </Badge>
          );
        }
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
            Skipped
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Action",
      cell: (row) => {
        if (row.status === "REPROCESSED") {
          return <span className="text-[11px] text-emerald-600 font-medium">Reconciled</span>;
        }
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMappingItem(row)}
            className="text-[11px] text-indigo-600 hover:text-indigo-700 h-7 px-2 gap-1"
          >
            <Tag className="w-3 h-3" /> Map Party
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skipped Bank Entries Report"
        description="Full audit trail of all skipped, ignored, and re-processed statement lines across all bank accounts. Hard Rule 0: No line is ever deleted."
        secondaryActions={[
          {
            label: "Export CSV",
            icon: <Download className="w-4 h-4 text-indigo-600" />,
            onClick: handleExportCSV,
            variant: "outline",
          },
          {
            label: "Print Report",
            icon: <Printer className="w-4 h-4 text-slate-600" />,
            onClick: handlePrint,
            variant: "outline",
          },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Still Skipped Lines"
          value={String(totalSkippedCount)}
          subtext="Unaccounted lines awaiting mapping"
          icon={<Ban className="h-4 w-4 text-amber-500" />}
        />
        <KpiCard
          title="Money Out Skipped"
          value={formatCurrency(moneyOutSkippedAmt)}
          subtext="Pending payment disbursements"
          icon={<ArrowUpRight className="h-4 w-4 text-amber-600" />}
        />
        <KpiCard
          title="Money In Skipped"
          value={formatCurrency(moneyInSkippedAmt)}
          subtext="Pending customer receipts"
          icon={<ArrowDownLeft className="h-4 w-4 text-emerald-600" />}
        />
        <KpiCard
          title="Re-Processed"
          value={String(reprocessedCount)}
          subtext="Mapped to masters and posted"
          icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200 dark:border-[#303036] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, reference ID, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-[#F5F5F7] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="SKIPPED">Still Skipped</option>
              <option value="REPROCESSED">Re-Processed (Vouchers Created)</option>
              <option value="IGNORED">Ignored Permanently</option>
            </select>
            <Button variant="outline" size="sm" onClick={loadReport} className="text-xs gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        searchable={false}
      />

      {/* Map Party Modal */}
      {mappingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200 dark:border-[#303036] p-5 shadow-2xl space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Map Skipped Line to Master</h4>
            <p className="text-xs text-slate-500">
              Mapping this line saves an alias for &apos;{mappingItem.description.slice(0, 30)}...&apos;. It will automatically match at 100% in future imports!
            </p>
            <div className="space-y-2 pt-1">
              <Button
                variant="outline"
                className="w-full justify-start text-xs font-medium"
                onClick={() => handleMapPartySubmit("DRIVER", 1, "Himanshu Sharma")}
              >
                Map to Driver: Himanshu Sharma
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs font-medium"
                onClick={() => handleMapPartySubmit("VENDOR", 1, "NEELKANTH MOTORS")}
              >
                Map to Vendor: NEELKANTH MOTORS
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs font-medium"
                onClick={() => handleMapPartySubmit("CLIENT", 1, "Tata Motors Commercial")}
              >
                Map to Client: Tata Motors Commercial
              </Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setMappingItem(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
