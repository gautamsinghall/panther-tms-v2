"use client";
import { toast, confirmModal } from "@/lib/toast";
import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Pencil, Building2, CheckCircle2, Users, Search,
  X, ChevronRight, BookOpen, Download, RotateCcw, ArrowUpDown,
  Filter, Calendar, FileText
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
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

// ─── Multi-select Billing Client Picker ──────────────────────────────────────

function BillingClientPicker({
  allAvailable,
  selected,
  onChange,
}: {
  allAvailable: BillingClientRef[];
  selected: BillingClientRef[];
  onChange: (clients: BillingClientRef[]) => void;
}) {
  const [search, setSearch] = useState("");
  const selectedIds = new Set(selected.map((c) => c.id));

  const filtered = allAvailable.filter(
    (c) =>
      !selectedIds.has(c.id) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.gstin || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.city || "").toLowerCase().includes(search.toLowerCase()))
  );

  const addClient = (c: BillingClientRef) => onChange([...selected, c]);
  const removeClient = (id: number) => onChange(selected.filter((c) => c.id !== id));

  return (
    <div className="space-y-3">
      {/* Selected clients */}
      {selected.length > 0 && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-2.5 space-y-1">
          <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Users className="w-3 h-3" /> Assigned Clients ({selected.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full shadow-sm"
              >
                {c.name}
                <button
                  type="button"
                  onClick={() => removeClient(c.id)}
                  className="text-indigo-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search + available list */}
      <div>
        <label className="block text-xs font-medium text-[#344054] mb-1.5">
          Add Billing Clients
        </label>
        <div className="relative mb-1.5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#98A2B3]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, GSTIN, city…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D0D5DD] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] bg-white"
          />
        </div>
        <div className="max-h-44 overflow-y-auto rounded-md border border-[#E4E7EC] bg-white divide-y divide-[#F2F4F7]">
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-[#98A2B3] py-4">
              {search ? "No matching clients found" : "All available clients already assigned"}
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => addClient(c)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#F9FAFB] transition-colors"
              >
                <div>
                  <p className="text-xs font-medium text-[#101828]">{c.name}</p>
                  <p className="text-[10px] text-[#667085]">
                    {[c.gstin, c.city].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3]" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Drawer Form ─────────────────────────────────────────────────────────────

function GroupCompanyForm({
  record,
  unassignedClients,
  onSubmit,
  onCancel,
  isLoading,
}: {
  record: GroupCompanyRecord | null;
  unassignedClients: BillingClientRef[];
  onSubmit: (values: { company_name: string; billing_client_ids: number[] }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(record?.company_name ?? "");
  const [selected, setSelected] = useState<BillingClientRef[]>(record?.billing_clients ?? []);

  // Available = unassigned + already assigned to THIS group
  const available: BillingClientRef[] = [
    ...unassignedClients,
    ...(record?.billing_clients ?? []),
  ];
  // Deduplicate by id
  const availableDeduped = Array.from(new Map(available.map((c) => [c.id, c])).values());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      company_name: name.trim(),
      billing_client_ids: selected.map((c) => c.id),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-5 pb-4">
        {/* Group Company Name – first field */}
        <div>
          <label className="block text-xs font-semibold text-[#344054] mb-1.5">
            Group Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Panther Logistics Group"
            className="w-full px-3 py-2 text-sm border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] bg-white"
          />
        </div>

        {/* Billing Client multi-select */}
        <div>
          <label className="block text-xs font-semibold text-[#344054] mb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#4F46E5]" />
            Billing Clients
          </label>
          <p className="text-[11px] text-[#667085] mb-2">
            Only unassigned billing clients are shown. Clients already assigned to another group company are excluded.
          </p>
          <BillingClientPicker
            allAvailable={availableDeduped}
            selected={selected}
            onChange={setSelected}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#E4E7EC] pt-4 flex gap-2.5 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-[#344054] border border-[#D0D5DD] rounded-lg hover:bg-[#F9FAFB] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="px-4 py-2 text-sm font-semibold text-white bg-[#4F46E5] rounded-lg hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Saving…" : record ? "Save Changes" : "Create Group"}
        </button>
      </div>
    </form>
  );
}

// ─── Combined Group Ledger View ──────────────────────────────────────────────

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-[#E4E7EC]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E7EC] flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-white to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] border border-indigo-200 flex items-center justify-center text-[#4F46E5]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#101828]">
                  Combined Group Ledger
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700">
                  {group.company_name}
                </span>
              </div>
              <p className="text-xs text-[#667085] mt-0.5">
                Consolidated financial ledger across {group.billing_clients?.length || 0} assigned billing client{group.billing_clients?.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              disabled={loading || !ledgerData?.transactions?.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#344054] bg-white border border-[#D0D5DD] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#667085]" />
              Export CSV
            </button>
            <button
              onClick={fetchLedger}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#344054] bg-white border border-[#D0D5DD] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-[#667085] ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#667085] hover:text-[#101828] hover:bg-[#F2F4F7] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Assigned Clients Pills */}
        {group.billing_clients && group.billing_clients.length > 0 && (
          <div className="px-6 py-2.5 bg-[#F8F9FC] border-b border-[#E4E7EC] flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-[#4F46E5]" /> Clients:
            </span>
            {group.billing_clients.map((c) => (
              <span
                key={c.id}
                className="text-xs px-2 py-0.5 rounded-md bg-white border border-[#D0D5DD] text-[#344054] font-medium shadow-2xs"
              >
                {c.name}
                {c.city ? ` (${c.city})` : ""}
              </span>
            ))}
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6 pb-4">
          <div className="rounded-lg border border-[#E4E7EC] bg-white p-3.5 shadow-2xs">
            <p className="text-[11px] font-medium text-[#667085]">Opening Balance</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-bold text-[#101828]">
                {formatCurrency(ledgerData?.opening_balance || 0)}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ledgerData?.opening_balance_type === "DR" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                {ledgerData?.opening_balance_type || "DR"}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-[#E4E7EC] bg-white p-3.5 shadow-2xs">
            <p className="text-[11px] font-medium text-[#667085]">Total Debits (Billed)</p>
            <div className="mt-1">
              <span className="text-lg font-bold text-rose-600">
                {formatCurrency(ledgerData?.total_debit || 0)}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-[#E4E7EC] bg-white p-3.5 shadow-2xs">
            <p className="text-[11px] font-medium text-[#667085]">Total Credits (Received)</p>
            <div className="mt-1">
              <span className="text-lg font-bold text-emerald-600">
                {formatCurrency(ledgerData?.total_credit || 0)}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3.5 shadow-2xs">
            <p className="text-[11px] font-semibold text-indigo-700">Net Closing Balance</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-extrabold text-[#101828]">
                {formatCurrency(ledgerData?.closing_balance || 0)}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ledgerData?.closing_balance_type === "DR" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                {ledgerData?.closing_balance_type || "DR"}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 pb-3 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#98A2B3]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by voucher #, client name, particulars…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#667085] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#98A2B3]" /> From:
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs border border-[#D0D5DD] rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#667085]">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs border border-[#D0D5DD] rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>
          <select
            value={txType}
            onChange={(e) => setTxType(e.target.value)}
            className="text-xs border border-[#D0D5DD] rounded-md px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
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
          <div className="rounded-lg border border-[#E4E7EC] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F8F9FC] text-[#475467] font-semibold border-b border-[#E4E7EC]">
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
              <tbody className="divide-y divide-[#F2F4F7] bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[#667085]">
                      <RotateCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#4F46E5]" />
                      Loading combined ledger statement…
                    </td>
                  </tr>
                ) : !ledgerData?.transactions?.length ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[#667085]">
                      <FileText className="w-8 h-8 text-[#98A2B3] mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-sm text-[#344054]">No transactions found</p>
                      <p className="text-xs text-[#98A2B3] mt-0.5">
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
                      className={`hover:bg-[#F9FAFB] transition-colors ${tx.is_void ? "opacity-40 bg-slate-50 line-through" : ""}`}
                    >
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#344054] whitespace-nowrap">
                        {formatDate(tx.entry_date)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block max-w-[130px] truncate text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                          {tx.client_name || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#101828]">
                        {tx.voucher_number}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#475467] bg-[#F2F4F7] px-1.5 py-0.5 rounded">
                          {tx.voucher_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#667085] font-mono text-[11px]">
                        {tx.reference_number || "—"}
                      </td>
                      <td className="py-2.5 px-3 max-w-[240px] truncate text-[#475467]" title={tx.particulars}>
                        {tx.particulars}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-rose-600 font-mono">
                        {Number(tx.debit_amount) > 0 ? formatCurrency(tx.debit_amount) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-600 font-mono">
                        {Number(tx.credit_amount) > 0 ? formatCurrency(tx.credit_amount) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[#101828] font-mono whitespace-nowrap">
                        {formatCurrency(tx.running_balance)}{" "}
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ml-1 ${tx.balance_type === "DR" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {tx.balance_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tx.status === "VOIDED" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
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

  const openCreate = () => { setEditingRecord(null); setIsDrawerOpen(true); };
  const openEdit = (row: GroupCompanyRecord) => { setEditingRecord(row); setIsDrawerOpen(true); };
  const closeDrawer = () => { setIsDrawerOpen(false); setEditingRecord(null); };

  const openLedger = (row: GroupCompanyRecord) => {
    setLedgerGroup(row);
    setIsLedgerOpen(true);
  };
  const closeLedger = () => {
    setIsLedgerOpen(false);
    setLedgerGroup(null);
  };

  const columns: ColumnDef<GroupCompanyRecord>[] = [
    {
      key: "company_name",
      header: "Group Company Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-[#101828] flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-[#4F46E5]" />
          {row.company_name}
        </span>
      ),
    },
    {
      key: "billing_clients",
      header: "Assigned Billing Clients",
      cell: (row) => {
        const clients = row.billing_clients ?? [];
        if (!clients.length) return <span className="text-[#98A2B3] text-xs">None assigned</span>;
        return (
          <div className="flex flex-wrap gap-1 items-center">
            {clients.slice(0, 3).map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-medium px-2 py-0.5 rounded-full">
                <Users className="w-2.5 h-2.5" />{c.name}
              </span>
            ))}
            {clients.length > 3 && (
              <span className="text-[10px] text-[#667085] font-semibold bg-gray-100 px-1.5 py-0.5 rounded-full">
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
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
          title="Open Combined Financial Ledger"
        >
          <BookOpen className="w-3 h-3 text-[#4F46E5]" />
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
      icon: <BookOpen className="w-3.5 h-3.5 text-[#4F46E5]" />,
      onClick: openLedger,
    },
    {
      label: "Edit",
      icon: <Pencil className="w-3.5 h-3.5 text-slate-600" />,
      onClick: openEdit,
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-[#F04438]" />,
      variant: "danger",
      hidden: (row) => !row.is_active,
      onClick: async (row) => {
        const ok = await confirmModal({
          title: "Deactivate Group Company",
          description: "Are you sure? Billing clients will remain but lose the group assignment.",
          confirmText: "Deactivate",
          variant: "danger",
        });
        if (!ok) return;
        setData((prev) => prev.map((item) => item.id === row.id ? { ...item, is_active: false } : item));
        try {
          await apiClient(`/api/v1/general/group-companies/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: false }),
          });
          toast.success("Deactivated successfully.");
        } catch (err: any) {
          setData((prev) => prev.map((item) => item.id === row.id ? { ...item, is_active: true } : item));
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
          description: "Are you sure you want to activate this group?",
          confirmText: "Activate",
          variant: "primary",
        });
        if (!ok) return;
        setData((prev) => prev.map((item) => item.id === row.id ? { ...item, is_active: true } : item));
        try {
          await apiClient(`/api/v1/general/group-companies/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: true }),
          });
          toast.success("Activated successfully.");
        } catch (err: any) {
          setData((prev) => prev.map((item) => item.id === row.id ? { ...item, is_active: false } : item));
          toast.error(err.message || "Failed to activate.");
        }
      },
    },
  ];

  const handleSubmit = async (values: { company_name: string; billing_client_ids: number[] }) => {
    setIsSubmitting(true);
    try {
      if (editingRecord) {
        const updated = await apiClient<GroupCompanyRecord>(`/api/v1/general/group-companies/${editingRecord.id}`, {
          method: "PUT",
          body: JSON.stringify(values),
        });
        toast.success("Group company updated successfully.");
        setData((prev) => prev.map((item) => item.id === editingRecord.id ? (updated as GroupCompanyRecord) : item));
      } else {
        await apiClient("/api/v1/general/group-companies", {
          method: "POST",
          body: JSON.stringify(values),
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
        description="Organize sister and corporate billing clients under Group Companies and view their Combined Group Ledger."
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

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        searchPlaceholder="Search by group company name…"
        emptyMessage="No group companies registered"
        emptySubtext="Create a group company and assign billing clients to view their combined ledger."
        emptyAction={{ label: "Add Group Company", onClick: openCreate }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={editingRecord ? "Edit Group Company" : "Create Group Company"}
        description={
          editingRecord
            ? "Update group name and manage assigned billing clients."
            : "Enter group company name and select billing clients to assign."
        }
      >
        <GroupCompanyForm
          key={editingRecord ? `edit-${editingRecord.id}` : "new"}
          record={editingRecord}
          unassignedClients={unassignedClients}
          onSubmit={handleSubmit}
          onCancel={closeDrawer}
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
