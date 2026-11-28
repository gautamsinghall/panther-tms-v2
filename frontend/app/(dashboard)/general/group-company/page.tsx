"use client";
import { toast, confirmModal } from "@/lib/toast";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Building2,
  CheckCircle2,
  Users,
  Search,
  X,
  BookOpen,
  Download,
  RotateCcw,
  Calendar,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BillingClientRef {
  id: number;
  name: string;
  gstin?: string | null;
  city?: string | null;
}

interface GroupCompanyRecord {
  id: number;
  company_name: string;
  billing_clients: BillingClientRef[];
  is_active: boolean;
}

interface GroupCompanyLedgerTransaction {
  id: number | string;
  entry_date: string;
  voucher_id?: number | null;
  voucher_number: string;
  voucher_type: string;
  client_id?: number | null;
  client_name?: string | null;
  reference_number?: string | null;
  particulars: string;
  debit_amount: number | string;
  credit_amount: number | string;
  running_balance: number | string;
  balance_type: "DR" | "CR";
  status: string;
  is_void: boolean;
}

interface GroupCompanyLedgerResponse {
  group_company_id: number;
  group_company_name: string;
  billing_clients: BillingClientRef[];
  from_date?: string | null;
  to_date?: string | null;
  opening_balance: number | string;
  opening_balance_type: "DR" | "CR";
  total_debit: number | string;
  total_credit: number | string;
  closing_balance: number | string;
  closing_balance_type: "DR" | "CR";
  total_transactions: number;
  transactions: GroupCompanyLedgerTransaction[];
}

// ─── Custom Form Field: Billing Client Picker ────────────────────────────────

