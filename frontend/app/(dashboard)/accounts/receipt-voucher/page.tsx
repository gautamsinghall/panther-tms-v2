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
import { getActiveOffice } from "@/lib/auth";
import { FormFieldLabel } from "@/components/ui/form-field";
import { FormActionBar } from "@/components/ui/form-action-bar";

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
  const [seriesInfo, setSeriesInfo] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const activeOffice = getActiveOffice();
      const officeParam = activeOffice?.id ? `?office_id=${activeOffice.id}` : "";
      const [res, sInfo] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=RECEIPT_VOUCHER"),
        apiClient<any>(`/api/v1/settings/series/check/RECEIPT_VOUCHER${officeParam}`).catch(() => null),
      ]);
      setData(res);
      setSeriesInfo(sInfo);
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
    if (!seriesInfo?.configured || !seriesInfo?.next_number_formatted) {
      alert("Receipt Voucher cannot be recorded because no series is configured for this issuing office. Please setup or import the default series in Settings > Series Master.");
      return;
    }

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
          voucher_number: seriesInfo.next_number_formatted,
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
        isError={Boolean(errorMessage) && data.length === 0}
        errorMessage={errorMessage}
        onRetry={loadData}
        searchPlaceholder="Search customer or receipt no..."
        searchColumn="party_name"
        actions={actions}
        emptyMessage="No receipt vouchers recorded"
        emptySubtext="Record a customer receipt to post the incoming payment to the ledger."
        emptyAction={{ label: "Record Receipt Voucher", onClick: () => setIsCreateOpen(true) }}
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
          {!seriesInfo?.configured && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Series Not Configured</span>
                <p className="mt-0.5 text-amber-700">
                  No series is configured for Receipt Voucher in the active issuing office. Vouchers cannot be created until a series is configured or imported.
                </p>
                <a
                  href="/settings/series-master"
                  className="inline-block mt-1.5 font-semibold text-indigo-600 hover:text-indigo-800 underline"
                >
                  Setup Series in Master &rarr;
                </a>
              </div>
            </div>
          )}

          {/* Series Master Info / Voucher Number */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider">
                Receipt Voucher Number (Auto Series)
              </div>
              <div className="font-mono font-bold text-sm text-[#0F172A] mt-0.5 min-h-[1.25rem]">
                {seriesInfo?.configured ? seriesInfo.next_number_formatted : ""}
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF] rounded-md">
              Auto-Assigned &amp; Locked
            </span>
          </div>

          <div>
            <FormFieldLabel htmlFor="receipt-party-name" required>Received From (Customer Name)</FormFieldLabel>
            <input
              id="receipt-party-name"
              name="party_name"
              type="text"
              required
              placeholder="e.g. Paramount Textiles Ltd"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FormFieldLabel htmlFor="receipt-payment-mode" required>Receipt Channel</FormFieldLabel>
              <SearchableSelect
                id="receipt-payment-mode"
                name="payment_mode"
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
              <FormFieldLabel htmlFor="receipt-amount" required>Amount Received (₹)</FormFieldLabel>
              <input
                id="receipt-amount"
                name="amount"
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
            <FormFieldLabel htmlFor="receipt-reference">Transaction / Cheque / UTR Reference</FormFieldLabel>
            <input
              id="receipt-reference"
              name="reference_number"
              type="text"
              placeholder="e.g. UTR-HDFC90823412"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] font-mono focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          <div>
            <FormFieldLabel htmlFor="receipt-narration">Narration / Notes</FormFieldLabel>
            <textarea
              id="receipt-narration"
              name="narration"
              rows={2}
              placeholder="Payment remarks or invoice adjustments..."
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-[#E4E7EC]">
            <FormActionBar
              onCancel={() => setIsCreateOpen(false)}
              submitLabel="Record Receipt"
              isSubmitting={isSubmitting}
              submitDisabled={!seriesInfo?.configured}
            />
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
