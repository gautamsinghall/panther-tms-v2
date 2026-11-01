"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Scale,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Printer,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Calendar,
  FileText,
  RotateCcw,
  Copy,
  TrendingDown,
  TrendingUp,
  Layers,
  Sparkles,
  Info,
  Tag,
  Paperclip,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

// -----------------------------------------------------------------------------
// Indian Rupees Number to Words Helper
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Interfaces
// -----------------------------------------------------------------------------
interface Branch {
  id: number;
  code: string;
  name: string;
  city?: string;
  state?: string;
}

interface AccountItem {
  id: number;
  name: string;
  code: string;
  group_name?: string;
  subgroup_name?: string;
  opening_balance?: string | number;
  opening_balance_type?: string;
  is_active: boolean;
}

interface LedgerEntryItem {
  id: number;
  account_id: number;
  account_name?: string;
  account_code?: string;
  group_name?: string;
  debit_amount: string | number;
  credit_amount: string | number;
  narration?: string;
  is_reversal: boolean;
}

interface VoucherRecord {
  id: number;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  party_name?: string;
  reference_number?: string;
  reference_date?: string;
  total_amount: string | number;
  net_amount: string | number;
  narration?: string;
  cost_center?: string;
  issuing_office_id?: number;
  issuing_office_name?: string;
  note_category?: string;
  attachment_url?: string;
  payment_status: string;
  is_void: boolean;
  void_reason?: string;
  voided_at?: string;
  tax_breakup?: any;
  ledger_entries: LedgerEntryItem[];
  created_at: string;
}

interface AdjustmentTypeMeta {
  code: string;
  label: string;
  description: string;
  typical_debit_ledger: string;
  typical_credit_ledger: string;
  default_narration: string;
  suggested_debit_account_code?: string;
  suggested_credit_account_code?: string;
}

interface JournalLineForm {
  account_id: number | "";
  debit_amount: string;
  credit_amount: string;
  narration: string;
  cost_center?: string;
}

