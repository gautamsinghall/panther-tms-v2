"use client";
import { toast } from "@/lib/toast";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  ArrowLeftRight,
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
  Search,
  X,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Landmark,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
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

  function convertGroup(val: number): string {
    let str = "";
    if (val >= 100) {
      str += a[Math.floor(val / 100)] + "Hundred ";
      val %= 100;
    }
    if (val >= 20) {
      str += b[Math.floor(val / 10)] + " ";
      val %= 10;
    }
    if (val > 0) {
      str += a[val];
    }
    return str;
  }

  let result = "";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  if (crore > 0) result += convertGroup(crore) + "Crore ";
  if (lakh > 0) result += convertGroup(lakh) + "Lakh ";
  if (thousand > 0) result += convertGroup(thousand) + "Thousand ";
  if (remainder > 0) result += convertGroup(remainder);

  result = result.trim() + " Rupees";
  if (paise > 0) {
    result += " and " + convertGroup(paise).trim() + " Paise";
  }
  return result + " Only";
}

interface ContraAccountOption {
  id: number;
  name: string;
  code: string;
  account_type: "BANK" | "CASH";
  current_balance: number | string;
  balance_type: "DR" | "CR";
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
  reference_number?: string;
  total_amount: string | number;
  tax_amount: string | number;
  net_amount: string | number;
  paid_amount: string | number;
  balance_amount: string | number;
  narration?: string;
  is_void: boolean;
  void_reason?: string;
  tax_breakup?: Record<string, any>;
  ledger_entries: LedgerEntry[];
  created_at: string;
  issuing_office_name?: string;
}

type ContraType = "CASH_TO_BANK" | "BANK_TO_CASH" | "BANK_TO_BANK" | "CASH_TO_CASH";

