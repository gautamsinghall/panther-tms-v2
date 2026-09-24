"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, ArrowDownLeft, Ban, CheckCircle, AlertCircle, Eye } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
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

export default function ReceiptVoucherPage() {
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create Drawer state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [paymentMode, setPaymentMode] = useState<"BANK" | "CASH">("BANK");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Void Dialog state
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  // View Ledger state
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=RECEIPT_VOUCHER");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load receipt vouchers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) {
      alert("Receipt amount must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/accounts/vouchers", {
        method: "POST",
        body: JSON.stringify({
          voucher_type: "RECEIPT_VOUCHER",
          party_name: partyName.trim(),
          reference_number: referenceNumber.trim() || undefined,
          total_amount: amt,
          tax_amount: 0,
          net_amount: amt,
          narration: `Mode: ${paymentMode}. ${narration.trim()}`.trim(),
        }),
      });
      setSuccessMessage("Receipt Voucher posted to ledger successfully!");
      setIsCreateOpen(false);
      setPartyName("");
      setReferenceNumber("");
      setAmount("");
      setNarration("");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create receipt voucher.");
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
      setSuccessMessage(`Receipt Voucher #${voidVoucherId} has been voided.`);
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
      header: "Receipt No / Date",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-[#101828] flex items-center gap-1.5">
            {row.voucher_number}
            {row.is_void && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] rounded">
                VOIDED
              </span>
            )}
          </span>
          <span className="block text-[11px] text-[#667085]">{row.voucher_date}</span>
        </div>
      ),
    },
    {
      key: "party_name",
      header: "Customer / Remitter",
      cell: (row) => (
        <div>
          <span className="font-medium text-[#101828]">
            {row.party_name || "Customer"}
          </span>
          {row.reference_number && (
            <span className="block font-mono text-[11px] text-[#667085]">
              Txn / UTR: {row.reference_number}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "narration",
      header: "Particulars",
      cell: (row) => (
        <span className="text-xs text-[#667085] line-clamp-1">
          {row.narration || "-"}
        </span>
      ),
    },
    {
      key: "net_amount",
      header: "Amount Received",
      isNumeric: true,
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-semibold tabular-nums text-[#027A48]">
          ₹{Number(row.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  const actions: RowAction<VoucherRecord>[] = [
    {
      label: "View Ledger",
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: (row) => setSelectedVoucher(row),
    },
    {
      label: "Void Receipt",
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
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Accounts", href: "/accounts" },
          { label: "Receipt Vouchers" },
        ]}
        title="Receipt Vouchers"
        description="Record customer inflows, NEFT/RTGS collections, and cash receipts against freight receivables."
        primaryAction={{
          label: "New Receipt Voucher",
          icon: Plus,
          onClick: () => setIsCreateOpen(true),
        }}
      />

      {errorMessage && (
        <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs rounded-lg font-medium flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-[#B42318] hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-[#ECFDF3] border border-[#A6F4C5] text-[#027A48] text-xs rounded-lg font-medium flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-[#027A48] hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Search customer or receipt no..."
        searchColumn="party_name"
        actions={actions}
      />

      {/* Create Drawer */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Record Customer Receipt"
        subtitle="Log payment remittance and post balanced ledger vouchers"
        size="md"
      >
        <form onSubmit={handleCreateReceipt} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Received From (Customer Name) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Paramount Textiles Ltd"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">
                Receipt Channel *
              </label>
              <SearchableSelect
                value={paymentMode}
                onChange={(val) => setPaymentMode(val as any)}
                options={[
                  { value: "BANK", label: "Bank Account (NEFT/RTGS/Cheque)" },
                  { value: "CASH", label: "Cash in Hand" },
                ]}
                placeholder="Select receipt channel..."
                searchPlaceholder="Search channel..."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">
                Amount Received (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] font-mono tabular-nums font-semibold focus:border-[#4F46E5] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Transaction / Cheque / UTR Reference
            </label>
            <input
              type="text"
              placeholder="e.g. UTR-HDFC90823412"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] font-mono focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Narration / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Payment remarks or invoice adjustments..."
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E4E7EC]">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Record Receipt
            </Button>
          </div>
        </form>
      </EntityDrawer>

      {/* Void Dialog */}
      <ConfirmDialog
        isOpen={isVoidOpen}
        onClose={() => {
          setIsVoidOpen(false);
          setVoidReason("");
        }}
        onConfirm={handleVoidVoucher}
        title={`Void Receipt #${voidVoucherId}`}
        consequence="Voiding this receipt voucher will post automatic reversing ledger entries per non-destructive audit rules."
        confirmLabel="Confirm Void"
        isLoading={isVoiding}
      />

      {/* Ledger Drawer */}
      <EntityDrawer
        isOpen={!!selectedVoucher}
        onClose={() => setSelectedVoucher(null)}
        title={`Double-Entry Ledger: ${selectedVoucher?.voucher_number}`}
        subtitle={`Amount: ₹${Number(selectedVoucher?.net_amount || 0).toFixed(2)} | Date: ${selectedVoucher?.voucher_date}`}
        size="lg"
      >
        {selectedVoucher && (
          <div className="space-y-4">
            <div className="border border-[#E4E7EC] rounded-card overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8F9FB] text-[#667085] font-semibold border-b border-[#E4E7EC]">
                  <tr>
                    <th className="px-4 py-2.5">Account</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5 text-right">Debit (Dr)</th>
                    <th className="px-4 py-2.5 text-right">Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EC]">
                  {selectedVoucher.ledger_entries.map((entry) => (
                    <tr key={entry.id} className={entry.is_reversal ? "bg-[#FEF3F2] text-[#B42318]" : ""}>
                      <td className="px-4 py-2.5 font-medium text-[#101828]">
                        {entry.account_name || `Account #${entry.account_id}`}
                        {entry.is_reversal && (
                          <span className="ml-2 text-[10px] font-bold text-[#B42318] uppercase">
                            [Reversal]
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[#667085]">
                        {Number(entry.debit_amount) > 0 ? "Debit" : "Credit"}
                      </td>
                      <td className="px-4 py-2.5 font-mono tabular-nums text-right text-[#101828]">
                        {Number(entry.debit_amount) > 0 ? `₹${Number(entry.debit_amount).toFixed(2)}` : "-"}
                      </td>
                      <td className="px-4 py-2.5 font-mono tabular-nums text-right text-[#101828]">
                        {Number(entry.credit_amount) > 0 ? `₹${Number(entry.credit_amount).toFixed(2)}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </EntityDrawer>
    </div>
  );
}