// -----------------------------------------------------------------------------
// Default 14 Indian Accounting Adjustment Types
// -----------------------------------------------------------------------------
const DEFAULT_ADJUSTMENT_TYPES: AdjustmentTypeMeta[] = [
  {
    code: "GENERAL",
    label: "General Journal Entry",
    description: "Standard non-cash double-entry accounting adjustment between general ledger accounts.",
    typical_debit_ledger: "Appropriate Expense / Asset / Liability Ledger",
    typical_credit_ledger: "Appropriate Revenue / Liability / Asset Ledger",
    default_narration: "General non-cash accounting adjustment",
  },
  {
    code: "DEPRECIATION",
    label: "Depreciation",
    description: "Charge periodic depreciation on transport trucks, trailers, material handling equipment, and computers.",
    typical_debit_ledger: "Depreciation on Vehicles & Equipment (Dr)",
    typical_credit_ledger: "Accumulated Depreciation Account (Cr)",
    default_narration: "Depreciation charged on commercial fleet assets per Accounting Standard 10",
    suggested_debit_account_code: "ACC_DEPRECIATION_EXP",
    suggested_credit_account_code: "ACC_ACCUMULATED_DEP",
  },
  {
    code: "OUTSTANDING_EXPENSE",
    label: "Outstanding Expense",
    description: "Accrue unpaid transport expenses, driver trip charges, rent, or salaries for the accounting period.",
    typical_debit_ledger: "Relevant Operational Expense (Dr)",
    typical_credit_ledger: "Outstanding Expenses Payable (Cr)",
    default_narration: "Accrual of outstanding expenses payable for the period",
    suggested_debit_account_code: "ACC_TRUCK_HIRE_EXP",
    suggested_credit_account_code: "ACC_OUTSTANDING_EXP",
  },
  {
    code: "PREPAID_EXPENSE",
    label: "Prepaid Expense Adjustment",
    description: "Amortize prepaid vehicle insurance, national permits, road taxes, or advance facility rentals.",
    typical_debit_ledger: "Insurance / Operational Expense (Dr)",
    typical_credit_ledger: "Prepaid Expenses & Insurance Asset (Cr)",
    default_narration: "Periodic recognition and amortization of prepaid insurance and permits",
    suggested_debit_account_code: "ACC_OFFICE_EXP",
    suggested_credit_account_code: "ACC_PREPAID_EXP",
  },
  {
    code: "ACCRUED_INCOME",
    label: "Accrued Income",
    description: "Recognize earned freight revenue, demurrage, or warehousing fees prior to formal invoice generation.",
    typical_debit_ledger: "Accrued Freight & Other Income (Dr)",
    typical_credit_ledger: "Freight / Warehousing Revenue (Cr)",
    default_narration: "Accrual of freight and handling income earned during the period",
    suggested_debit_account_code: "ACC_ACCRUED_INCOME",
    suggested_credit_account_code: "ACC_FREIGHT_REV",
  },
  {
    code: "EXPENSE_ADJUSTMENT",
    label: "Expense Adjustment",
    description: "Reclassify operational freight expenses, fuel, maintenance, or administrative overheads.",
    typical_debit_ledger: "Target Expense Account",
    typical_credit_ledger: "Source Expense Account",
    default_narration: "Reclassification of operational expenses between cost heads",
    suggested_debit_account_code: "ACC_VEHICLE_MAINT_EXP",
    suggested_credit_account_code: "ACC_OFFICE_EXP",
  },
  {
    code: "PROVISION_ENTRY",
    label: "Provision Entry",
    description: "Record prudent provisions for known liabilities of uncertain timing or amount per AS-29.",
    typical_debit_ledger: "Profit & Loss / Expense Account (Dr)",
    typical_credit_ledger: "Provision for Expenses & Contingencies (Cr)",
    default_narration: "Provision created for estimated logistics liabilities and contingent expenses",
    suggested_debit_account_code: "ACC_PROVISION_EXP",
    suggested_credit_account_code: "ACC_OUTSTANDING_EXP",
  },
  {
    code: "LEDGER_ADJUSTMENT",
    label: "Ledger Adjustment",
    description: "Internal balance adjustments between distinct general ledger heads without cash involvement.",
    typical_debit_ledger: "Receiving Ledger (Dr)",
    typical_credit_ledger: "Relinquishing Ledger (Cr)",
    default_narration: "Internal ledger balance adjustment",
  },
  {
    code: "PARTY_ADJUSTMENT",
    label: "Vendor / Customer Adjustment",
    description: "Reconcile agreed mutual trade settlements between vendor credit and customer debit balances.",
    typical_debit_ledger: "Vendor Account / Creditor (Dr)",
    typical_credit_ledger: "Customer Account / Debtor (Cr)",
    default_narration: "Mutual settlement adjustment between vendor and customer accounts",
    suggested_debit_account_code: "ACC_SUNDRY_CREDITORS",
    suggested_credit_account_code: "ACC_SUNDRY_DEBTORS",
  },
  {
    code: "DRIVER_ADJUSTMENT",
    label: "Driver Account Adjustment",
    description: "Settle verified driver trip advances against approved operational trip expenses and shortages.",
    typical_debit_ledger: "Trip Fuel / Handling / Shortage Expense (Dr)",
    typical_credit_ledger: "Driver Trip Advances (Cr)",
    default_narration: "Driver trip advance adjustment against verified trip expenses",
    suggested_debit_account_code: "ACC_HANDLING_EXP",
    suggested_credit_account_code: "ACC_DRIVER_ADVANCES",
  },
  {
    code: "GST_ADJUSTMENT",
    label: "GST Adjustment",
    description: "Record statutory GST adjustments, blocked credit reversals under Sec 17(5), or tax liability adjustments.",
    typical_debit_ledger: "Expense / ITC Reversal Account (Dr)",
    typical_credit_ledger: "GST Input Tax Ledger (Cr)",
    default_narration: "GST ITC reversal under Section 17(5) / Rule 42 of CGST Rules",
    suggested_debit_account_code: "ACC_OFFICE_EXP",
    suggested_credit_account_code: "ACC_GST_IN_IGST",
  },
  {
    code: "TDS_ADJUSTMENT",
    label: "TDS Adjustment",
    description: "Reconcile TDS deducted under Sec 194C/194J against Form 26AS, AIS, or statutory challan dues.",
    typical_debit_ledger: "TDS Payable / Statutory Dues (Dr)",
    typical_credit_ledger: "TDS Receivable / Expense Account (Cr)",
    default_narration: "TDS reconciliation with Form 26AS/AIS and statutory tax accounts",
    suggested_debit_account_code: "ACC_TDS_PAYABLE_194C",
    suggested_credit_account_code: "ACC_TDS_RECEIVABLE",
  },
  {
    code: "YEAR_END_ADJUSTMENT",
    label: "Financial Year-End Adjustment",
    description: "Statutory audit adjustments, rounding write-offs, and final financial year closing adjustments.",
    typical_debit_ledger: "Round Off / Bad Debts Written Off (Dr)",
    typical_credit_ledger: "Small Balances / Sundry Account (Cr)",
    default_narration: "Financial year-end closing and audit adjustment entry",
    suggested_debit_account_code: "ACC_ROUNDING_OFF",
    suggested_credit_account_code: "ACC_SUNDRY_DEBTORS",
  },
  {
    code: "CORRECTION_ENTRY",
    label: "Correction / Rectification Entry",
    description: "Rectify errors of commission or principle from prior transactions while preserving full audit history.",
    typical_debit_ledger: "Correct Ledger Head (Dr)",
    typical_credit_ledger: "Erroneously Posted Ledger Head (Cr)",
    default_narration: "Rectification entry correcting wrong account classification in prior period",
  },
];

