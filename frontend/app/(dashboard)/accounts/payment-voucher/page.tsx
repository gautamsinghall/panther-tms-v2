"use client";
import { toast } from "@/lib/toast";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  ArrowUpRight,
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
  TrendingDown,
  Percent,
  Layers,
  Search,
  X,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Clock,
  Truck,
  User,
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
  vendor_id?: number;
  driver_id?: number;
  hire_challan_id?: number;
  due_date?: string;
  narration?: string;
  is_void: boolean;
  void_reason?: string;
  tax_breakup?: Record<string, any>;
  ledger_entries: LedgerEntry[];
  bill_allocations?: BillAllocationItem[];
  created_at: string;
}

interface VendorOption {
  id: number;
  name: string;
  gstin?: string;
  pan?: string;
  phone?: string;
}

interface DriverOption {
  id: number;
  name: string;
  phone: string;
  license_number?: string;
}

interface HireChallanOption {
  id: number;
  challan_number: string;
  challan_date: string;
  vehicle_number: string;
  owner_id?: number;
  owner_name?: string;
  driver_name?: string;
  hire_rate: number;
  advance_amount: number;
  balance_amount: number;
  status: string;
}

interface AccountOption {
  id: number;
  name: string;
  code: string;
  group_name?: string;
}

interface OpenBill {
  id: number;
  voucher_number: string;
  voucher_date: string;
  voucher_type: string;
  reference_number?: string;
  total_amount: number;
  net_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date?: string;
  party_name?: string;
  days_overdue?: number;
}

interface AllocationRow {
  invoice_id: number;
  bill_number: string;
  reference_number?: string;
  voucher_date: string;
  balance_amount: number;
  days_overdue?: number;
  allocated_amount: string;
  tds_amount: string;
  discount_amount: string;
}

