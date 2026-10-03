"use client";

import React, { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  DownloadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  LayoutGrid,
  Table as TableIcon,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

export interface LRInvoiceItem {
  id?: string;
  eway_bill_number: string;
  eway_bill_date: string;
  eway_bill_expiry: string;
  invoice_no: string;
  invoice_date: string;
  invoice_value: string | number;
  cha_job_number: string;
  particulars: string;
  remarks: string;
}

interface LRInvoiceItemsTableProps {
  items: LRInvoiceItem[];
  onChange: (items: LRInvoiceItem[]) => void;
  disabled?: boolean;
  onEwbFetched?: (data: any, rowIndex: number) => void;
}

/**
 * Creates an empty invoice line item without prepopulating dates,
 * avoiding the false implication that an E-Way Bill or Invoice already exists.
 */
export function createEmptyInvoiceItem(): LRInvoiceItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    eway_bill_number: "",
    eway_bill_date: "",
    eway_bill_expiry: "",
    invoice_no: "",
    invoice_date: "",
    invoice_value: "",
    cha_job_number: "",
    particulars: "",
    remarks: "",
  };
}

export function isInvoiceItemEmpty(r: LRInvoiceItem): boolean {
  return (
    !String(r.invoice_no || "").trim() &&
    !String(r.eway_bill_number || "").trim() &&
    (!r.invoice_value || parseFloat(String(r.invoice_value)) === 0) &&
    !String(r.particulars || "").trim() &&
    !String(r.cha_job_number || "").trim() &&
    !String(r.remarks || "").trim()
  );
}

