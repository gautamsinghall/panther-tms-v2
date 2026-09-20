"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, ArrowUpRight, Ban, CheckCircle, AlertCircle, Eye, Truck } from "lucide-react";
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
  hire_challan_id?: number;
  hire_challan_number?: string;
  total_amount: string | number;
  net_amount: string | number;
  narration?: string;
  is_void: boolean;
  void_reason?: string;
  ledger_entries: LedgerEntry[];
  created_at: string;
}

interface HireChallanRecord {
  id: number;
  challan_number: string;
  vehicle_number: string;
  owner_name?: string;
  hire_rate: string | number;
  advance_amount: string | number;
  balance_amount: string | number;
  status: string;
}

export default function PaymentVoucherPage() {
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [challans, setChallans] = useState<HireChallanRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "PAYMENT_VOUCHER" | "ATH_PAYMENT" | "BTH_PAYMENT">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Standard Payment Modal
  const [isStandardOpen, setIsStandardOpen] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [paymentMode, setPaymentMode] = useState<"BANK" | "CASH">("BANK");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ATH Modal
  const [isAthOpen, setIsAthOpen] = useState(false);
  const [athChallanId, setAthChallanId] = useState("");
  const [athAmount, setAthAmount] = useState("");
  const [athMode, setAthMode] = useState<"BANK" | "CASH">("BANK");
  const [athNarration, setAthNarration] = useState("");

  // BTH Modal
  const [isBthOpen, setIsBthOpen] = useState(false);
  const [bthChallanId, setBthChallanId] = useState("");
  const [bthAmount, setBthAmount] = useState("");
  const [bthMode, setBthMode] = useState<"BANK" | "CASH">("BANK");
  const [bthNarration, setBthNarration] = useState("");

  // Void Modal
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  // View Ledger Modal
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [stdRes, athRes, bthRes, hcRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=PAYMENT_VOUCHER"),
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=ATH_PAYMENT"),
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=BTH_PAYMENT"),
        apiClient<HireChallanRecord[]>("/api/v1/transport/hire-challans"),
      ]);
      setData([...stdRes, ...athRes, ...bthRes]);
      setChallans(hcRes);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load payment vouchers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateStandardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) {
      alert("Payment amount must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/accounts/vouchers", {
        method: "POST",
        body: JSON.stringify({
          voucher_type: "PAYMENT_VOUCHER",
          party_name: partyName.trim(),
          reference_number: referenceNumber.trim() || undefined,
          total_amount: amt,
          tax_amount: 0,
          net_amount: amt,
          narration: `Mode: ${paymentMode}. ${narration.trim()}`.trim(),
        }),
      });
      setSuccessMessage("Payment Voucher created and posted to ledger!");
      setIsStandardOpen(false);
      setPartyName("");
      setReferenceNumber("");
      setAmount("");
      setNarration("");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create payment voucher.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAth = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(athAmount) || 0;
    if (!athChallanId || amt <= 0) {
      alert("Please select a valid Hire Challan and enter an amount.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/accounts/payments/ath", {
        method: "POST",
        body: JSON.stringify({
          hire_challan_id: parseInt(athChallanId, 10),
          amount: amt,
          payment_mode: athMode,
          narration: athNarration.trim() || undefined,
        }),
      });
      setSuccessMessage("ATH (Advance To Hired) payment voucher posted!");
      setIsAthOpen(false);
      setAthChallanId("");
      setAthAmount("");
      setAthNarration("");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to post ATH payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBth = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(bthAmount) || 0;
    if (!bthChallanId || amt <= 0) {
      alert("Please select a valid Hire Challan and enter an amount.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/accounts/payments/bth", {
        method: "POST",
        body: JSON.stringify({
          hire_challan_id: parseInt(bthChallanId, 10),
          amount: amt,
          payment_mode: bthMode,
          narration: bthNarration.trim() || undefined,
        }),
      });
      setSuccessMessage("BTH (Balance To Hired) payment voucher posted and Hire Challan settled!");
      setIsBthOpen(false);
      setBthChallanId("");
      setBthAmount("");
      setBthNarration("");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to post BTH payment.");
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
      setSuccessMessage(`Payment Voucher #${voidVoucherId} has been voided.`);
      setIsVoidOpen(false);
      setVoidReason("");
      setVoidVoucherId(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to void payment voucher.");
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
      header: "Payment No / Date",
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
      header: "Type",
      align: "center",
      cell: (row) => {
        if (row.voucher_type === "ATH_PAYMENT") {
          return <Badge variant="warning">ATH (Advance)</Badge>;
        }
        if (row.voucher_type === "BTH_PAYMENT") {
          return <Badge variant="success">BTH (Balance)</Badge>;
        }
        return <Badge variant="primary">Standard Payment</Badge>;
      },
    },
    {
      key: "party_name",
      header: "Beneficiary / Lorry",
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {row.party_name || "Beneficiary"}
          </span>
          {row.hire_challan_number && (
            <span className="block font-mono text-[11px] text-blue-600 dark:text-blue-400">
              HC: {row.hire_challan_number}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "net_amount",
      header: "Amount Paid",
      align: "right",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
          ₹{Number(row.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
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
      label: "Void Payment",
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
            <ArrowUpRight className="w-6 h-6 text-rose-600" />
            Payment Vouchers & Lorry Settlements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Disburse vendor payments, advance truck hire payments (ATH), and final balance settlements (BTH) with automatic double-entry ledger postings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setIsAthOpen(true)} variant="outline" className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30">
            <Truck className="w-4 h-4" />
            Pay ATH (Advance)
          </Button>
          <Button onClick={() => setIsBthOpen(true)} variant="outline" className="gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
            <Truck className="w-4 h-4" />
            Pay BTH (Balance)
          </Button>
          <Button onClick={() => setIsStandardOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Standard Payment
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
          All Payments ({data.length})
        </button>
        <button
          onClick={() => setActiveTab("ATH_PAYMENT")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "ATH_PAYMENT"
              ? "bg-[var(--color-primary)] text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          ATH Advances ({data.filter((d) => d.voucher_type === "ATH_PAYMENT").length})
        </button>
        <button
          onClick={() => setActiveTab("BTH_PAYMENT")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "BTH_PAYMENT"
              ? "bg-[var(--color-primary)] text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          BTH Balances ({data.filter((d) => d.voucher_type === "BTH_PAYMENT").length})
        </button>
        <button
          onClick={() => setActiveTab("PAYMENT_VOUCHER")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "PAYMENT_VOUCHER"
              ? "bg-[var(--color-primary)] text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          Standard Payments ({data.filter((d) => d.voucher_type === "PAYMENT_VOUCHER").length})
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
          searchPlaceholder="Search beneficiary or voucher..."
          searchColumn="party_name"
          actions={actions}
        />
      </div>

      {/* Standard Payment Modal */}
      {isStandardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-rose-600" />
                Record Standard Payment
              </h3>
              <button onClick={() => setIsStandardOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStandardPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Paid To (Beneficiary Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fuel Station / Office Landlord"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Channel *
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="BANK">Bank Account (NEFT/RTGS/Cheque)</option>
                    <option value="CASH">Cash in Hand</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount Paid (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cheque / UTR / Reference Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-98214221"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Narration / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Payment particulars..."
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsStandardOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Disbursing..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATH Modal */}
      {isAthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Pay ATH (Advance To Hired Vehicle)
              </h3>
              <button onClick={() => setIsAthOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAth} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Hire Challan *
                </label>
                <select
                  required
                  value={athChallanId}
                  onChange={(e) => {
                    setAthChallanId(e.target.value);
                    const selected = challans.find((c) => c.id.toString() === e.target.value);
                    if (selected) {
                      setAthAmount(selected.advance_amount?.toString() || "");
                    }
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Choose Hire Challan --</option>
                  {challans.map((hc) => (
                    <option key={hc.id} value={hc.id}>
                      {hc.challan_number} — {hc.vehicle_number} ({hc.owner_name || "Owner"}) — Adv: ₹{Number(hc.advance_amount || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Channel
                  </label>
                  <select
                    value={athMode}
                    onChange={(e) => setAthMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="BANK">Bank Account (NEFT/UPI)</option>
                    <option value="CASH">Cash Advance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Advance Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={athAmount}
                    onChange={(e) => setAthAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Narration / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Advance release particulars..."
                  value={athNarration}
                  onChange={(e) => setAthNarration(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsAthOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Posting..." : "Disburse ATH Advance"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BTH Modal */}
      {isBthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Pay BTH (Balance To Hired Vehicle Settlement)
              </h3>
              <button onClick={() => setIsBthOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBth} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Hire Challan *
                </label>
                <select
                  required
                  value={bthChallanId}
                  onChange={(e) => {
                    setBthChallanId(e.target.value);
                    const selected = challans.find((c) => c.id.toString() === e.target.value);
                    if (selected) {
                      setBthAmount(selected.balance_amount?.toString() || "");
                    }
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Choose Hire Challan --</option>
                  {challans.map((hc) => (
                    <option key={hc.id} value={hc.id}>
                      {hc.challan_number} — {hc.vehicle_number} — Bal: ₹{Number(hc.balance_amount || 0).toFixed(2)} ({hc.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Channel
                  </label>
                  <select
                    value={bthMode}
                    onChange={(e) => setBthMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="BANK">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CASH">Cash Settlement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Balance Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={bthAmount}
                    onChange={(e) => setBthAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Settlement Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Final settlement and POD clearance notes..."
                  value={bthNarration}
                  onChange={(e) => setBthNarration(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsBthOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Settling..." : "Settle Lorry Hire Balance"}
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
                Void Payment #{voidVoucherId}
              </h3>
              <button onClick={() => setIsVoidOpen(false)} className="text-slate-400 hover:text-slate-600">
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
                  placeholder="Explain why this payment voucher is being reversed..."
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
                  {isVoiding ? "Voiding..." : "Confirm Void Entry"}
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
                  <ArrowUpRight className="w-5 h-5 text-rose-600" />
                  Double-Entry Ledger: {selectedVoucher.voucher_number}
                </h3>
                <p className="text-xs text-slate-400">
                  Beneficiary: {selectedVoucher.party_name} | Total: ₹{Number(selectedVoucher.net_amount).toFixed(2)}
                </p>
              </div>
              <button onClick={() => setSelectedVoucher(null)} className="text-slate-400 hover:text-slate-600">
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
                            <span className="ml-2 text-[10px] font-bold text-rose-600 uppercase">
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
