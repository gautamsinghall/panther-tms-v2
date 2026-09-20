"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, ShoppingCart, Ban, CheckCircle, AlertCircle, Eye } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [purchaseType, setPurchaseType] = useState<"NORMAL_PURCHASE" | "GENERAL_PURCHASE">("NORMAL_PURCHASE");
  const [vendorName, setVendorName] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
  const [narration, setNarration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Void Modal state
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

  const handleVoidVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
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
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            {row.voucher_number}
            {row.is_void && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded">
                VOIDED
              </span>
            )}
          </span>
          <span className="block text-[11px] text-slate-400">{row.voucher_date}</span>
        </div>
      ),
    },
    {
      key: "voucher_type",
      header: "Category",
      align: "center",
      cell: (row) => (
        <Badge variant={row.voucher_type === "NORMAL_PURCHASE" ? "primary" : "neutral"}>
          {row.voucher_type === "NORMAL_PURCHASE" ? "Operational / Spares" : "General Expense"}
        </Badge>
      ),
    },
    {
      key: "party_name",
      header: "Vendor / Supplier",
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {row.party_name || "Direct Vendor"}
          </span>
          {row.reference_number && (
            <span className="block font-mono text-[11px] text-slate-400">
              Bill Ref: {row.reference_number}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "net_amount",
      header: "Total Bill Amount",
      align: "right",
      sortable: true,
      cell: (row) => (
        <div className="text-right">
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            ₹{Number(row.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="block text-[11px] text-slate-400">
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
      variant: "default",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-[var(--color-primary)]" />
            Purchase Register
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track operational truck purchases (fuel, tyres, spare parts) and general overhead expenses with input tax credit (ITC) tracking.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Record Purchase Bill
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "ALL"
              ? "bg-[var(--color-primary)] text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          All Purchases ({data.length})
        </button>
        <button
          onClick={() => setActiveTab("NORMAL_PURCHASE")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "NORMAL_PURCHASE"
              ? "bg-[var(--color-primary)] text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          Operational / Spares ({data.filter((d) => d.voucher_type === "NORMAL_PURCHASE").length})
        </button>
        <button
          onClick={() => setActiveTab("GENERAL_PURCHASE")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "GENERAL_PURCHASE"
              ? "bg-[var(--color-primary)] text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          General & Admin ({data.filter((d) => d.voucher_type === "GENERAL_PURCHASE").length})
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          searchPlaceholder="Search vendor, bill ref..."
          searchColumn="party_name"
          actions={actions}
        />
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[var(--color-primary)]" />
                Record Purchase Bill
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Purchase Classification *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPurchaseType("NORMAL_PURCHASE")}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      purchaseType === "NORMAL_PURCHASE"
                        ? "border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)] dark:bg-blue-950"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Operational (Spares / Tyres)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurchaseType("GENERAL_PURCHASE")}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      purchaseType === "GENERAL_PURCHASE"
                        ? "border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)] dark:bg-blue-950"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    General Overhead / Admin
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vendor / Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MRF Tyres Distributor"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vendor Bill / Invoice Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-9022"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Taxable Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    GST Input Tax (ITC) (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Narration / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Purchase particulars..."
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Recording..." : "Record & Post"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {isVoidOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <Ban className="w-5 h-5" />
                Void Purchase #{voidVoucherId}
              </h3>
              <button onClick={() => setIsVoidOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVoidVoucher} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Voiding * (Min 10 chars)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this purchase bill is being voided..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsVoidOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" disabled={isVoiding || voidReason.trim().length < 10}>
                  {isVoiding ? "Voiding..." : "Confirm Void"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[var(--color-primary)]" />
                  Double-Entry Ledger: {selectedVoucher.voucher_number}
                </h3>
                <p className="text-xs text-slate-400">
                  Vendor: {selectedVoucher.party_name} | Total: ₹{Number(selectedVoucher.net_amount).toFixed(2)}
                </p>
              </div>
              <button onClick={() => setSelectedVoucher(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2.5">Account</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5 text-right">Debit (Dr)</th>
                      <th className="px-4 py-2.5 text-right">Credit (Cr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedVoucher.ledger_entries.map((entry) => (
                      <tr key={entry.id} className={entry.is_reversal ? "bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200" : ""}>
                        <td className="px-4 py-2.5 font-medium">
                          {entry.account_name || `Account #${entry.account_id}`}
                          {entry.is_reversal && (
                            <span className="ml-2 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                              [Reversal]
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">
                          {Number(entry.debit_amount) > 0 ? "Debit" : "Credit"}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-right">
                          {Number(entry.debit_amount) > 0 ? `₹${Number(entry.debit_amount).toFixed(2)}` : "-"}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-right">
                          {Number(entry.credit_amount) > 0 ? `₹${Number(entry.credit_amount).toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                    <tr>
                      <td colSpan={2} className="px-4 py-2.5 text-right">Balance Check:</td>
                      <td className="px-4 py-2.5 font-mono text-right text-emerald-600">
                        ₹{selectedVoucher.ledger_entries.reduce((sum, e) => sum + Number(e.debit_amount), 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-right text-emerald-600">
                        ₹{selectedVoucher.ledger_entries.reduce((sum, e) => sum + Number(e.credit_amount), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setSelectedVoucher(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