export function LRInvoiceItemsTable({
  items = [],
  onChange,
  disabled = false,
  onEwbFetched,
}: LRInvoiceItemsTableProps) {
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [fetchingRowIdx, setFetchingRowIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  // Ensure at least one row exists
  const rows = useMemo(() => {
    if (!items || items.length === 0) {
      return [createEmptyInvoiceItem()];
    }
    return items;
  }, [items]);

  const handleFieldChange = (index: number, field: keyof LRInvoiceItem, value: any) => {
    const updated = rows.map((r, i) => {
      if (i === index) {
        return { ...r, [field]: value };
      }
      return r;
    });
    onChange(updated);
  };

  const handleAddRow = () => {
    onChange([...rows, createEmptyInvoiceItem()]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      // Clear the single row rather than leaving completely empty
      onChange([createEmptyInvoiceItem()]);
      return;
    }
    const updated = rows.filter((_, i) => i !== index);
    onChange(updated);
  };

  const setRowDateToday = (index: number, field: "invoice_date" | "eway_bill_date") => {
    const today = new Date().toISOString().split("T")[0];
    handleFieldChange(index, field, today);
  };

  const toggleCardCollapse = (rowId: string) => {
    setCollapsedCards((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  // Auto-Fetch E-Way Bill Details from Portal
  const handleFetchEwb = async (index: number) => {
    const rawNo = String(rows[index]?.eway_bill_number || "").trim();
    if (!rawNo) {
      setFeedback({ type: "error", message: "Please enter an E-Way Bill Number to fetch details." });
      return;
    }

    try {
      setFetchingRowIdx(index);
      setFeedback(null);

      const res = await apiClient.get<any>(`/api/v1/transport/eway-bill/fetch?ewbNo=${encodeURIComponent(rawNo)}`);

      if (res && res.success) {
        const updated = rows.map((r, i) => {
          if (i === index) {
            return {
              ...r,
              eway_bill_number: res.eway_bill_number || rawNo,
              eway_bill_date: res.eway_bill_date || r.eway_bill_date || new Date().toISOString().split("T")[0],
              eway_bill_expiry: res.eway_bill_expiry || r.eway_bill_expiry,
              invoice_no: res.invoice_no || r.invoice_no,
              invoice_date: res.invoice_date || r.invoice_date,
              invoice_value:
                res.invoice_value !== undefined && res.invoice_value !== null && res.invoice_value !== ""
                  ? res.invoice_value
                  : r.invoice_value,
              particulars: res.particulars || r.particulars,
              remarks: res.remarks || r.remarks,
            };
          }
          return r;
        });

        onChange(updated);
        setFeedback({
          type: "success",
          message: `E-Way Bill ${res.eway_bill_number || rawNo} fetched successfully! Item #${index + 1} populated.`,
        });

        if (onEwbFetched) {
          onEwbFetched(res, index);
        }
      } else {
        setFeedback({
          type: "error",
          message: res?.message || "Failed to fetch E-Way Bill details. Check portal credentials in API Center.",
        });
      }
    } catch (err: any) {
      console.error("EWB fetch error:", err);
      setFeedback({
        type: "error",
        message: err?.message || "Server error while querying E-Way Bill. Please verify API Center settings.",
      });
    } finally {
      setFetchingRowIdx(null);
    }
  };

  // Summary computations
  const totalInvoices = useMemo(() => {
    return rows.filter((r) => r.invoice_no && String(r.invoice_no).trim().length > 0).length;
  }, [rows]);

  const totalEwb = useMemo(() => {
    return rows.filter((r) => r.eway_bill_number && String(r.eway_bill_number).trim().length > 0).length;
  }, [rows]);

  const totalInvoiceValue = useMemo(() => {
    return rows.reduce((acc, r) => {
      const val = parseFloat(String(r.invoice_value || 0)) || 0;
      return acc + val;
    }, 0);
  }, [rows]);

  const activeRowCount = useMemo(() => {
    return rows.filter((r) => !isInvoiceItemEmpty(r)).length;
  }, [rows]);

  return (
    <div className="w-full space-y-4">
      {/* Top Header Summary & Layout Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>
              {rows.length} {rows.length === 1 ? "Line Item" : "Line Items"}
              {activeRowCount < rows.length && (
                <span className="text-slate-400 font-normal ml-1">
                  ({activeRowCount} filled)
                </span>
              )}
            </span>
          </div>

          <div className="text-xs text-slate-600 flex items-center gap-3">
            <span className="font-medium">
              Invoices: <strong className="text-slate-900 font-semibold">{totalInvoices}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-medium">
              E-Way Bills: <strong className="text-slate-900 font-semibold">{totalEwb}</strong>
            </span>
            {totalInvoiceValue > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <span className="font-medium text-emerald-700">
                  Total Value: <strong>{formatCurrency(totalInvoiceValue)}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              title="Stacked cards view (no horizontal scrolling)"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white text-indigo-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Compact table view"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-indigo-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          {/* Add Row Button */}
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRow}
              className="h-8 text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-transparent transition-colors cursor-pointer shadow-2xs rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line</span>
            </Button>
          )}
        </div>
      </div>

      {/* Notification Banner for EWB Fetch Feedback */}
      {feedback && (
        <div
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs border transition-all shadow-2xs ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/5 rounded transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* CARDS / GROUPED VIEW (Zero horizontal scrolling at any desktop width) */}
      {viewMode === "cards" && (
        <div className="space-y-3.5">
          {rows.map((row, idx) => {
            const rowKey = row.id || `row-${idx}`;
            const isCollapsed = Boolean(collapsedCards[rowKey]);
            const isEmpty = isInvoiceItemEmpty(row);

            return (
              <div
                key={rowKey}
                className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                  isEmpty
                    ? "border-slate-200/80 bg-slate-50/40"
                    : "border-indigo-200/90 shadow-xs"
                }`}
              >
                {/* Card Header Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/80">
                  <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-600 text-white font-mono font-bold text-xs shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Invoice Line #{idx + 1}
                    </span>

                    {/* Summary badges */}
                    {isEmpty ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600 border border-slate-300/60">
                        Blank / Unused
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {row.invoice_no && (
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            Inv: {row.invoice_no}
                          </span>
                        )}
                        {row.invoice_value && parseFloat(String(row.invoice_value)) > 0 && (
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {formatCurrency(parseFloat(String(row.invoice_value)))}
                          </span>
                        )}
                        {row.eway_bill_number && (
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                            EWB: {row.eway_bill_number}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleCardCollapse(rowKey)}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                      title={isCollapsed ? "Expand section" : "Collapse section"}
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title={rows.length <= 1 ? "Clear this row" : "Remove line item"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Content (Expandable) */}
                {!isCollapsed && (
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Section 1: Commercial Invoicing Details */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Commercial Invoicing Details</span>
                        {!row.invoice_date && !disabled && (
                          <button
                            type="button"
                            onClick={() => setRowDateToday(idx, "invoice_date")}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Set Date to Today</span>
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* 1. Invoice No */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700">
                            Invoice No.
                          </label>
                          <input
                            type="text"
                            value={row.invoice_no || ""}
                            disabled={disabled}
                            placeholder="e.g. INV-2026-001"
                            onChange={(e) => handleFieldChange(idx, "invoice_no", e.target.value)}
                            className="w-full h-9 px-3 text-xs font-semibold text-slate-900 rounded-xl border border-slate-200 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-2xs"
                          />
                        </div>

                        {/* 2. Invoice Date */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-700">
                              Invoice Date
                            </label>
                            {row.invoice_date && (
                              <button
                                type="button"
                                onClick={() => handleFieldChange(idx, "invoice_date", "")}
                                className="text-[10px] text-slate-400 hover:text-rose-500 cursor-pointer"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          <input
                            type="date"
                            value={row.invoice_date || ""}
                            disabled={disabled}
                            onChange={(e) => handleFieldChange(idx, "invoice_date", e.target.value)}
                            className="w-full h-9 px-3 text-xs font-medium text-slate-800 rounded-xl border border-slate-200 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-2xs"
                          />
                        </div>

                        {/* 3. Invoice Value */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700">
                            Invoice Value (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.invoice_value ?? ""}
                            disabled={disabled}
                            placeholder="0.00"
                            onChange={(e) => handleFieldChange(idx, "invoice_value", e.target.value)}
                            className="w-full h-9 px-3 text-xs font-mono font-semibold text-slate-900 rounded-xl border border-slate-200 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-2xs"
                          />
                        </div>

                        {/* 4. CHA Job No */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700">
                            CHA Job / Booking Ref
                          </label>
                          <input
                            type="text"
                            value={row.cha_job_number || ""}
                            disabled={disabled}
                            placeholder="e.g. CHA-1029"
                            onChange={(e) => handleFieldChange(idx, "cha_job_number", e.target.value)}
                            className="w-full h-9 px-3 text-xs font-medium text-slate-800 rounded-xl border border-slate-200 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: E-Way Bill Compliance (Distinct background group) */}
                    <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3.5 space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                        <span>E-Way Bill Compliance</span>
                        {!row.eway_bill_date && !disabled && (
                          <button
                            type="button"
                            onClick={() => setRowDateToday(idx, "eway_bill_date")}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Set EWB Date Today</span>
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1. EWB Number + Fetch button */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700">
                            E-Way Bill No. (12 digits)
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              maxLength={12}
                              value={row.eway_bill_number || ""}
                              disabled={disabled}
                              placeholder="e.g. 123456789012"
                              onChange={(e) =>
                                handleFieldChange(idx, "eway_bill_number", e.target.value.replace(/\D/g, ""))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleFetchEwb(idx);
                                }
                              }}
                              className="flex-1 min-w-0 h-9 px-3 text-xs font-mono font-bold tracking-wider text-slate-900 rounded-xl border border-slate-200 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-2xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleFetchEwb(idx)}
                              disabled={
                                disabled ||
                                fetchingRowIdx === idx ||
                                !row.eway_bill_number ||
                                String(row.eway_bill_number).trim().length < 6
                              }
                              title="Auto-fetch details from government E-Way Bill portal"
                              className="h-9 px-2.5 text-xs font-semibold flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-2xs"
                            >
                              {fetchingRowIdx === idx ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <DownloadCloud className="w-3.5 h-3.5" />
                              )}
                              <span>Fetch</span>
                            </button>
                          </div>
                        </div>

                        {/* 2. EWB Date */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-700">
                              EWB Date
                            </label>
                            {row.eway_bill_date && (
                              <button
                                type="button"
                                onClick={() => handleFieldChange(idx, "eway_bill_date", "")}
                                className="text-[10px] text-slate-400 hover:text-rose-500 cursor-pointer"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          <input
                            type="date"
                            value={row.eway_bill_date || ""}
                            disabled={disabled}
                            onChange={(e) => handleFieldChange(idx, "eway_bill_date", e.target.value)}
                            className="w-full h-9 px-3 text-xs font-medium text-slate-800 rounded-xl border border-slate-200 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-2xs"
                          />
                        </div>

                        {/* 3. EWB Expiry */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700">
                            EWB Validity / Expiry Date
                          </label>
                          <input
                            type="date"
                            value={row.eway_bill_expiry || ""}
                            disabled={disabled}
                            onChange={(e) => handleFieldChange(idx, "eway_bill_expiry", e.target.value)}
                            className="w-full h-9 px-3 text-xs font-medium text-slate-800 rounded-xl border border-slate-200 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Cargo Description & Remarks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">
                          Particulars / Commodity Description
                        </label>
                        <input
                          type="text"
                          value={row.particulars || ""}
                          disabled={disabled}
                          placeholder="e.g. 50 Cartons FMCG Goods / Machinery"
                          onChange={(e) => handleFieldChange(idx, "particulars", e.target.value)}
                          className="w-full h-9 px-3 text-xs font-medium text-slate-800 rounded-xl border border-slate-200 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-2xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">
                          Line Remarks / Special Notes
                        </label>
                        <input
                          type="text"
                          value={row.remarks || ""}
                          disabled={disabled}
                          placeholder="e.g. Handle with care / temperature controlled"
                          onChange={(e) => handleFieldChange(idx, "remarks", e.target.value)}
                          className="w-full h-9 px-3 text-xs font-medium text-slate-800 rounded-xl border border-slate-200 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* COMPACT TABLE VIEW (Responsive, no forced 1450px width) */}
      {viewMode === "table" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                <th className="py-2.5 px-2 text-center w-8">#</th>
                <th className="py-2.5 px-2.5 min-w-[140px]">Invoice No.</th>
                <th className="py-2.5 px-2.5 min-w-[120px]">Invoice Date</th>
                <th className="py-2.5 px-2.5 min-w-[110px] text-right">Value (₹)</th>
                <th className="py-2.5 px-2.5 min-w-[180px]">E-Way Bill No.</th>
                <th className="py-2.5 px-2.5 min-w-[120px]">EWB Date</th>
                <th className="py-2.5 px-2.5 min-w-[120px]">EWB Expiry</th>
                <th className="py-2.5 px-2.5 min-w-[150px]">Particulars</th>
                <th className="py-2.5 px-2 text-center w-10">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      value={row.invoice_no || ""}
                      disabled={disabled}
                      placeholder="Inv No."
                      onChange={(e) => handleFieldChange(idx, "invoice_no", e.target.value)}
                      className="w-full h-8 px-2 text-xs font-semibold text-slate-900 rounded-lg border border-slate-200 bg-white focus:border-indigo-600 outline-none"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="date"
                      value={row.invoice_date || ""}
                      disabled={disabled}
                      onChange={(e) => handleFieldChange(idx, "invoice_date", e.target.value)}
                      className="w-full h-8 px-2 text-xs font-medium text-slate-800 rounded-lg border border-slate-200 bg-white focus:border-indigo-600 outline-none"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.invoice_value ?? ""}
                      disabled={disabled}
                      placeholder="0.00"
                      onChange={(e) => handleFieldChange(idx, "invoice_value", e.target.value)}
                      className="w-full h-8 px-2 text-xs font-mono font-semibold text-slate-900 text-right rounded-lg border border-slate-200 bg-white focus:border-indigo-600 outline-none"
                    />
                  </td>
                  <td className="p-1.5">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        maxLength={12}
                        value={row.eway_bill_number || ""}
                        disabled={disabled}
                        placeholder="EWB No."
                        onChange={(e) =>
                          handleFieldChange(idx, "eway_bill_number", e.target.value.replace(/\D/g, ""))
                        }
                        className="flex-1 min-w-0 h-8 px-2 text-xs font-mono font-bold text-slate-900 rounded-lg border border-slate-200 bg-white focus:border-indigo-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleFetchEwb(idx)}
                        disabled={
                          disabled ||
                          fetchingRowIdx === idx ||
                          !row.eway_bill_number ||
                          String(row.eway_bill_number).trim().length < 6
                        }
                        title="Fetch from E-Way Bill portal"
                        className="h-8 px-2 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                      >
                        {fetchingRowIdx === idx ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <DownloadCloud className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="p-1.5">
                    <input
                      type="date"
                      value={row.eway_bill_date || ""}
                      disabled={disabled}
                      onChange={(e) => handleFieldChange(idx, "eway_bill_date", e.target.value)}
                      className="w-full h-8 px-2 text-xs font-medium text-slate-800 rounded-lg border border-slate-200 bg-white focus:border-indigo-600 outline-none"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="date"
                      value={row.eway_bill_expiry || ""}
                      disabled={disabled}
                      onChange={(e) => handleFieldChange(idx, "eway_bill_expiry", e.target.value)}
                      className="w-full h-8 px-2 text-xs font-medium text-slate-800 rounded-lg border border-slate-200 bg-white focus:border-indigo-600 outline-none"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      value={row.particulars || ""}
                      disabled={disabled}
                      placeholder="Goods Description"
                      onChange={(e) => handleFieldChange(idx, "particulars", e.target.value)}
                      className="w-full h-8 px-2 text-xs font-medium text-slate-800 rounded-lg border border-slate-200 bg-white focus:border-indigo-600 outline-none"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                        title={rows.length <= 1 ? "Clear this row" : "Remove line"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Helper text footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
        <span className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Empty / unused invoice rows with blank numbers are automatically excluded during save.</span>
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={handleAddRow}
            className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            + Add Another Invoice Line
          </button>
        )}
      </div>
    </div>
  );
}
