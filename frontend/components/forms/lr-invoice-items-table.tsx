"use client";

import React, { useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ChevronsLeft,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

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
}

export function createEmptyInvoiceItem(): LRInvoiceItem {
  const today = new Date().toISOString().split("T")[0];
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    eway_bill_number: "",
    eway_bill_date: today,
    eway_bill_expiry: "",
    invoice_no: "",
    invoice_date: today,
    invoice_value: "",
    cha_job_number: "",
    particulars: "",
    remarks: "",
  };
}

export function LRInvoiceItemsTable({
  items = [],
  onChange,
  disabled = false,
}: LRInvoiceItemsTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

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

  // Scroll helper controls
  const scrollLeft = () => {
    tableContainerRef.current?.scrollBy({ left: -380, behavior: "smooth" });
  };

  const scrollRight = () => {
    tableContainerRef.current?.scrollBy({ left: 380, behavior: "smooth" });
  };

  const scrollToStart = () => {
    tableContainerRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  const scrollToEnd = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({
        left: tableContainerRef.current.scrollWidth,
        behavior: "smooth",
      });
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

  return (
    <div className="w-full space-y-3">
      {/* Top Header Bar & Horizontal Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-0.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            <span>{rows.length} {rows.length === 1 ? "Line Item" : "Line Items"}</span>
          </span>
          {totalInvoices > 0 && (
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              ({totalEwb} E-Way Bills · {totalInvoices} Invoices linked)
            </span>
          )}
        </div>

        {/* Scroll navigation arrows & Add Row */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={scrollToStart}
              title="Scroll to beginning (E-Way Bills)"
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={scrollLeft}
              title="Scroll left"
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-semibold text-slate-500 px-1.5 select-none">
              Slide Columns
            </span>
            <button
              type="button"
              onClick={scrollRight}
              title="Scroll right"
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={scrollToEnd}
              title="Scroll to Particulars & Remarks"
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={scrollToEnd}
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            <span>Particulars & Remarks</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRow}
              className="h-8 text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-transparent transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </Button>
          )}
        </div>
      </div>

      {/* Helper Bar indicating horizontal scroll */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 bg-gradient-to-r from-indigo-50/60 to-slate-50 px-3 py-1.5 rounded-lg border border-indigo-100">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>
            Columns order: <strong>E-Way Bill No.</strong> → <strong>EWB Date</strong> → <strong>EWB Expiry</strong> → <strong>Invoice No.</strong> → <strong>Invoice Date</strong> → <strong>Invoice Value (₹)</strong> → <strong>CHA Job</strong> → <strong>Particulars</strong> → <strong>Remarks</strong>
          </span>
        </span>
        <span className="text-slate-400 font-medium hidden lg:inline">
          Use the navigation buttons above or drag the horizontal scrollbar below
        </span>
      </div>

      {/* Horizontal Scrollable Table Container */}
      <div
        ref={tableContainerRef}
        className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs bg-white custom-horizontal-scrollbar"
        style={{
          overflowX: "auto",
          scrollbarWidth: "auto",
          scrollbarColor: "#6366f1 #f1f5f9",
        }}
      >
        <table className="min-w-[1450px] w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-700 uppercase tracking-wider divide-x divide-slate-200">
              <th className="py-2.5 px-2 text-center w-10 sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_0_#e2e8f0]">#</th>
              {/* 1. E-Way Bill No. */}
              <th className="py-2.5 px-2.5 min-w-[145px]">E-Way Bill No.</th>
              {/* 2. EWB Date */}
              <th className="py-2.5 px-2.5 min-w-[130px]">EWB Date</th>
              {/* 3. EWB Expiry */}
              <th className="py-2.5 px-2.5 min-w-[130px]">EWB Expiry</th>
              {/* 4. Invoice No. */}
              <th className="py-2.5 px-2.5 min-w-[140px]">Invoice No.</th>
              {/* 5. Invoice Date */}
              <th className="py-2.5 px-2.5 min-w-[130px]">Invoice Date</th>
              {/* 6. Invoice Value (₹) */}
              <th className="py-2.5 px-2.5 min-w-[135px] text-right">Invoice Value (₹)</th>
              {/* 7. CHA Job / Booking */}
              <th className="py-2.5 px-2.5 min-w-[145px]">CHA Job / Booking</th>
              {/* 8. Particulars */}
              <th className="py-2.5 px-2.5 min-w-[180px]">Particulars</th>
              {/* 9. Remarks */}
              <th className="py-2.5 px-2.5 min-w-[160px]">Remarks</th>
              {/* 10. Action */}
              <th className="py-2.5 px-2 text-center w-12 sticky right-0 bg-slate-50 z-10 shadow-[-1px_0_0_0_#e2e8f0]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={row.id || idx} className="hover:bg-indigo-50/20 transition-colors divide-x divide-slate-100">
                {/* Index */}
                <td className="py-1.5 px-2 text-center font-mono text-[11px] text-slate-400 font-medium sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#f1f5f9]">
                  {idx + 1}
                </td>

                {/* 1. E-Way Bill No */}
                <td className="p-1">
                  <input
                    type="text"
                    maxLength={12}
                    value={row.eway_bill_number || ""}
                    disabled={disabled}
                    placeholder="12-digit number"
                    onChange={(e) => handleFieldChange(idx, "eway_bill_number", e.target.value)}
                    className="w-full h-8 px-2 text-xs font-mono font-medium text-slate-900 placeholder:text-slate-300 rounded-md border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </td>

                {/* 2. EWB Date */}
                <td className="p-1">
                  <input
                    type="date"
                    value={row.eway_bill_date || ""}
                    disabled={disabled}
                    onChange={(e) => handleFieldChange(idx, "eway_bill_date", e.target.value)}
                    className="w-full h-8 px-2 text-xs font-medium text-slate-800 rounded-md border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </td>

                {/* 3. EWB Expiry */}
                <td className="p-1">
                  <input
                    type="date"
                    value={row.eway_bill_expiry || ""}
                    disabled={disabled}
                    onChange={(e) => handleFieldChange(idx, "eway_bill_expiry", e.target.value)}
                    className="w-full h-8 px-2 text-xs font-medium text-slate-800 rounded-md border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </td>

                {/* 4. Invoice No */}
                <td className="p-1">
                  <input
                    type="text"
                    value={row.invoice_no || ""}
                    disabled={disabled}
                    placeholder="e.g. INV-1001"
                    onChange={(e) => handleFieldChange(idx, "invoice_no", e.target.value)}
                    className="w-full h-8 px-2 text-xs font-semibold text-slate-900 placeholder:text-slate-300 rounded-md border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </td>

                {/* 5. Invoice Date */}
                <td className="p-1">
                  <input
                    type="date"
                    value={row.invoice_date || ""}
                    disabled={disabled}
                    onChange={(e) => handleFieldChange(idx, "invoice_date", e.target.value)}
                    className="w-full h-8 px-2 text-xs font-medium text-slate-800 rounded-md border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </td>

                {/* 6. Invoice Value */}
                <td className="p-1">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={row.invoice_value ?? ""}
                      disabled={disabled}
                      placeholder="0.00"
                      onChange={(e) => handleFieldChange(idx, "invoice_value", e.target.value)}
                      className="w-full h-8 pl-5 pr-2 text-xs font-mono font-medium text-slate-900 text-right placeholder:text-slate-300 rounded-md border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </td>

                {/* 7. CHA Job / Booking */}
                <td className="p-1">
                  <input
                    type="text"
                    value={row.cha_job_number || ""}
                    disabled={disabled}
                    placeholder="CHA / Booking ref"
                    onChange={(e) => handleFieldChange(idx, "cha_job_number", e.target.value)}
                    className="w-full h-8 px-2 text-xs font-medium text-slate-800 placeholder:text-slate-300 rounded-md border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </td>

                {/* 8. Particulars */}
                <td className="p-1">
                  <input
                    type="text"
                    value={row.particulars || ""}
                    disabled={disabled}
                    placeholder="Cargo contents / goods..."
                    onChange={(e) => handleFieldChange(idx, "particulars", e.target.value)}
                    className="w-full h-8 px-2 text-xs font-medium text-slate-800 placeholder:text-slate-300 rounded-md border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </td>

                {/* 9. Remarks */}
                <td className="p-1">
                  <input
                    type="text"
                    value={row.remarks || ""}
                    disabled={disabled}
                    placeholder="Transit notes..."
                    onChange={(e) => handleFieldChange(idx, "remarks", e.target.value)}
                    className="w-full h-8 px-2 text-xs font-medium text-slate-800 placeholder:text-slate-300 rounded-md border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </td>

                {/* 10. Delete Action */}
                <td className="p-1 text-center sticky right-0 bg-white z-10 shadow-[-1px_0_0_0_#f1f5f9]">
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      title={rows.length <= 1 ? "Clear row" : "Remove row"}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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

      {/* Table Summary Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRow}
              className="h-7 text-xs font-medium gap-1 bg-white border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3 h-3 text-slate-600" />
              <span>Add Another Row</span>
            </Button>
          )}

          <button
            type="button"
            onClick={scrollToEnd}
            className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer ml-2"
          >
            Slide to Particulars & Remarks →
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <div>
            <span>Invoices Recorded: </span>
            <span className="font-bold text-slate-900 font-mono">{totalInvoices}</span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Total Invoice Value:</span>
            <span className="font-bold text-slate-900 font-mono text-sm text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 shadow-2xs">
              {formatCurrency(totalInvoiceValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Custom Scrollbar CSS */}
      <style jsx>{`
        .custom-horizontal-scrollbar::-webkit-scrollbar {
          height: 10px;
        }
        .custom-horizontal-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 6px;
        }
        .custom-horizontal-scrollbar::-webkit-scrollbar-thumb {
          background: #818cf8;
          border-radius: 6px;
        }
        .custom-horizontal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4f46e5;
        }
      `}</style>
    </div>
  );
}
