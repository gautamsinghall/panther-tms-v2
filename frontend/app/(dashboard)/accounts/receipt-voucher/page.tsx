"use client";
import { toast } from "@/lib/toast";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  ArrowDownLeft,
  Ban,
  CheckCircle,
  AlertCircle,
  Eye,
  Printer,
  FileSpreadsheet,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  TrendingUp,
  Percent,
  Layers,
  Search,
  X,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Clock,
  Check,
} from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormActionBar } from "@/components/ui/form-action-bar";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import { getActiveOffice } from "@/lib/auth";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

// Indian Rupees Number to Words
function numberToWords(num: number): string {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const n = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - n) * 100);
  if (n === 0 && paise === 0) return "Zero Rupees Only";

  const inWords = (val: number): string => {
    let str = "";
    if (val >= 10000000) {
      str += inWords(Math.floor(val / 10000000)) + "Crore ";
      val %= 10000000;
    }
    if (val >= 100000) {
      str += inWords(Math.floor(val / 100000)) + "Lakh ";
      val %= 100000;
    }
    if (val >= 1000) {
      str += inWords(Math.floor(val / 1000)) + "Thousand ";
      val %= 1000;
    }
    if (val >= 100) {
      str += inWords(Math.floor(val / 100)) + "Hundred ";
      val %= 100;
    }
    if (val > 0) {
      if (val < 20) str += a[val];
      else {
        str += b[Math.floor(val / 10)] + " ";
        if (val % 10) str += a[val % 10];
      }
    }
    return str;
  };

  let res = "";
  if (n > 0) {
    res = `Rupees ${inWords(n).trim()}`;
  }
  if (paise > 0) {
    res += `${res ? " and " : ""}${inWords(paise).trim()} Paise`;
  }
  return (res + " Only").trim();
}

interface BillAllocationItem {
  id: number;
  voucher_id: number;
  invoice_id: number;
  allocated_amount: number | string;
  tds_amount: number | string;
  discount_amount: number | string;
  total_settled: number | string;
  adjustment_type: string;
  notes?: string;
  created_at: string;
  voucher_number?: string;
  invoice_number?: string;
}

interface LedgerEntry {
  id: number;
  account_id: number;
  account_name?: string;
  debit_amount: string | number;
  credit_amount: string | number;
  is_reversal: boolean;
  narration?: string;
}

interface VoucherRecord {
  id: number;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  party_name?: string;
  party_gstin?: string;
  reference_number?: string;
  reference_date?: string;
  total_amount: string | number;
  tax_amount: string | number;
  net_amount: string | number;
  paid_amount?: string | number;
  balance_amount?: string | number;
  payment_status?: string;
  billing_client_id?: number;
  billing_client_name?: string;
  due_date?: string;
  narration?: string;
  is_void: boolean;
  void_reason?: string;
  tax_breakup?: Record<string, any>;
  ledger_entries: LedgerEntry[];
  bill_allocations?: BillAllocationItem[];
  created_at: string;
}

interface BillingClientOption {
  id: number;
  name: string;
  gstin?: string;
  pan?: string;
  tds_rate?: number;
  state?: string;
}

interface AccountOption {
  id: number;
  name: string;
  code: string;
  group_name?: string;
}

interface OpenInvoice {
  id: number;
  voucher_number: string;
  voucher_date: string;
  voucher_type: string;
  total_amount: number;
  net_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date?: string;
  lr_number?: string;
  party_name?: string;
  gst_treatment?: string;
  days_overdue?: number;
}

interface AllocationRow {
  invoice_id: number;
  invoice_number: string;
  voucher_date: string;
  voucher_type: string;
  balance_amount: number;
  days_overdue?: number;
  allocated_amount: string;
  tds_amount: string;
  discount_amount: string;
}