export default function ContraVoucherPage() {
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Accounts Master
  const [eligibleAccounts, setEligibleAccounts] = useState<ContraAccountOption[]>([]);
  const [seriesInfo, setSeriesInfo] = useState<any>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Drawer 1: Record Contra Transfer
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [contraType, setContraType] = useState<ContraType>("CASH_TO_BANK");
  const [sourceAccountId, setSourceAccountId] = useState<string>("");
  const [destinationAccountId, setDestinationAccountId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [voucherDate, setVoucherDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [transferMode, setTransferMode] = useState<string>("BANK_TRANSFER");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [chequeNumber, setChequeNumber] = useState<string>("");
  const [chequeDate, setChequeDate] = useState<string>("");
  const [bankCharges, setBankCharges] = useState<string>("0");
  const [narration, setNarration] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTallyPreview, setShowTallyPreview] = useState(false);

  // Drawer 2: View Ledger Audit
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);

  // Modal 3: Print Voucher
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printVoucher, setPrintVoucher] = useState<VoucherRecord | null>(null);

  // Modal 4: Void Dialog
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const activeOffice = getActiveOffice();
      const officeParam = activeOffice?.id ? `?office_id=${activeOffice.id}` : "";

      const [vouchersRes, accountsRes, sInfo] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=CONTRA_VOUCHER"),
        apiClient<ContraAccountOption[]>("/api/v1/accounts/contra/accounts").catch(async () => {
          const raw = await apiClient<any[]>("/api/v1/misc/accounts").catch(() => []);
          return raw
            .filter((a) => {
              const code = (a.code || "").toUpperCase();
              const name = (a.name || "").toLowerCase();
              return code.includes("BANK") || code.includes("CASH") || name.includes("bank") || name.includes("cash");
            })
            .map((a) => ({
              id: a.id,
              name: a.name,
              code: a.code,
              account_type: ((a.code || "").toUpperCase().includes("CASH") ? "CASH" : "BANK") as "BANK" | "CASH",
              current_balance: a.opening_balance || 0,
              balance_type: a.opening_balance_type || "DR",
            }));
        }),
        apiClient<any>(`/api/v1/settings/series/check/CONTRA_VOUCHER${officeParam}`).catch(() => null),
      ]);

      setData(vouchersRes);
      setEligibleAccounts(accountsRes);
      setSeriesInfo(sInfo);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load contra vouchers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter accounts by type
  const cashAccounts = useMemo(() => {
    return eligibleAccounts.filter((a) => a.account_type === "CASH");
  }, [eligibleAccounts]);

  const bankAccounts = useMemo(() => {
    return eligibleAccounts.filter((a) => a.account_type === "BANK");
  }, [eligibleAccounts]);

  // Dynamic source and destination options based on contraType
  const sourceAccountOptions = useMemo(() => {
    if (contraType === "CASH_TO_BANK" || contraType === "CASH_TO_CASH") {
      return cashAccounts;
    }
    return bankAccounts;
  }, [contraType, cashAccounts, bankAccounts]);

  const destinationAccountOptions = useMemo(() => {
    let pool: ContraAccountOption[] = [];
    if (contraType === "CASH_TO_BANK" || contraType === "BANK_TO_BANK") {
      pool = bankAccounts;
    } else {
      pool = cashAccounts;
    }
    return pool.filter((a) => String(a.id) !== sourceAccountId);
  }, [contraType, cashAccounts, bankAccounts, sourceAccountId]);

  // Reset form when changing contraType or opening drawer
  const resetCreateForm = (newType?: ContraType) => {
    const selectedT = newType || contraType;
    setContraType(selectedT);
    setSourceAccountId("");
    setDestinationAccountId("");
    setAmount("");
    setVoucherDate(new Date().toISOString().split("T")[0]);
    setTransferMode(
      selectedT === "CASH_TO_BANK"
        ? "CASH_DEPOSIT"
        : selectedT === "BANK_TO_CASH"
        ? "CHEQUE"
        : selectedT === "CASH_TO_CASH"
        ? "INTERNAL_TRANSFER"
        : "NEFT_RTGS"
    );
    setReferenceNumber("");
    setChequeNumber("");
    setChequeDate("");
    setBankCharges("0");
    setNarration("");
    setShowTallyPreview(false);
  };

  // Selected account objects for live balance preview
  const selectedSourceAccount = useMemo(() => {
    return eligibleAccounts.find((a) => String(a.id) === sourceAccountId);
  }, [eligibleAccounts, sourceAccountId]);

  const selectedDestinationAccount = useMemo(() => {
    return eligibleAccounts.find((a) => String(a.id) === destinationAccountId);
  }, [eligibleAccounts, destinationAccountId]);

  // Post Contra Voucher Handler
  const handleCreateContra = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) {
      toast.warning("Transfer amount must be strictly greater than zero.");
      return;
    }
    if (!sourceAccountId) {
      toast.warning("Please select the source account ('Transfer From').");
      return;
    }
    if (!destinationAccountId) {
      toast.warning("Please select the destination account ('Transfer To').");
      return;
    }
    if (sourceAccountId === destinationAccountId) {
      toast.error("Source and Destination accounts cannot be the same.");
      return;
    }

    const bCharges = parseFloat(bankCharges) || 0;

    setIsSubmitting(true);
    try {
      const activeOffice = getActiveOffice();
      const payload = {
        contra_type: contraType,
        source_account_id: parseInt(sourceAccountId, 10),
        destination_account_id: parseInt(destinationAccountId, 10),
        amount: amt,
        voucher_date: voucherDate,
        transfer_mode: transferMode,
        reference_number: referenceNumber.trim() || undefined,
        cheque_number: chequeNumber.trim() || undefined,
        cheque_date: chequeDate ? chequeDate : undefined,
        bank_charges: bCharges,
        narration: narration.trim() || undefined,
        issuing_office_id: activeOffice?.id || undefined,
      };

      await apiClient("/api/v1/accounts/contra-vouchers", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Contra Voucher posted successfully with balanced double-entry entries!");
      setIsCreateOpen(false);
      resetCreateForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to post contra voucher.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Void Handler
  const handleVoidVoucher = async () => {
    if (!voidVoucherId) return;
    if (voidReason.trim().length < 10) {
      toast.warning("Void reason must be at least 10 characters as per audit rules.");
      return;
    }

    setIsVoiding(true);
    try {
      await apiClient(`/api/v1/accounts/vouchers/${voidVoucherId}/void`, {
        method: "POST",
        body: JSON.stringify({ void_reason: voidReason.trim() }),
      });
      toast.success(`Contra Voucher #${voidVoucherId} has been successfully voided and reversed.`);
      setIsVoidOpen(false);
      setVoidReason("");
      setVoidVoucherId(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to void contra voucher.");
    } finally {
      setIsVoiding(false);
    }
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    const valid = data.filter((v) => !v.is_void);
    const totalTransfers = valid.reduce((sum, v) => sum + (parseFloat(String(v.net_amount)) || 0), 0);

    const cashDeposited = valid
      .filter((v) => (v.tax_breakup?.contra_type || "").toUpperCase() === "CASH_TO_BANK" || (v.party_name || "").toLowerCase().includes("deposit"))
      .reduce((sum, v) => sum + (parseFloat(String(v.net_amount)) || 0), 0);

    const cashWithdrawn = valid
      .filter((v) => (v.tax_breakup?.contra_type || "").toUpperCase() === "BANK_TO_CASH" || (v.party_name || "").toLowerCase().includes("withdrawal"))
      .reduce((sum, v) => sum + (parseFloat(String(v.net_amount)) || 0), 0);

    const interbank = valid
      .filter((v) => (v.tax_breakup?.contra_type || "").toUpperCase() === "BANK_TO_BANK" || (v.party_name || "").toLowerCase().includes("inter-bank") || (v.party_name || "").toLowerCase().includes("interbank"))
      .reduce((sum, v) => sum + (parseFloat(String(v.net_amount)) || 0), 0);

    return { totalTransfers, cashDeposited, cashWithdrawn, interbank, count: valid.length };
  }, [data]);

  // Filtered Records
  const filteredData = useMemo(() => {
    return data.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        v.voucher_number.toLowerCase().includes(q) ||
        (v.party_name || "").toLowerCase().includes(q) ||
        (v.reference_number || "").toLowerCase().includes(q) ||
        (v.narration || "").toLowerCase().includes(q);

      const cType = (v.tax_breakup?.contra_type || "").toUpperCase();
      const matchType =
        filterType === "ALL" ||
        cType === filterType ||
        (filterType === "CASH_TO_BANK" && (v.party_name || "").toLowerCase().includes("deposit")) ||
        (filterType === "BANK_TO_CASH" && (v.party_name || "").toLowerCase().includes("withdrawal")) ||
        (filterType === "BANK_TO_BANK" && (v.party_name || "").toLowerCase().includes("inter"));

      const matchStatus =
        filterStatus === "ALL" ||
        (filterStatus === "POSTED" && !v.is_void) ||
        (filterStatus === "VOID" && v.is_void);

      return matchQuery && matchType && matchStatus;
    });
  }, [data, searchQuery, filterType, filterStatus]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.warning("No contra voucher records to export.");
      return;
    }

    const headers = [
      "Voucher Number",
      "Voucher Date",
      "Transfer Nature",
      "Contra Type",
      "Source Account",
      "Destination Account",
      "Reference Number",
      "Transfer Mode",
      "Transferred Amount (INR)",
      "Bank Charges (INR)",
      "Total Disbursed (INR)",
      "Status",
      "Narration",
    ];

    const rows = filteredData.map((v) => {
      const tb = v.tax_breakup || {};
      return [
        v.voucher_number,
        v.voucher_date,
        `"${(v.party_name || "").replace(/"/g, '""')}"`,
        tb.contra_type || "CONTRA",
        `"${(tb.source_account_name || "").replace(/"/g, '""')}"`,
        `"${(tb.destination_account_name || "").replace(/"/g, '""')}"`,
        `"${(v.reference_number || "").replace(/"/g, '""')}"`,
        tb.transfer_mode || "TRANSFER",
        parseFloat(String(v.net_amount || 0)).toFixed(2),
        parseFloat(String(tb.bank_charges || 0)).toFixed(2),
        parseFloat(String(v.total_amount || 0)).toFixed(2),
        v.is_void ? "VOIDED" : "POSTED",
        `"${(v.narration || "").replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Contra_Vouchers_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Contra Vouchers exported to CSV successfully!");
  };

  // Table Columns
  const columns: ColumnDef<VoucherRecord>[] = [
    {
      key: "voucher_number",
      header: "Contra No & Date",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            {row.voucher_number}
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(row.voucher_date)}</span>
        </div>
      ),
    },
    {
      key: "party_name",
      header: "Transfer Details",
      cell: (row) => {
        const tb = row.tax_breakup || {};
        const src = tb.source_account_name;
        const dst = tb.destination_account_name;

        return (
          <div className="space-y-0.5 max-w-[280px]">
            <span className="font-medium text-slate-800 dark:text-slate-200 block text-xs truncate">
              {row.party_name || "Internal Fund Movement"}
            </span>
            {src && dst ? (
              <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                <span className="text-rose-600 dark:text-rose-400 truncate max-w-[120px]">{src}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[120px]">{dst}</span>
              </span>
            ) : null}
            {row.reference_number && (
              <span className="block font-mono text-[11px] text-slate-400 dark:text-slate-500">
                Ref: {row.reference_number}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "transfer_type",
      header: "Category",
      cell: (row) => {
        const cType = (row.tax_breakup?.contra_type || "").toUpperCase();
        if (cType === "CASH_TO_BANK" || (row.party_name || "").toLowerCase().includes("deposit")) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300">
              <Landmark className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              Cash Deposit
            </span>
          );
        }
        if (cType === "BANK_TO_CASH" || (row.party_name || "").toLowerCase().includes("withdrawal")) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-300">
              <Wallet className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
              Cash Withdrawal
            </span>
          );
        }
        if (cType === "BANK_TO_BANK" || (row.party_name || "").toLowerCase().includes("inter")) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300">
              <Building2 className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
              Inter-Bank
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300">
            <ArrowLeftRight className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            Cash to Cash
          </span>
        );
      },
    },
    {
      key: "net_amount",
      header: "Transferred Amount",
      align: "right",
      sortable: true,
      cell: (row) => (
        <div className="text-right">
          <span className="font-mono font-bold text-slate-900 dark:text-white text-sm tabular-nums">
            {formatCurrency(parseFloat(String(row.net_amount)) || 0)}
          </span>
          {row.tax_breakup?.bank_charges && parseFloat(row.tax_breakup.bank_charges) > 0 && (
            <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-mono">
              + Charges: {formatCurrency(parseFloat(row.tax_breakup.bank_charges))}
            </span>
          )}
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

  // Table Row Actions
  const actions: RowAction<VoucherRecord>[] = [
    {
      label: "View Ledger",
      icon: <Eye className="w-3.5 h-3.5" />,
      variant: "default",
      onClick: (row) => {
        setSelectedVoucher(row);
        setIsLedgerOpen(true);
      },
    },
    {
      label: "Print Voucher",
      icon: <Printer className="w-3.5 h-3.5" />,
      variant: "default",
      onClick: (row) => {
        setPrintVoucher(row);
        setIsPrintModalOpen(true);
      },
    },
    {
      label: "Void Contra",
      icon: <Ban className="w-3.5 h-3.5 text-rose-500" />,
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
      {/* Page Header */}
      <PageHeader
        title="Contra Vouchers (Fund Transfers)"
        description="Internal cash and bank account transfers. Strict Indian double-entry bookkeeping with zero profit/loss distortion."
        breadcrumbs={[
          { label: "Accounts", href: "/accounts" },
          { label: "Contra Vouchers" },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#17171B] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs font-medium"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => {
                resetCreateForm("CASH_TO_BANK");
                setIsCreateOpen(true);
              }}
              className="bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-xs font-semibold rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Record Contra Transfer
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Fund Transfers"
          value={formatCurrency(kpis.totalTransfers)}
          subtext={`${kpis.count} internal transactions posted`}
          icon={<ArrowLeftRight className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
        />
        <KpiCard
          title="Cash Deposited to Bank"
          value={formatCurrency(kpis.cashDeposited)}
          subtext="Cash-in-hand credited to bank accounts"
          icon={<Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
        />
        <KpiCard
          title="Cash Withdrawn (Self/ATM)"
          value={formatCurrency(kpis.cashWithdrawn)}
          subtext="Bank liquidity converted to office cash"
          icon={<Wallet className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
        />
        <KpiCard
          title="Inter-Bank Transfers"
          value={formatCurrency(kpis.interbank)}
          subtext="Bank A to Bank B rebalancing"
          icon={<Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
        />
      </div>
      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search contra vouchers by voucher #, account name, reference, or narration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#0E0F15] border border-slate-200 dark:border-[#2B2E42] rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white dark:bg-[#0E0F15] border border-slate-200 dark:border-[#2B2E42] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            >
              <option value="ALL">All Categories</option>
              <option value="CASH_TO_BANK">Cash Deposit (Cash &rarr; Bank)</option>
              <option value="BANK_TO_CASH">Cash Withdrawal (Bank &rarr; Cash)</option>
              <option value="BANK_TO_BANK">Inter-Bank (Bank &rarr; Bank)</option>
              <option value="CASH_TO_CASH">Cash to Cash (Internal Move)</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white dark:bg-[#0E0F15] border border-slate-200 dark:border-[#2B2E42] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            >
              <option value="ALL">All Status</option>
              <option value="POSTED">Posted (Active)</option>
              <option value="VOID">Voided (Reversed)</option>
            </select>

            {(searchQuery || filterType !== "ALL" || filterStatus !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("ALL");
                  setFilterStatus("ALL");
                }}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs px-2.5 rounded-xl"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Reset
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
        emptyState={
          <div className="py-12 text-center">
            <ArrowLeftRight className="h-10 w-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Contra Vouchers found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Click &quot;Record Contra Transfer&quot; to transfer funds between cash and bank accounts.
            </p>
            <Button
              size="sm"
              onClick={() => {
                resetCreateForm("CASH_TO_BANK");
                setIsCreateOpen(true);
              }}
              className="mt-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-xl shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Record Contra Transfer
            </Button>
          </div>
        }
      />

      {/* DRAWER 1: Record Contra Transfer (Friendly & Guided) */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Record Contra Transfer (Move Money)"
        description="Internal fund movement between your company's cash and bank accounts. Strictly balanced double-entry accounting with zero trading profit or loss."
        size="xl"
      >
        <form onSubmit={handleCreateContra} className="space-y-6 pb-20">
          {/* Step 1: Select Transfer Category (4 Big Easy Cards) */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm border-b border-slate-100 dark:border-[#303036] pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                1
              </span>
              What Kind of Fund Transfer Is This?
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Option 1: Cash to Bank */}
              <button
                type="button"
                onClick={() => resetCreateForm("CASH_TO_BANK")}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between shadow-2xs",
                  contraType === "CASH_TO_BANK"
                    ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20"
                    : "border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#17171B] hover:border-slate-300 hover:bg-slate-50/50"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                      <Landmark className="h-4 w-4" />
                    </span>
                    {contraType === "CASH_TO_BANK" && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white text-xs">Deposit Cash into Bank</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Deposit cash from cash register / drawer into company bank account.
                  </p>
                </div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-2 font-mono font-semibold">
                  Dr. Bank / Cr. Cash
                </span>
              </button>

              {/* Option 2: Bank to Cash */}
              <button
                type="button"
                onClick={() => resetCreateForm("BANK_TO_CASH")}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between shadow-2xs",
                  contraType === "BANK_TO_CASH"
                    ? "border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/30 ring-2 ring-cyan-500/20"
                    : "border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#17171B] hover:border-slate-300 hover:bg-slate-50/50"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/40">
                      <Wallet className="h-4 w-4" />
                    </span>
                    {contraType === "BANK_TO_CASH" && (
                      <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white text-xs">Withdraw Cash from Bank</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Withdraw funds via self cheque or ATM for operational cash needs.
                  </p>
                </div>
                <span className="text-[10px] text-cyan-700 dark:text-cyan-400 mt-2 font-mono font-semibold">
                  Dr. Cash / Cr. Bank
                </span>
              </button>

              {/* Option 3: Bank to Bank */}
              <button
                type="button"
                onClick={() => resetCreateForm("BANK_TO_BANK")}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between shadow-2xs",
                  contraType === "BANK_TO_BANK"
                    ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                    : "border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#17171B] hover:border-slate-300 hover:bg-slate-50/50"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                      <Building2 className="h-4 w-4" />
                    </span>
                    {contraType === "BANK_TO_BANK" && (
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white text-xs">Transfer Between Banks</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Move funds from Bank A to Bank B (e.g. HDFC to ICICI) via NEFT/RTGS.
                  </p>
                </div>
                <span className="text-[10px] text-indigo-700 dark:text-indigo-400 mt-2 font-mono font-semibold">
                  Dr. Bank B / Cr. Bank A
                </span>
              </button>

              {/* Option 4: Cash to Cash */}
              <button
                type="button"
                onClick={() => resetCreateForm("CASH_TO_CASH")}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between shadow-2xs",
                  contraType === "CASH_TO_CASH"
                    ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 ring-2 ring-amber-500/20"
                    : "border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#17171B] hover:border-slate-300 hover:bg-slate-50/50"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                      <ArrowLeftRight className="h-4 w-4" />
                    </span>
                    {contraType === "CASH_TO_CASH" && (
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white text-xs">Transfer Between Cash Accounts</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Move cash internally (e.g. Main Cash to Petty Cash / Branch Drawer).
                  </p>
                </div>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 mt-2 font-mono font-semibold">
                  Dr. Petty / Cr. Main Cash
                </span>
              </button>
            </div>
          </div>

          {/* Step 2: Source & Destination Accounts */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm border-b border-slate-100 dark:border-[#303036] pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                2
              </span>
              Where Is The Money Moving From &amp; To?
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Transfer From (Credit) */}
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                    <ArrowUpRight className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                    Transfer From (Source Account) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 font-mono font-bold">
                    Credit (Cr) - Outflow
                  </span>
                </div>

                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-[#0E0F15] border border-rose-300 dark:border-rose-900/60 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 shadow-2xs transition-all font-medium"
                >
                  <option value="">-- Select Source Account --</option>
                  {sourceAccountOptions.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.account_type}) — Bal: ₹{Number(acc.current_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })} {acc.balance_type}
                    </option>
                  ))}
                </select>

                {selectedSourceAccount && (
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span>Available Ledger Balance:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₹{Number(selectedSourceAccount.current_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })} {selectedSourceAccount.balance_type}
                    </span>
                  </div>
                )}
              </div>

              {/* Transfer To (Debit) */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Transfer To (Destination Account) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                    Debit (Dr) - Inflow
                  </span>
                </div>

                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-[#0E0F15] border border-emerald-300 dark:border-emerald-900/60 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all font-medium"
                >
                  <option value="">-- Select Destination Account --</option>
                  {destinationAccountOptions.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.account_type}) — Bal: ₹{Number(acc.current_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })} {acc.balance_type}
                    </option>
                  ))}
                </select>

                {selectedDestinationAccount && (
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span>Available Ledger Balance:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₹{Number(selectedDestinationAccount.current_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })} {selectedDestinationAccount.balance_type}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Amount, Date & Reference */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm border-b border-slate-100 dark:border-[#303036] pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                3
              </span>
              Transfer Amount &amp; Payment Particulars
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                  Amount to Transfer (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold font-mono rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all tabular-nums"
                />
                {amount && parseFloat(amount) > 0 && (
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 italic font-medium">
                    {numberToWords(parseFloat(amount))}
                  </p>
                )}
              </div>

              {/* Transfer Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                  Transfer Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                  Transfer Mode / Instrument
                </label>
                <select
                  value={transferMode}
                  onChange={(e) => setTransferMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS)</option>
                  <option value="IMPS">Instant Transfer (IMPS)</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                  <option value="CASH_DEPOSIT">Cash Deposit Slip</option>
                  <option value="ATM_WITHDRAWAL">ATM / Self Withdrawal</option>
                  <option value="INTERNAL_TRANSFER">Internal Cash Handover</option>
                </select>
              </div>
            </div>

            {/* Additional Fields: Reference & Cheque */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                  Deposit Slip / UTR / Reference #
                </label>
                <input
                  type="text"
                  placeholder="e.g. SLIP-88123 / UTR9823471"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                />
              </div>

              {transferMode === "CHEQUE" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                      Cheque Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 004812"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
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
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                    Bank Charges / IMPS Fee (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={bankCharges}
                    onChange={(e) => setBankCharges(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Debits Bank Charges Expense without inflating contra transfer value.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
                Narration / Transfer Particulars
              </label>
              <textarea
                rows={2}
                placeholder="Brief internal note explaining this transfer..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
              />
            </div>
          </div>

          {/* Live Double-Entry & Confirmation Summary */}
          {amount && parseFloat(amount) > 0 && selectedSourceAccount && selectedDestinationAccount && (
            <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-indigo-200 dark:border-indigo-900/60 p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#303036] pb-3">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Live Transfer &amp; Accounting Confirmation
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300">
                  Double-Entry Balanced
                </span>
              </div>

              {/* Clear Human Phrase */}
              <div className="p-4 bg-slate-50 dark:bg-[#101013] rounded-xl border border-slate-200/80 dark:border-[#303036] text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">{formatCurrency(parseFloat(amount))}</span>
                <span>will move out of</span>
                <span className="font-bold text-rose-700 dark:text-rose-400">{selectedSourceAccount.name}</span>
                <span>and deposit into</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{selectedDestinationAccount.name}</span>
              </div>

              {/* Collapsible Tally Journal Entry Breakdown */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowTallyPreview(!showTallyPreview)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold flex items-center gap-1"
                >
                  {showTallyPreview ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showTallyPreview ? "Hide" : "Show"} Tally Prime Journal Posting Breakdown
                </button>

                {showTallyPreview && (
                  <div className="mt-3 text-xs font-mono border border-slate-200 dark:border-[#2B2E42] rounded-xl overflow-hidden shadow-2xs">
                    <div className="bg-slate-50 dark:bg-[#101013] p-3 flex justify-between text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-[#303036]">
                      <span>Account</span>
                      <span>Debit (Dr) / Credit (Cr)</span>
                    </div>
                    {/* Debit: Destination */}
                    <div className="p-3 flex justify-between text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#17171B] font-semibold">
                      <span>Dr. {selectedDestinationAccount.name} (Inflow)</span>
                      <span>{formatCurrency(parseFloat(amount))}</span>
                    </div>
                    {/* Debit: Bank Charges (if any) */}
                    {parseFloat(bankCharges) > 0 && (
                      <div className="p-3 flex justify-between text-amber-700 dark:text-amber-400 bg-white dark:bg-[#17171B] border-t border-slate-100 dark:border-[#303036]">
                        <span>Dr. Bank Charges Expense</span>
                        <span>{formatCurrency(parseFloat(bankCharges))}</span>
                      </div>
                    )}
                    {/* Credit: Source */}
                    <div className="p-3 flex justify-between text-rose-700 dark:text-rose-400 bg-white dark:bg-[#17171B] border-t border-slate-100 dark:border-[#303036] font-semibold">
                      <span>Cr. {selectedSourceAccount.name} (Outflow)</span>
                      <span>{formatCurrency(parseFloat(amount) + (parseFloat(bankCharges) || 0))}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <FormActionBar
            onCancel={() => setIsCreateOpen(false)}
            submitLabel="Confirm & Post Contra Transfer"
            isSubmitting={isSubmitting}
          />
        </form>
      </EntityDrawer>

      {/* DRAWER 2: View Voucher Details & Double-Entry Ledger */}
      <EntityDrawer
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        title={selectedVoucher ? `Contra Voucher: ${selectedVoucher.voucher_number}` : "Voucher Details"}
        description="Inspect complete internal fund transfer metadata and double-entry ledger postings."
        size="lg"
      >
        {selectedVoucher && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">VOUCHER NUMBER</span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">{selectedVoucher.voucher_number}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TRANSFER DATE</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{formatDate(selectedVoucher.voucher_date)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-100 dark:border-[#303036]">
                <div>
                  <span className="text-slate-500 block">Transferred:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm font-mono">{formatCurrency(parseFloat(String(selectedVoucher.net_amount)) || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Nature:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedVoucher.party_name || "Contra Transfer"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mode:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedVoucher.tax_breakup?.transfer_mode || "BANK_TRANSFER"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  <StatusBadge status={selectedVoucher.is_void ? "VOIDED" : "POSTED"} variant={selectedVoucher.is_void ? "danger" : "success"} />
                </div>
              </div>

              {selectedVoucher.narration && (
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#101013] p-3 rounded-xl border border-slate-200/80 dark:border-[#303036]">
                  <strong>Narration:</strong> {selectedVoucher.narration}
                </div>
              )}
            </div>

            {/* Double-Entry Journal Postings */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono">
                <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Double-Entry Ledger Postings
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#303036] shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-[#101013] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-[#303036] font-bold">
                    <tr>
                      <th className="p-3">Ledger Account</th>
                      <th className="p-3 text-right">Debit (Dr) ₹</th>
                      <th className="p-3 text-right">Credit (Cr) ₹</th>
                      <th className="p-3">Entry Narration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {selectedVoucher.ledger_entries.map((le) => (
                      <tr key={le.id} className={cn(le.is_reversal && "bg-rose-50 dark:bg-rose-950/20 text-rose-700")}>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {le.account_name || `Account #${le.account_id}`}
                          {le.is_reversal && (
                            <span className="ml-2 text-[10px] font-bold text-rose-600 uppercase">[Reversal]</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                          {parseFloat(String(le.debit_amount)) > 0 ? formatCurrency(parseFloat(String(le.debit_amount))) : "—"}
                        </td>
                        <td className="p-3 text-right text-rose-700 dark:text-rose-400 font-bold tabular-nums">
                          {parseFloat(String(le.credit_amount)) > 0 ? formatCurrency(parseFloat(String(le.credit_amount))) : "—"}
                        </td>
                        <td className="p-3 text-slate-500 font-sans text-xs">{le.narration || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </EntityDrawer>

      {/* MODAL 3: Print Contra Voucher (Indian Transport Standard) */}
      {isPrintModalOpen && printVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 relative print:m-0 print:p-0 print:w-full print:shadow-none">
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold tracking-tight uppercase">PANTHER LOGISTICS &amp; TRANSPORT</h2>
                <p className="text-xs text-slate-600">Enterprise Transport Management System</p>
                <p className="text-xs text-slate-500 mt-0.5">Issuing Office: {printVoucher.issuing_office_name || "Head Office (MUM-HO)"}</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-indigo-600 text-white text-xs font-bold uppercase rounded-lg">
                  CONTRA VOUCHER
                </span>
                <p className="text-xs font-mono font-bold mt-1">{printVoucher.voucher_number}</p>
                <p className="text-xs text-slate-600">{formatDate(printVoucher.voucher_date)}</p>
              </div>
            </div>

            {/* Transfer Summary */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p><strong>Transfer Nature:</strong> {printVoucher.party_name || "Internal Fund Movement"}</p>
                <p><strong>Instrument / Mode:</strong> {printVoucher.tax_breakup?.transfer_mode || "BANK_TRANSFER"}</p>
                {printVoucher.reference_number && (
                  <p><strong>Slip / UTR Ref #:</strong> <span className="font-mono">{printVoucher.reference_number}</span></p>
                )}
                {printVoucher.tax_breakup?.cheque_number && (
                  <p><strong>Cheque #:</strong> <span className="font-mono">{printVoucher.tax_breakup.cheque_number}</span></p>
                )}
              </div>
              <div>
                <p><strong>Source Account (Cr):</strong> {printVoucher.tax_breakup?.source_account_name || "Cash/Bank"}</p>
                <p><strong>Destination Account (Dr):</strong> {printVoucher.tax_breakup?.destination_account_name || "Bank/Cash"}</p>
                <p><strong>Amount:</strong> <span className="font-bold font-mono">{formatCurrency(parseFloat(String(printVoucher.net_amount)) || 0)}</span></p>
              </div>
            </div>

            {/* Amount in Words */}
            <div className="text-xs border-l-4 border-slate-900 pl-3 py-2 bg-slate-50 italic rounded-r-lg">
              <strong>Amount in Words:</strong> {numberToWords(parseFloat(String(printVoucher.net_amount)) || 0)}
            </div>

            {/* Ledger Postings Table */}
            <div>
              <h4 className="text-xs font-bold uppercase mb-1">Double-Entry Journal Postings</h4>
              <table className="w-full text-xs border border-slate-300 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                  <tr>
                    <th className="p-2 text-left">Particulars</th>
                    <th className="p-2 text-right">Debit (Dr) ₹</th>
                    <th className="p-2 text-right">Credit (Cr) ₹</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {printVoucher.ledger_entries.map((le) => (
                    <tr key={le.id}>
                      <td className="p-2 font-sans">
                        {le.account_name || `Account #${le.account_id}`}
                        <span className="block text-[10px] text-slate-500 font-mono">{le.narration}</span>
                      </td>
                      <td className="p-2 text-right font-semibold">
                        {parseFloat(String(le.debit_amount)) > 0 ? formatCurrency(parseFloat(String(le.debit_amount))) : "—"}
                      </td>
                      <td className="p-2 text-right font-semibold">
                        {parseFloat(String(le.credit_amount)) > 0 ? formatCurrency(parseFloat(String(le.credit_amount))) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="pt-8 border-t border-slate-300 grid grid-cols-4 gap-4 text-center text-xs">
              <div>
                <div className="border-b border-slate-400 mb-1 h-10" />
                <span className="text-slate-600 font-medium">Prepared By</span>
              </div>
              <div>
                <div className="border-b border-slate-400 mb-1 h-10" />
                <span className="text-slate-600 font-medium">Verified By</span>
              </div>
              <div>
                <div className="border-b border-slate-400 mb-1 h-10" />
                <span className="text-slate-600 font-medium">Authorized Signatory</span>
              </div>
              <div>
                <div className="border-b border-slate-400 mb-1 h-10" />
                <span className="text-slate-600 font-medium">Receiver / Depositor</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
              <Button variant="outline" size="sm" onClick={() => setIsPrintModalOpen(false)} className="rounded-xl">
                Close
              </Button>
              <Button size="sm" onClick={() => window.print()} className="bg-[#4F46E5] text-white hover:bg-[#4338CA] rounded-xl font-medium">
                <Printer className="h-4 w-4 mr-1.5" />
                Print Voucher
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Void Confirm Dialog */}
      <ConfirmDialog
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        onConfirm={handleVoidVoucher}
        title={`Void Contra Voucher #${voidVoucherId || ""}`}
        description="Voiding reverses the double-entry accounting ledger entries automatically and restores both account balances. This action is irreversible."
        confirmText="Confirm Void"
        variant="danger"
        isLoading={isVoiding}
        disabled={voidReason.trim().length < 10}
      >
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reason for Voiding * (Min 10 characters)
          </label>
          <textarea
            required
            rows={3}
            placeholder="Explain why this internal fund transfer is being reversed..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs transition-all"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
