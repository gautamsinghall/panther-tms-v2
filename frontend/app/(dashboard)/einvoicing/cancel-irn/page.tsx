"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Ban, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

interface EInvoiceRecord {
  id: number;
  voucher_id: number;
  voucher_number?: string;
  irn: string;
  ack_number?: string;
  status: string;
  party_name?: string;
}

function CancelIRNContent() {
  const searchParams = useSearchParams();
  const initialIrn = searchParams.get("irn") || "";

  const [activeIrns, setActiveIrns] = useState<EInvoiceRecord[]>([]);
  const [irn, setIrn] = useState(initialIrn);
  const [cancelReason, setCancelReason] = useState("1 - Duplicate");
  const [cancelRemarks, setCancelRemarks] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadActiveIRNs() {
      setIsLoading(true);
      try {
        const res = await apiClient<EInvoiceRecord[]>("/api/v1/einvoicing/irn-list");
        const active = res.filter((r) => r.status === "GENERATED");
        setActiveIrns(active);
        if (initialIrn) {
          setIrn(initialIrn);
        } else if (active.length > 0) {
          setIrn(active[0].irn);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load active IRNs.");
      } finally {
        setIsLoading(false);
      }
    }
    loadActiveIRNs();
  }, [initialIrn]);

  const handleCancelIRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!irn.trim()) {
      alert("Please enter or select a valid 64-character IRN.");
      return;
    }
    if (!confirm(`Are you sure you want to cancel IRN on the GST Portal? This action cannot be undone.`)) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await apiClient("/api/v1/einvoicing/cancel-irn", {
        method: "POST",
        body: JSON.stringify({
          irn: irn.trim(),
          cancel_reason: cancelReason,
          cancel_remarks: cancelRemarks.trim() || undefined,
        }),
      });
      setSuccessMessage(`IRN has been successfully cancelled on the GST Portal.`);
      // Reload list
      const res = await apiClient<EInvoiceRecord[]>("/api/v1/einvoicing/irn-list");
      setActiveIrns(res.filter((r) => r.status === "GENERATED"));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to cancel IRN.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Ban className="w-6 h-6 text-rose-600" />
            Cancel E-Invoice IRN
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit an official 24-hour window cancellation request for an issued GST Invoice Reference Number.
          </p>
        </div>
        <Link href="/einvoicing/irn-list">
          <Button variant="outline" size="sm" className="gap-1 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to IRN List
          </Button>
        </Link>
      </div>

      {/* 24-Hour Notice */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">GST Rule Reminder: 24-Hour Cancellation Window</strong>
          Per government regulations, an IRN can only be cancelled within 24 hours of its generation on the IRP.
          Once cancelled, the same invoice number cannot be used again to generate another IRN.
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <form onSubmit={handleCancelIRN} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Active IRN from System
            </label>
            <select
              value={irn}
              onChange={(e) => setIrn(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
            >
              <option value="">-- Choose active generated invoice --</option>
              {activeIrns.map((rec) => (
                <option key={rec.id} value={rec.irn}>
                  {rec.voucher_number || `Voucher #${rec.voucher_id}`} — {rec.party_name || "Customer"} — {rec.irn.substring(0, 16)}...
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              64-Character IRN String *
            </label>
            <input
              type="text"
              required
              maxLength={64}
              placeholder="Paste 64-character hash..."
              value={irn}
              onChange={(e) => setIrn(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              NIC Cancellation Reason *
            </label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="1 - Duplicate">1 - Duplicate Document</option>
              <option value="2 - Data Entry Mistake">2 - Data Entry Mistake</option>
              <option value="3 - Order Cancelled">3 - Order / Consignment Cancelled</option>
              <option value="4 - Other">4 - Other Business Reason</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Audit Cancellation Remarks
            </label>
            <textarea
              rows={3}
              placeholder="Detailed remarks recorded for GST audit purposes..."
              value={cancelRemarks}
              onChange={(e) => setCancelRemarks(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Button
              type="submit"
              variant="danger"
              disabled={isSubmitting || !irn.trim()}
              className="gap-2"
            >
              <Ban className="w-4 h-4" />
              {isSubmitting ? "Cancelling with IRP..." : "Confirm & Cancel IRN"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CancelIRNPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading cancellation interface...</div>}>
      <CancelIRNContent />
    </Suspense>
  );
}
