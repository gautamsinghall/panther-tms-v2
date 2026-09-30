"use client";

import React, { useMemo } from "react";
import { Plus, Trash2, FileSpreadsheet, Receipt, ShieldCheck, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export interface LRInvoiceItem {
  id?: string;
  invoice_no: string;
  invoice_date: string;
  invoice_value: string | number;
  eway_bill_number: string;
  eway_bill_date: string;
  eway_bill_expiry: string;
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
    invoice_no: "",
    invoice_date: today,
    invoice_value: "",
    eway_bill_number: "",
    eway_bill_date: today,
    eway_bill_expiry: "",
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
      // Clear the single row rather than deleting
      onChange([createEmptyInvoiceItem()]);
      return;
    }
    const updated = rows.filter((_, i) => i !== index);
    onChange(updated);
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
      {/* Table Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            <span>{rows.length} {rows.length === 1 ? "Line Item" : "Line Items"}</span>
          </span>
          {totalInvoices > 0 && (
            <span className="text-xs text-slate-500 font-medium">
              ({totalInvoices} Invoices · {totalEwb} E-Way Bills linked)
            </span>
          )}
        </div>

        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="h-8 text-xs font-semibold gap-1.5 bg-indigo-50/60 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Add Invoice & E-Way Bill</span>
          </Button>
        )}
      </div>

      {/* Spreadsheet / Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs bg-white">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-700 uppercase tracking-wider divide-x divide-slate-200">
              <th className="py-2.5 px-2 text-center w-10">#</th>
              <th className="py-2.5 px-2.5 min-w-[130px]">Invoice No.</th>
              <th className="py-2.5 px-2.5 min-w-[125px]">Invoice Date</th>
              <th className="py-2.5 px-2.5 min-w-[130px] text-right">Invoice Value (₹)</th>
              <th className="py-2.5 px-2.5 min-w-[140px]">E-Way Bill No.</th>
              <th className="py-2.5 px-2.5 min-w-[125px]">EWB Date</th>
              <th className="py-2.5 px-2.5 min-w-[125px]">EWB Expiry</th>
              <th className="py-2.5 px-2.5 min-w-[135px]">CHA Job / Booking</th>
              <th className="py-2.5 px-2.5 min-w-[160px]">Particulars</th>
              <th className="py-2.5 px-2.5 min-w-[140px]">Remarks</th>
              <th className="py-2.5 px-2 text-center w-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={row.id || idx} className="hover:bg-indigo-50/20 transition-colors divide-x divide-slate-100">
                {/* Index */}
                <td className="py-1.5 px-2 text-center font-mono text-[11px] text-slate-400 font-medium">
                  {idx + 1}
                </td>

                {/* Invoice No */}
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

                {/* Invoice Date */}
                <td className="p-1">
                  <input
                    type="date"
                    value={row.invoice_date || ""}
                    disabled={disabled}
                    onChange={(e) => handleFieldChange(idx, "invoice_date", e.target.value)}
                    className="w-full h-8 px-2 text-xs font-medium text-slate-800 rounded-md border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </td>

                {/* Invoice Value */}
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

                {/* E-Way Bill No */}
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

                {/* EWB Date */}
                <td className="p-1">
                  <input
                    type="date"
                    value={row.eway_bill_date || ""}
                    disabled={disabled}
                    onChange={(e) => handleFieldChange(idx, "eway_bill_date", e.target.value)}
                    className="w-full h-8 px-2 text-xs font-medium text-slate-800 rounded-md border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </td>

                {/* EWB Expiry */}
                <td className="p-1">
                  <input
                    type="date"
                    value={row.eway_bill_expiry || ""}
                    disabled={disabled}
                    onChange={(e) => handleFieldChange(idx, "eway_bill_expiry", e.target.value)}
                    className="w-full h-8 px-2 text-xs font-medium text-slate-800 rounded-md border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </td>

                {/* CHA Job / Booking */}
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

                {/* Particulars */}
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

                {/* Remarks */}
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

                {/* Delete Action */}
                <td className="p-1 text-center">
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
    </div>
  );
}
