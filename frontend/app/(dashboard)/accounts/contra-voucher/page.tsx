"use client";

import React, { useState, useEffect } from "react";
import { Plus, ArrowLeftRight, Ban, CheckCircle, AlertCircle, Eye, ArrowRight } from "lucide-react";
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
  net_amount: string | number;
  narration?: string;
  is_void: boolean;
  void_reason?: string;
  ledger_entries: LedgerEntry[];
  created_at: string;
}

export default function ContraVoucherPage() {
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create Drawer state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [contraType, setContraType] = useState<"DEPOSIT" | "WITHDRAWAL" | "INTERBANK">("DEPOSIT");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Void Dialog state
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  // View Ledger Drawer state
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=CONTRA_VOUCHER");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load contra vouchers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateContra = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) {
      alert("Transfer amount must be greater than 0.");
      return;
    }

    const typeDesc =
      contraType === "DEPOSIT"
        ? "Cash Deposited into Bank"
        : contraType === "WITHDRAWAL"
        ? "Cash Withdrawn from Bank"
        : "Inter-Bank Transfer";

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/accounts/vouchers", {
        method: "POST",
        body: JSON.stringify({
          voucher_type: "CONTRA_VOUCHER",
          party_name: typeDesc,
          reference_number: referenceNumber.trim() || undefined,
          total_amount: amt,
          tax_amount: 0,
          net_amount: amt,
          narration: narration.trim() || typeDesc,
        }),
      });
      setSuccessMessage("Contra Voucher posted successfully!");
      setIsCreateOpen(false);
      setReferenceNumber("");
      setAmount("");
      setNarration("");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create contra voucher.");
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
      setSuccessMessage(`Contra Voucher #${voidVoucherId} has been voided.`);
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
      header: "Contra No / Date",
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
      header: "Transfer Nature",
      cell: (row) => (
        <div>
          <span className="font-medium text-text-primary">
            {row.party_name || "Cash / Bank Contra"}
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
      key: "narration",
      header: "Particulars",
      cell: (row) => (
        <span className="text-xs text-text-secondary line-clamp-1 max-w-[280px]">
          {row.narration || "—"}
        </span>
      ),
    },
    {
      key: "net_amount",
      header: "Transferred Amount",
      align: "right",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-semibold text-text-primary text-sm tabular-nums">
          ₹{Number(row.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "is_void",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.is_void ? "VOIDED" : "POSTED"}
          variant={row.is_void ? "danger" : "success"}
        />
      ),
    },
  ];

  const actions: RowAction<VoucherRecord>[] = [
    {
      label: "View Ledger",
      icon: <Eye className="w-3.5 h-3.5" />,
      variant: "default",
      onClick: (row) => setSelectedVoucher(row),
    },
    {
      label: "Void Contra",
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
        title="Contra Vouchers"
        description="Record internal fund movements between physical cash and bank accounts or inter-bank transfers."
        breadcrumbs={[
          { label: "Accounts", href: "/accounts" },
          { label: "Contra Vouchers" },
        ]}
        actions={
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Contra Transfer
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
          searchPlaceholder="Search contra vouchers..."
          searchColumn="party_name"
          actions={actions}
        />
      </div>

      {/* Record Contra Drawer */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Record Contra Transfer"
        description="Internal account-to-account transfer adhering to double-entry standards"
        size="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="contra-voucher-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Posting..." : "Record Contra Transfer"}
            </Button>
          </div>
        }
      >
        <form id="contra-voucher-form" onSubmit={handleCreateContra} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Transfer Type *
            </label>
            <select
              value={contraType}
              onChange={(e) => setContraType(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="DEPOSIT">Cash Deposit (Cash in Hand → Bank Account)</option>
              <option value="WITHDRAWAL">Cash Withdrawal (Bank Account → Cash in Hand)</option>
              <option value="INTERBANK">Inter-Bank Transfer (Bank A → Bank B)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Amount Transferred (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary font-mono font-semibold tabular-nums focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Deposit Slip / Cheque / UTR Reference
            </label>
            <input
              type="text"
              placeholder="e.g. SLIP-88123 / UTR9823471"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Narration / Notes
            </label>
            <textarea
              rows={3}
              placeholder="Transfer remarks..."
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </form>
      </EntityDrawer>

      {/* Double-Entry Ledger Drawer */}
      <EntityDrawer
        isOpen={Boolean(selectedVoucher)}
        onClose={() => setSelectedVoucher(null)}
        title={`Ledger: ${selectedVoucher?.voucher_number || ""}`}
        description={`Double-entry audit breakdown • ${selectedVoucher?.voucher_date || ""}`}
        size="lg"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="outline" onClick={() => setSelectedVoucher(null)}>
              Close Audit
            </Button>
          </div>
        }
      >
        {selectedVoucher && (
          <div className="space-y-4">
            <div className="p-3.5 bg-surface-secondary rounded-xl border border-border flex items-center justify-between text-xs">
              <span className="text-text-muted">Total Transfer Amount</span>
              <span className="font-mono font-bold text-sm text-text-primary tabular-nums">
                ₹{Number(selectedVoucher.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-secondary text-text-secondary font-semibold border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5">Account</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5 text-right">Debit (Dr)</th>
                    <th className="px-4 py-2.5 text-right">Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedVoucher.ledger_entries.map((entry) => (
                    <tr key={entry.id} className={entry.is_reversal ? "bg-danger-light/30 text-danger" : ""}>
                      <td className="px-4 py-2.5 font-medium text-text-primary">
                        {entry.account_name || `Account #${entry.account_id}`}
                        {entry.is_reversal && (
                          <span className="ml-2 text-[10px] font-bold text-danger uppercase">
                            [Reversal]
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {Number(entry.debit_amount) > 0 ? "Debit" : "Credit"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-right tabular-nums">
                        {Number(entry.debit_amount) > 0 ? `₹${Number(entry.debit_amount).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-right tabular-nums">
                        {Number(entry.credit_amount) > 0 ? `₹${Number(entry.credit_amount).toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </EntityDrawer>

      {/* Void Confirm Dialog */}
      <ConfirmDialog
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        onConfirm={handleVoidVoucher}
        title={`Void Contra Voucher #${voidVoucherId || ""}`}
        description="Voiding reverses the double-entry accounting ledger entries automatically. This action cannot be undone."
        confirmText="Confirm Void"
        variant="danger"
        isLoading={isVoiding}
        disabled={voidReason.trim().length < 10}
      >
        <div className="mt-4">
          <label className="block text-xs font-semibold text-text-primary mb-1">
            Reason for Voiding * (Min 10 characters)
          </label>
          <textarea
            required
            rows={3}
            placeholder="Explain why this contra transfer is being reversed..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-danger/20"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