export default function JournalVouchersPage() {
  const router = useRouter();

  // Data states
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [adjustmentTypes, setAdjustmentTypes] = useState<AdjustmentTypeMeta[]>(DEFAULT_ADJUSTMENT_TYPES);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOfficeFilter, setSelectedOfficeFilter] = useState<string>("ALL");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [fromDateFilter, setFromDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTabMode, setActiveTabMode] = useState<"GUIDED" | "ADVANCED">("GUIDED");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Form fields
  const [formVoucherDate, setFormVoucherDate] = useState(new Date().toISOString().split("T")[0]);
  const [formOfficeId, setFormOfficeId] = useState<number | "">("");
  const [formAdjustmentType, setFormAdjustmentType] = useState("GENERAL");
  const [formReferenceNumber, setFormReferenceNumber] = useState("");
  const [formReferenceDate, setFormReferenceDate] = useState("");
  const [formCostCenter, setFormCostCenter] = useState("");
  const [formNarration, setFormNarration] = useState("");
  const [formInternalRemarks, setFormInternalRemarks] = useState("");
  const [formAttachmentUrl, setFormAttachmentUrl] = useState("");
  const [formAllowCashBank, setFormAllowCashBank] = useState(false);
  const [formGstTaxType, setFormGstTaxType] = useState("");
  const [formTdsSection, setFormTdsSection] = useState("");
  const [formLines, setFormLines] = useState<JournalLineForm[]>([
    { account_id: "", debit_amount: "", credit_amount: "", narration: "" },
    { account_id: "", debit_amount: "", credit_amount: "", narration: "" },
  ]);

  // Modals
  const [viewVoucher, setViewVoucher] = useState<VoucherRecord | null>(null);
  const [reverseDialog, setReverseDialog] = useState<{
    isOpen: boolean;
    voucher?: VoucherRecord;
    reason: string;
    isReversing?: boolean;
  }>({ isOpen: false, reason: "" });

  // ---------------------------------------------------------------------------
  // Load Initial Data
  // ---------------------------------------------------------------------------
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [vchRes, brRes, accRes, typesRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/journal-vouchers").catch(() => []),
        apiClient<Branch[]>("/api/v1/profile/branches").catch(() => []),
        apiClient<AccountItem[]>("/api/v1/misc/accounts").catch(() => []),
        apiClient<AdjustmentTypeMeta[]>("/api/v1/accounts/journal-vouchers/adjustment-types").catch(() => DEFAULT_ADJUSTMENT_TYPES),
      ]);
      setVouchers(vchRes || []);
      setBranches(brRes || []);
      setAccounts(accRes || []);
      if (typesRes && typesRes.length > 0) {
        setAdjustmentTypes(typesRes);
      }
      if (!formOfficeId && brRes && brRes.length > 0) {
        setFormOfficeId(brRes[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load journal vouchers:", err);
      toast.error("Failed to load journal vouchers.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------------------------------------------------------------------------
  // Live Balance Calculation
  // ---------------------------------------------------------------------------
  const totalDebit = useMemo(() => {
    return formLines.reduce((sum, line) => sum + (parseFloat(line.debit_amount) || 0), 0);
  }, [formLines]);

  const totalCredit = useMemo(() => {
    return formLines.reduce((sum, line) => sum + (parseFloat(line.credit_amount) || 0), 0);
  }, [formLines]);

  const difference = useMemo(() => {
    return Math.abs(totalDebit - totalCredit);
  }, [totalDebit, totalCredit]);

  const isBalanced = useMemo(() => {
    return totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.001;
  }, [totalDebit, totalCredit]);

  // ---------------------------------------------------------------------------
  // Guided Mode Helper: Auto-populate Recommended Accounts
  // ---------------------------------------------------------------------------
  const handleSelectAdjustmentType = (typeCode: string) => {
    setFormAdjustmentType(typeCode);
    const meta = adjustmentTypes.find((t) => t.code === typeCode) || DEFAULT_ADJUSTMENT_TYPES.find((t) => t.code === typeCode);
    if (!meta) return;

    // Suggest default narration
    setFormNarration(meta.default_narration);

    // Auto-fill suggested accounts if found in accounts list
    let suggestedDrId: number | "" = "";
    let suggestedCrId: number | "" = "";

    if (meta.suggested_debit_account_code) {
      const matchDr = accounts.find((a) => a.code === meta.suggested_debit_account_code);
      if (matchDr) suggestedDrId = matchDr.id;
    }
    if (meta.suggested_credit_account_code) {
      const matchCr = accounts.find((a) => a.code === meta.suggested_credit_account_code);
      if (matchCr) suggestedCrId = matchCr.id;
    }

    if (suggestedDrId || suggestedCrId) {
      setFormLines([
        {
          account_id: suggestedDrId,
          debit_amount: formLines[0]?.debit_amount || "",
          credit_amount: "",
          narration: meta.default_narration,
        },
        {
          account_id: suggestedCrId,
          debit_amount: "",
          credit_amount: formLines[1]?.credit_amount || formLines[0]?.debit_amount || "",
          narration: meta.default_narration,
        },
      ]);
    }
  };

  // ---------------------------------------------------------------------------
  // Line manipulation
  // ---------------------------------------------------------------------------
  const handleLineChange = (index: number, field: keyof JournalLineForm, value: any) => {
    const updated = [...formLines];
    if (field === "debit_amount" && value !== "") {
      updated[index] = { ...updated[index], debit_amount: value, credit_amount: "" };
    } else if (field === "credit_amount" && value !== "") {
      updated[index] = { ...updated[index], credit_amount: value, debit_amount: "" };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setFormLines(updated);
  };

  const handleAddLine = () => {
    setFormLines([
      ...formLines,
      { account_id: "", debit_amount: "", credit_amount: "", narration: "" },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (formLines.length <= 2) {
      toast.error("A Journal Voucher requires at least two accounts (one Debit and one Credit).");
      return;
    }
    setFormLines(formLines.filter((_, i) => i !== index));
  };

  // ---------------------------------------------------------------------------
  // Open Create Drawer
  // ---------------------------------------------------------------------------
  const handleOpenCreate = () => {
    setFormVoucherDate(new Date().toISOString().split("T")[0]);
    setFormOfficeId(branches.length > 0 ? branches[0].id : "");
    setFormAdjustmentType("GENERAL");
    setFormReferenceNumber("");
    setFormReferenceDate("");
    setFormCostCenter("");
    setFormNarration("General non-cash accounting adjustment");
    setFormInternalRemarks("");
    setFormAttachmentUrl("");
    setFormAllowCashBank(false);
    setFormGstTaxType("");
    setFormTdsSection("");
    setFormLines([
      { account_id: "", debit_amount: "", credit_amount: "", narration: "" },
      { account_id: "", debit_amount: "", credit_amount: "", narration: "" },
    ]);
    setActiveTabMode("GUIDED");
    setShowAdvancedOptions(false);
    setIsDrawerOpen(true);
  };

  // Duplicate Voucher
  const handleDuplicate = (v: VoucherRecord) => {
    setFormVoucherDate(new Date().toISOString().split("T")[0]);
    setFormOfficeId(v.issuing_office_id || (branches.length > 0 ? branches[0].id : ""));
    setFormAdjustmentType(v.note_category || "GENERAL");
    setFormReferenceNumber(v.reference_number ? `${v.reference_number}-COPY` : "");
    setFormReferenceDate(new Date().toISOString().split("T")[0]);
    setFormCostCenter(v.cost_center || "");
    setFormNarration(v.narration || "");
    setFormInternalRemarks("");
    setFormAttachmentUrl("");
    setFormAllowCashBank(false);

    if (v.ledger_entries && v.ledger_entries.length > 0) {
      const activeEntries = v.ledger_entries.filter((le) => !le.is_reversal);
      setFormLines(
        activeEntries.map((le) => ({
          account_id: le.account_id,
          debit_amount: Number(le.debit_amount) > 0 ? String(le.debit_amount) : "",
          credit_amount: Number(le.credit_amount) > 0 ? String(le.credit_amount) : "",
          narration: le.narration || "",
        }))
      );
    }
    setActiveTabMode("ADVANCED");
    setIsDrawerOpen(true);
    toast.success("Voucher duplicated into creation form.");
  };

  // ---------------------------------------------------------------------------
  // Save / Post Journal Voucher
  // ---------------------------------------------------------------------------
  const handleSubmitVoucher = async (asDraft: boolean) => {
    if (!formOfficeId) {
      toast.error("Please select an Issuing Office.");
      return;
    }
    if (!formNarration.trim()) {
      toast.error("Narration / Reason for Adjustment is mandatory.");
      return;
    }

    // Validate lines
    for (let i = 0; i < formLines.length; i++) {
      const line = formLines[i];
      if (!line.account_id) {
        toast.error(`Please select a ledger account for row #${i + 1}.`);
        return;
      }
      const dr = parseFloat(line.debit_amount) || 0;
      const cr = parseFloat(line.credit_amount) || 0;
      if (dr <= 0 && cr <= 0) {
        toast.error(`Please enter a Debit or Credit amount for row #${i + 1}.`);
        return;
      }
    }

    if (!asDraft && !isBalanced) {
      toast.error(`Voucher is unbalanced. Total Debit (${formatCurrency(totalDebit)}) must equal Total Credit (${formatCurrency(totalCredit)}).`);
      return;
    }

    const payload = {
      voucher_date: formVoucherDate,
      issuing_office_id: Number(formOfficeId),
      adjustment_type: formAdjustmentType,
      reference_number: formReferenceNumber.trim() || null,
      reference_date: formReferenceDate || null,
      narration: formNarration.trim(),
      internal_remarks: formInternalRemarks.trim() || null,
      cost_center: formCostCenter.trim() || null,
      attachment_url: formAttachmentUrl.trim() || null,
      is_draft: asDraft,
      allow_cash_bank: formAllowCashBank,
      gst_tax_type: formGstTaxType || null,
      tds_section: formTdsSection || null,
      entries: formLines.map((l) => ({
        account_id: Number(l.account_id),
        debit_amount: parseFloat(l.debit_amount) || 0,
        credit_amount: parseFloat(l.credit_amount) || 0,
        narration: l.narration.trim() || null,
        cost_center: formCostCenter.trim() || null,
      })),
    };

    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/accounts/journal-vouchers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(asDraft ? "Journal Voucher saved as Draft." : "Journal Voucher posted to Master Ledger successfully.");
      setIsDrawerOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Create journal voucher error:", err);
      toast.error(err.message || "Failed to post Journal Voucher.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Post Draft
  const handlePostDraft = async (v: VoucherRecord) => {
    try {
      await apiClient(`/api/v1/accounts/journal-vouchers/${v.id}/post`, {
        method: "POST",
      });
      toast.success(`Draft Journal #${v.voucher_number} posted to Master Ledger successfully.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to post draft voucher.");
    }
  };

  // Reverse Voucher
  const handleConfirmReverse = async () => {
    if (!reverseDialog.voucher) return;
    if (!reverseDialog.reason.trim()) {
      toast.error("Please enter a reason for reversing this voucher.");
      return;
    }
    setReverseDialog((prev) => ({ ...prev, isReversing: true }));
    try {
      await apiClient(`/api/v1/accounts/journal-vouchers/${reverseDialog.voucher.id}/reverse`, {
        method: "POST",
        body: JSON.stringify({
          reversal_reason: reverseDialog.reason.trim(),
        }),
      });
      toast.success(`Journal Voucher #${reverseDialog.voucher.voucher_number} reversed successfully.`);
      setReverseDialog({ isOpen: false, reason: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reverse voucher.");
      setReverseDialog((prev) => ({ ...prev, isReversing: false }));
    }
  };

  // ---------------------------------------------------------------------------
  // Filtered Vouchers
  // ---------------------------------------------------------------------------
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mNum = (v.voucher_number || "").toLowerCase().includes(q);
        const mRef = (v.reference_number || "").toLowerCase().includes(q);
        const mNarr = (v.narration || "").toLowerCase().includes(q);
        const mParty = (v.party_name || "").toLowerCase().includes(q);
        const mEntries = (v.ledger_entries || []).some(
          (le) => (le.account_name || "").toLowerCase().includes(q)
        );
        if (!mNum && !mRef && !mNarr && !mParty && !mEntries) return false;
      }

      if (selectedOfficeFilter !== "ALL") {
        if (v.issuing_office_id !== Number(selectedOfficeFilter)) return false;
      }

      if (selectedTypeFilter !== "ALL") {
        if (v.note_category !== selectedTypeFilter) return false;
      }

      if (selectedStatusFilter !== "ALL") {
        if (selectedStatusFilter === "POSTED" && (v.is_void || v.payment_status === "DRAFT")) return false;
        if (selectedStatusFilter === "DRAFT" && (v.is_void || v.payment_status !== "DRAFT")) return false;
        if (selectedStatusFilter === "VOID" && !v.is_void) return false;
      }

      if (fromDateFilter && v.voucher_date < fromDateFilter) return false;
      if (toDateFilter && v.voucher_date > toDateFilter) return false;

      return true;
    });
  }, [vouchers, searchQuery, selectedOfficeFilter, selectedTypeFilter, selectedStatusFilter, fromDateFilter, toDateFilter]);

  // KPI Metrics
  const totalCount = vouchers.length;
  const postedCount = vouchers.filter((v) => !v.is_void && v.payment_status !== "DRAFT").length;
  const draftCount = vouchers.filter((v) => !v.is_void && v.payment_status === "DRAFT").length;
  const totalPostedAmount = vouchers
    .filter((v) => !v.is_void && v.payment_status !== "DRAFT")
    .reduce((sum, v) => sum + Number(v.net_amount || 0), 0);

  const selectedCategoryMeta = adjustmentTypes.find((t) => t.code === formAdjustmentType);
  const selectedOfficeObj = branches.find((b) => b.id === Number(formOfficeId));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Accounts", href: "/accounts" },
          { label: "Journal Voucher" },
        ]}
        title="Journal Voucher"
        description="TallyPrime-style non-cash accounting adjustments, provisions, accruals, depreciation, and ledger reclassifications."
        primaryAction={{
          label: "Create Journal Voucher",
          onClick: handleOpenCreate,
          icon: Plus,
        }}
        secondaryActions={[
          {
            label: isRefreshing ? "Refreshing..." : "Refresh",
            onClick: () => {
              setIsRefreshing(true);
              fetchData();
            },
            icon: RefreshCw,
          },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Journal Vouchers"
          value={totalCount}
          subtext="Recorded adjustment vouchers"
          icon={<Scale className="w-5 h-5 text-indigo-600" />}
        />
        <KpiCard
          title="Total Adjustments Value"
          value={formatCurrency(totalPostedAmount)}
          subtext="Net double-entry adjustments posted"
          icon={<CreditCard className="w-5 h-5 text-emerald-600" />}
        />
        <KpiCard
          title="Posted / Active"
          value={postedCount}
          subtext="Live in Master Ledger & Trial Balance"
          icon={<CheckCircle2 className="w-5 h-5 text-teal-600" />}
        />
        <KpiCard
          title="Draft Vouchers"
          value={draftCount}
          subtext="Pending accountant verification"
          icon={<FileText className="w-5 h-5 text-amber-500" />}
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Voucher #, Reference, Account, or Narration..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-[#303036] rounded-xl bg-white dark:bg-[#101013] text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Office Filter */}
          <select
            value={selectedOfficeFilter}
            onChange={(e) => setSelectedOfficeFilter(e.target.value)}
            className="h-10 px-3 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
          >
            <option value="ALL">All Issuing Offices</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          {/* Adjustment Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="h-10 px-3 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
          >
            <option value="ALL">All Adjustment Categories</option>
            {adjustmentTypes.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="h-10 px-3 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
          >
            <option value="ALL">All Statuses</option>
            <option value="POSTED">Posted Only</option>
            <option value="DRAFT">Draft Only</option>
            <option value="VOID">Voided / Reversed</option>
          </select>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700 dark:text-gray-200">
            <thead className="bg-slate-50 dark:bg-[#101013] text-xs uppercase font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-[#303036]">
              <tr>
                <th className="py-3.5 px-4 w-28">Date</th>
                <th className="py-3.5 px-4 w-36">Voucher #</th>
                <th className="py-3.5 px-4">Adjustment Category</th>
                <th className="py-3.5 px-4">Issuing Office</th>
                <th className="py-3.5 px-4">Debited Accounts (Dr)</th>
                <th className="py-3.5 px-4">Credited Accounts (Cr)</th>
                <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#22232E]">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading journal vouchers...
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <Scale className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="font-medium text-gray-700 dark:text-gray-300">No Journal Vouchers found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {searchQuery || selectedOfficeFilter !== "ALL" || selectedTypeFilter !== "ALL"
                        ? "Try adjusting your search filters."
                        : "Click 'Create Journal Voucher' to record your first accounting adjustment."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const activeEntries = (v.ledger_entries || []).filter((le) => !le.is_reversal);
                  const debitEntries = activeEntries.filter((le) => Number(le.debit_amount) > 0);
                  const creditEntries = activeEntries.filter((le) => Number(le.credit_amount) > 0);

                  const isDraft = v.payment_status === "DRAFT";
                  const isVoid = v.is_void;

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#202025] transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300 font-mono">
                        {formatDate(v.voucher_date)}
                      </td>

                      {/* Voucher # */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setViewVoucher(v)}
                          className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-xs flex items-center gap-1"
                        >
                          {v.voucher_number}
                        </button>
                        {v.reference_number && (
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            Ref: {v.reference_number}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <Badge variant="neutral" className="text-[11px] font-semibold whitespace-nowrap">
                          {v.note_category ? v.note_category.replace(/_/g, " ") : "GENERAL"}
                        </Badge>
                        {v.narration && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-xs truncate" title={v.narration}>
                            {v.narration}
                          </div>
                        )}
                      </td>

                      {/* Issuing Office */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{v.issuing_office_name || "Office"}</span>
                        </div>
                      </td>

                      {/* Debited Accounts */}
                      <td className="py-3.5 px-4 text-xs">
                        {debitEntries.length === 0 ? (
                          <span className="text-gray-400 italic">None (Draft)</span>
                        ) : (
                          debitEntries.map((le, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2 py-0.5">
                              <span className="font-medium text-gray-900 dark:text-white truncate max-w-[140px]" title={le.account_name}>
                                {le.account_name || `Account #${le.account_id}`}
                              </span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                {formatCurrency(le.debit_amount)}
                              </span>
                            </div>
                          ))
                        )}
                      </td>

                      {/* Credited Accounts */}
                      <td className="py-3.5 px-4 text-xs">
                        {creditEntries.length === 0 ? (
                          <span className="text-gray-400 italic">None (Draft)</span>
                        ) : (
                          creditEntries.map((le, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2 py-0.5">
                              <span className="font-medium text-gray-900 dark:text-white truncate max-w-[140px]" title={le.account_name}>
                                {le.account_name || `Account #${le.account_id}`}
                              </span>
                              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                                {formatCurrency(le.credit_amount)}
                              </span>
                            </div>
                          ))
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                        {formatCurrency(v.net_amount)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isVoid ? (
                          <Badge variant="danger" className="text-[10px]">
                            REVERSED
                          </Badge>
                        ) : isDraft ? (
                          <Badge variant="warning" className="text-[10px]">
                            DRAFT
                          </Badge>
                        ) : (
                          <StatusBadge status="ACTIVE" customLabel="POSTED" />
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View / Print */}
                          <button
                            type="button"
                            onClick={() => setViewVoucher(v)}
                            title="View / Print Voucher"
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Post Draft (if Draft) */}
                          {isDraft && (
                            <button
                              type="button"
                              onClick={() => handlePostDraft(v)}
                              title="Post Draft to Master Ledger"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          {/* Duplicate as New Draft */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(v)}
                            title="Duplicate as New Draft"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Reverse (if Posted and not Void) */}
                          {!isDraft && !isVoid && (
                            <button
                              type="button"
                              onClick={() =>
                                setReverseDialog({
                                  isOpen: true,
                                  voucher: v,
                                  reason: "",
                                })
                              }
                              title="Reverse Posted Voucher"
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* Create / Edit Journal Voucher Drawer                                    */}
      {/* ======================================================================= */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Create Journal Voucher"
        subtitle="Record double-entry non-cash adjustments, provisions, accruals, depreciation, and ledger reclassifications."
        width="xl"
      >
        <div className="space-y-6 pb-12">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setActiveTabMode("GUIDED")}
              className={cn(
                "py-2.5 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors",
                activeTabMode === "GUIDED"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Guided Adjustment Workflow (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setActiveTabMode("ADVANCED")}
              className={cn(
                "py-2.5 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors",
                activeTabMode === "ADVANCED"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <Layers className="w-4 h-4" />
              Advanced Multi-Line Journal Entry
            </button>
          </div>

          {/* Guided Category Selector (Visible in Guided Mode) */}
          {activeTabMode === "GUIDED" && (
            <div className="space-y-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                  Select Accounting Adjustment Category
                </span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                  Auto-suggests compliant accounts & narrations
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {adjustmentTypes.map((type) => {
                  const isSelected = formAdjustmentType === type.code;
                  return (
                    <button
                      key={type.code}
                      type="button"
                      onClick={() => handleSelectAdjustmentType(type.code)}
                      className={cn(
                        "p-2.5 text-left rounded-lg border text-xs transition-all flex flex-col justify-between",
                        isSelected
                          ? "bg-white dark:bg-gray-800 border-indigo-600 ring-2 ring-indigo-500 shadow-sm"
                          : "bg-white/60 dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 hover:border-indigo-300"
                      )}
                    >
                      <div className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                        {type.label}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 line-clamp-2">
                        {type.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedCategoryMeta && (
                <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-1">
                  <div className="text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedCategoryMeta.label}:</span>{" "}
                    {selectedCategoryMeta.description}
                  </div>
                  <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">
                    Typical Treatment: {selectedCategoryMeta.typical_debit_ledger} ➔ {selectedCategoryMeta.typical_credit_ledger}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 1: Voucher Details */}
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-[#22232E] pb-3 text-base font-bold text-slate-900 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">1</span>
              Voucher Specifications
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Voucher Date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Voucher Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formVoucherDate}
                  onChange={(e) => setFormVoucherDate(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                />
              </div>

              {/* Issuing Office */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Issuing Office <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formOfficeId}
                  onChange={(e) => setFormOfficeId(Number(e.target.value))}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                >
                  <option value="">Select Issuing Office</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Adjustment Category */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Adjustment Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formAdjustmentType}
                  onChange={(e) => handleSelectAdjustmentType(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                >
                  {adjustmentTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reference / Document Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AUDIT-2026-04, POL-9842"
                  value={formReferenceNumber}
                  onChange={(e) => setFormReferenceNumber(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-mono font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                />
              </div>

              {/* Reference Date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reference Date (Optional)
                </label>
                <input
                  type="date"
                  value={formReferenceDate}
                  onChange={(e) => setFormReferenceDate(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                />
              </div>

              {/* Cost Center */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cost Center / Branch Allocation (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fleet Operations, Maintenance Hub"
                  value={formCostCenter}
                  onChange={(e) => setFormCostCenter(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Accounting Entry Details */}
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#22232E] pb-3">
              <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">2</span>
                Accounting Entry Details (Double-Entry Invariant)
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLine}
                className="gap-1 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another Account
              </Button>
            </div>

            {/* Entry Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-[#101013] text-xs uppercase font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-[#303036]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Account / Ledger <span className="text-rose-500">*</span></th>
                    <th className="py-2.5 px-3 w-40 text-right">Debit (₹)</th>
                    <th className="py-2.5 px-3 w-40 text-right">Credit (₹)</th>
                    <th className="py-2.5 px-3">Line Narration (Optional)</th>
                    <th className="py-2.5 px-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#22232E]">
                  {formLines.map((line, idx) => {
                    const selectedAcc = accounts.find((a) => a.id === Number(line.account_id));
                    return (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                        {/* Row # */}
                        <td className="py-2.5 px-3 text-center text-xs text-gray-400 font-mono">
                          {idx + 1}
                        </td>

                        {/* Account Selector */}
                        <td className="py-2.5 px-3">
                          <select
                            required
                            value={line.account_id}
                            onChange={(e) => handleLineChange(idx, "account_id", e.target.value)}
                            className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-md p-1.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select Ledger Account</option>
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name} ({acc.code}) • {acc.group_name || "Ledger"}
                              </option>
                            ))}
                          </select>
                          {selectedAcc && (
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              Group: {selectedAcc.group_name || "General Ledger"}
                            </div>
                          )}
                        </td>

                        {/* Debit Amount */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={line.debit_amount}
                            onChange={(e) => handleLineChange(idx, "debit_amount", e.target.value)}
                            className="w-full text-xs font-mono text-right border border-gray-300 dark:border-gray-700 rounded-md p-1.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Credit Amount */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={line.credit_amount}
                            onChange={(e) => handleLineChange(idx, "credit_amount", e.target.value)}
                            className="w-full text-xs font-mono text-right border border-gray-300 dark:border-gray-700 rounded-md p-1.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Line Narration */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="Line remarks (optional)"
                            value={line.narration}
                            onChange={(e) => handleLineChange(idx, "narration", e.target.value)}
                            className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-md p-1.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Remove Button */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            disabled={formLines.length <= 2}
                            title={formLines.length <= 2 ? "Minimum 2 lines required" : "Remove account line"}
                            className="text-gray-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Live Balance Summary Bar */}
            <div className={cn(
              "p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors",
              isBalanced
                ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  isBalanced
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
                )}>
                  {isBalanced ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <div className={cn(
                    "text-xs font-bold",
                    isBalanced
                      ? "text-emerald-900 dark:text-emerald-300"
                      : "text-rose-900 dark:text-rose-300"
                  )}>
                    {isBalanced
                      ? "Voucher is Balanced (Double-Entry Invariant Satisfied)"
                      : totalDebit === 0 && totalCredit === 0
                      ? "Enter Debit and Credit amounts"
                      : `Unbalanced Voucher: Difference of ${formatCurrency(difference)}`}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    {isBalanced
                      ? "Total Debits equal Total Credits. Ready to post into Master Ledger."
                      : "Under Indian Accounting Standards, Total Debit must equal Total Credit before posting."}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-right font-mono">
                <div>
                  <div className="text-[10px] uppercase text-gray-500">Total Debit</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalDebit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-gray-500">Total Credit</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalCredit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-gray-500">Difference</div>
                  <div className={cn(
                    "text-sm font-extrabold",
                    isBalanced ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    {formatCurrency(difference)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Narration & Additional Details */}
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-[#22232E] pb-3 text-base font-bold text-slate-900 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">3</span>
              Narration & Supporting Documentation
            </div>

            {/* Narration */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Narration / Reason for Adjustment <span className="text-rose-500">*</span>
                </label>
                {selectedCategoryMeta && (
                  <button
                    type="button"
                    onClick={() => setFormNarration(selectedCategoryMeta.default_narration)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Use Suggested Narration
                  </button>
                )}
              </div>
              <textarea
                required
                rows={2}
                placeholder="Explain the commercial/accounting reason for this journal adjustment..."
                value={formNarration}
                onChange={(e) => setFormNarration(e.target.value)}
                className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Internal Remarks */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Internal Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Notes for internal auditors / finance team"
                  value={formInternalRemarks}
                  onChange={(e) => setFormInternalRemarks(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                />
              </div>

              {/* Attachment URL */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Supporting Document Link / URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://... or document reference link"
                  value={formAttachmentUrl}
                  onChange={(e) => setFormAttachmentUrl(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Expandable Advanced Options */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center justify-between w-full py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Advanced Statutory & Cash/Bank Controls
              </span>
              {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvancedOptions && (
              <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                {/* Cash/Bank Override */}
                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                  <input
                    type="checkbox"
                    id="formAllowCashBank"
                    checked={formAllowCashBank}
                    onChange={(e) => setFormAllowCashBank(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500 mt-0.5"
                  />
                  <label htmlFor="formAllowCashBank" className="text-xs text-gray-700 dark:text-gray-300">
                    <span className="font-semibold block text-gray-900 dark:text-white">
                      Allow Exceptional Cash / Bank Ledger Override
                    </span>
                    Under standard Tally & Indian Accounting Standards, Journal Vouchers strictly prohibit Cash & Bank accounts.
                    Check this only for exceptional authorized adjustments (e.g. opening adjustments or bank charges write-off).
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* GST Tax Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      GST Adjustment Classification (If Applicable)
                    </label>
                    <select
                      value={formGstTaxType}
                      onChange={(e) => setFormGstTaxType(e.target.value)}
                      className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">None (Standard Journal)</option>
                      <option value="ITC_REVERSAL_17_5">ITC Reversal u/s 17(5) (Blocked Credit)</option>
                      <option value="ITC_REVERSAL_RULE_42">ITC Reversal under Rule 42 / 43</option>
                      <option value="RCM_LIABILITY">RCM Output Liability Adjustment</option>
                      <option value="GST_PENALTY_LATEFEE">GST Penalty / Interest Adjustment</option>
                    </select>
                  </div>

                  {/* TDS Section */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      TDS Section Allocation (If Applicable)
                    </label>
                    <select
                      value={formTdsSection}
                      onChange={(e) => setFormTdsSection(e.target.value)}
                      className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">None</option>
                      <option value="194C">Section 194C (Transporters / Contractors)</option>
                      <option value="194J">Section 194J (Professional & Technical Services)</option>
                      <option value="194Q">Section 194Q (Purchase of Goods)</option>
                      <option value="194H">Section 194H (Commission & Brokerage)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="bg-white dark:bg-[#12131A] border border-slate-200/90 dark:border-[#22232E] rounded-2xl p-4 sm:p-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow-2xs mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDrawerOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              {/* Save as Draft */}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmitVoucher(true)}
                disabled={isSubmitting}
                className="gap-1.5 text-xs font-semibold"
              >
                Save as Draft
              </Button>

              {/* Post Journal Voucher */}
              <Button
                type="button"
                onClick={() => handleSubmitVoucher(false)}
                disabled={isSubmitting || !isBalanced}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold"
              >
                {isSubmitting ? "Posting..." : "Post Journal Voucher"}
              </Button>
            </div>
          </div>
        </div>
      </EntityDrawer>

      {/* ======================================================================= */}
      {/* TallyPrime-Style Printable Voucher Modal                                */}
      {/* ======================================================================= */}
      {viewVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 print:hidden">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Journal Voucher — #{viewVoucher.voucher_number}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewVoucher(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Printable Voucher Body */}
            <div className="p-6 space-y-6 text-gray-800 dark:text-gray-200">
              {/* Header Box */}
              <div className="text-center pb-4 border-b border-gray-300 dark:border-gray-700">
                <h2 className="text-xl font-extrabold uppercase tracking-wide text-gray-900 dark:text-white">
                  JOURNAL VOUCHER
                </h2>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Issuing Office: {viewVoucher.issuing_office_name || "Headquarters"}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                <div>
                  <div className="text-gray-500 uppercase text-[10px]">Voucher Number</div>
                  <div className="font-mono font-bold text-gray-900 dark:text-white mt-0.5">
                    {viewVoucher.voucher_number}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px]">Voucher Date</div>
                  <div className="font-mono font-semibold text-gray-900 dark:text-white mt-0.5">
                    {formatDate(viewVoucher.voucher_date)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px]">Adjustment Category</div>
                  <div className="font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {viewVoucher.note_category || "GENERAL"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px]">Status</div>
                  <div className="mt-0.5">
                    {viewVoucher.is_void ? (
                      <span className="text-rose-600 font-bold uppercase text-xs">REVERSED / VOID</span>
                    ) : viewVoucher.payment_status === "DRAFT" ? (
                      <span className="text-amber-600 font-bold uppercase text-xs">DRAFT</span>
                    ) : (
                      <span className="text-emerald-600 font-bold uppercase text-xs">POSTED</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Double-Entry Table */}
              <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-100 dark:bg-gray-800 font-bold uppercase text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-700">
                    <tr>
                      <th className="py-2.5 px-3">Particulars / Account Head</th>
                      <th className="py-2.5 px-3 w-32 text-right">Debit (₹)</th>
                      <th className="py-2.5 px-3 w-32 text-right">Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#22232E]">
                    {(viewVoucher.ledger_entries || []).map((le, idx) => (
                      <tr key={idx} className={le.is_reversal ? "opacity-60 italic" : ""}>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {Number(le.debit_amount) > 0 ? "Dr. " : "    To "}
                            {le.account_name || `Account #${le.account_id}`}
                          </div>
                          {le.narration && (
                            <div className="text-[11px] text-gray-500 pl-4 mt-0.5">
                              ({le.narration})
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">
                          {Number(le.debit_amount) > 0 ? formatCurrency(le.debit_amount) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">
                          {Number(le.credit_amount) > 0 ? formatCurrency(le.credit_amount) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-400 dark:border-gray-600">
                    <tr>
                      <td className="py-2.5 px-3 text-right uppercase">Total</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {formatCurrency(viewVoucher.net_amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {formatCurrency(viewVoucher.net_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Amount in words */}
              <div className="text-xs bg-gray-50 dark:bg-gray-800/60 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="text-gray-500 font-medium">Amount in Words: </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {numberToWords(Number(viewVoucher.net_amount))}
                </span>
              </div>

              {/* Main Narration */}
              <div className="text-xs space-y-1">
                <div className="font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px]">
                  Narration / Commercial Justification:
                </div>
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                  {viewVoucher.narration || "No narration provided."}
                </div>
              </div>

              {/* Void Reason if reversed */}
              {viewVoucher.is_void && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
                  <span className="font-bold">Reversal Audit Reason:</span> {viewVoucher.void_reason}
                </div>
              )}

              {/* Signature Blocks */}
              <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs text-gray-500">
                <div className="border-t border-gray-400 dark:border-gray-600 pt-2 font-medium">
                  Prepared By
                </div>
                <div className="border-t border-gray-400 dark:border-gray-600 pt-2 font-medium">
                  Verified / Checked By
                </div>
                <div className="border-t border-gray-400 dark:border-gray-600 pt-2 font-medium">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* Reversal Confirmation Dialog                                            */}
      {/* ======================================================================= */}
      <ConfirmDialog
        isOpen={reverseDialog.isOpen}
        onClose={() => setReverseDialog({ isOpen: false, reason: "" })}
        onConfirm={handleConfirmReverse}
        title="Reverse Journal Voucher"
        description={`Are you sure you want to reverse Journal Voucher #${reverseDialog.voucher?.voucher_number}?`}
        consequence="Per Indian Accounting Standards and Tally double-entry rules, reversing this voucher will automatically post balancing debit/credit reversal entries and preserve the full historical audit trail."
        confirmText={reverseDialog.isReversing ? "Reversing..." : "Confirm Reversal"}
        variant="danger"
        isLoading={reverseDialog.isReversing}
      >
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Reversal Reason (Mandatory for audit trail) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Month-end accrual reversal upon receipt of vendor bill"
            value={reverseDialog.reason}
            onChange={(e) => setReverseDialog((prev) => ({ ...prev, reason: e.target.value }))}
            className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
