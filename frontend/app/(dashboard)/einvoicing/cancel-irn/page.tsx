"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Ban, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title="Cancel E-Invoice IRN"
        description="Submit an official 24-hour window cancellation request for an issued GST Invoice Reference Number."
        breadcrumbs={[
          { label: "Accounts", href: "/accounts" },
          { label: "E-Invoicing", href: "/einvoicing" },
          { label: "Cancel IRN" },
        ]}
        actions={
          <Link href="/einvoicing/irn-list">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to IRN List
            </Button>
          </Link>
        }
      />

      {/* 24-Hour Notice */}
      <div className="p-4 rounded-xl bg-warning-light border border-warning/20 text-warning text-xs leading-relaxed flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">GST Rule Reminder: 24-Hour Cancellation Window</strong>
          Per government regulations, an IRN can only be cancelled within 24 hours of its generation on the IRP.
          Once cancelled, the same invoice number cannot be used again to generate another IRN.
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-danger hover:opacity-80">×</button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-success-light border border-success/20 text-success text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-success hover:opacity-80">×</button>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-surface rounded-card border border-border p-6 shadow-xs">
        <form onSubmit={handleCancelIRN} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Select Active IRN from System
            </label>
            <select
              value={irn}
              onChange={(e) => setIrn(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-text-primary font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/20"
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
            <label className="block text-xs font-semibold text-text-primary mb-1">
              64-Character IRN String *
            </label>
            <input
              type="text"
              required
              maxLength={64}
              placeholder="Paste 64-character hash..."
              value={irn}
              onChange={(e) => setIrn(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-text-primary font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              NIC Cancellation Reason *
            </label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="1 - Duplicate">1 - Duplicate Document</option>
              <option value="2 - Data Entry Mistake">2 - Data Entry Mistake</option>
              <option value="3 - Order Cancelled">3 - Order / Consignment Cancelled</option>
              <option value="4 - Other">4 - Other Business Reason</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Audit Cancellation Remarks
            </label>
            <textarea
              rows={3}
              placeholder="Detailed remarks recorded for GST audit purposes..."
              value={cancelRemarks}
              onChange={(e) => setCancelRemarks(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
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
    <Suspense fallback={<div className="p-6 text-sm text-text-muted">Loading cancellation interface...</div>}>
      <CancelIRNContent />
    </Suspense>
  );
}
