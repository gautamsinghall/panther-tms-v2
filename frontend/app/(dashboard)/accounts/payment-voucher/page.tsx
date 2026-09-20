"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, ArrowUpRight, Ban, CheckCircle, AlertCircle, Eye, Truck } from "lucide-react";
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

  // Standard Payment Drawer
  const [isStandardOpen, setIsStandardOpen] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [paymentMode, setPaymentMode] = useState<"BANK" | "CASH">("BANK");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ATH Drawer
  const [isAthOpen, setIsAthOpen] = useState(false);
  const [athChallanId, setAthChallanId] = useState("");
  const [athAmount, setAthAmount] = useState("");
  const [athMode, setAthMode] = useState<"BANK" | "CASH">("BANK");
  const [athNarration, setAthNarration] = useState("");

  // BTH Drawer
  const [isBthOpen, setIsBthOpen] = useState(false);
  const [bthChallanId, setBthChallanId] = useState("");
  const [bthAmount, setBthAmount] = useState("");
  const [bthMode, setBthMode] = useState<"BANK" | "CASH">("BANK");
  const [bthNarration, setBthNarration] = useState("");

  // Void Dialog
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  // View Ledger Drawer
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
      header: "Type",
      cell: (row) => {
        if (row.voucher_type === "ATH_PAYMENT") {
          return <Badge variant="warning" dot className="text-xs">ATH (Advance)</Badge>;
        }
        if (row.voucher_type === "BTH_PAYMENT") {
          return <Badge variant="success" dot className="text-xs">BTH (Balance)</Badge>;
        }
        return <Badge variant="primary" dot className="text-xs">Standard Payment</Badge>;
      },
    },
    {
      key: "party_name",
      header: "Beneficiary / Lorry",
      cell: (row) => (
        <div>
          <span className="font-medium text-[#101828]">
            {row.party_name || "Beneficiary"}
          </span>
          {row.hire_challan_number && (
            <span className="block font-mono text-[11px] text-[#4F46E5]">
              HC: {row.hire_challan_number}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "net_amount",
      header: "Amount Paid",
      isNumeric: true,
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-semibold tabular-nums text-[#B42318]">
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
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Accounts", href: "/accounts" },
          { label: "Payment Vouchers" },
        ]}
        title="Payment Vouchers & Lorry Settlements"
        description="Disburse vendor payments, advance truck hire payments (ATH), and final balance settlements (BTH) with automatic ledger postings."
        primaryAction={{
          label: "Standard Payment",
          icon: Plus,
          onClick: () => setIsStandardOpen(true),
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => setIsAthOpen(true)}
          variant="secondary"
          size="sm"
          className="gap-1.5 text-xs text-[#B54708] border-[#FEDF89] bg-[#FFFAEB] hover:bg-[#FEF0C7]"
        >
          <Truck className="w-3.5 h-3.5" />
          Pay ATH (Advance)
        </Button>
        <Button
          onClick={() => setIsBthOpen(true)}
          variant="secondary"
          size="sm"
          className="gap-1.5 text-xs text-[#027A48] border-[#A6F4C5] bg-[#ECFDF3] hover:bg-[#D1FADF]"
        >
          <Truck className="w-3.5 h-3.5" />
          Pay BTH (Balance)
        </Button>
      </div>

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
          All Payments ({data.length})
        </button>
        <button
          onClick={() => setActiveTab("ATH_PAYMENT")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "ATH_PAYMENT"
              ? "bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]"
              : "text-[#667085] hover:bg-[#F2F4F7]"
          }`}
        >
          ATH Advances ({data.filter((d) => d.voucher_type === "ATH_PAYMENT").length})
        </button>
        <button
          onClick={() => setActiveTab("BTH_PAYMENT")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "BTH_PAYMENT"
              ? "bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]"
              : "text-[#667085] hover:bg-[#F2F4F7]"
          }`}
        >
          BTH Balances ({data.filter((d) => d.voucher_type === "BTH_PAYMENT").length})
        </button>
        <button
          onClick={() => setActiveTab("PAYMENT_VOUCHER")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "PAYMENT_VOUCHER"
              ? "bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]"
              : "text-[#667085] hover:bg-[#F2F4F7]"
          }`}
        >
          Standard Payments ({data.filter((d) => d.voucher_type === "PAYMENT_VOUCHER").length})
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
        searchPlaceholder="Search beneficiary or voucher..."
        searchColumn="party_name"
        actions={actions}
      />

      {/* Standard Payment Drawer */}
      <EntityDrawer
        isOpen={isStandardOpen}
        onClose={() => setIsStandardOpen(false)}
        title="Record Standard Payment"
        subtitle="Disburse vendor or supplier payment voucher"
        size="md"
      >
        <form onSubmit={handleCreateStandardPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Paid To (Beneficiary Name) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Fuel Station / Office Landlord"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">
                Payment Channel *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] focus:border-[#4F46E5] focus:outline-none"
              >
                <option value="BANK">Bank Account (NEFT/RTGS/Cheque)</option>
                <option value="CASH">Cash in Hand</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">
                Amount Paid (₹) *
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
              Cheque / UTR / Reference Number
            </label>
            <input
              type="text"
              placeholder="e.g. UTR-98214221"
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
              placeholder="Payment particulars..."
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E4E7EC]">
            <Button type="button" variant="secondary" onClick={() => setIsStandardOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Record Payment
            </Button>
          </div>
        </form>
      </EntityDrawer>

      {/* ATH Drawer */}
      <EntityDrawer
        isOpen={isAthOpen}
        onClose={() => setIsAthOpen(false)}
        title="Pay ATH (Advance To Hired Vehicle)"
        subtitle="Disburse lorry advance against selected Hire Challan"
        size="md"
      >
        <form onSubmit={handleCreateAth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
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
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] focus:border-[#4F46E5] focus:outline-none"
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
              <label className="block text-xs font-semibold text-[#344054] mb-1">
                Payment Channel
              </label>
              <select
                value={athMode}
                onChange={(e) => setAthMode(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] focus:border-[#4F46E5] focus:outline-none"
              >
                <option value="BANK">Bank Account (NEFT/UPI)</option>
                <option value="CASH">Cash Advance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">
                Advance Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={athAmount}
                onChange={(e) => setAthAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] font-mono tabular-nums font-semibold focus:border-[#4F46E5] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Narration / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Advance release particulars..."
              value={athNarration}
              onChange={(e) => setAthNarration(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E4E7EC]">
            <Button type="button" variant="secondary" onClick={() => setIsAthOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Disburse ATH Advance
            </Button>
          </div>
        </form>
      </EntityDrawer>

      {/* BTH Drawer */}
      <EntityDrawer
        isOpen={isBthOpen}
        onClose={() => setIsBthOpen(false)}
        title="Pay BTH (Balance Settlement)"
        subtitle="Disburse final balance against delivered Hire Challan"
        size="md"
      >
        <form onSubmit={handleCreateBth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
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
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] focus:border-[#4F46E5] focus:outline-none"
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
              <label className="block text-xs font-semibold text-[#344054] mb-1">
                Payment Channel
              </label>
              <select
                value={bthMode}
                onChange={(e) => setBthMode(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] focus:border-[#4F46E5] focus:outline-none"
              >
                <option value="BANK">Bank Transfer (NEFT/RTGS)</option>
                <option value="CASH">Cash Settlement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">
                Balance Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={bthAmount}
                onChange={(e) => setBthAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] font-mono tabular-nums font-semibold focus:border-[#4F46E5] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Settlement Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Final settlement and POD clearance notes..."
              value={bthNarration}
              onChange={(e) => setBthNarration(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E7EC] bg-white text-[#101828] focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E4E7EC]">
            <Button type="button" variant="secondary" onClick={() => setIsBthOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Settle Lorry Hire Balance
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
        title={`Void Payment #${voidVoucherId}`}
        consequence="Voiding this payment voucher will post automatic reversing ledger entries per non-destructive audit rules."
        confirmLabel="Confirm Void"
        isLoading={isVoiding}
      />

      {/* Ledger Drawer */}
      <EntityDrawer
        isOpen={!!selectedVoucher}
        onClose={() => setSelectedVoucher(null)}
        title={`Double-Entry Ledger: ${selectedVoucher?.voucher_number}`}
        subtitle={`Beneficiary: ${selectedVoucher?.party_name} | Total: ₹${Number(selectedVoucher?.net_amount || 0).toFixed(2)}`}
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