function BillingClientPicker({
  allAvailable,
  selectedIds,
  onChange,
}: {
  allAvailable: BillingClientRef[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [search, setSearch] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedClients = useMemo(
    () => allAvailable.filter((c) => selectedSet.has(c.id)),
    [allAvailable, selectedSet]
  );

  const availableList = useMemo(
    () =>
      allAvailable.filter(
        (c) =>
          !selectedSet.has(c.id) &&
          (c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.gstin || "").toLowerCase().includes(search.toLowerCase()) ||
            (c.city || "").toLowerCase().includes(search.toLowerCase()))
      ),
    [allAvailable, selectedSet, search]
  );

  const handleAdd = (id: number) => {
    onChange([...selectedIds, id]);
  };

  const handleRemove = (id: number) => {
    onChange(selectedIds.filter((item) => item !== id));
  };

  return (
    <div className="space-y-3 pt-1">
      {/* Selected clients pill container */}
      {selectedClients.length > 0 ? (
        <div className="rounded-xl border border-indigo-200/90 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Assigned Billing Clients ({selectedClients.length})
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedClients.map((client) => (
              <span
                key={client.id}
                className="inline-flex items-center gap-1.5 bg-white dark:bg-[#12131A] border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs font-medium px-2.5 py-1 rounded-lg shadow-2xs"
              >
                <span>{client.name}</span>
                {client.city && (
                  <span className="text-[10px] text-slate-400">· {client.city}</span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(client.id)}
                  className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors ml-0.5 cursor-pointer"
                  title="Remove client from group"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-3 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No billing clients assigned yet. Pick from the available list below.
          </p>
        </div>
      )}

      {/* Search & Available List */}
      <div className="space-y-1.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search available billing clients by name, GSTIN, city..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12131A] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12131A] divide-y divide-slate-100 dark:divide-slate-800/60">
          {availableList.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              {search
                ? "No billing clients matching search"
                : "All available billing clients are already assigned"}
            </div>
          ) : (
            availableList.map((client) => (
              <div
                key={client.id}
                onClick={() => handleAdd(client.id)}
                className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {client.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {[client.gstin, client.city].filter(Boolean).join(" · ") || "No additional info"}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Assign
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Combined Group Ledger Modal ─────────────────────────────────────────────

function CombinedGroupLedgerModal({
  group,
  isOpen,
  onClose,
}: {
  group: GroupCompanyRecord | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [ledgerData, setLedgerData] = useState<GroupCompanyLedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [txType, setTxType] = useState("ALL");

  const fetchLedger = useCallback(async () => {
    if (!group) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);
      if (search) params.append("search", search);
      if (txType && txType !== "ALL") params.append("tx_type", txType);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await apiClient<GroupCompanyLedgerResponse>(
        `/api/v1/general/group-companies/${group.id}/ledger${qs}`
      );
      setLedgerData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load combined ledger.");
    } finally {
      setLoading(false);
    }
  }, [group, fromDate, toDate, search, txType]);

  useEffect(() => {
    if (isOpen && group) {
      fetchLedger();
    } else {
      setLedgerData(null);
      setFromDate("");
      setToDate("");
      setSearch("");
      setTxType("ALL");
    }
  }, [isOpen, group, fetchLedger]);

  if (!isOpen || !group) return null;

  const exportCSV = () => {
    if (!ledgerData || !ledgerData.transactions.length) {
      toast.error("No transactions to export.");
      return;
    }
    const headers = ["Date", "Client", "Voucher Number", "Type", "Reference", "Particulars", "Debit", "Credit", "Running Balance", "Balance Type", "Status"];
    const rows = ledgerData.transactions.map((t) => [
      t.entry_date,
      `"${t.client_name || ""}"`,
      `"${t.voucher_number}"`,
      t.voucher_type,
      `"${t.reference_number || ""}"`,
      `"${(t.particulars || "").replace(/"/g, '""')}"`,
      Number(t.debit_amount || 0).toFixed(2),
      Number(t.credit_amount || 0).toFixed(2),
      Number(t.running_balance || 0).toFixed(2),
      t.balance_type,
      t.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Combined_Ledger_${group.company_name.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6">
      <div className="bg-white dark:bg-[#0F1017] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:via-[#0F1017] dark:to-[#0F1017]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Combined Group Ledger
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                  {group.company_name}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Consolidated financial ledger across {group.billing_clients?.length || 0} assigned billing client{group.billing_clients?.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              disabled={loading || !ledgerData?.transactions?.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#12131A] border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export CSV
            </button>
            <button
              onClick={fetchLedger}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#12131A] border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Assigned Clients Pills */}
        {group.billing_clients && group.billing_clients.length > 0 && (
          <div className="px-6 py-2.5 bg-slate-50/80 dark:bg-[#12131A]/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-indigo-500" /> Clients:
            </span>
            {group.billing_clients.map((c) => (
              <span
                key={c.id}
                className="text-xs px-2.5 py-0.5 rounded-md bg-white dark:bg-[#181926] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium shadow-2xs"
              >
                {c.name}
                {c.city ? ` (${c.city})` : ""}
              </span>
            ))}
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6 pb-4">
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-[#12131A] p-3.5 shadow-2xs">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Opening Balance</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(ledgerData?.opening_balance || 0)}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ledgerData?.opening_balance_type === "DR" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>
                {ledgerData?.opening_balance_type || "DR"}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-[#12131A] p-3.5 shadow-2xs">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Debits (Billed)</p>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(ledgerData?.total_debit || 0)}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-[#12131A] p-3.5 shadow-2xs">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Credits (Received)</p>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(ledgerData?.total_credit || 0)}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-indigo-200/90 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 shadow-2xs">
            <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">Net Closing Balance</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                {formatCurrency(ledgerData?.closing_balance || 0)}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ledgerData?.closing_balance_type === "DR" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>
                {ledgerData?.closing_balance_type || "DR"}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 pb-3 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by voucher #, client name, particulars…"
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12131A] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> From:
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1 bg-white dark:bg-[#12131A] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1 bg-white dark:bg-[#12131A] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <select
            value={txType}
            onChange={(e) => setTxType(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 bg-white dark:bg-[#12131A] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Vouchers</option>
            <option value="TRANSPORT_INVOICE">Transport Invoices</option>
            <option value="GENERAL_INVOICE">General Invoices</option>
            <option value="RECEIPT_VOUCHER">Receipts</option>
            <option value="CREDIT_NOTE">Credit Notes</option>
            <option value="DEBIT_NOTE">Debit Notes</option>
          </select>
        </div>

        {/* Ledger Transactions Table */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-[#181926] text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Voucher #</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Particulars</th>
                  <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                  <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                  <th className="py-2.5 px-3 text-right">Running Balance (₹)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#0F1017]">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <RotateCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading combined ledger statement…
                    </td>
                  </tr>
                ) : !ledgerData?.transactions?.length ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No transactions found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {group.billing_clients?.length === 0
                          ? "Assign billing clients to this group to see their combined ledger."
                          : "No accounting vouchers recorded for the assigned clients in this period."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  ledgerData.transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${tx.is_void ? "opacity-40 bg-slate-50 dark:bg-slate-900/50 line-through" : ""}`}
                    >
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(tx.entry_date)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block max-w-[130px] truncate text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 px-1.5 py-0.5 rounded">
                          {tx.client_name || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {tx.voucher_number}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {tx.voucher_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {tx.reference_number || "—"}
                      </td>
                      <td className="py-2.5 px-3 max-w-[240px] truncate text-slate-600 dark:text-slate-300" title={tx.particulars}>
                        {tx.particulars}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-rose-600 dark:text-rose-400 font-mono">
                        {Number(tx.debit_amount) > 0 ? formatCurrency(tx.debit_amount) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400 font-mono">
                        {Number(tx.credit_amount) > 0 ? formatCurrency(tx.credit_amount) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-slate-100 font-mono whitespace-nowrap">
                        {formatCurrency(tx.running_balance)}{" "}
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ml-1 ${tx.balance_type === "DR" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>
                          {tx.balance_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tx.status === "VOIDED" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GroupCompanyPage() {
  const [data, setData] = useState<GroupCompanyRecord[]>([]);
  const [unassignedClients, setUnassignedClients] = useState<BillingClientRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Drawer State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GroupCompanyRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combined Ledger Modal state
  const [ledgerGroup, setLedgerGroup] = useState<GroupCompanyRecord | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [companies, unassigned] = await Promise.all([
        apiClient<GroupCompanyRecord[]>("/api/v1/general/group-companies"),
        apiClient<BillingClientRef[]>("/api/v1/general/group-companies/unassigned-clients"),
      ]);
      setData(Array.isArray(companies) ? companies : []);
      setUnassignedClients(Array.isArray(unassigned) ? unassigned : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load group companies.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingRecord(null);
    setIsDrawerOpen(true);
  };
  const openEdit = (row: GroupCompanyRecord) => {
    setEditingRecord(row);
    setIsDrawerOpen(true);
  };
  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingRecord(null);
  };

  const openLedger = (row: GroupCompanyRecord) => {
    setLedgerGroup(row);
    setIsLedgerOpen(true);
  };
  const closeLedger = () => {
    setIsLedgerOpen(false);
    setLedgerGroup(null);
  };

  // Available clients for the form: globally unassigned + already assigned to this group when editing
  const availableClients = useMemo(() => {
    const currentAssigned = editingRecord?.billing_clients || [];
    const map = new Map<number, BillingClientRef>();
    for (const c of unassignedClients) {
      map.set(c.id, c);
    }
    for (const c of currentAssigned) {
      map.set(c.id, c);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [unassignedClients, editingRecord]);

  // Initial values for enterprise Form component
  const editingInitialValues = useMemo(() => {
    if (!editingRecord) {
      return {
        company_name: "",
        billing_client_ids: [],
      };
    }
    return {
      company_name: editingRecord.company_name || "",
      billing_client_ids: (editingRecord.billing_clients || []).map((c) => c.id),
    };
  }, [editingRecord]);

  // Standardized Form Sections matching global design system (docs/design.md)
  const formSections: FormSectionDef[] = useMemo(
    () => [
      {
        id: "group_company_info",
        title: "Group Company Entity",
        description: "Parent corporate group identity and multi-entity commercial debtor structure",
        columns: 2,
        fields: [
          {
            name: "company_name",
            label: "Group Company Name",
            type: "text",
            required: true,
            placeholder: "e.g. Panther Logistics South Group",
            colSpan: 2,
            helperText: "Official group corporate name used for invoice series and combined ledger statements",
          },
          {
            name: "billing_client_ids",
            label: "Assigned Billing Clients",
            type: "custom",
            colSpan: 2,
            helperText: "Select and assign billing clients belonging to this company group. Clients already assigned to another group company are excluded.",
            customRender: ({ value, onChange }) => (
              <BillingClientPicker
                allAvailable={availableClients}
                selectedIds={Array.isArray(value) ? value : []}
                onChange={onChange}
              />
            ),
          },
        ],
      },
    ],
    [availableClients]
  );

  // Filtered dataset for DataTable matching FilterBar
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchSearch =
        !searchTerm ||
        row.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.billing_clients?.some((c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()))
        );

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && row.is_active) ||
        (statusFilter === "INACTIVE" && !row.is_active);

      return matchSearch && matchStatus;
    });
  }, [data, searchTerm, statusFilter]);

  const columns: ColumnDef<GroupCompanyRecord>[] = [
    {
      key: "company_name",
      header: "Group Company Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          {row.company_name}
        </span>
      ),
    },
    {
      key: "billing_clients",
      header: "Assigned Billing Clients",
      cell: (row) => {
        const clients = row.billing_clients ?? [];
        if (!clients.length) return <span className="text-slate-400 text-xs">None assigned</span>;
        return (
          <div className="flex flex-wrap gap-1 items-center">
            {clients.slice(0, 3).map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                <Users className="w-2.5 h-2.5" />{c.name}
              </span>
            ))}
            {clients.length > 3 && (
              <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                +{clients.length - 3} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "ledger_action",
      header: "Combined Ledger",
      align: "center",
      cell: (row) => (
        <button
          type="button"
          onClick={() => openLedger(row)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer"
          title="Open Combined Financial Ledger"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          View Ledger
        </button>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
  ];

  const actions: RowAction<GroupCompanyRecord>[] = [
    {
      label: "Combined Ledger",
      icon: <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
      onClick: openLedger,
    },
    {
      label: "Edit",
      icon: <Pencil className="w-3.5 h-3.5 text-slate-600" />,
      onClick: openEdit,
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
      variant: "danger",
      hidden: (row) => !row.is_active,
      onClick: async (row) => {
        const ok = await confirmModal({
          title: "Deactivate Group Company",
          description: "Are you sure? Billing clients will remain in the system but lose this group company assignment.",
          confirmText: "Deactivate",
          variant: "danger",
        });
        if (!ok) return;
        setData((prev) => prev.map((item) => (item.id === row.id ? { ...item, is_active: false } : item)));
        try {
          await apiClient(`/api/v1/general/group-companies/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: false }),
          });
          toast.success("Deactivated successfully.");
        } catch (err: any) {
          setData((prev) => prev.map((item) => (item.id === row.id ? { ...item, is_active: true } : item)));
          toast.error(err.message || "Failed to deactivate.");
        }
      },
    },
    {
      label: "Activate",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      variant: "default",
      hidden: (row) => !!row.is_active,
      onClick: async (row) => {
        const ok = await confirmModal({
          title: "Activate Group Company",
          description: "Are you sure you want to activate this group company?",
          confirmText: "Activate",
          variant: "primary",
        });
        if (!ok) return;
        setData((prev) => prev.map((item) => (item.id === row.id ? { ...item, is_active: true } : item)));
        try {
          await apiClient(`/api/v1/general/group-companies/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: true }),
          });
          toast.success("Activated successfully.");
        } catch (err: any) {
          setData((prev) => prev.map((item) => (item.id === row.id ? { ...item, is_active: false } : item)));
          toast.error(err.message || "Failed to activate.");
        }
      },
    },
  ];

  const handleFormSubmit = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    const payload = {
      company_name: String(values.company_name || "").trim(),
      billing_client_ids: Array.isArray(values.billing_client_ids) ? values.billing_client_ids : [],
    };
    try {
      if (editingRecord) {
        const updated = await apiClient<GroupCompanyRecord>(`/api/v1/general/group-companies/${editingRecord.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Group company updated successfully.");
        setData((prev) => prev.map((item) => (item.id === editingRecord.id ? (updated as GroupCompanyRecord) : item)));
      } else {
        await apiClient("/api/v1/general/group-companies", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Group company created successfully.");
      }
      closeDrawer();
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save group company.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Group Companies"
        description="Organize sister companies and corporate billing clients under Group Companies and view their Combined Group Ledger."
        breadcrumbs={[
          { label: "General", href: "/general/group-company" },
          { label: "Group Companies" },
        ]}
        primaryAction={{
          label: "Add Group Company",
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: openCreate,
        }}
      />

      {/* FilterBar per docs/design.md §5 */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by group company name or assigned client..."
        filters={[
          {
            id: "status",
            label: "All Statuses",
            value: statusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
            ],
            onChange: setStatusFilter,
          },
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
        }}
        hasActiveFilters={Boolean(searchTerm || statusFilter !== "ALL")}
      />

      {/* DataTable per docs/design.md §5 */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        searchable={false}
        emptyMessage="No group companies registered"
        emptySubtext="Create a group company and assign billing clients to view their combined ledger."
        emptyAction={{ label: "Add Group Company", onClick: openCreate }}
      />

      {/* Standardized EntityDrawer with Global Enterprise Form */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={editingRecord ? `Edit Group Company: ${editingRecord.company_name}` : "Create Group Company"}
        description={
          editingRecord
            ? "Update group company name and manage assigned billing clients."
            : "Register a parent group company entity and assign billing clients to it."
        }
      >
        <Form
          key={editingRecord ? `edit-${editingRecord.id}` : "new"}
          sections={formSections}
          initialValues={editingInitialValues}
          onSubmit={handleFormSubmit}
          onCancel={closeDrawer}
          submitLabel={editingRecord ? "Save Group Changes" : "Create Group Company"}
          cancelLabel="Cancel"
          isLoading={isSubmitting}
        />
      </EntityDrawer>

      {/* Combined Group Ledger Modal */}
      <CombinedGroupLedgerModal
        group={ledgerGroup}
        isOpen={isLedgerOpen}
        onClose={closeLedger}
      />
    </div>
  );
}