export default function ReceiptVoucherPage() {
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Masters
  const [billingClients, setBillingClients] = useState<BillingClientOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<AccountOption[]>([]);
  const [seriesInfo, setSeriesInfo] = useState<any>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<string>("ALL");
  const [filterReceiptType, setFilterReceiptType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Drawer 1: Record Customer Receipt
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [customPartyName, setCustomPartyName] = useState<string>("");
  const [receiptType, setReceiptType] = useState<"AGAINST_REF" | "ADVANCE" | "ON_ACCOUNT">("AGAINST_REF");
  const [paymentMode, setPaymentMode] = useState<string>("BANK");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [voucherDate, setVoucherDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [chequeNumber, setChequeNumber] = useState<string>("");
  const [chequeDate, setChequeDate] = useState<string>("");
  const [chequeBank, setChequeBank] = useState<string>("");
  const [clearanceStatus, setClearanceStatus] = useState<string>("CLEARED");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [tdsSection, setTdsSection] = useState<string>("194C");
  const [tdsRate, setTdsRate] = useState<string>("2");
  const [tdsAmount, setTdsAmount] = useState<string>("0");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [narration, setNarration] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client's open invoices for bill-wise allocation
  const [clientOpenInvoices, setClientOpenInvoices] = useState<OpenInvoice[]>([]);
  const [allocations, setAllocations] = useState<Record<number, AllocationRow>>({});
  const [isLoadingOpenInvoices, setIsLoadingOpenInvoices] = useState(false);

  // Drawer 2: View Voucher Details & Ledger
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  // Modal 3: Print Receipt Voucher
  const [printVoucher, setPrintVoucher] = useState<VoucherRecord | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Modal 4: Void Receipt
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidVoucherNumber, setVoidVoucherNumber] = useState<string>("");
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const activeOffice = getActiveOffice();
      const officeParam = activeOffice?.id ? `?office_id=${activeOffice.id}` : "";

      const [vouchersRes, sInfo, clientsRes, accountsRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=RECEIPT_VOUCHER"),
        apiClient<any>(`/api/v1/settings/series/check/RECEIPT_VOUCHER${officeParam}`).catch(() => null),
        apiClient<BillingClientOption[]>("/api/v1/general/billing-clients").catch(() => []),
        apiClient<AccountOption[]>("/api/v1/misc/accounts").catch(() => []),
      ]);

      setData(vouchersRes);
      setSeriesInfo(sInfo);
      setBillingClients(clientsRes);
      
      // Filter bank and cash accounts
      const liquidAccounts = accountsRes.filter((a) => {
        const name = (a.name || "").toLowerCase();
        const code = (a.code || "").toUpperCase();
        return code.includes("BANK") || code.includes("CASH") || name.includes("bank") || name.includes("cash");
      });
      setBankAccounts(liquidAccounts.length > 0 ? liquidAccounts : accountsRes);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load receipt vouchers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When selected client changes in create drawer, fetch open invoices
  useEffect(() => {
    if (!selectedClientId) {
      setClientOpenInvoices([]);
      setAllocations({});
      return;
    }

    const clientIdNum = parseInt(selectedClientId);
    if (!clientIdNum) return;

    // Auto-detect client default TDS rate
    const cl = billingClients.find((c) => c.id === clientIdNum);
    if (cl && cl.tds_rate !== undefined && cl.tds_rate !== null) {
      setTdsRate(String(cl.tds_rate));
    }

    setIsLoadingOpenInvoices(true);
    apiClient<OpenInvoice[]>(`/api/v1/accounts/billing-clients/${clientIdNum}/open-invoices`)
      .then((res) => {
        setClientOpenInvoices(res);
        // Pre-populate empty allocation rows
        const initialAlloc: Record<number, AllocationRow> = {};
        res.forEach((inv) => {
          initialAlloc[inv.id] = {
            invoice_id: inv.id,
            invoice_number: inv.voucher_number,
            voucher_date: inv.voucher_date,
            voucher_type: inv.voucher_type,
            balance_amount: inv.balance_amount,
            days_overdue: inv.days_overdue,
            allocated_amount: "",
            tds_amount: "",
            discount_amount: "",
          };
        });
        setAllocations(initialAlloc);
      })
      .catch((err) => {
        toast.error("Could not fetch open invoices: " + (err.message || "Unknown error"));
        setClientOpenInvoices([]);
        setAllocations({});
      })
      .finally(() => {
        setIsLoadingOpenInvoices(false);
      });
  }, [selectedClientId, billingClients]);

  // Handle quick "Pay Full" for an invoice row
  const handlePayFullInvoice = (inv: OpenInvoice) => {
    const bal = inv.balance_amount;
    const rateNum = parseFloat(tdsRate) || 0;
    let autoTds = 0;
    let netPay = bal;

    if (rateNum > 0) {
      autoTds = Math.round((bal * (rateNum / 100)) * 100) / 100;
      netPay = bal - autoTds;
    }

    setAllocations((prev) => ({
      ...prev,
      [inv.id]: {
        ...prev[inv.id],
        allocated_amount: netPay.toFixed(2),
        tds_amount: autoTds > 0 ? autoTds.toFixed(2) : "0",
        discount_amount: "0",
      },
    }));

    // Update global received amount if currently 0
    const currentRecv = parseFloat(amountReceived) || 0;
    if (currentRecv === 0) {
      setAmountReceived(netPay.toFixed(2));
      setTdsAmount(autoTds > 0 ? autoTds.toFixed(2) : "0");
    }
  };

  // Compute live totals from bill allocation table
  const allocatedTotals = useMemo(() => {
    let sumNet = 0;
    let sumTds = 0;
    let sumDisc = 0;
    let sumTotal = 0;
    let countActive = 0;

    Object.values(allocations).forEach((a) => {
      const net = parseFloat(a.allocated_amount) || 0;
      const tds = parseFloat(a.tds_amount) || 0;
      const disc = parseFloat(a.discount_amount) || 0;
      const tot = net + tds + disc;
      if (tot > 0) {
        sumNet += net;
        sumTds += tds;
        sumDisc += disc;
        sumTotal += tot;
        countActive += 1;
      }
    });

    return {
      sumNet: Math.round(sumNet * 100) / 100,
      sumTds: Math.round(sumTds * 100) / 100,
      sumDisc: Math.round(sumDisc * 100) / 100,
      sumTotal: Math.round(sumTotal * 100) / 100,
      countActive,
    };
  }, [allocations]);

  // Compute live unapplied advance / excess
  const unappliedAdvance = useMemo(() => {
    const recv = parseFloat(amountReceived) || 0;
    if (receiptType === "AGAINST_REF") {
      return Math.max(0, Math.round((recv - allocatedTotals.sumNet) * 100) / 100);
    }
    return recv;
  }, [amountReceived, allocatedTotals.sumNet, receiptType]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const nonVoid = data.filter((v) => !v.is_void);
    const totalReceipts = nonVoid.reduce((acc, v) => acc + (parseFloat(String(v.net_amount)) || 0), 0);
    const totalTds = nonVoid.reduce((acc, v) => {
      const tb = v.tax_breakup || {};
      return acc + (parseFloat(String(tb.tds_amount)) || 0);
    }, 0);
    const totalAdvances = nonVoid.reduce((acc, v) => {
      const tb = v.tax_breakup || {};
      const unapplied = parseFloat(String(tb.unapplied_advance_amount)) || 0;
      if (tb.receipt_type === "ADVANCE") {
        return acc + (parseFloat(String(v.net_amount)) || 0);
      }
      return acc + unapplied;
    }, 0);
    const totalSettledBills = nonVoid.reduce((acc, v) => {
      const allocs = v.bill_allocations || [];
      return acc + allocs.reduce((a2, b) => a2 + (parseFloat(String(b.total_settled)) || 0), 0);
    }, 0);

    return {
      totalReceipts,
      totalTds,
      totalAdvances,
      totalSettledBills,
      totalCount: nonVoid.length,
    };
  }, [data]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (v.voucher_number || "").toLowerCase().includes(q) ||
        (v.party_name || "").toLowerCase().includes(q) ||
        (v.reference_number || "").toLowerCase().includes(q) ||
        (v.narration || "").toLowerCase().includes(q);

      const tb = v.tax_breakup || {};
      const mode = (tb.payment_mode || "BANK").toUpperCase();
      const matchMode =
        filterMode === "ALL" ||
        (filterMode === "BANK" && ["BANK", "NEFT", "RTGS", "IMPS"].includes(mode)) ||
        (filterMode === "CHEQUE" && mode === "CHEQUE") ||
        (filterMode === "CASH" && mode === "CASH") ||
        (filterMode === "UPI" && mode === "UPI");

      const rType = (tb.receipt_type || "AGAINST_REF").toUpperCase();
      const matchType = filterReceiptType === "ALL" || rType === filterReceiptType;

      const matchStatus =
        filterStatus === "ALL" ||
        (filterStatus === "CLEARED" && !v.is_void && v.payment_status === "PAID") ||
        (filterStatus === "PENDING" && !v.is_void && v.payment_status === "PENDING") ||
        (filterStatus === "VOID" && v.is_void);

      return matchQuery && matchMode && matchType && matchStatus;
    });
  }, [data, searchQuery, filterMode, filterReceiptType, filterStatus]);

  // Reset Create Form
  const resetCreateForm = () => {
    setSelectedClientId("");
    setCustomPartyName("");
    setReceiptType("AGAINST_REF");
    setPaymentMode("BANK");
    setBankAccountId("");
    setVoucherDate(new Date().toISOString().split("T")[0]);
    setReferenceNumber("");
    setChequeNumber("");
    setChequeDate("");
    setChequeBank("");
    setClearanceStatus("CLEARED");
    setAmountReceived("");
    setTdsSection("194C");
    setTdsRate("2");
    setTdsAmount("0");
    setDiscountAmount("0");
    setNarration("");
    setClientOpenInvoices([]);
    setAllocations({});
  };

  // Submit Receipt Voucher
  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesInfo?.configured) {
      toast.error(
        "Receipt Voucher series is not configured for this office. Please set up Series Master under Settings > Series Master."
      );
      return;
    }

    const netReceived = parseFloat(amountReceived) || 0;
    if (netReceived <= 0) {
      toast.warning("Please enter a valid amount received greater than ₹0.");
      return;
    }

    if (!selectedClientId && !customPartyName.trim()) {
      toast.warning("Please select a Billing Client or enter customer name.");
      return;
    }

    // Build allocation payload
    const activeAllocations = Object.values(allocations)
      .filter((a) => {
        const net = parseFloat(a.allocated_amount) || 0;
        const tds = parseFloat(a.tds_amount) || 0;
        const disc = parseFloat(a.discount_amount) || 0;
        return net + tds + disc > 0;
      })
      .map((a) => ({
        invoice_id: a.invoice_id,
        allocated_amount: parseFloat(a.allocated_amount) || 0,
        tds_amount: parseFloat(a.tds_amount) || 0,
        discount_amount: parseFloat(a.discount_amount) || 0,
        total_settled: (parseFloat(a.allocated_amount) || 0) + (parseFloat(a.tds_amount) || 0) + (parseFloat(a.discount_amount) || 0),
        invoice_number: a.invoice_number,
      }));

    if (receiptType === "AGAINST_REF" && activeAllocations.length === 0 && clientOpenInvoices.length > 0) {
      toast.warning("You selected 'Against Bills / Invoices'. Please allocate payment to at least one open bill, or change type to 'Customer Advance'.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        billing_client_id: selectedClientId ? parseInt(selectedClientId) : undefined,
        party_name: customPartyName.trim() || undefined,
        voucher_date: voucherDate,
        receipt_type: receiptType,
        payment_mode: paymentMode,
        bank_account_id: bankAccountId ? parseInt(bankAccountId) : undefined,
        reference_number: referenceNumber.trim() || chequeNumber.trim() || undefined,
        cheque_number: chequeNumber.trim() || undefined,
        cheque_date: chequeDate || undefined,
        cheque_bank: chequeBank.trim() || undefined,
        clearance_status: clearanceStatus,
        amount: netReceived,
        tds_section: tdsSection,
        tds_rate: parseFloat(tdsRate) || 0,
        tds_amount: receiptType === "AGAINST_REF" ? allocatedTotals.sumTds : (parseFloat(tdsAmount) || 0),
        discount_amount: receiptType === "AGAINST_REF" ? allocatedTotals.sumDisc : (parseFloat(discountAmount) || 0),
        allocations: activeAllocations,
        unapplied_advance_amount: unappliedAdvance,
        narration: narration.trim() || undefined,
      };

      await apiClient("/api/v1/accounts/receipt-vouchers", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Receipt Voucher posted successfully with balanced double-entry entries!");
      setIsCreateOpen(false);
      resetCreateForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to post receipt voucher.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Void Handler
  const handleVoidVoucher = async () => {
    if (!voidVoucherId || !voidReason.trim() || voidReason.trim().length < 5) {
      toast.warning("Please provide a meaningful audit void reason (minimum 5 characters).");
      return;
    }

    setIsVoiding(true);
    try {
      await apiClient(`/api/v1/accounts/vouchers/${voidVoucherId}/void`, {
        method: "POST",
        body: JSON.stringify({ void_reason: voidReason.trim() }),
      });
      toast.success(`Voucher ${voidVoucherNumber} voided and invoice balances restored successfully.`);
      setIsVoidOpen(false);
      setVoidVoucherId(null);
      setVoidReason("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to void voucher.");
    } finally {
      setIsVoiding(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.warning("No records to export.");
      return;
    }
    const headers = [
      "Receipt Number",
      "Date",
      "Customer / Payer",
      "GSTIN",
      "Payment Mode",
      "Reference / Cheque No",
      "Receipt Type",
      "Net Received (₹)",
      "TDS Deducted (₹)",
      "Discount Allowed (₹)",
      "Total Settlement Value (₹)",
      "Status",
      "Narration",
    ];
    const rows = filteredData.map((v) => {
      const tb = v.tax_breakup || {};
      return [
        v.voucher_number,
        v.voucher_date,
        `"${(v.party_name || "").replace(/"/g, '""')}"`,
        v.party_gstin || "",
        tb.payment_mode || "BANK",
        v.reference_number || tb.cheque_number || "",
        tb.receipt_type || "AGAINST_REF",
        parseFloat(String(v.net_amount)) || 0,
        parseFloat(String(tb.tds_amount)) || 0,
        parseFloat(String(tb.discount_amount)) || 0,
        parseFloat(String(v.total_amount)) || 0,
        v.is_void ? "VOID" : (v.payment_status || "PAID"),
        `"${(v.narration || "").replace(/"/g, '""')}"`,
      ].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Receipt_Vouchers_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export downloaded successfully.");
  };

  // Table Column Definitions
  const columns: ColumnDef<VoucherRecord>[] = [
    {
      key: "voucher_number",
      label: "Receipt No & Date",
      sortable: true,
      render: (v) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 font-mono">
            <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            {v.voucher_number}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" />
            {formatDate(v.voucher_date)}
          </span>
        </div>
      ),
    },
    {
      key: "party_name",
      label: "Received From (Customer)",
      sortable: true,
      render: (v) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate" title={v.party_name || "Direct Customer"}>
            {v.party_name || "Direct Customer"}
          </span>
          {v.party_gstin && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              GST: {v.party_gstin}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "payment_mode",
      label: "Payment Mode & Ref",
      render: (v) => {
        const tb = v.tax_breakup || {};
        const mode = tb.payment_mode || "BANK";
        const ref = v.reference_number || tb.cheque_number;
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase",
                mode === "CASH" ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/60" :
                mode === "CHEQUE" ? "bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800/60" :
                "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800/60"
              )}>
                {mode}
              </span>
              {tb.clearance_status === "PENDING" && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Pending Clear</span>
              )}
            </div>
            {ref && (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono mt-0.5 truncate max-w-[130px]" title={ref}>
                Ref: {ref}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "receipt_type",
      label: "Receipt Type",
      render: (v) => {
        const tb = v.tax_breakup || {};
        const rType = tb.receipt_type || "AGAINST_REF";
        const allocCount = (v.bill_allocations || []).length;
        if (rType === "ADVANCE") {
          return (
            <Badge variant="outline" className="bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60 text-[11px]">
              Customer Advance
            </Badge>
          );
        }
        if (rType === "ON_ACCOUNT") {
          return (
            <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60 text-[11px]">
              On Account
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 text-[11px]">
            Against Bills ({allocCount})
          </Badge>
        );
      },
    },
    {
      key: "net_amount",
      label: "Money Received",
      sortable: true,
      render: (v) => (
        <div className="flex flex-col text-right">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatCurrency(v.net_amount)}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Net in Bank/Cash</span>
        </div>
      ),
    },
    {
      key: "deductions",
      label: "TDS / Discount",
      render: (v) => {
        const tb = v.tax_breakup || {};
        const tds = parseFloat(String(tb.tds_amount)) || 0;
        const disc = parseFloat(String(tb.discount_amount)) || 0;
        if (tds === 0 && disc === 0) {
          return <span className="text-xs text-slate-500 dark:text-slate-400">—</span>;
        }
        return (
          <div className="flex flex-col text-xs">
            {tds > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-mono">
                TDS: {formatCurrency(tds)} <span className="text-[10px] text-slate-500 dark:text-slate-400">({tb.tds_section || "194C"})</span>
              </span>
            )}
            {disc > 0 && (
              <span className="text-blue-600 dark:text-blue-400 font-mono">
                Disc: {formatCurrency(disc)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "total_amount",
      label: "Settlement Value",
      sortable: true,
      render: (v) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
          {formatCurrency(v.total_amount)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => {
        if (v.is_void) {
          return <StatusBadge status="VOID" customLabel="VOIDED" />;
        }
        if (v.payment_status === "PENDING") {
          return (
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 text-[11px] flex items-center gap-1">
              <Clock className="h-3 w-3" /> In Clearance
            </Badge>
          );
        }
        return <StatusBadge status="CLEARED" customLabel="CLEARED" />;
      },
    },
  ];

  // Table Row Actions
  const actions: RowAction<VoucherRecord>[] = [
    {
      label: "View Journal & Allocations",
      icon: <Eye className="h-4 w-4 text-cyan-400" />,
      onClick: (v) => {
        setSelectedVoucher(v);
        setIsLedgerOpen(true);
      },
    },
    {
      label: "Print Receipt Voucher",
      icon: <Printer className="h-4 w-4 text-emerald-400" />,
      onClick: (v) => {
        setPrintVoucher(v);
        setIsPrintModalOpen(true);
      },
    },
    {
      label: "Void Voucher (Reverse)",
      icon: <Ban className="h-4 w-4 text-rose-400" />,
      onClick: (v) => {
        setVoidVoucherId(v.id);
        setVoidVoucherNumber(v.voucher_number);
        setVoidReason("");
        setIsVoidOpen(true);
      },
      danger: true,
      hidden: (v) => v.is_void,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Series Warning Banner */}
      {seriesInfo && !seriesInfo.configured && (
        <div className="rounded-lg border border-amber-600/50 bg-amber-950/20 p-4 text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Series Configuration Warning</p>
              <p className="text-xs text-amber-400/90 mt-0.5">
                No active sequence series is configured for Receipt Vouchers (RV). Please configure or import the series in Settings &gt; Series Master.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-600 text-amber-300 hover:bg-amber-900/40 shrink-0"
            onClick={() => window.location.href = "/settings/series"}
          >
            Configure Series
          </Button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Receipt Vouchers"
        description="Double-entry customer collections, multi-invoice bill-wise settlements, TDS deductions (Sec 194C/194J), and customer advances."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#17171B] hover:bg-slate-50 dark:hover:bg-[#202025] text-slate-700 dark:text-slate-300 rounded-xl shadow-2xs font-medium"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-400" />
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => {
                resetCreateForm();
                setIsCreateOpen(true);
              }}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white shadow-xs font-semibold rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Record Customer Receipt
            </Button>
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Received"
          value={formatCurrency(kpis.totalReceipts)}
          subtext="Net funds credited into Bank/Cash"
          badge={<span className="text-[11px] text-slate-500 font-medium">({kpis.totalCount} receipts)</span>}
          icon={<Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
        />
        <KpiCard
          title="Invoices Settled"
          value={formatCurrency(kpis.totalSettledBills)}
          subtext="Applied against debtors receivables"
          icon={<FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
        />
        <KpiCard
          title="Customer Advances"
          value={formatCurrency(kpis.totalAdvances)}
          subtext="Unapplied receipts / credit liability"
          icon={<TrendingUp className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
        />
        <KpiCard
          title="TDS Receivable"
          value={formatCurrency(kpis.totalTds)}
          subtext="Sec 194C / 194J tax credits (Form 26AS)"
          icon={<Percent className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
        />
      </div>
      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search voucher #, customer name, cheque/ref #, narration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-[#F5F5F7] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Payment Mode Filter */}
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="bg-white dark:bg-[#0E0F15] border border-slate-200 dark:border-[#2B2E42] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
            >
              <option value="ALL">All Payment Modes</option>
              <option value="BANK">Bank Transfer / NEFT / RTGS</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
            </select>

            {/* Receipt Type Filter */}
            <select
              value={filterReceiptType}
              onChange={(e) => setFilterReceiptType(e.target.value)}
              className="bg-white dark:bg-[#0E0F15] border border-slate-200 dark:border-[#2B2E42] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
            >
              <option value="ALL">All Receipt Types</option>
              <option value="AGAINST_REF">Against Bills (Settlement)</option>
              <option value="ADVANCE">Customer Advance</option>
              <option value="ON_ACCOUNT">On Account</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white dark:bg-[#0E0F15] border border-slate-200 dark:border-[#2B2E42] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="CLEARED">Cleared / Posted</option>
              <option value="PENDING">Pending Clearance</option>
              <option value="VOID">Voided / Reversed</option>
            </select>

            {(searchQuery || filterMode !== "ALL" || filterReceiptType !== "ALL" || filterStatus !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilterMode("ALL");
                  setFilterReceiptType("ALL");
                  setFilterStatus("ALL");
                }}
                className="text-xs text-slate-400 hover:text-slate-800 dark:text-slate-200"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        actions={actions}
        searchable={false}
        emptyState={
          <div className="py-12 text-center">
            <ArrowDownLeft className="h-10 w-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Receipt Vouchers found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Click &quot;Record Customer Receipt&quot; to post a customer collection with bill-wise settlement.
            </p>
            <Button
              size="sm"
              onClick={() => {
                resetCreateForm();
                setIsCreateOpen(true);
              }}
              className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Record Customer Receipt
            </Button>
          </div>
        }
      />

      {/* DRAWER 1: Record Customer Receipt (Friendly & Intuitive) */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Record Customer Receipt (Money In)"
        description="Enter payment details received from your customer. Distribute across open invoices or record as an advance deposit."
        size="xl"
      >
        <form onSubmit={handleCreateReceipt} className="space-y-6 pb-20">
          {/* Step 1: Who paid the money? */}
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950 border border-emerald-700 text-xs text-emerald-300">
                1
              </span>
              Who Paid You The Money? (Customer)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                  Select Billing Client <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    if (e.target.value) setCustomPartyName("");
                  }}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                >
                  <option value="">-- Choose Corporate / Billing Client --</option>
                  {billingClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.gstin ? `(${c.gstin})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Selecting a client automatically loads all unpaid transport and sales invoices.
                </p>
              </div>

              {!selectedClientId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                    Or Enter Direct Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shyam Logistics / Cash Customer"
                    value={customPartyName}
                    onChange={(e) => setCustomPartyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                  Receipt Type / Treatment
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReceiptType("AGAINST_REF")}
                    className={cn(
                      "py-2 px-3 text-xs rounded-lg font-medium border text-center transition-all",
                      receiptType === "AGAINST_REF"
                        ? "bg-emerald-950/80 border-emerald-600 text-emerald-300 shadow-sm"
                        : "bg-white dark:bg-[#101013] border-slate-200 dark:border-[#303036] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#202025]"
                    )}
                  >
                    Against Bills
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptType("ADVANCE")}
                    className={cn(
                      "py-2 px-3 text-xs rounded-lg font-medium border text-center transition-all",
                      receiptType === "ADVANCE"
                        ? "bg-cyan-950/80 border-cyan-600 text-cyan-300 shadow-sm"
                        : "bg-white dark:bg-[#101013] border-slate-200 dark:border-[#303036] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#202025]"
                    )}
                  >
                    Customer Advance
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptType("ON_ACCOUNT")}
                    className={cn(
                      "py-2 px-3 text-xs rounded-lg font-medium border text-center transition-all",
                      receiptType === "ON_ACCOUNT"
                        ? "bg-indigo-950/80 border-indigo-600 text-indigo-300 shadow-sm"
                        : "bg-white dark:bg-[#101013] border-slate-200 dark:border-[#303036] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#202025]"
                    )}
                  >
                    On Account
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Where did you receive the money? */}
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950 border border-emerald-700 text-xs text-emerald-300">
                2
              </span>
              Payment & Banking Information
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                  Payment Mode <span className="text-rose-400">*</span>
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                >
                  <option value="BANK">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI / Digital QR</option>
                  <option value="CASH">Cash in Hand</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                  Deposit Into Ledger <span className="text-rose-400">*</span>
                </label>
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                >
                  <option value="">-- Standard Bank / Cash Account --</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                  Receipt Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                />
              </div>

              {/* Cheque specific fields */}
              {paymentMode === "CHEQUE" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                      Cheque Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 004521"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                      Cheque Date
                    </label>
                    <input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                      Drawn on Bank
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India"
                      value={chequeBank}
                      onChange={(e) => setChequeBank(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                      Clearance Status
                    </label>
                    <select
                      value={clearanceStatus}
                      onChange={(e) => setClearanceStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                    >
                      <option value="CLEARED">Cleared (Funds in Bank)</option>
                      <option value="PENDING">Pending Clearance (Cheque in Hand)</option>
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                    UTR / Txn Reference #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CMS2948294821 or UPI Ref"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                  Net Amount Received (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-full h-10 px-3.5 text-sm sm:text-base font-bold rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  The actual money deposited into your bank account or cash drawer.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Bill-wise allocation table (if AGAINST_REF) */}
          {receiptType === "AGAINST_REF" && (
            <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950 border border-emerald-700 text-xs text-emerald-300">
                    3
                  </span>
                  Which Bills / Invoices Are Being Settled?
                </div>
                {clientOpenInvoices.length > 0 && (
                  <span className="text-xs text-slate-400">
                    {clientOpenInvoices.length} open invoice(s) found
                  </span>
                )}
              </div>

              {isLoadingOpenInvoices ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-emerald-400" />
                  Loading client open invoices...
                </div>
              ) : clientOpenInvoices.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-[#303036] bg-slate-50 dark:bg-[#101013] p-6 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500/80 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-300">
                    {selectedClientId
                      ? "No pending open invoices for this customer!"
                      : "Please select a Billing Client above to view their outstanding invoices."}
                  </p>
                  {selectedClientId && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      You can record this receipt as a <strong className="text-cyan-400">Customer Advance</strong> or <strong className="text-indigo-400">On Account</strong> above.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#22232E] shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#101013] text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-[#303036]">
                      <tr>
                        <th className="p-2.5">Invoice # & Date</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5 text-right">Balance Due</th>
                        <th className="p-2.5 text-right">Cash/Bank (₹)</th>
                        <th className="p-2.5 text-right">TDS (₹)</th>
                        <th className="p-2.5 text-right">Discount (₹)</th>
                        <th className="p-2.5 text-right">Total Settled</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {clientOpenInvoices.map((inv) => {
                        const row = allocations[inv.id] || {
                          allocated_amount: "",
                          tds_amount: "",
                          discount_amount: "",
                        };
                        const netNum = parseFloat(row.allocated_amount) || 0;
                        const tdsNum = parseFloat(row.tds_amount) || 0;
                        const discNum = parseFloat(row.discount_amount) || 0;
                        const rowTotal = netNum + tdsNum + discNum;
                        const isOverAllocated = rowTotal > inv.balance_amount + 0.01;

                        return (
                          <tr key={inv.id} className={cn("hover:bg-slate-50/80 dark:hover:bg-[#202025] transition-colors border-b border-slate-100 dark:border-[#303036]", rowTotal > 0 && "bg-emerald-50/40 dark:bg-emerald-950/20")}>
                            <td className="p-2.5">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                {inv.voucher_number}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {formatDate(inv.voucher_date)}
                                {inv.days_overdue && inv.days_overdue > 0 ? (
                                  <span className="text-rose-400 ml-1">
                                    ({inv.days_overdue}d overdue)
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="p-2.5">
                              <Badge variant="outline" className="text-[10px] py-0">
                                {inv.voucher_type === "TRANSPORT_INVOICE" ? "Transport" : "General"}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {formatCurrency(inv.balance_amount)}
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={row.allocated_amount}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAllocations((prev) => ({
                                    ...prev,
                                    [inv.id]: { ...prev[inv.id], allocated_amount: val },
                                  }));
                                }}
                                className="w-24 h-8 bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-lg px-2 text-right font-sans font-semibold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs shadow-2xs"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={row.tds_amount}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAllocations((prev) => ({
                                    ...prev,
                                    [inv.id]: { ...prev[inv.id], tds_amount: val },
                                  }));
                                }}
                                className="w-20 h-8 bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-lg px-2 text-right font-sans font-semibold text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs shadow-2xs"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={row.discount_amount}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAllocations((prev) => ({
                                    ...prev,
                                    [inv.id]: { ...prev[inv.id], discount_amount: val },
                                  }));
                                }}
                                className="w-20 h-8 bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-lg px-2 text-right font-sans font-semibold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs shadow-2xs"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-semibold">
                              <span className={cn(isOverAllocated ? "text-rose-400" : "text-slate-100")}>
                                {formatCurrency(rowTotal)}
                              </span>
                              {isOverAllocated && (
                                <p className="text-[9px] text-rose-400">Exceeds Balance!</p>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handlePayFullInvoice(inv)}
                                className="text-[10px] h-6 px-2 border-emerald-700 text-emerald-300 hover:bg-emerald-950/60"
                              >
                                Pay Full
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-[#101013] font-semibold border-t border-slate-200 dark:border-[#303036] text-slate-800 dark:text-slate-200">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right uppercase text-[10px] text-slate-400">
                          Allocated Totals:
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-400">
                          {formatCurrency(allocatedTotals.sumNet)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-amber-400">
                          {formatCurrency(allocatedTotals.sumTds)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-blue-400">
                          {formatCurrency(allocatedTotals.sumDisc)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-100">
                          {formatCurrency(allocatedTotals.sumTotal)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Deductions & TDS section for non-allocated or quick setup */}
          {receiptType !== "AGAINST_REF" && (
            <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <Percent className="h-4 w-4" />
                Customer TDS Deduction & Settlement Discount
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                    TDS Section
                  </label>
                  <select
                    value={tdsSection}
                    onChange={(e) => setTdsSection(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                  >
                    <option value="194C">Section 194C (Transport / Contractor - 1% or 2%)</option>
                    <option value="194J">Section 194J (Professional / Technical - 2% or 10%)</option>
                    <option value="NONE">No TDS Deducted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                    TDS Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdsRate}
                    onChange={(e) => {
                      const r = e.target.value;
                      setTdsRate(r);
                      const amt = parseFloat(amountReceived) || 0;
                      const rateNum = parseFloat(r) || 0;
                      if (amt > 0 && rateNum > 0) {
                        const calculatedTds = (amt / (1 - (rateNum / 100))) * (rateNum / 100);
                        setTdsAmount(calculatedTds.toFixed(2));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                    TDS Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdsAmount}
                    onChange={(e) => setTdsAmount(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-semibold rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                    Cash Discount Allowed (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Narration & Live Double-Entry Preview */}
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                Narration / Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Payment received towards freight bills for April 2026 dispatches..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
              />
            </div>

            {/* Double-Entry Journal Preview Card */}
            <div className="rounded-xl border border-slate-200/90 dark:border-[#303036] bg-slate-50 dark:bg-[#101013] p-4 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Live Tally Double-Entry Preview
              </span>
              <div className="text-xs font-mono space-y-1.5 pt-1">
                <div className="flex justify-between text-emerald-400">
                  <span>Dr. Bank / Cash Account (Funds received)</span>
                  <span>{formatCurrency(parseFloat(amountReceived) || 0)}</span>
                </div>
                {(parseFloat(tdsAmount) > 0 || allocatedTotals.sumTds > 0) && (
                  <div className="flex justify-between text-amber-400">
                    <span>Dr. TDS Receivable ({tdsSection} Tax Credit)</span>
                    <span>
                      {formatCurrency(receiptType === "AGAINST_REF" ? allocatedTotals.sumTds : parseFloat(tdsAmount))}
                    </span>
                  </div>
                )}
                {(parseFloat(discountAmount) > 0 || allocatedTotals.sumDisc > 0) && (
                  <div className="flex justify-between text-blue-400">
                    <span>Dr. Consignment Discount Allowed</span>
                    <span>
                      {formatCurrency(receiptType === "AGAINST_REF" ? allocatedTotals.sumDisc : parseFloat(discountAmount))}
                    </span>
                  </div>
                )}
                {receiptType === "AGAINST_REF" ? (
                  <>
                    <div className="flex justify-between text-slate-800 dark:text-slate-200 border-t border-slate-200 dark:border-[#303036] pt-1">
                      <span>Cr. Debtor / Customer Ledger (Settled Against Bills)</span>
                      <span>{formatCurrency(allocatedTotals.sumTotal)}</span>
                    </div>
                    {unappliedAdvance > 0 && (
                      <div className="flex justify-between text-cyan-400">
                        <span>Cr. Customer Advances & Unapplied Receipts (Liability)</span>
                        <span>{formatCurrency(unappliedAdvance)}</span>
                      </div>
                    )}
                  </>
                ) : receiptType === "ADVANCE" ? (
                  <div className="flex justify-between text-cyan-600 dark:text-cyan-400 border-t border-slate-200 dark:border-[#303036] pt-1">
                    <span>Cr. Customer Advances & Unapplied Receipts</span>
                    <span>{formatCurrency(parseFloat(amountReceived) || 0)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-800 dark:text-slate-200 border-t border-slate-200 dark:border-[#303036] pt-1">
                    <span>Cr. Debtor / Customer Ledger (On Account)</span>
                    <span>{formatCurrency(parseFloat(amountReceived) || 0)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <FormActionBar
            onCancel={() => setIsCreateOpen(false)}
            submitLabel="Post Receipt Voucher"
            isSubmitting={isSubmitting}
          />
        </form>
      </EntityDrawer>

      {/* DRAWER 2: View Voucher Details & Ledger */}
      <EntityDrawer
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        title={selectedVoucher ? `Receipt Voucher: ${selectedVoucher.voucher_number}` : "Voucher Details"}
        description="Inspect complete transaction metadata, bill-wise settlements, and posted double-entry journal postings."
        size="lg"
      >
        {selectedVoucher && (
          <div className="space-y-6 pb-12">
            {/* Header Card */}
            <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Customer / Debtor</span>
                  <p className="text-base font-semibold text-slate-100">{selectedVoucher.party_name || "Direct Customer"}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Total Value</span>
                  <p className="text-base font-bold font-mono text-emerald-400">
                    {formatCurrency(selectedVoucher.net_amount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-[#303036] text-xs">
                <div>
                  <span className="text-slate-500">Date:</span>{" "}
                  <span className="text-slate-800 dark:text-slate-200">{formatDate(selectedVoucher.voucher_date)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Mode:</span>{" "}
                  <span className="text-slate-800 dark:text-slate-200">{selectedVoucher.tax_breakup?.payment_mode || "BANK"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Ref / Cheque:</span>{" "}
                  <span className="text-slate-800 dark:text-slate-200 font-mono">{selectedVoucher.reference_number || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{" "}
                  <span className={selectedVoucher.is_void ? "text-rose-400" : "text-emerald-400"}>
                    {selectedVoucher.is_void ? "VOIDED" : (selectedVoucher.payment_status || "CLEARED")}
                  </span>
                </div>
              </div>

              {selectedVoucher.narration && (
                <div className="text-xs text-slate-400 italic pt-1 border-t border-slate-200 dark:border-[#303036]">
                  &quot;{selectedVoucher.narration}&quot;
                </div>
              )}
            </div>

            {/* Bill Allocations List */}
            {selectedVoucher.bill_allocations && selectedVoucher.bill_allocations.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Settled Invoices ({selectedVoucher.bill_allocations.length})
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#22232E] shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#101013] text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-[#303036]">
                      <tr>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5 text-right">Cash/Bank Applied</th>
                        <th className="p-2.5 text-right">TDS Deducted</th>
                        <th className="p-2.5 text-right">Discount</th>
                        <th className="p-2.5 text-right">Total Settled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#303036] bg-white dark:bg-[#101013]">
                      {selectedVoucher.bill_allocations.map((ba) => (
                        <tr key={ba.id}>
                          <td className="p-2.5 font-mono text-cyan-400 font-semibold">
                            {ba.invoice_number || `Invoice #${ba.invoice_id}`}
                          </td>
                          <td className="p-2.5 text-right font-mono text-emerald-400">
                            {formatCurrency(ba.allocated_amount)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-amber-400">
                            {formatCurrency(ba.tds_amount)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-blue-400">
                            {formatCurrency(ba.discount_amount)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-100 font-semibold">
                            {formatCurrency(ba.total_settled)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Double-Entry Ledger Postings Table */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Posted Double-Entry Ledger Entries
              </span>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#22232E] shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#101013] text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-[#303036]">
                    <tr>
                      <th className="p-2.5">Ledger Account</th>
                      <th className="p-2.5 text-right">Debit (Dr) ₹</th>
                      <th className="p-2.5 text-right">Credit (Cr) ₹</th>
                      <th className="p-2.5">Entry Narration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#303036] bg-white dark:bg-[#101013]">
                    {selectedVoucher.ledger_entries.map((le) => (
                      <tr key={le.id} className={le.is_reversal ? "bg-rose-950/20" : ""}>
                        <td className="p-2.5 font-medium text-slate-800 dark:text-slate-800 dark:text-slate-200">
                          {le.account_name || `Account #${le.account_id}`}
                          {le.is_reversal && (
                            <span className="ml-1.5 text-[10px] text-rose-400 uppercase font-semibold">
                              (Reversal)
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-emerald-400">
                          {parseFloat(String(le.debit_amount)) > 0 ? formatCurrency(le.debit_amount) : "—"}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-blue-400">
                          {parseFloat(String(le.credit_amount)) > 0 ? formatCurrency(le.credit_amount) : "—"}
                        </td>
                        <td className="p-2.5 text-slate-400 text-[11px] truncate max-w-[200px]" title={le.narration}>
                          {le.narration || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-[#101013] font-semibold border-t border-slate-200 dark:border-[#303036] text-slate-800 dark:text-slate-200">
                    <tr>
                      <td className="p-2.5 uppercase text-[10px] text-slate-400">Total:</td>
                      <td className="p-2.5 text-right font-mono text-emerald-400">
                        {formatCurrency(
                          selectedVoucher.ledger_entries
                            .filter((e) => !e.is_reversal)
                            .reduce((acc, e) => acc + (parseFloat(String(e.debit_amount)) || 0), 0)
                        )}
                      </td>
                      <td className="p-2.5 text-right font-mono text-blue-400">
                        {formatCurrency(
                          selectedVoucher.ledger_entries
                            .filter((e) => !e.is_reversal)
                            .reduce((acc, e) => acc + (parseFloat(String(e.credit_amount)) || 0), 0)
                        )}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPrintVoucher(selectedVoucher);
                  setIsPrintModalOpen(true);
                }}
                className="border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#17171B] hover:bg-slate-50 dark:hover:bg-[#202025] text-slate-700 dark:text-slate-300 rounded-xl shadow-2xs font-medium"
              >
                <Printer className="h-4 w-4 mr-1.5 text-emerald-400" />
                Print Receipt Voucher
              </Button>
            </div>
          </div>
        )}
      </EntityDrawer>

      {/* MODAL 3: Print Receipt Voucher (Indian Transport Standard) */}
      {isPrintModalOpen && printVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 relative print:m-0 print:p-0 print:w-full print:shadow-none">
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <span className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-emerald-600" />
                Print Preview: Receipt Voucher
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Printer className="h-4 w-4 mr-1.5" />
                  Print Now
                </Button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 rounded text-slate-500 hover:text-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="space-y-4 font-serif text-sm">
              {/* Receipt Header */}
              <div className="text-center border-b pb-3 space-y-1">
                <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">
                  RECEIPT VOUCHER
                </h2>
                <p className="text-xs text-slate-600 font-sans">
                  PantherTMS Transport Logistics Network
                </p>
              </div>

              {/* Voucher Meta */}
              <div className="flex justify-between items-start text-xs border-b pb-2">
                <div>
                  <p><strong>Voucher No:</strong> <span className="font-mono">{printVoucher.voucher_number}</span></p>
                  <p><strong>Payment Mode:</strong> {printVoucher.tax_breakup?.payment_mode || "BANK"}</p>
                  {printVoucher.reference_number && (
                    <p><strong>Ref / Cheque #:</strong> {printVoucher.reference_number}</p>
                  )}
                </div>
                <div className="text-right">
                  <p><strong>Date:</strong> {formatDate(printVoucher.voucher_date)}</p>
                  <p><strong>Status:</strong> {printVoucher.is_void ? "VOIDED" : (printVoucher.payment_status || "CLEARED")}</p>
                </div>
              </div>

              {/* Received From */}
              <div className="border rounded p-3 text-xs space-y-1 bg-slate-50">
                <p className="text-slate-500 uppercase text-[10px] font-sans">Received with thanks from:</p>
                <p className="font-bold text-sm text-slate-900">{printVoucher.party_name || "Direct Customer"}</p>
                {printVoucher.party_gstin && (
                  <p className="text-slate-600">GSTIN: {printVoucher.party_gstin}</p>
                )}
              </div>

              {/* Amount in Numbers & Words */}
              <div className="border rounded p-3 space-y-2 bg-emerald-50/50 border-emerald-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600 uppercase font-sans">Amount Received:</span>
                  <span className="text-xl font-bold font-mono text-emerald-800">
                    {formatCurrency(printVoucher.net_amount)}
                  </span>
                </div>
                <div className="text-xs italic text-slate-700 border-t pt-1 border-emerald-200">
                  <strong>In Words:</strong> {numberToWords(parseFloat(String(printVoucher.net_amount)) || 0)}
                </div>
              </div>

              {/* Bill Allocation Table if any */}
              {printVoucher.bill_allocations && printVoucher.bill_allocations.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 uppercase font-sans">
                    Settlement Breakdown Against Invoices:
                  </span>
                  <table className="w-full text-left text-xs border">
                    <thead className="bg-slate-100 text-[10px] uppercase font-sans">
                      <tr className="border-b">
                        <th className="p-1.5">Invoice #</th>
                        <th className="p-1.5 text-right">Bank/Cash Applied</th>
                        <th className="p-1.5 text-right">TDS Deducted</th>
                        <th className="p-1.5 text-right">Discount</th>
                        <th className="p-1.5 text-right">Total Settled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-[11px]">
                      {printVoucher.bill_allocations.map((ba) => (
                        <tr key={ba.id}>
                          <td className="p-1.5 font-mono">{ba.invoice_number || `Invoice #${ba.invoice_id}`}</td>
                          <td className="p-1.5 text-right font-mono">{formatCurrency(ba.allocated_amount)}</td>
                          <td className="p-1.5 text-right font-mono">{formatCurrency(ba.tds_amount)}</td>
                          <td className="p-1.5 text-right font-mono">{formatCurrency(ba.discount_amount)}</td>
                          <td className="p-1.5 text-right font-mono font-bold">{formatCurrency(ba.total_settled)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-12 flex justify-between text-xs text-slate-700">
                <div className="text-center border-t border-slate-400 pt-1 w-40">
                  Received By
                </div>
                <div className="text-center border-t border-slate-400 pt-1 w-48">
                  Authorised Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Void Voucher Dialog */}
      <ConfirmDialog
        open={isVoidOpen}
        title={`Void Receipt Voucher ${voidVoucherNumber}?`}
        description="Voiding this receipt will automatically unallocate the payment from all linked invoices, restore their balance amounts, and post balanced reversing double-entry journal entries. This action cannot be undone."
        confirmText="Void & Reverse Voucher"
        confirmVariant="danger"
        isLoading={isVoiding}
        onCancel={() => {
          setIsVoidOpen(false);
          setVoidVoucherId(null);
          setVoidReason("");
        }}
        onConfirm={handleVoidVoucher}
      >
        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
            Reason for Voiding <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Cheque dishonoured / payment bounced / wrong client entered..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
