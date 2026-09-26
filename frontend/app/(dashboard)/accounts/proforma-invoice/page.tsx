"use client";

import React, { useState, useEffect } from "react";
import { Plus, FileSpreadsheet, Ban, CheckCircle, AlertCircle, Eye } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";

interface LedgerEntry {
  id: number;
  account_id: number;
  account_name?: string;
  debit_amount: string | number;
  credit_amount: string | number;
  is_reversal: boolean;
}

interface VoucherRecord {
  id: number;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  party_name?: string;
  reference_number?: string;
  total_amount: string | number;
  tax_amount: string | number;
  net_amount: string | number;
  narration?: string;
  is_void: boolean;
  void_reason?: string;
  ledger_entries: LedgerEntry[];
  created_at: string;
}

export default function ProformaInvoicePage() {
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create Drawer state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
  const [narration, setNarration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Void Dialog state
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  // View Details Drawer state
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=PROFORMA_INVOICE");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load proforma invoices.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const tot = parseFloat(totalAmount) || 0;
    const tax = parseFloat(taxAmount) || 0;
    if (tot <= 0) {
      alert("Estimated total amount must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/accounts/vouchers", {
        method: "POST",
        body: JSON.stringify({
          voucher_type: "PROFORMA_INVOICE",
          party_name: partyName.trim(),
          reference_number: refNumber.trim() || undefined,
          total_amount: tot,
          tax_amount: tax,
          net_amount: tot + tax,
          narration: narration.trim() || undefined,
        }),
      });
      setSuccessMessage("Proforma Invoice issued successfully!");
      setIsCreateOpen(false);
      setPartyName("");
      setRefNumber("");
      setTotalAmount("");
      setTaxAmount("0");
      setNarration("");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create proforma invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoidVoucher = async () => {
    if (!voidVoucherId) return;
    if (voidReason.trim().length < 10) {
      alert("Void reason must be at least 10 characters as per audit rules.");
      return;
    }

    setIsVoiding(true);
    setErrorMessage(null);
    try {
      await apiClient(`/api/v1/accounts/vouchers/${voidVoucherId}/void`, {
        method: "POST",
        body: JSON.stringify({ reason: voidReason.trim() }),
      });
      setSuccessMessage(`Proforma Invoice #${voidVoucherId} marked as void.`);
      setIsVoidOpen(false);
      setVoidReason("");
      setVoidVoucherId(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to void voucher.");
    } finally {
      setIsVoiding(false);
    }
  };

  const columns: ColumnDef<VoucherRecord>[] = [
    {
      key: "voucher_number",
      header: "Proforma No.",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-text-primary flex items-center gap-2">
            {row.voucher_number}
          </span>
          <span className="block text-xs text-text-muted mt-0.5">{row.voucher_date}</span>
        </div>
      ),
    },
    {
      key: "party_name",
      header: "Prospective Customer",
      cell: (row) => (
        <div>
          <span className="font-medium text-text-primary">
            {row.party_name || "—"}
          </span>
          {row.reference_number && (
            <span className="block font-mono text-xs text-text-muted mt-0.5">
              Ref: {row.reference_number}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "net_amount",
      header: "Estimated Total",
      align: "right",
      sortable: true,
      cell: (row) => (
        <div className="text-right">
          <span className="font-mono font-semibold text-text-primary text-sm tabular-nums">
            ₹{Number(row.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="block text-xs text-text-muted mt-0.5 tabular-nums">
            Tax: ₹{Number(row.tax_amount).toFixed(2)}
          </span>
        </div>
      ),
    },
    {
      key: "is_void",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.is_void ? "VOIDED" : "ACTIVE"}
          variant={row.is_void ? "danger" : "warning"}
        />
      ),
    },
  ];

  const actions: RowAction<VoucherRecord>[] = [
    {
      label: "View Details",
      icon: <Eye className="w-3.5 h-3.5" />,
      variant: "default",
      onClick: (row) => setSelectedVoucher(row),
    },
    {
      label: "Void Proforma",
      icon: <Ban className="w-3.5 h-3.5" />,
      variant: "danger",
      hidden: (row) => row.is_void,
      onClick: (row) => {
        setVoidVoucherId(row.id);
        setIsVoidOpen(true);
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proforma Invoices"
        description="Generate provisional commercial estimates and quotations prior to final freight dispatch or service execution."
        breadcrumbs={[
          { label: "Accounts", href: "/accounts" },
          { label: "Proforma Invoices" },
        ]}
        actions={
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Proforma Invoice
          </Button>
        }
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
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

      <div className="bg-surface rounded-xl border border-border shadow-xs p-4">
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          searchPlaceholder="Search proforma by number or party..."
          searchColumn="party_name"
          actions={actions}
        />
      </div>

      {/* Create Proforma Drawer */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="New Proforma Invoice"
        description="Provisional commercial quotation without impact on General Ledger"
        size="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="proforma-invoice-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Generating..." : "Issue Proforma"}
            </Button>
          </div>
        }
      >
        <form id="proforma-invoice-form" onSubmit={handleCreateInvoice} className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 lg:p-7 space-y-5 shadow-2xs">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Prospective Customer / Party *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Industrial Works"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Enquiry / Reference Number
              </label>
              <input
                type="text"
                placeholder="e.g. ENQ-4412"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Estimated Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary font-mono tabular-nums focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Estimated Tax (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary font-mono tabular-nums focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Quotation Terms & Narration
              </label>
              <textarea
                rows={3}
                placeholder="Proforma notes and validity period..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </form>
      </EntityDrawer>

      {/* Details Drawer */}
      <EntityDrawer
        isOpen={Boolean(selectedVoucher)}
        onClose={() => setSelectedVoucher(null)}
        title={`Proforma: ${selectedVoucher?.voucher_number || ""}`}
        description={`Commercial quotation overview • ${selectedVoucher?.voucher_date || ""}`}
        size="md"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="outline" onClick={() => setSelectedVoucher(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedVoucher && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-secondary rounded-xl border border-border space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Customer / Party</span>
                <span className="font-medium text-text-primary">{selectedVoucher.party_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Quotation Date</span>
                <span className="text-text-primary">{selectedVoucher.voucher_date}</span>
              </div>
              {selectedVoucher.reference_number && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Enquiry Reference</span>
                  <span className="font-mono text-text-primary">{selectedVoucher.reference_number}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
                <span className="text-text-primary">Net Estimated Amount</span>
                <span className="font-mono text-primary tabular-nums">
                  ₹{Number(selectedVoucher.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {selectedVoucher.narration && (
              <div className="p-3 bg-surface-secondary border border-border rounded-xl text-xs">
                <strong className="text-text-primary block mb-1">Terms & Notes:</strong>
                <p className="text-text-secondary whitespace-pre-wrap">{selectedVoucher.narration}</p>
              </div>
            )}

            {selectedVoucher.is_void && (
              <div className="p-3 bg-danger-light border border-danger/20 rounded-xl text-danger text-xs">
                <strong>Cancellation Reason:</strong> {selectedVoucher.void_reason}
              </div>
            )}
          </div>
        )}
      </EntityDrawer>

      {/* Void Confirm Dialog */}
      <ConfirmDialog
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        onConfirm={handleVoidVoucher}
        title={`Cancel Proforma #${voidVoucherId || ""}`}
        description="Marking a proforma invoice as void deactivates the quotation. This action cannot be undone."
        confirmText="Confirm Cancellation"
        variant="danger"
        isLoading={isVoiding}
        disabled={voidReason.trim().length < 10}
      >
        <div className="mt-4">
          <label className="block text-xs font-semibold text-text-primary mb-1">
            Reason for Cancellation * (Min 10 characters)
          </label>
          <textarea
            required
            rows={3}
            placeholder="Reason for cancelling this proforma..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-danger/20"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
