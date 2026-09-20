"use client";

import React, { useState, useEffect } from "react";
import { Plus, Split, Ban, CheckCircle, AlertCircle, Eye } from "lucide-react";
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

export default function CreditDebitNotesPage() {
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "CREDIT_NOTE" | "DEBIT_NOTE">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create Drawer state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [noteType, setNoteType] = useState<"CREDIT_NOTE" | "DEBIT_NOTE">("CREDIT_NOTE");
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

  // View Ledger Drawer state
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [crRes, drRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=CREDIT_NOTE"),
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=DEBIT_NOTE"),
      ]);
      setData([...crRes, ...drRes]);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load credit and debit notes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const tot = parseFloat(totalAmount) || 0;
    const tax = parseFloat(taxAmount) || 0;
    if (tot <= 0) {
      alert("Taxable amount must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/accounts/vouchers", {
        method: "POST",
        body: JSON.stringify({
          voucher_type: noteType,
          party_name: partyName.trim(),
          reference_number: refNumber.trim() || undefined,
          total_amount: tot,
          tax_amount: tax,
          net_amount: tot + tax,
          narration: narration.trim() || undefined,
        }),
      });
      setSuccessMessage(`${noteType === "CREDIT_NOTE" ? "Credit Note" : "Debit Note"} issued and posted!`);
      setIsCreateOpen(false);
      setPartyName("");
      setRefNumber("");
      setTotalAmount("");
      setTaxAmount("0");
      setNarration("");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create note.");
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
      setSuccessMessage(`Note Voucher #${voidVoucherId} has been voided.`);
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

  const filteredData = data.filter((v) => {
    if (activeTab === "ALL") return true;
    return v.voucher_type === activeTab;
  });

  const columns: ColumnDef<VoucherRecord>[] = [
    {
      key: "voucher_number",
      header: "Note No / Date",
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
      key: "voucher_type",
      header: "Note Type",
      cell: (row) => (
        <Badge variant={row.voucher_type === "CREDIT_NOTE" ? "warning" : "info"}>
          {row.voucher_type === "CREDIT_NOTE" ? "Credit Note (Cr)" : "Debit Note (Dr)"}
        </Badge>
      ),
    },
    {
      key: "party_name",
      header: "Party / Ref Invoice",
      cell: (row) => (
        <div>
          <span className="font-medium text-text-primary">
            {row.party_name || "—"}
          </span>
          {row.reference_number && (
            <span className="block font-mono text-xs text-text-muted mt-0.5">
              Ref Inv: {row.reference_number}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "net_amount",
      header: "Adjustment Amount",
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
      label: "Void Note",
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
        title="Credit & Debit Notes"
        description="Issue customer credit adjustments, shortage claims, vendor purchase deductions, and GST adjustments."
        breadcrumbs={[
          { label: "Accounts", href: "/accounts" },
          { label: "Credit & Debit Notes" },
        ]}
        actions={
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Issue Note
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-secondary rounded-xl border border-border w-fit">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "ALL"
              ? "bg-surface text-text-primary shadow-xs font-semibold"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          All Notes ({data.length})
        </button>
        <button
          onClick={() => setActiveTab("CREDIT_NOTE")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "CREDIT_NOTE"
              ? "bg-surface text-text-primary shadow-xs font-semibold"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Credit Notes ({data.filter((d) => d.voucher_type === "CREDIT_NOTE").length})
        </button>
        <button
          onClick={() => setActiveTab("DEBIT_NOTE")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "DEBIT_NOTE"
              ? "bg-surface text-text-primary shadow-xs font-semibold"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Debit Notes ({data.filter((d) => d.voucher_type === "DEBIT_NOTE").length})
        </button>
      </div>

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
          data={filteredData}
          isLoading={isLoading}
          searchPlaceholder="Search party or note number..."
          searchColumn="party_name"
          actions={actions}
        />
      </div>

      {/* Create Note Drawer */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Issue Adjustment Note"
        description="Create double-entry adjustment note for customer or vendor"
        size="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="credit-debit-note-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Posting..." : "Issue & Post"}
            </Button>
          </div>
        }
      >
        <form id="credit-debit-note-form" onSubmit={handleCreateNote} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Note Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNoteType("CREDIT_NOTE")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  noteType === "CREDIT_NOTE"
                    ? "border-warning bg-warning-light text-warning"
                    : "border-border text-text-secondary hover:bg-surface-secondary"
                }`}
              >
                Credit Note (To Customer)
              </button>
              <button
                type="button"
                onClick={() => setNoteType("DEBIT_NOTE")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  noteType === "DEBIT_NOTE"
                    ? "border-info bg-info-light text-info"
                    : "border-border text-text-secondary hover:bg-surface-secondary"
                }`}
              >
                Debit Note (To Vendor / Supplier)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Party Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Customer / MRF Vendor"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Original Invoice Reference #
            </label>
            <input
              type="text"
              placeholder="e.g. TI-2026-0001"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Taxable Adjustment (₹) *
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
                Tax Adjustment (₹)
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
              Reason for Adjustment / Narration
            </label>
            <textarea
              rows={3}
              placeholder="Shortage deduction, rate difference, or freight adjustment..."
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
              <span className="text-text-muted">Total Net Adjustment</span>
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
        title={`Void Note Voucher #${voidVoucherId || ""}`}
        description="Voiding reverses the double-entry accounting ledger entries automatically. This action cannot be undone."
        confirmText="Confirm Void Entry"
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
            placeholder="Explain why this note is being reversed..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-danger/20"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