export default function PaymentVoucherPage() {
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Master data
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [hireChallans, setHireChallans] = useState<HireChallanOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<AccountOption[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<AccountOption[]>([]);
  const [seriesInfo, setSeriesInfo] = useState<any>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<string>("ALL");
  const [filterPaymentType, setFilterPaymentType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Drawer 1: Record Business Payment
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<string>("AGAINST_REF");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [selectedChallanId, setSelectedChallanId] = useState<string>("");
  const [challanPaymentType, setChallanPaymentType] = useState<"ATH" | "BTH" | "FULL">("ATH");
  const [selectedExpenseAccountId, setSelectedExpenseAccountId] = useState<string>("");
  const [customPartyName, setCustomPartyName] = useState<string>("");
  
  const [paymentMode, setPaymentMode] = useState<string>("BANK");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [voucherDate, setVoucherDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [chequeNumber, setChequeNumber] = useState<string>("");
  const [chequeDate, setChequeDate] = useState<string>("");
  const [chequeBank, setChequeBank] = useState<string>("");
  const [clearanceStatus, setClearanceStatus] = useState<string>("CLEARED");
  
  const [amountToPay, setAmountToPay] = useState<string>("");
  const [tdsSection, setTdsSection] = useState<string>("194C");
  const [tdsRate, setTdsRate] = useState<string>("2");
  const [tdsAmount, setTdsAmount] = useState<string>("0");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [narration, setNarration] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vendor's open purchase bills for bill-wise allocation
  const [vendorOpenBills, setVendorOpenBills] = useState<OpenBill[]>([]);
  const [allocations, setAllocations] = useState<Record<number, AllocationRow>>({});
  const [isLoadingOpenBills, setIsLoadingOpenBills] = useState(false);

  // Drawer 2: View Voucher Details & Ledger
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  // Modal 3: Print Payment Voucher
  const [printVoucher, setPrintVoucher] = useState<VoucherRecord | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Modal 4: Void Payment
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

      const [stdRes, athRes, bthRes, sInfo, vendorsRes, driversRes, challansRes, accountsRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=PAYMENT_VOUCHER").catch(() => []),
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=PAYMENT_ATH").catch(() => []),
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=PAYMENT_BTH").catch(() => []),
        apiClient<any>(`/api/v1/settings/series/check/PAYMENT_VOUCHER${officeParam}`).catch(() => null),
        apiClient<VendorOption[]>("/api/v1/general/vendors").catch(() => []),
        apiClient<DriverOption[]>("/api/v1/transport/drivers").catch(() => []),
        apiClient<HireChallanOption[]>("/api/v1/transport/hire-challans").catch(() => []),
        apiClient<AccountOption[]>("/api/v1/misc/accounts").catch(() => []),
      ]);

      const all = [...stdRes, ...athRes, ...bthRes];
      const unique = Array.from(new Map(all.map((v) => [v.id, v])).values());
      // Sort newest first
      unique.sort((a, b) => b.id - a.id);

      setData(unique);
      setSeriesInfo(sInfo);
      setVendors(vendorsRes);
      setDrivers(driversRes);
      setHireChallans(challansRes);

      // Separate bank/cash vs expense accounts
      const liquid = accountsRes.filter((a) => {
        const code = (a.code || "").toUpperCase();
        const name = (a.name || "").toLowerCase();
        return code.includes("BANK") || code.includes("CASH") || name.includes("bank") || name.includes("cash");
      });
      setBankAccounts(liquid.length > 0 ? liquid : accountsRes);

      const exp = accountsRes.filter((a) => {
        const code = (a.code || "").toUpperCase();
        return code.includes("EXP") || code.includes("ADVANCES") || code.includes("PAYABLE");
      });
      setExpenseAccounts(exp.length > 0 ? exp : accountsRes);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load payment vouchers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When selected vendor changes in Against Bills, fetch open purchase bills
  useEffect(() => {
    if (paymentType !== "AGAINST_REF" || !selectedVendorId) {
      setVendorOpenBills([]);
      setAllocations({});
      return;
    }

    const vIdNum = parseInt(selectedVendorId);
    if (!vIdNum) return;

    setIsLoadingOpenBills(true);
    apiClient<OpenBill[]>(`/api/v1/accounts/vendors/${vIdNum}/open-bills`)
      .then((res) => {
        setVendorOpenBills(res);
        const initAlloc: Record<number, AllocationRow> = {};
        res.forEach((b) => {
          initAlloc[b.id] = {
            invoice_id: b.id,
            bill_number: b.voucher_number,
            reference_number: b.reference_number,
            voucher_date: b.voucher_date,
            balance_amount: b.balance_amount,
            days_overdue: b.days_overdue,
            allocated_amount: "",
            tds_amount: "",
            discount_amount: "",
          };
        });
        setAllocations(initAlloc);
      })
      .catch((err) => {
        toast.error("Could not fetch open bills: " + (err.message || "Unknown error"));
        setVendorOpenBills([]);
        setAllocations({});
      })
      .finally(() => {
        setIsLoadingOpenBills(false);
      });
  }, [selectedVendorId, paymentType]);

  // When a hire challan is selected, auto-populate amount
  useEffect(() => {
    if (paymentType !== "HIRE_CHALLAN" || !selectedChallanId) return;
    const hc = hireChallans.find((c) => c.id === parseInt(selectedChallanId));
    if (hc) {
      if (challanPaymentType === "ATH") {
        const half = Math.round((hc.hire_rate * 0.7) * 100) / 100;
        setAmountToPay(String(half));
      } else {
        setAmountToPay(String(hc.balance_amount));
      }
    }
  }, [selectedChallanId, challanPaymentType, hireChallans, paymentType]);

  // Quick Pay Full on a purchase bill row
  const handlePayFullBill = (bill: OpenBill) => {
    const bal = bill.balance_amount;
    const rateNum = parseFloat(tdsRate) || 0;
    let autoTds = 0;
    let netPay = bal;

    if (rateNum > 0) {
      autoTds = Math.round((bal * (rateNum / 100)) * 100) / 100;
      netPay = bal - autoTds;
    }

    setAllocations((prev) => ({
      ...prev,
      [bill.id]: {
        ...prev[bill.id],
        allocated_amount: netPay.toFixed(2),
        tds_amount: autoTds > 0 ? autoTds.toFixed(2) : "0",
        discount_amount: "0",
      },
    }));

    const currentPay = parseFloat(amountToPay) || 0;
    if (currentPay === 0) {
      setAmountToPay(netPay.toFixed(2));
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

  // Compute live unapplied supplier advance / excess
  const unappliedAdvance = useMemo(() => {
    const pmt = parseFloat(amountToPay) || 0;
    if (paymentType === "AGAINST_REF") {
      return Math.max(0, Math.round((pmt - allocatedTotals.sumNet) * 100) / 100);
    }
    return pmt;
  }, [amountToPay, allocatedTotals.sumNet, paymentType]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const nonVoid = data.filter((v) => !v.is_void);
    const totalPayments = nonVoid.reduce((acc, v) => acc + (parseFloat(String(v.net_amount)) || 0), 0);
    const totalTds = nonVoid.reduce((acc, v) => {
      const tb = v.tax_breakup || {};
      return acc + (parseFloat(String(tb.tds_amount)) || 0);
    }, 0);
    const totalHireChallans = nonVoid.reduce((acc, v) => {
      const tb = v.tax_breakup || {};
      if (tb.payment_type === "HIRE_CHALLAN" || v.hire_challan_id) {
        return acc + (parseFloat(String(v.net_amount)) || 0);
      }
      return acc;
    }, 0);
    const totalDriverAdvances = nonVoid.reduce((acc, v) => {
      const tb = v.tax_breakup || {};
      if (tb.payment_type === "DRIVER_ADVANCE" || tb.payment_type === "DRIVER_EXPENSE") {
        return acc + (parseFloat(String(v.net_amount)) || 0);
      }
      return acc;
    }, 0);

    return {
      totalPayments,
      totalTds,
      totalHireChallans,
      totalDriverAdvances,
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

      const pType = (tb.payment_type || (v.voucher_type === "PAYMENT_ATH" ? "HIRE_CHALLAN" : v.voucher_type === "PAYMENT_BTH" ? "HIRE_CHALLAN" : "AGAINST_REF")).toUpperCase();
      const matchType = filterPaymentType === "ALL" || pType === filterPaymentType;

      const matchStatus =
        filterStatus === "ALL" ||
        (filterStatus === "CLEARED" && !v.is_void && v.payment_status === "PAID") ||
        (filterStatus === "PENDING" && !v.is_void && v.payment_status === "PENDING") ||
        (filterStatus === "VOID" && v.is_void);

      return matchQuery && matchMode && matchType && matchStatus;
    });
  }, [data, searchQuery, filterMode, filterPaymentType, filterStatus]);

  // Reset Create Form
  const resetCreateForm = () => {
    setPaymentType("AGAINST_REF");
    setSelectedVendorId("");
    setSelectedDriverId("");
    setSelectedChallanId("");
    setChallanPaymentType("ATH");
    setSelectedExpenseAccountId("");
    setCustomPartyName("");
    setPaymentMode("BANK");
    setBankAccountId("");
    setVoucherDate(new Date().toISOString().split("T")[0]);
    setReferenceNumber("");
    setChequeNumber("");
    setChequeDate("");
    setChequeBank("");
    setClearanceStatus("CLEARED");
    setAmountToPay("");
    setTdsSection("194C");
    setTdsRate("2");
    setTdsAmount("0");
    setDiscountAmount("0");
    setNarration("");
    setVendorOpenBills([]);
    setAllocations({});
  };

  // Submit Payment Voucher
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesInfo?.configured) {
      toast.error(
        "Payment Voucher series is not configured for this office. Please set up Series Master under Settings > Series Master."
      );
      return;
    }

    const netPay = parseFloat(amountToPay) || 0;
    if (netPay <= 0) {
      toast.warning("Please enter a valid payment amount greater than ₹0.");
      return;
    }

    // Validate party per type
    if (paymentType === "AGAINST_REF" && !selectedVendorId && !customPartyName.trim()) {
      toast.warning("Please select a Vendor / Supplier or enter party name.");
      return;
    }
    if (paymentType === "HIRE_CHALLAN" && !selectedChallanId) {
      toast.warning("Please select a Hire Challan to settle.");
      return;
    }
    if ((paymentType === "DRIVER_ADVANCE" || paymentType === "DRIVER_EXPENSE") && !selectedDriverId && !customPartyName.trim()) {
      toast.warning("Please select a Driver or enter driver name.");
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
        bill_number: a.bill_number,
      }));

    if (paymentType === "AGAINST_REF" && activeAllocations.length === 0 && vendorOpenBills.length > 0) {
      toast.warning("You selected 'Against Bills'. Please allocate payment to at least one open bill, or change payment type to 'Supplier Advance'.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        vendor_id: selectedVendorId ? parseInt(selectedVendorId) : undefined,
        driver_id: selectedDriverId ? parseInt(selectedDriverId) : undefined,
        party_name: customPartyName.trim() || undefined,
        party_account_id: selectedExpenseAccountId ? parseInt(selectedExpenseAccountId) : undefined,
        voucher_date: voucherDate,
        payment_type: paymentType,
        payment_mode: paymentMode,
        bank_account_id: bankAccountId ? parseInt(bankAccountId) : undefined,
        reference_number: referenceNumber.trim() || chequeNumber.trim() || undefined,
        cheque_number: chequeNumber.trim() || undefined,
        cheque_date: chequeDate || undefined,
        cheque_bank: chequeBank.trim() || undefined,
        clearance_status: clearanceStatus,
        amount: netPay,
        tds_section: tdsSection,
        tds_rate: parseFloat(tdsRate) || 0,
        tds_amount: paymentType === "AGAINST_REF" ? allocatedTotals.sumTds : (parseFloat(tdsAmount) || 0),
        discount_amount: paymentType === "AGAINST_REF" ? allocatedTotals.sumDisc : (parseFloat(discountAmount) || 0),
        allocations: activeAllocations,
        unapplied_advance_amount: unappliedAdvance,
        hire_challan_id: selectedChallanId ? parseInt(selectedChallanId) : undefined,
        hire_challan_payment_type: challanPaymentType,
        narration: narration.trim() || undefined,
      };

      await apiClient("/api/v1/accounts/payment-vouchers", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Payment Voucher posted successfully with balanced double-entry entries!");
      setIsCreateOpen(false);
      resetCreateForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to post payment voucher.");
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
      toast.success(`Payment Voucher ${voidVoucherNumber} voided and balances restored successfully.`);
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
      "Payment Number",
      "Date",
      "Paid To (Party)",
      "Payment Mode",
      "Reference / Cheque No",
      "Payment Type",
      "Net Amount Paid (₹)",
      "TDS Retained (₹)",
      "Discount Received (₹)",
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
        tb.payment_mode || "BANK",
        v.reference_number || tb.cheque_number || "",
        tb.payment_type || v.voucher_type,
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
    link.download = `Payment_Vouchers_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export downloaded successfully.");
  };

  // Columns for DataTable
  const columns: ColumnDef<VoucherRecord>[] = [
    {
      key: "voucher_number",
      label: "Payment No & Date",
      sortable: true,
      render: (v) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 font-mono">
            <ArrowUpRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
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
      label: "Paid To (Beneficiary)",
      sortable: true,
      render: (v) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate" title={v.party_name || "Beneficiary"}>
            {v.party_name || "Beneficiary"}
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
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate max-w-[130px]" title={ref}>
                Ref: {ref}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "payment_type",
      label: "Payment Type",
      render: (v) => {
        const tb = v.tax_breakup || {};
        const pType = tb.payment_type || (v.voucher_type === "PAYMENT_ATH" ? "HIRE_CHALLAN" : v.voucher_type === "PAYMENT_BTH" ? "HIRE_CHALLAN" : "AGAINST_REF");
        if (pType === "HIRE_CHALLAN" || v.hire_challan_id) {
          return (
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 text-[11px] flex items-center gap-1">
              <Truck className="h-3 w-3" /> Truck Hire (HC)
            </Badge>
          );
        }
        if (pType === "DRIVER_ADVANCE") {
          return (
            <Badge variant="outline" className="bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60 text-[11px] flex items-center gap-1">
              <User className="h-3 w-3" /> Driver Advance
            </Badge>
          );
        }
        if (pType === "ADVANCE") {
          return (
            <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60 text-[11px]">
              Supplier Advance
            </Badge>
          );
        }
        if (pType === "DIRECT_EXPENSE" || pType === "DRIVER_EXPENSE") {
          return (
            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60 text-[11px]">
              Direct Expense
            </Badge>
          );
        }
        const allocCount = (v.bill_allocations || []).length;
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60 text-[11px]">
            Against Bills ({allocCount})
          </Badge>
        );
      },
    },
    {
      key: "net_amount",
      label: "Money Paid",
      sortable: true,
      render: (v) => (
        <div className="flex flex-col text-right">
          <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
            {formatCurrency(v.net_amount)}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Bank / Cash Out</span>
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
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">
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
        return <StatusBadge status="CLEARED" customLabel="PAID" />;
      },
    },
  ];

  // Actions
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
      label: "Print Payment Voucher",
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
                No active sequence series is configured for Payment Vouchers (PV). Please configure or import the series in Settings &gt; Series Master.
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
        title="Payment Vouchers"
        description="Double-entry disbursements, vendor bill settlements, truck hire settlements (ATH/BTH), driver advances, and statutory payments."
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
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/50 font-medium"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Record Business Payment
            </Button>
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Disbursed"
          value={formatCurrency(kpis.totalPayments)}
          subtext="Total bank & cash disbursements"
          badge={<span className="text-[11px] text-slate-500 font-medium">({kpis.totalCount} vouchers)</span>}
          icon={<Wallet className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
        />
        <KpiCard
          title="Truck Hire (HC)"
          value={formatCurrency(kpis.totalHireChallans)}
          subtext="Transporter & market truck advances (ATH/BTH)"
          icon={<Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
        />
        <KpiCard
          title="Driver Advances"
          value={formatCurrency(kpis.totalDriverAdvances)}
          subtext="Trip advances & expense reimbursements"
          icon={<User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
        />
        <KpiCard
          title="TDS Retained"
          value={formatCurrency(kpis.totalTds)}
          subtext="Sec 194C / 194J statutory tax withheld"
          icon={<Percent className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search payment #, beneficiary, cheque/UTR #, narration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-[#F5F5F7] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Payment Mode Filter */}
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
            >
              <option value="ALL">All Payment Modes</option>
              <option value="BANK">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
            </select>

            {/* Payment Type Filter */}
            <select
              value={filterPaymentType}
              onChange={(e) => setFilterPaymentType(e.target.value)}
              className="bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
            >
              <option value="ALL">All Payment Types</option>
              <option value="AGAINST_REF">Against Bills (Supplier Settlement)</option>
              <option value="HIRE_CHALLAN">Truck Hire / Hire Challan</option>
              <option value="DRIVER_ADVANCE">Driver Advance</option>
              <option value="DIRECT_EXPENSE">Direct Expense</option>
              <option value="ADVANCE">Supplier Advance</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="CLEARED">Paid / Cleared</option>
              <option value="PENDING">Pending Clearance</option>
              <option value="VOID">Voided / Reversed</option>
            </select>

            {(searchQuery || filterMode !== "ALL" || filterPaymentType !== "ALL" || filterStatus !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilterMode("ALL");
                  setFilterPaymentType("ALL");
                  setFilterStatus("ALL");
                }}
                className="text-xs text-slate-400 hover:text-slate-200"
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
            <ArrowUpRight className="h-10 w-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Payment Vouchers found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Click &quot;Record Business Payment&quot; to disburse payments to vendors, drivers, or market truck owners.
            </p>
            <Button
              size="sm"
              onClick={() => {
                resetCreateForm();
                setIsCreateOpen(true);
              }}
              className="mt-4 bg-rose-600 hover:bg-rose-500 text-white font-medium"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Record Business Payment
            </Button>
          </div>
        }
      />

      {/* DRAWER 1: Record Business Payment (Friendly & Guided) */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Record Business Payment (Money Out)"
        description="Enter outgoing payment details for vendor bills, market truck hire, driver advances, or direct operating expenses."
        size="xl"
      >
        <form onSubmit={handleCreatePayment} className="space-y-6 pb-20">
          {/* Step 1: What is this payment for? */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#303036] pb-3 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                1
              </span>
              What Is This Payment For? (Payment Category)
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType("AGAINST_REF")}
                className={cn(
                  "py-2.5 px-3 text-xs rounded-lg font-medium border text-center transition-all flex flex-col items-center gap-1",
                  paymentType === "AGAINST_REF"
                    ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-semibold shadow-xs"
                    : "bg-white dark:bg-[#101013] border-slate-200 dark:border-[#303036] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#202025]"
                )}
              >
                <FileText className="h-4 w-4" />
                Against Vendor Bills
              </button>

              <button
                type="button"
                onClick={() => setPaymentType("HIRE_CHALLAN")}
                className={cn(
                  "py-2.5 px-3 text-xs rounded-lg font-medium border text-center transition-all flex flex-col items-center gap-1",
                  paymentType === "HIRE_CHALLAN"
                    ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-semibold shadow-xs"
                    : "bg-white dark:bg-[#101013] border-slate-200 dark:border-[#303036] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#202025]"
                )}
              >
                <Truck className="h-4 w-4" />
                Truck Hire (HC)
              </button>

              <button
                type="button"
                onClick={() => setPaymentType("DRIVER_ADVANCE")}
                className={cn(
                  "py-2.5 px-3 text-xs rounded-lg font-medium border text-center transition-all flex flex-col items-center gap-1",
                  paymentType === "DRIVER_ADVANCE"
                    ? "bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-900 dark:text-cyan-200 font-semibold shadow-xs"
                    : "bg-white dark:bg-[#101013] border-slate-200 dark:border-[#303036] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#202025]"
                )}
              >
                <User className="h-4 w-4" />
                Driver Advance
              </button>

              <button
                type="button"
                onClick={() => setPaymentType("DIRECT_EXPENSE")}
                className={cn(
                  "py-2.5 px-3 text-xs rounded-lg font-medium border text-center transition-all flex flex-col items-center gap-1",
                  paymentType === "DIRECT_EXPENSE"
                    ? "bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-900 dark:text-purple-200 font-semibold shadow-xs"
                    : "bg-white dark:bg-[#101013] border-slate-200 dark:border-[#303036] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#202025]"
                )}
              >
                <CreditCard className="h-4 w-4" />
                Direct Expense
              </button>
            </div>
          </div>

          {/* Step 2: Who are you paying? */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#303036] pb-3 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                2
              </span>
              Who Are You Paying? (Beneficiary)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* If Against Bills or Supplier Advance */}
              {(paymentType === "AGAINST_REF" || paymentType === "ADVANCE") && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                      Select Vendor / Supplier <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={selectedVendorId}
                      onChange={(e) => {
                        setSelectedVendorId(e.target.value);
                        if (e.target.value) setCustomPartyName("");
                      }}
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                    >
                      <option value="">-- Choose Vendor / Supplier --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.gstin ? `(${v.gstin})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!selectedVendorId && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                        Or Enter Vendor Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Local Petrol Pump / Tyre Dealer"
                        value={customPartyName}
                        onChange={(e) => setCustomPartyName(e.target.value)}
                        className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                      />
                    </div>
                  )}
                </>
              )}

              {/* If Hire Challan */}
              {paymentType === "HIRE_CHALLAN" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                      Select Hire Challan <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={selectedChallanId}
                      onChange={(e) => setSelectedChallanId(e.target.value)}
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                    >
                      <option value="">-- Choose Hire Challan --</option>
                      {hireChallans.map((hc) => (
                        <option key={hc.id} value={hc.id}>
                          {hc.challan_number} | {hc.vehicle_number} | Bal: {formatCurrency(hc.balance_amount)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                      Challan Payment Stage
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setChallanPaymentType("ATH")}
                        className={cn(
                          "py-2 text-xs rounded-lg font-medium border text-center transition-all",
                          challanPaymentType === "ATH"
                            ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-semibold"
                            : "bg-white dark:bg-[#101013] border-slate-200 dark:border-[#303036] text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                        )}
                      >
                        Advance (ATH)
                      </button>
                      <button
                        type="button"
                        onClick={() => setChallanPaymentType("BTH")}
                        className={cn(
                          "py-2 text-xs rounded-lg font-medium border text-center transition-all",
                          challanPaymentType === "BTH"
                            ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-semibold"
                            : "bg-white dark:bg-[#101013] border-slate-200 dark:border-[#303036] text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                        )}
                      >
                        Balance (BTH)
                      </button>
                      <button
                        type="button"
                        onClick={() => setChallanPaymentType("FULL")}
                        className={cn(
                          "py-2 text-xs rounded-lg font-medium border text-center transition-all",
                          challanPaymentType === "FULL"
                            ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-semibold"
                            : "bg-white dark:bg-[#101013] border-slate-200 dark:border-[#303036] text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                        )}
                      >
                        Full Settlement
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* If Driver Advance or Expense */}
              {(paymentType === "DRIVER_ADVANCE" || paymentType === "DRIVER_EXPENSE") && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                      Select Driver <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                    >
                      <option value="">-- Choose Company / Market Driver --</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-[11px] text-cyan-300/90 bg-cyan-950/30 border border-cyan-800/40 rounded-lg p-2.5 mt-4">
                      Driver advances are booked to Current Assets (receivables from driver) and are settled later against submitted trip expense vouchers.
                    </p>
                  </div>
                </>
              )}

              {/* If Direct Expense */}
              {paymentType === "DIRECT_EXPENSE" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                      Expense Ledger Head <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={selectedExpenseAccountId}
                      onChange={(e) => setSelectedExpenseAccountId(e.target.value)}
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                    >
                      <option value="">-- Select Expense Ledger --</option>
                      {expenseAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                      Paid To (Payee Name)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Anand Stationary / Coolie Union"
                      value={customPartyName}
                      onChange={(e) => setCustomPartyName(e.target.value)}
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Step 3: Payment & Banking Information */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-950 border border-blue-700 text-xs text-blue-300">
                3
              </span>
              Payment & Banking Information
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                  Payment Method <span className="text-rose-400">*</span>
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                >
                  <option value="BANK">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI / Digital QR</option>
                  <option value="CASH">Cash in Hand</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                  Pay From Which Account? <span className="text-rose-400">*</span>
                </label>
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
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
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                  Payment Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>

              {/* Cheque specific fields */}
              {paymentMode === "CHEQUE" ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                      Cheque Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 008921"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                      Cheque Date
                    </label>
                    <input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                      Drawn on Bank
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank"
                      value={chequeBank}
                      onChange={(e) => setChequeBank(e.target.value)}
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                      Clearance Status
                    </label>
                    <select
                      value={clearanceStatus}
                      onChange={(e) => setClearanceStatus(e.target.value)}
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                    >
                      <option value="CLEARED">Cleared (Realized from Bank)</option>
                      <option value="PENDING">Pending Clearance (Cheque Issued)</option>
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                    UTR / Txn Reference #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NEFT29482948 or UPI Ref"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                  Amount to Pay (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amountToPay}
                  onChange={(e) => setAmountToPay(e.target.value)}
                  className="w-full h-10 px-3.5 text-sm sm:text-base font-bold rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-2xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Net funds disbursed from your bank account or cash drawer.
                </p>
              </div>
            </div>
          </div>

          {/* Step 4: Bill Allocation Table (if AGAINST_REF) */}
          {paymentType === "AGAINST_REF" && (
            <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-950 border border-blue-700 text-xs text-blue-300">
                    4
                  </span>
                  Select Unpaid Purchase Bills / Invoices
                </div>
                {vendorOpenBills.length > 0 && (
                  <span className="text-xs text-slate-400">
                    {vendorOpenBills.length} unpaid bill(s) found
                  </span>
                )}
              </div>

              {isLoadingOpenBills ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-blue-400" />
                  Loading vendor open bills...
                </div>
              ) : vendorOpenBills.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-[#303036] bg-slate-50 dark:bg-[#101013] p-6 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500/80 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {selectedVendorId
                      ? "No pending open purchase bills for this vendor!"
                      : "Please select a Vendor above to view their outstanding unpaid bills."}
                  </p>
                  {selectedVendorId && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      You can record this payment as a <strong className="text-cyan-400">Supplier Advance</strong> above.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#303036]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#101013] text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-[#303036]">
                      <tr>
                        <th className="p-2.5">Bill # & Date</th>
                        <th className="p-2.5">Supplier Ref #</th>
                        <th className="p-2.5 text-right">Balance Due</th>
                        <th className="p-2.5 text-right">Cash/Bank (₹)</th>
                        <th className="p-2.5 text-right">TDS (₹)</th>
                        <th className="p-2.5 text-right">Discount (₹)</th>
                        <th className="p-2.5 text-right">Total Settled</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#303036] bg-white dark:bg-[#101013]">
                      {vendorOpenBills.map((bill) => {
                        const row = allocations[bill.id] || {
                          allocated_amount: "",
                          tds_amount: "",
                          discount_amount: "",
                        };
                        const netNum = parseFloat(row.allocated_amount) || 0;
                        const tdsNum = parseFloat(row.tds_amount) || 0;
                        const discNum = parseFloat(row.discount_amount) || 0;
                        const rowTotal = netNum + tdsNum + discNum;
                        const isOverAllocated = rowTotal > bill.balance_amount + 0.01;

                        return (
                          <tr key={bill.id} className={cn("hover:bg-slate-50/80 dark:hover:bg-[#202025] transition-colors border-b border-slate-100 dark:border-[#303036]", rowTotal > 0 && "bg-indigo-50/40 dark:bg-indigo-950/20")}>
                            <td className="p-2.5">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                {bill.voucher_number}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {formatDate(bill.voucher_date)}
                                {bill.days_overdue && bill.days_overdue > 0 ? (
                                  <span className="text-rose-600 dark:text-rose-400 ml-1">
                                    ({bill.days_overdue}d overdue)
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="p-2.5 font-mono text-slate-600 dark:text-slate-300">
                              {bill.reference_number || "—"}
                            </td>
                            <td className="p-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {formatCurrency(bill.balance_amount)}
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
                                    [bill.id]: { ...prev[bill.id], allocated_amount: val },
                                  }));
                                }}
                                className="w-24 h-8 bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-lg px-2 text-right font-sans font-semibold text-rose-600 dark:text-rose-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs shadow-2xs"
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
                                    [bill.id]: { ...prev[bill.id], tds_amount: val },
                                  }));
                                }}
                                className="w-20 h-8 bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-lg px-2 text-right font-sans font-semibold text-purple-600 dark:text-purple-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs shadow-2xs"
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
                                    [bill.id]: { ...prev[bill.id], discount_amount: val },
                                  }));
                                }}
                                className="w-20 h-8 bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-lg px-2 text-right font-sans font-semibold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs shadow-2xs"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-semibold">
                              <span className={cn(isOverAllocated ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100")}>
                                {formatCurrency(rowTotal)}
                              </span>
                              {isOverAllocated && (
                                <p className="text-[9px] text-rose-600 dark:text-rose-400">Exceeds Balance!</p>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handlePayFullBill(bill)}
                                className="text-[10px] h-6 px-2 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60"
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
                        <td colSpan={3} className="p-2.5 text-right uppercase text-[10px] text-slate-500 dark:text-slate-400">
                          Allocated Totals:
                        </td>
                        <td className="p-2.5 text-right font-mono text-rose-600 dark:text-rose-400">
                          {formatCurrency(allocatedTotals.sumNet)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-purple-600 dark:text-purple-400">
                          {formatCurrency(allocatedTotals.sumTds)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(allocatedTotals.sumDisc)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-900 dark:text-slate-100 font-semibold">
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

          {/* Deductions & TDS section for non-allocated payments */}
          {paymentType !== "AGAINST_REF" && (
            <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                <Percent className="h-4 w-4" />
                Statutory TDS Deduction on Payment
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                    TDS Section
                  </label>
                  <select
                    value={tdsSection}
                    onChange={(e) => setTdsSection(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                  >
                    <option value="194C">Section 194C (Transporter / Contractor - 1% or 2%)</option>
                    <option value="194J">Section 194J (Professional / Technical - 2% or 10%)</option>
                    <option value="194Q">Section 194Q (Purchase of Goods - 0.1%)</option>
                    <option value="NONE">No TDS Deducted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                    TDS Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdsRate}
                    onChange={(e) => setTdsRate(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                    TDS Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdsAmount}
                    onChange={(e) => setTdsAmount(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-semibold rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                    Discount / Rebate Received (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-semibold rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Narration & Live Double-Entry Preview */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
                Narration / Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Cheque issued towards fuel bill settlement..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
              />
            </div>

            {/* Double-Entry Journal Preview Card */}
            <div className="rounded-xl border border-slate-200/90 dark:border-[#303036] bg-slate-50 dark:bg-[#101013] p-4 space-y-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                Live Tally Double-Entry Preview
              </span>
              <div className="text-xs font-mono space-y-1.5 pt-1">
                {paymentType === "AGAINST_REF" ? (
                  <>
                    <div className="flex justify-between text-slate-800 dark:text-slate-200">
                      <span>Dr. Vendor / Creditor Ledger (Settled Bills)</span>
                      <span>{formatCurrency(allocatedTotals.sumTotal)}</span>
                    </div>
                    {unappliedAdvance > 0 && (
                      <div className="flex justify-between text-cyan-400">
                        <span>Dr. Supplier Advances & Prepayments (Asset)</span>
                        <span>{formatCurrency(unappliedAdvance)}</span>
                      </div>
                    )}
                  </>
                ) : paymentType === "HIRE_CHALLAN" ? (
                  <div className="flex justify-between text-amber-400">
                    <span>Dr. Transporter / Vehicle Owner (Hire Challan)</span>
                    <span>{formatCurrency((parseFloat(amountToPay) || 0) + (parseFloat(tdsAmount) || 0))}</span>
                  </div>
                ) : paymentType === "DRIVER_ADVANCE" ? (
                  <div className="flex justify-between text-cyan-400">
                    <span>Dr. Driver Trip Advances (Current Asset)</span>
                    <span>{formatCurrency(parseFloat(amountToPay) || 0)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-purple-400">
                    <span>Dr. Business Expense / Payee Ledger</span>
                    <span>{formatCurrency(parseFloat(amountToPay) || 0)}</span>
                  </div>
                )}

                <div className="flex justify-between text-rose-600 dark:text-rose-400 border-t border-slate-200 dark:border-[#303036] pt-1 font-semibold">
                  <span>Cr. Bank / Cash Account (Funds disbursed)</span>
                  <span>{formatCurrency(parseFloat(amountToPay) || 0)}</span>
                </div>

                {(parseFloat(tdsAmount) > 0 || allocatedTotals.sumTds > 0) && (
                  <div className="flex justify-between text-purple-400">
                    <span>Cr. TDS Payable u/s {tdsSection} (Withheld Tax)</span>
                    <span>
                      {formatCurrency(paymentType === "AGAINST_REF" ? allocatedTotals.sumTds : parseFloat(tdsAmount))}
                    </span>
                  </div>
                )}

                {(parseFloat(discountAmount) > 0 || allocatedTotals.sumDisc > 0) && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Cr. Discount Received on Purchases (Income)</span>
                    <span>
                      {formatCurrency(paymentType === "AGAINST_REF" ? allocatedTotals.sumDisc : parseFloat(discountAmount))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <FormActionBar
            onCancel={() => setIsCreateOpen(false)}
            submitLabel="Post Payment Voucher"
            isSubmitting={isSubmitting}
          />
        </form>
      </EntityDrawer>

      {/* DRAWER 2: View Voucher Details & Ledger */}
      <EntityDrawer
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        title={selectedVoucher ? `Payment Voucher: ${selectedVoucher.voucher_number}` : "Voucher Details"}
        description="Inspect complete disbursement metadata, bill-wise settlements, and posted double-entry journal postings."
        size="lg"
      >
        {selectedVoucher && (
          <div className="space-y-6 pb-12">
            {/* Header Card */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#303036] bg-white dark:bg-[#17171B] p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Beneficiary / Payee</span>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{selectedVoucher.party_name || "Beneficiary"}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Total Value</span>
                  <p className="text-base font-bold font-mono text-rose-400">
                    {formatCurrency(selectedVoucher.net_amount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-[#303036] text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Date:</span>{" "}
                  <span className="text-slate-800 dark:text-slate-200">{formatDate(selectedVoucher.voucher_date)}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Mode:</span>{" "}
                  <span className="text-slate-800 dark:text-slate-200">{selectedVoucher.tax_breakup?.payment_mode || "BANK"}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Ref / Cheque:</span>{" "}
                  <span className="text-slate-800 dark:text-slate-200 font-mono">{selectedVoucher.reference_number || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{" "}
                  <span className={selectedVoucher.is_void ? "text-rose-400" : "text-emerald-400"}>
                    {selectedVoucher.is_void ? "VOIDED" : (selectedVoucher.payment_status || "PAID")}
                  </span>
                </div>
              </div>

              {selectedVoucher.narration && (
                <div className="text-xs text-slate-400 italic pt-1 border-t border-slate-100 dark:border-[#303036]">
                  &quot;{selectedVoucher.narration}&quot;
                </div>
              )}
            </div>

            {/* Bill Allocations List if any */}
            {selectedVoucher.bill_allocations && selectedVoucher.bill_allocations.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Settled Purchase Bills ({selectedVoucher.bill_allocations.length})
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#303036]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#101013] text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-[#303036]">
                      <tr>
                        <th className="p-2.5">Bill #</th>
                        <th className="p-2.5 text-right">Bank/Cash Applied</th>
                        <th className="p-2.5 text-right">TDS Retained</th>
                        <th className="p-2.5 text-right">Discount</th>
                        <th className="p-2.5 text-right">Total Settled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#303036] bg-white dark:bg-[#101013]">
                      {selectedVoucher.bill_allocations.map((ba) => (
                        <tr key={ba.id}>
                          <td className="p-2.5 font-mono text-blue-400 font-semibold">
                            {ba.invoice_number || `Bill #${ba.invoice_id}`}
                          </td>
                          <td className="p-2.5 text-right font-mono text-rose-400">
                            {formatCurrency(ba.allocated_amount)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-purple-400">
                            {formatCurrency(ba.tds_amount)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-emerald-400">
                            {formatCurrency(ba.discount_amount)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-900 dark:text-slate-100 font-semibold">
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
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#303036]">
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
                        <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">
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
                        <td className="p-2.5 text-right font-mono font-semibold text-rose-400">
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
                      <td className="p-2.5 text-right font-mono text-rose-400">
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
                Print Payment Voucher
              </Button>
            </div>
          </div>
        )}
      </EntityDrawer>

      {/* MODAL 3: Print Payment Voucher (Indian Transport Standard) */}
      {isPrintModalOpen && printVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative print:m-0 print:p-0 print:w-full print:shadow-none">
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <span className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-emerald-600" />
                Print Preview: Payment Voucher
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
              {/* Voucher Header */}
              <div className="text-center border-b pb-3 space-y-1">
                <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">
                  PAYMENT VOUCHER
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
                  <p><strong>Status:</strong> {printVoucher.is_void ? "VOIDED" : (printVoucher.payment_status || "PAID")}</p>
                </div>
              </div>

              {/* Paid To */}
              <div className="border rounded p-3 text-xs space-y-1 bg-slate-50">
                <p className="text-slate-500 uppercase text-[10px] font-sans">Paid with thanks to:</p>
                <p className="font-bold text-sm text-slate-900">{printVoucher.party_name || "Beneficiary"}</p>
                {printVoucher.party_gstin && (
                  <p className="text-slate-600">GSTIN: {printVoucher.party_gstin}</p>
                )}
              </div>

              {/* Amount in Numbers & Words */}
              <div className="border rounded p-3 space-y-2 bg-blue-50/50 border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600 uppercase font-sans">Amount Disbursed:</span>
                  <span className="text-xl font-bold font-mono text-blue-800">
                    {formatCurrency(printVoucher.net_amount)}
                  </span>
                </div>
                <div className="text-xs italic text-slate-700 border-t pt-1 border-blue-200">
                  <strong>In Words:</strong> {numberToWords(parseFloat(String(printVoucher.net_amount)) || 0)}
                </div>
              </div>

              {/* Bill Allocation Table if any */}
              {printVoucher.bill_allocations && printVoucher.bill_allocations.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 uppercase font-sans">
                    Settlement Breakdown Against Supplier Bills:
                  </span>
                  <table className="w-full text-left text-xs border">
                    <thead className="bg-slate-100 text-[10px] uppercase font-sans">
                      <tr className="border-b">
                        <th className="p-1.5">Bill #</th>
                        <th className="p-1.5 text-right">Bank/Cash Disbursed</th>
                        <th className="p-1.5 text-right">TDS Retained</th>
                        <th className="p-1.5 text-right">Discount</th>
                        <th className="p-1.5 text-right">Total Settled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-[11px]">
                      {printVoucher.bill_allocations.map((ba) => (
                        <tr key={ba.id}>
                          <td className="p-1.5 font-mono">{ba.invoice_number || `Bill #${ba.invoice_id}`}</td>
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
              <div className="pt-12 grid grid-cols-4 gap-2 text-center text-xs text-slate-700">
                <div className="border-t border-slate-400 pt-1">
                  Prepared By
                </div>
                <div className="border-t border-slate-400 pt-1">
                  Passed By
                </div>
                <div className="border-t border-slate-400 pt-1">
                  Authorised Signatory
                </div>
                <div className="border-t border-slate-400 pt-1">
                  Receiver&apos;s Signature
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Void Voucher Dialog */}
      <ConfirmDialog
        open={isVoidOpen}
        title={`Void Payment Voucher ${voidVoucherNumber}?`}
        description="Voiding this payment will automatically restore the outstanding balance of all linked purchase bills and Hire Challans, and post balanced reversing double-entry journal entries. This action cannot be undone."
        confirmText="Void & Reverse Payment"
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
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight mb-1 font-semibold">
            Reason for Voiding <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Cheque stopped / RTGS failed / wrong vendor selected..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
