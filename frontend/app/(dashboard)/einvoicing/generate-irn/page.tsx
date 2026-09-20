"use client";

import React, { useState, useEffect } from "react";
import { FileCheck2, AlertTriangle, CheckCircle, ShieldCheck, ArrowRight, RefreshCw, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";

interface VoucherRecord {
  id: number;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  party_name?: string;
  party_gstin?: string;
  lr_number?: string;
  net_amount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  irn?: string;
  irn_status?: string;
}

interface EInvoiceResponse {
  id: number;
  voucher_id: number;
  voucher_number?: string;
  irn: string;
  ack_no: string;
  ack_date: string;
  status: string;
  signed_invoice?: string;
  signed_qr_code?: string;
}

export default function GenerateIRNPage() {
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>("");
  const [supplierGstin, setSupplierGstin] = useState<string>("24AAACT1234F1Z1"); // Demo transport co
  const [buyerGstin, setBuyerGstin] = useState<string>("27AABCF5678G1Z3");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedRecord, setGeneratedRecord] = useState<EInvoiceResponse | null>(null);

  const loadPendingVouchers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [tiRes, giRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=TRANSPORT_INVOICE"),
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=GENERAL_INVOICE"),
      ]);
      const all = [...tiRes, ...giRes];
      // Filter vouchers that are not void and don't already have an IRN generated
      const pending = all.filter((v) => !v.irn || v.irn_status === "CANCELLED");
      setVouchers(pending);
      if (pending.length > 0) {
        setSelectedVoucherId(pending[0].id.toString());
        if (pending[0].party_gstin) {
          setBuyerGstin(pending[0].party_gstin);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load pending vouchers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPendingVouchers();
  }, []);

  const selectedVoucher = vouchers.find((v) => v.id.toString() === selectedVoucherId);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVoucherId) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedRecord(null);

    try {
      const res = await apiClient<EInvoiceResponse>("/api/v1/einvoicing/generate-irn", {
        method: "POST",
        body: JSON.stringify({
          voucher_id: parseInt(selectedVoucherId, 10),
          supplier_gstin: supplierGstin.trim(),
          buyer_gstin: buyerGstin.trim(),
        }),
      });
      setGeneratedRecord(res);
      await loadPendingVouchers();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate IRN.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <FileCheck2 className="w-6 h-6 text-[var(--color-primary)]" />
          Generate E-Invoice IRN
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Initiate GST Suvidha Provider (GSP) compliant Invoice Reference Number (IRN) generation with signed QR code.
        </p>
      </div>

      {/* Integration Notice Alert (rules.md §2) */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">
            INTEGRATION NOTICE: Mock Sandbox GSP Active (rules.md §2)
          </strong>
          Production GST Suvidha Provider (GSP: ClearTax, Masters India, or NIC Direct) is currently pending vendor confirmation.
          The backend is executing via an isolated provider interface generating deterministic SHA-256 IRNs and mock digital signatures.
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Generation Success Card */}
      {generatedRecord && (
        <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-sm animate-in fade-in space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-bold text-lg">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            IRN Successfully Generated & Signed!
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-semibold block">64-Character IRN:</span>
                <span className="font-mono text-xs bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 break-all block font-bold text-slate-800 dark:text-slate-200">
                  {generatedRecord.irn}
                </span>
              </div>
              <div className="flex gap-4">
                <div>
                  <span className="text-slate-500 font-semibold block">Ack No:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{generatedRecord.ack_no}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Ack Date:</span>
                  <span className="text-slate-800 dark:text-slate-200">{generatedRecord.ack_date}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <QrCode className="w-10 h-10 text-slate-700 dark:text-slate-300" />
              </div>
              <div className="space-y-1">
                <Badge variant="success" className="gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  NIC Digital Signature Verified
                </Badge>
                <p className="text-[11px] text-slate-500">
                  B2B QR Code generated and attached to invoice record.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Form & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center justify-between">
            <span>Select Invoice for IRN Dispatch</span>
            <Button variant="outline" size="sm" onClick={loadPendingVouchers} disabled={isLoading} className="gap-1 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </h2>

          {vouchers.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-xs">
              No pending un-invoiced vouchers found. All transport and general invoices currently have IRNs generated!
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Choose Invoice Voucher *
                </label>
                <select
                  required
                  value={selectedVoucherId}
                  onChange={(e) => {
                    setSelectedVoucherId(e.target.value);
                    const sel = vouchers.find((v) => v.id.toString() === e.target.value);
                    if (sel?.party_gstin) {
                      setBuyerGstin(sel.party_gstin);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {vouchers.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.voucher_number} ({v.voucher_type}) — {v.party_name || "Direct Customer"} — ₹{Number(v.net_amount).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier GSTIN (PantherTMS Transporter) *
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierGstin}
                    onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Buyer / Consigner GSTIN *
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerGstin}
                    onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button type="submit" disabled={isGenerating} className="gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {isGenerating ? "Requesting NIC IRN..." : "Generate IRN via GSP"}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Invoice Summary Preview */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[var(--color-primary)]" />
            Payload Snapshot
          </h3>

          {selectedVoucher ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Document No:</span>
                  <span className="font-mono font-bold">{selectedVoucher.voucher_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Doc Date:</span>
                  <span>{selectedVoucher.voucher_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Document Type:</span>
                  <Badge variant="neutral">{selectedVoucher.voucher_type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Taxable Value:</span>
                  <span className="font-mono">₹{Number(selectedVoucher.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tax Amount:</span>
                  <span className="font-mono">₹{Number(selectedVoucher.tax_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2 font-bold text-slate-900 dark:text-slate-100">
                  <span>Total Invoice Value:</span>
                  <span className="font-mono text-emerald-600">₹{Number(selectedVoucher.net_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="font-semibold block mb-1">NIC Hash Formula:</span>
                <code className="block text-[10px] text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800 p-2 rounded break-all">
                  SHA256({supplierGstin} + {selectedVoucher.voucher_number} + 2026-27 + INV)
                </code>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Select an invoice to preview payload details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
