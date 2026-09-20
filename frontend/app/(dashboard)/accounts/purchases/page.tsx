"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, ShoppingCart, Ban, CheckCircle, AlertCircle, Eye } from "lucide-react";
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

export default function PurchasesPage() {
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "NORMAL_PURCHASE" | "GENERAL_PURCHASE">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create Drawer state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [purchaseType, setPurchaseType] = useState<"NORMAL_PURCHASE" | "GENERAL_PURCHASE">("NORMAL_PURCHASE");
  const [vendorName, setVendorName] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
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
      const [normalRes, generalRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=NORMAL_PURCHASE"),
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=GENERAL_PURCHASE"),
      ]);
      setData([...normalRes, ...generalRes]);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load purchase records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const tot = parseFloat(totalAmount) || 0;
    const tax = parseFloat(taxAmount) || 0;
    if (tot <= 0) {
      alert("Taxable purchase amount must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/accounts/vouchers", {
        method: "POST",
        body: JSON.stringify({
          voucher_type: purchaseType,
          party_name: vendorName.trim(),
          reference_number: billNumber.trim() || undefined,
          total_amount: tot,
          tax_amount: tax,
          net_amount: tot + tax,
          narration: narration.trim() || undefined,
        }),
      });
      setSuccessMessage("Purchase Bill recorded and posted to double-entry ledger!");
      setIsCreateOpen(false);
      setVendorName("");
      setBillNumber("");
      setTotalAmount("");
      setTaxAmount("0");
      setNarration("");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record purchase.");
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
      setSuccessMessage(`Purchase Voucher #${voidVoucherId} has been voided.`);
      setIsVoidOpen(false);
      setVoidReason("");
      setVoidVoucherId(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to void purchase voucher.");
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
      header: "Voucher / Date",
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
      key: "voucher_type",
      header: "Category",
      cell: (row) => (
        <Badge variant={row.voucher_type === "NORMAL_PURCHASE" ? "primary" : "neutral"} className="text-xs">
          {row.voucher_type === "NORMAL_PURCHASE" ? "Operational / Spares" : "General Expense"}
        </Badge>
      ),
    },
    {
      key: "party_name",
      header: "Vendor / Supplier",
      cell: (row) => (
        <div>
          <span className="font-medium text-[#101828]">
            {row.party_name || "Direct Vendor"}
          </span>
          {row.reference_number && (
            <span className="block font-mono text-[11px] text-[#667085]">
              Bill Ref: {row.reference_number}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "net_amount",
      header: "Total Bill Amount",
      isNumeric: true,
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold tabular-nums text-[#101828]">
            ₹{Number(row.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="block text-[11px] font-mono tabular-nums text-[#667085]">
            ITC Tax: ₹{Number(row.tax_amount).toFixed(2)}
          </span>
        </div>
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
      label: "Void Purchase",
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
          { label: "Purchase Register" },
        ]}
        title="Purchase Register"
        description="Track operational truck purchases (fuel, tyres, spare parts) and general overhead expenses with input tax credit (ITC) tracking."
        primaryAction={{
          label: "Record Purchase Bill",
          icon: Plus,
          onClick: () => setIsCreateOpen(true),
        }}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E4E7EC] pb-2">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "ALL"
              ? "bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]"
              : "text-[#667085] hover:bg-[#F2F4F7]"
          }`}
        >
          All Purchases ({data.length})
        </button>
        <button
          onClick={() => setActiveTab("NORMAL_PURCHASE")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "NORMAL_PURCHASE"
              ? "bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]"
              : "text-[#667085] hover:bg-[#F2F4F7]"
          }`}
        >
          Operational / Spares ({data.filter((d) => d.voucher_type === "NORMAL_PURCHASE").length})
        </button>
        <button
          onClick={() => setActiveTab("GENERAL_PURCHASE")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "GENERAL_PURCHASE"
              ? "bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]"
              : "text-[#667085] hover:bg-[#F2F4F7]"
          }`}
        >
          General & Admin ({data.filter((d) => d.voucher_type === "GENERAL_PURCHASE").length})
        </button>
      </div>

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
        data={filteredData}
        isLoading={isLoading}
        searchPlaceholder="Search vendor, bill ref..."
        searchColumn="party_name"
        actions={actions}
      />

      {/* Create Drawer */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Record Purchase Bill"
        subtitle="Log vendor invoice and post balanced ledger entries"
        size="md"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Purchase Classification *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPurchaseType("NORMAL_PURCHASE")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  purchaseType === "NORMAL_PURCHASE"
                    ? "border-[#4F46E5] bg-[#EEF2FF] text-[#4338CA]"
                    : "border-[#E4E7EC] text-[#667085] hover:bg-[#F2F4F7]"
                }`}
              >
                Operational (Spares / Tyres)
              </button>
              <button
                type="button"
                onClick={() => setPurchaseType("GENERAL_PURCHASE")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  purchaseType === "GENERAL_PURCHASE"
                    ? "border-[#4F46E5] bg-[#EEF2FF] text-[#4338CA]"
                    : "border-[#E4E7EC] text-[#667085] hover:bg-[#F2F4F7]"
                }`}
              >
                General Overhead / Admin
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Vendor / Supplier Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. MRF Tyres Distributor"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Vendor Bill / Invoice Number
            </label>
            <input
              type="text"
              placeholder="e.g. INV-9022"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] font-mono focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">
                Taxable Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] font-mono tabular-nums focus:border-[#4F46E5] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">
                GST Input Tax (ITC) (₹)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] font-mono tabular-nums focus:border-[#4F46E5] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Narration / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Purchase particulars..."
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
              Record & Post
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
        title={`Void Purchase #${voidVoucherId}`}
        consequence="Voiding this purchase voucher will post automatic reversing ledger entries per non-destructive audit rules."
        confirmLabel="Confirm Void"
        isLoading={isVoiding}
      />

      {/* Ledger Drawer */}
      <EntityDrawer
        isOpen={!!selectedVoucher}
        onClose={() => setSelectedVoucher(null)}
        title={`Double-Entry Ledger: ${selectedVoucher?.voucher_number}`}
        subtitle={`Vendor: ${selectedVoucher?.party_name} | Total: ₹${Number(selectedVoucher?.net_amount || 0).toFixed(2)}`}
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
                <tfoot className="bg-[#F8F9FB] font-semibold border-t border-[#E4E7EC] text-[#101828]">
                  <tr>
                    <td colSpan={2} className="px-4 py-2.5 text-right">Balance Check:</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-right text-[#027A48]">
                      ₹{selectedVoucher.ledger_entries.reduce((sum, e) => sum + Number(e.debit_amount), 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-right text-[#027A48]">
                      ₹{selectedVoucher.ledger_entries.reduce((sum, e) => sum + Number(e.credit_amount), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </EntityDrawer>
    </div>
  );
}
