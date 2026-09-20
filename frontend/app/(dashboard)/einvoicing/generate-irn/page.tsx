"use client";

import React, { useState, useEffect } from "react";
import { FileCheck2, AlertTriangle, CheckCircle, ShieldCheck, RefreshCw, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
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
  const [supplierGstin, setSupplierGstin] = useState<string>("24AAACT1234F1Z1");
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
      <PageHeader
        title="Generate E-Invoice IRN"
        description="Initiate GST Suvidha Provider (GSP) compliant Invoice Reference Number (IRN) generation with signed QR code."
        breadcrumbs={[
          { label: "Accounts", href: "/accounts" },
          { label: "E-Invoicing", href: "/einvoicing" },
          { label: "Generate IRN" },
        ]}
      />

      {/* Integration Notice Alert (rules.md §2) */}
      <div className="p-4 rounded-xl bg-warning-light border border-warning/20 text-warning text-xs leading-relaxed flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">
            INTEGRATION NOTICE: Mock Sandbox GSP Active (rules.md §2)
          </strong>
          Production GST Suvidha Provider (GSP: ClearTax, Masters India, or NIC Direct) is currently operating via an isolated provider interface generating deterministic SHA-256 IRNs and digital signatures.
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-danger hover:opacity-80">×</button>
        </div>
      )}

      {/* Generation Success Card */}
      {generatedRecord && (
        <div className="p-6 rounded-2xl bg-success-light border border-success/20 shadow-xs animate-in fade-in space-y-4">
          <div className="flex items-center gap-2.5 text-success font-semibold text-base">
            <CheckCircle className="w-5 h-5 text-success" />
            IRN Successfully Generated & Signed!
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div>
                <span className="text-text-muted font-medium block">64-Character IRN:</span>
                <span className="font-mono text-xs bg-surface px-3 py-1.5 rounded-lg border border-border break-all block font-semibold text-text-primary mt-1">
                  {generatedRecord.irn}
                </span>
              </div>
              <div className="flex gap-4 pt-1">
                <div>
                  <span className="text-text-muted font-medium block">Ack No:</span>
                  <span className="font-mono font-semibold text-text-primary">{generatedRecord.ack_no}</span>
                </div>
                <div>
                  <span className="text-text-muted font-medium block">Ack Date:</span>
                  <span className="text-text-primary">{generatedRecord.ack_date}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-surface rounded-xl border border-border flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-surface-secondary flex items-center justify-center text-text-secondary shrink-0">
                <QrCode className="w-8 h-8 text-text-primary" />
              </div>
              <div className="space-y-1">
                <Badge variant="success" className="gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  NIC Signature Verified
                </Badge>
                <p className="text-[11px] text-text-muted">
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
        <div className="lg:col-span-7 bg-surface rounded-card border border-border p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">
              Select Invoice for IRN Dispatch
            </h2>
            <Button variant="outline" size="sm" onClick={loadPendingVouchers} disabled={isLoading} className="gap-1.5 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {vouchers.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-border rounded-xl text-text-muted text-xs">
              No pending un-invoiced vouchers found. All transport and general invoices currently have valid IRNs generated!
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
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
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
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
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Supplier GSTIN (Transporter) *
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierGstin}
                    onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Buyer / Consigner GSTIN *
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerGstin}
                    onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button type="submit" disabled={isGenerating} className="gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {isGenerating ? "Requesting NIC IRN..." : "Generate IRN via GSP"}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Invoice Summary Preview */}
        <div className="lg:col-span-5 bg-surface-secondary rounded-card border border-border p-6 space-y-4">
          <h3 className="font-semibold text-sm text-text-primary flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-primary" />
            Payload Snapshot
          </h3>

          {selectedVoucher ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-surface rounded-xl border border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-muted">Document No:</span>
                  <span className="font-mono font-semibold text-text-primary">{selectedVoucher.voucher_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Doc Date:</span>
                  <span className="text-text-primary">{selectedVoucher.voucher_date}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Document Type:</span>
                  <Badge variant="neutral">{selectedVoucher.voucher_type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Taxable Value:</span>
                  <span className="font-mono tabular-nums text-text-primary">₹{Number(selectedVoucher.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Tax Amount:</span>
                  <span className="font-mono tabular-nums text-text-primary">₹{Number(selectedVoucher.tax_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold text-text-primary">
                  <span>Total Invoice Value:</span>
                  <span className="font-mono text-primary tabular-nums">₹{Number(selectedVoucher.net_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-[11px] text-text-muted bg-surface p-3 rounded-xl border border-border">
                <span className="font-medium text-text-primary block mb-1">NIC Hash Formula:</span>
                <code className="block text-[10px] text-text-secondary font-mono bg-surface-secondary p-2 rounded-lg break-all">
                  SHA256({supplierGstin} + {selectedVoucher.voucher_number} + 2026-27 + INV)
                </code>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted">Select an invoice to preview payload details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
