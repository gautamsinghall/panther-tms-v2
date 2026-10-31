"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Landmark,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Star,
  Edit,
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
  AlertCircle,
  ExternalLink,
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

const INDIAN_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Kotak Mahindra Bank",
  "Canara Bank",
  "Union Bank of India",
  "IndusInd Bank",
  "Yes Bank",
  "IDBI Bank",
  "Federal Bank",
  "Bank of India",
  "Central Bank of India",
  "Indian Bank",
  "UCO Bank",
  "Indian Overseas Bank",
  "Punjab & Sind Bank",
  "Bank of Maharashtra",
  "Standard Chartered Bank",
  "Other",
];

interface Branch {
  id: number;
  code: string;
  name: string;
  city?: string;
  state?: string;
}

interface CompanyBankAccount {
  id: number;
  bank_name: string;
  custom_bank_name?: string | null;
  account_holder_name: string;
  account_number: string;
  account_number_masked: string;
  account_type: "CURRENT" | "SAVINGS" | "OVERDRAFT" | "CASH_CREDIT" | "OTHER";
  ifsc_code: string;
  branch_name?: string | null;
  branch_address?: string | null;
  micr_code?: string | null;
  upi_id?: string | null;
  currency: string;
  issuing_office_id: number;
  issuing_office_code?: string | null;
  issuing_office_name?: string | null;
  issuing_office_city?: string | null;
  is_default: boolean;
  account_id?: number | null;
  ledger_name?: string | null;
  ledger_group?: string | null;
  opening_balance: string | number;
  opening_balance_date?: string | null;
  opening_balance_type: "DR" | "CR";
  reconciliation_start_date?: string | null;
  is_active: boolean;
  current_balance: string | number;
  balance_type: "DR" | "CR" | "NIL";
  created_at?: string;
  updated_at?: string;
}

export default function CompanyBankAccountsPage() {
  const router = useRouter();

  // Data states
  const [accounts, setAccounts] = useState<CompanyBankAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOfficeFilter, setSelectedOfficeFilter] = useState<string>("ALL");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  // Unmask state map { [accountId]: boolean }
  const [unmaskedAccounts, setUnmaskedAccounts] = useState<Record<number, boolean>>({});

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CompanyBankAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingIFSC, setIsVerifyingIFSC] = useState(false);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  // Form Fields
  const [formBankName, setFormBankName] = useState(INDIAN_BANKS[0]);
  const [formCustomBankName, setFormCustomBankName] = useState("");
  const [formAccountHolder, setFormAccountHolder] = useState("");
  const [formAccountNumber, setFormAccountNumber] = useState("");
  const [formConfirmAccountNumber, setFormConfirmAccountNumber] = useState("");
  const [formAccountType, setFormAccountType] = useState<"CURRENT" | "SAVINGS" | "OVERDRAFT" | "CASH_CREDIT" | "OTHER">("CURRENT");
  const [formIFSC, setFormIFSC] = useState("");
  const [formBranchName, setFormBranchName] = useState("");
  const [formBranchAddress, setFormBranchAddress] = useState("");
  const [formMICR, setFormMICR] = useState("");
  const [formUPI, setFormUPI] = useState("");
  const [formCurrency, setFormCurrency] = useState("INR");
  const [formOfficeId, setFormOfficeId] = useState<number | "">("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formLedgerName, setFormLedgerName] = useState("");
  const [formLedgerGroup, setFormLedgerGroup] = useState("Bank Accounts");
  const [formOpeningBalance, setFormOpeningBalance] = useState("0.00");
  const [formOpeningDate, setFormOpeningDate] = useState(new Date().toISOString().split("T")[0]);
  const [formOpeningType, setFormOpeningType] = useState<"DR" | "CR">("DR");
  const [formReconciliationDate, setFormReconciliationDate] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // Confirmation dialogs
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    account?: CompanyBankAccount;
    isDeleting?: boolean;
  }>({ isOpen: false });

  // ---------------------------------------------------------------------------
  // Load Initial Data
  // ---------------------------------------------------------------------------
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [accRes, branchRes] = await Promise.all([
        apiClient<CompanyBankAccount[]>("/api/v1/accounts/bank-accounts").catch(() => []),
        apiClient<Branch[]>("/api/v1/profile/branches").catch(() => []),
      ]);
      setAccounts(accRes || []);
      setBranches(branchRes || []);
      if (!formOfficeId && branchRes && branchRes.length > 0) {
        setFormOfficeId(branchRes[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load bank accounts:", err);
      toast.error("Failed to load bank accounts.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update default Ledger Group & Type when Account Type changes
  useEffect(() => {
    if (formAccountType === "OVERDRAFT") {
      setFormLedgerGroup("Bank OD A/c");
      setFormOpeningType("CR");
    } else if (formAccountType === "CASH_CREDIT") {
      setFormLedgerGroup("Bank OCC A/c");
      setFormOpeningType("CR");
    } else {
      setFormLedgerGroup("Bank Accounts");
      setFormOpeningType("DR");
    }
  }, [formAccountType]);

  // Auto-suggest Ledger Name if not modified manually
  useEffect(() => {
    if (!editingAccount) {
      const bankDisplay = formBankName === "Other" ? (formCustomBankName || "Bank") : formBankName;
      const office = branches.find((b) => b.id === Number(formOfficeId));
      const officeDisplay = office ? office.name : "";
      if (bankDisplay && officeDisplay) {
        setFormLedgerName(`${bankDisplay} - ${officeDisplay}`);
      } else if (bankDisplay) {
        setFormLedgerName(`${bankDisplay} A/c`);
      }
    }
  }, [formBankName, formCustomBankName, formOfficeId, branches, editingAccount]);

  // ---------------------------------------------------------------------------
  // IFSC Lookup
  // ---------------------------------------------------------------------------
  const handleVerifyIFSC = async () => {
    const cleanIFSC = formIFSC.trim().toUpperCase();
    if (!cleanIFSC || cleanIFSC.length !== 11) {
      toast.error("Please enter a valid 11-character IFSC code.");
      return;
    }
    setIsVerifyingIFSC(true);
    try {
      const res = await apiClient<{
        ifsc: string;
        bank: string;
        branch: string;
        address: string;
        city: string;
        state: string;
        micr?: string;
      }>(`/api/v1/accounts/bank-accounts/ifsc/${cleanIFSC}`);

      if (res && res.bank) {
        // Match bank name or set custom
        const matchedBank = INDIAN_BANKS.find(
          (b) => b.toLowerCase() === res.bank.toLowerCase() || res.bank.toLowerCase().includes(b.toLowerCase())
        );
        if (matchedBank) {
          setFormBankName(matchedBank);
        } else {
          setFormBankName("Other");
          setFormCustomBankName(res.bank);
        }
        if (res.branch) setFormBranchName(res.branch);
        if (res.address) setFormBranchAddress(res.address);
        if (res.micr) setFormMICR(res.micr);
        toast.success(`Verified: ${res.bank} (${res.branch})`);
      }
    } catch (err: any) {
      toast.error(err.message || "IFSC lookup failed. Please enter branch details manually.");
    } finally {
      setIsVerifyingIFSC(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Open Add / Edit Drawer
  // ---------------------------------------------------------------------------
  const handleOpenAdd = () => {
    setEditingAccount(null);
    setFormBankName(INDIAN_BANKS[0]);
    setFormCustomBankName("");
    setFormAccountHolder("");
    setFormAccountNumber("");
    setFormConfirmAccountNumber("");
    setFormAccountType("CURRENT");
    setFormIFSC("");
    setFormBranchName("");
    setFormBranchAddress("");
    setFormMICR("");
    setFormUPI("");
    setFormCurrency("INR");
    setFormOfficeId(branches.length > 0 ? branches[0].id : "");
    setFormIsDefault(false);
    setFormLedgerName("");
    setFormLedgerGroup("Bank Accounts");
    setFormOpeningBalance("0.00");
    setFormOpeningDate(new Date().toISOString().split("T")[0]);
    setFormOpeningType("DR");
    setFormReconciliationDate("");
    setFormIsActive(true);
    setShowAdvancedDetails(false);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (acc: CompanyBankAccount) => {
    setEditingAccount(acc);
    setFormBankName(INDIAN_BANKS.includes(acc.bank_name) ? acc.bank_name : "Other");
    setFormCustomBankName(acc.custom_bank_name || (!INDIAN_BANKS.includes(acc.bank_name) ? acc.bank_name : ""));
    setFormAccountHolder(acc.account_holder_name);
    setFormAccountNumber(acc.account_number);
    setFormConfirmAccountNumber(acc.account_number);
    setFormAccountType(acc.account_type);
    setFormIFSC(acc.ifsc_code);
    setFormBranchName(acc.branch_name || "");
    setFormBranchAddress(acc.branch_address || "");
    setFormMICR(acc.micr_code || "");
    setFormUPI(acc.upi_id || "");
    setFormCurrency(acc.currency || "INR");
    setFormOfficeId(acc.issuing_office_id);
    setFormIsDefault(acc.is_default);
    setFormLedgerName(acc.ledger_name || "");
    setFormLedgerGroup(acc.ledger_group || "Bank Accounts");
    setFormOpeningBalance(String(acc.opening_balance || "0.00"));
    setFormOpeningDate(acc.opening_balance_date || new Date().toISOString().split("T")[0]);
    setFormOpeningType(acc.opening_balance_type || "DR");
    setFormReconciliationDate(acc.reconciliation_start_date || "");
    setFormIsActive(acc.is_active);
    setShowAdvancedDetails(true);
    setIsDrawerOpen(true);
  };

  // ---------------------------------------------------------------------------
  // Save Bank Account (Create / Update)
  // ---------------------------------------------------------------------------
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formAccountHolder.trim()) {
      toast.error("Account Holder Name is required.");
      return;
    }
    if (!formAccountNumber.trim()) {
      toast.error("Account Number is required.");
      return;
    }
    if (!editingAccount && formAccountNumber.trim() !== formConfirmAccountNumber.trim()) {
      toast.error("Account numbers do not match.");
      return;
    }
    if (!formIFSC.trim() || formIFSC.trim().length !== 11) {
      toast.error("Please enter a valid 11-digit IFSC code.");
      return;
    }
    if (!formOfficeId) {
      toast.error("Please select an Issuing Office.");
      return;
    }

    const payload: any = {
      bank_name: formBankName === "Other" ? (formCustomBankName.trim() || "Other Bank") : formBankName,
      custom_bank_name: formBankName === "Other" ? formCustomBankName.trim() : null,
      account_holder_name: formAccountHolder.trim(),
      account_number: formAccountNumber.trim(),
      account_type: formAccountType,
      ifsc_code: formIFSC.trim().toUpperCase(),
      branch_name: formBranchName.trim() || null,
      branch_address: formBranchAddress.trim() || null,
      micr_code: formMICR.trim() || null,
      upi_id: formUPI.trim() || null,
      currency: formCurrency || "INR",
      issuing_office_id: Number(formOfficeId),
      is_default: formIsDefault,
      ledger_name: formLedgerName.trim() || null,
      ledger_group: formLedgerGroup || null,
      opening_balance: parseFloat(formOpeningBalance) || 0,
      opening_balance_date: formOpeningDate || null,
      opening_balance_type: formOpeningType,
      reconciliation_start_date: formReconciliationDate || null,
      is_active: formIsActive,
    };

    setIsSubmitting(true);
    try {
      if (editingAccount) {
        await apiClient(`/api/v1/accounts/bank-accounts/${editingAccount.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Company bank account updated successfully.");
      } else {
        await apiClient("/api/v1/accounts/bank-accounts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Company bank account created successfully.");
      }
      setIsDrawerOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Save account failed:", err);
      toast.error(err.message || "Failed to save bank account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const handleToggleStatus = async (acc: CompanyBankAccount) => {
    try {
      await apiClient(`/api/v1/accounts/bank-accounts/${acc.id}/toggle-status`, {
        method: "PATCH",
      });
      toast.success(acc.is_active ? "Bank account deactivated." : "Bank account activated.");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update account status.");
    }
  };

  const handleSetDefault = async (acc: CompanyBankAccount) => {
    try {
      await apiClient(`/api/v1/accounts/bank-accounts/${acc.id}/set-default`, {
        method: "PATCH",
      });
      toast.success(`Set as default bank account for ${acc.issuing_office_name || "Office"}.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to set default account.");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.account) return;
    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));
    try {
      await apiClient(`/api/v1/accounts/bank-accounts/${deleteDialog.account.id}`, {
        method: "DELETE",
      });
      toast.success("Bank account removed successfully.");
      setDeleteDialog({ isOpen: false });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Cannot delete account with existing transactions.");
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  // ---------------------------------------------------------------------------
  // Filtered Data
  // ---------------------------------------------------------------------------
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesBank = acc.bank_name.toLowerCase().includes(q);
        const matchesHolder = acc.account_holder_name.toLowerCase().includes(q);
        const matchesNumber = acc.account_number.includes(q);
        const matchesMasked = acc.account_number_masked.includes(q);
        const matchesIFSC = acc.ifsc_code.toLowerCase().includes(q);
        const matchesBranch = (acc.branch_name || "").toLowerCase().includes(q);
        const matchesOffice = (acc.issuing_office_name || "").toLowerCase().includes(q);
        if (!matchesBank && !matchesHolder && !matchesNumber && !matchesMasked && !matchesIFSC && !matchesBranch && !matchesOffice) {
          return false;
        }
      }

      // Office filter
      if (selectedOfficeFilter !== "ALL") {
        if (acc.issuing_office_id !== Number(selectedOfficeFilter)) return false;
      }

      // Type filter
      if (selectedTypeFilter !== "ALL") {
        if (acc.account_type !== selectedTypeFilter) return false;
      }

      // Status filter
      if (selectedStatusFilter !== "ALL") {
        const isActive = selectedStatusFilter === "ACTIVE";
        if (acc.is_active !== isActive) return false;
      }

      return true;
    });
  }, [accounts, searchQuery, selectedOfficeFilter, selectedTypeFilter, selectedStatusFilter]);

  // ---------------------------------------------------------------------------
  // KPI Metrics
  // ---------------------------------------------------------------------------
  const totalAccountsCount = accounts.length;
  const activeAccountsCount = accounts.filter((a) => a.is_active).length;
  const defaultAccountsCount = accounts.filter((a) => a.is_default).length;
  const netTotalLiquidity = accounts.reduce((acc, curr) => {
    const val = Number(curr.current_balance || 0);
    return curr.balance_type === "CR" ? acc - val : acc + val;
  }, 0);

  const selectedOfficeObj = branches.find((b) => b.id === Number(formOfficeId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Accounts", href: "/accounts" },
          { label: "Company Bank Accounts" },
        ]}
        title="Company Bank Accounts"
        description="Maintain company bank accounts linked to issuing offices, automated ledger creation, and balances."
        primaryAction={{
          label: "Add Bank Account",
          onClick: handleOpenAdd,
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
          title="Total Bank Accounts"
          value={totalAccountsCount}
          subtext="Registered company accounts"
          icon={<Landmark className="w-5 h-5 text-indigo-600" />}
        />
        <KpiCard
          title="Active Accounts"
          value={activeAccountsCount}
          subtext="Ready for receipts & payments"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <KpiCard
          title="Default Accounts"
          value={defaultAccountsCount}
          subtext="Assigned to issuing offices"
          icon={<Star className="w-5 h-5 text-amber-500" />}
        />
        <KpiCard
          title="Total Net Liquidity"
          value={formatCurrency(netTotalLiquidity)}
          subtext={netTotalLiquidity >= 0 ? "Consolidated Bank Balance (DR)" : "Consolidated Overdraft (CR)"}
          icon={<CreditCard className="w-5 h-5 text-blue-600" />}
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Bank, Account No, IFSC, or Office..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Office Filter */}
          <select
            value={selectedOfficeFilter}
            onChange={(e) => setSelectedOfficeFilter(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-md py-2 px-3 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Issuing Offices</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          {/* Account Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-md py-2 px-3 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Account Types</option>
            <option value="CURRENT">Current Account</option>
            <option value="SAVINGS">Savings Account</option>
            <option value="OVERDRAFT">Overdraft (OD)</option>
            <option value="CASH_CREDIT">Cash Credit (CC)</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-md py-2 px-3 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Bank Accounts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700 dark:text-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="py-3.5 px-4">Bank & Branch</th>
                <th className="py-3.5 px-4">Account Number</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Issuing Office</th>
                <th className="py-3.5 px-4 text-right">Opening Balance</th>
                <th className="py-3.5 px-4 text-right">Current Balance</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading bank accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <Landmark className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="font-medium text-gray-700 dark:text-gray-300">No company bank accounts found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {searchQuery || selectedOfficeFilter !== "ALL" || selectedTypeFilter !== "ALL"
                        ? "Try clearing filters to view accounts."
                        : "Click 'Add Bank Account' to register your first bank account."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const isUnmasked = Boolean(unmaskedAccounts[acc.id]);
                  const isODorCC = acc.account_type === "OVERDRAFT" || acc.account_type === "CASH_CREDIT";

                  return (
                    <tr
                      key={acc.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                    >
                      {/* Bank & Branch */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 mt-0.5">
                            <Landmark className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {acc.bank_name}
                              </span>
                              {acc.is_default && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {acc.branch_name ? `${acc.branch_name} • ` : ""}
                              IFSC: <span className="font-mono">{acc.ifsc_code}</span>
                            </div>
                            <div className="text-[11px] text-gray-400">
                              Holder: {acc.account_holder_name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Account Number */}
                      <td className="py-3.5 px-4 font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span>
                            {isUnmasked ? acc.account_number : acc.account_number_masked}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setUnmaskedAccounts((prev) => ({
                                ...prev,
                                [acc.id]: !prev[acc.id],
                              }))
                            }
                            title={isUnmasked ? "Mask account number" : "Reveal full account number"}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                          >
                            {isUnmasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {acc.upi_id && (
                          <div className="text-[11px] font-sans text-gray-400 mt-0.5">
                            UPI: {acc.upi_id}
                          </div>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            acc.account_type === "CURRENT"
                              ? "info"
                              : acc.account_type === "SAVINGS"
                              ? "neutral"
                              : "warning"
                          }
                        >
                          {acc.account_type.replace("_", " ")}
                        </Badge>
                      </td>

                      {/* Issuing Office */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {acc.issuing_office_name || "Office"}
                          </span>
                          {acc.issuing_office_code && (
                            <span className="text-[10px] text-gray-400">
                              ({acc.issuing_office_code})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Opening Balance */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-gray-600 dark:text-gray-300">
                        {formatCurrency(acc.opening_balance)}
                        <span className="ml-1 text-[10px] font-semibold text-gray-400">
                          {acc.opening_balance_type}
                        </span>
                      </td>

                      {/* Current Balance */}
                      <td className="py-3.5 px-4 text-right">
                        <div className={cn(
                          "font-mono font-semibold text-sm",
                          acc.balance_type === "DR"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : acc.balance_type === "CR"
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-gray-600 dark:text-gray-400"
                        )}>
                          {formatCurrency(acc.current_balance)}
                          <span className="ml-1 text-xs font-normal text-gray-500">
                            {acc.balance_type}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(acc)}
                          title={`Click to ${acc.is_active ? "Deactivate" : "Activate"}`}
                          className="cursor-pointer"
                        >
                          <StatusBadge
                            status={acc.is_active ? "ACTIVE" : "INACTIVE"}
                          />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Ledger */}
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/accounts/master-ledger?tab=COMPANY_BANK_ACCOUNT&id=${acc.id}`
                              )
                            }
                            title="View Bank Ledger"
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition-colors"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>

                          {/* Set Default */}
                          {!acc.is_default && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(acc)}
                              title="Set as Default Account for this Office"
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded transition-colors"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(acc)}
                            title="Edit Bank Account"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteDialog({
                                isOpen: true,
                                account: acc,
                              })
                            }
                            title="Delete Bank Account"
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Add / Edit Drawer */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingAccount ? "Edit Company Bank Account" : "Add Company Bank Account"}
        subtitle="Configure company bank account linked to an issuing office and accounting ledger."
        width="lg"
      >
        <form onSubmit={handleSaveAccount} className="space-y-6 pb-12">
          {/* Section 1: Bank Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-600" />
              1. Bank Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bank Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bank Name <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formBankName}
                  onChange={(e) => setFormBankName(e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                >
                  {INDIAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Bank Name (if Other) */}
              {formBankName === "Other" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full bank name"
                    value={formCustomBankName}
                    onChange={(e) => setFormCustomBankName(e.target.value)}
                    className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Account Holder Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Holder Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Panther Logistics Pvt Ltd"
                  value={formAccountHolder}
                  onChange={(e) => setFormAccountHolder(e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formAccountType}
                  onChange={(e) => setFormAccountType(e.target.value as any)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="CURRENT">Current Account</option>
                  <option value="SAVINGS">Savings Account</option>
                  <option value="OVERDRAFT">Overdraft (OD)</option>
                  <option value="CASH_CREDIT">Cash Credit (CC)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Bank Account Number */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bank Account Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter full account number"
                  value={formAccountNumber}
                  onChange={(e) => setFormAccountNumber(e.target.value)}
                  className="w-full text-sm font-mono border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Confirm Bank Account Number */}
              {!editingAccount && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Account Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter account number"
                    value={formConfirmAccountNumber}
                    onChange={(e) => setFormConfirmAccountNumber(e.target.value)}
                    className="w-full text-sm font-mono border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                  />
                  {formConfirmAccountNumber && formAccountNumber !== formConfirmAccountNumber && (
                    <span className="text-[11px] text-rose-500 mt-1 block">Account numbers do not match</span>
                  )}
                </div>
              )}

              {/* IFSC Code with Lookup */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  IFSC Code <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={11}
                    placeholder="e.g. HDFC0001234"
                    value={formIFSC}
                    onChange={(e) => setFormIFSC(e.target.value.toUpperCase())}
                    className="flex-1 text-sm font-mono uppercase border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyIFSC}
                    disabled={isVerifyingIFSC || formIFSC.length !== 11}
                    className="whitespace-nowrap"
                  >
                    {isVerifyingIFSC ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>

              {/* Branch Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Connaught Place Branch"
                  value={formBranchName}
                  onChange={(e) => setFormBranchName(e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Branch Address */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bank Branch Address
                </label>
                <input
                  type="text"
                  placeholder="Branch street address, city, state"
                  value={formBranchAddress}
                  onChange={(e) => setFormBranchAddress(e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* MICR Code */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  MICR Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="9-digit MICR code"
                  value={formMICR}
                  onChange={(e) => setFormMICR(e.target.value)}
                  className="w-full text-sm font-mono border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* UPI ID */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  UPI ID / VPA (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. company@hdfcbank"
                  value={formUPI}
                  onChange={(e) => setFormUPI(e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Issuing Office Association */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              2. Issuing Office Association
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Issuing Office Dropdown */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Issuing Office <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formOfficeId}
                  onChange={(e) => setFormOfficeId(Number(e.target.value))}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Issuing Office</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Office Info */}
              <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-md border border-gray-200 dark:border-gray-700 text-xs space-y-1">
                <div className="text-gray-500">Office Code & Location:</div>
                <div className="font-semibold text-gray-800 dark:text-gray-200">
                  {selectedOfficeObj
                    ? `${selectedOfficeObj.code} • ${selectedOfficeObj.city || "Headquarters"}, ${selectedOfficeObj.state || ""}`
                    : "Please select an issuing office"}
                </div>
              </div>

              {/* Default Bank Account Toggle */}
              <div className="md:col-span-2 flex items-center gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-md border border-amber-200/60 dark:border-amber-800/60">
                <input
                  type="checkbox"
                  id="formIsDefault"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                />
                <label htmlFor="formIsDefault" className="text-xs text-gray-700 dark:text-gray-300">
                  <span className="font-semibold block text-gray-900 dark:text-white">
                    Primary / Default Account for this Issuing Office
                  </span>
                  Automatically selected in receipts, payments, and contra transfers for this office.
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Expandable Advanced Accounting Details */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
              className="w-full flex items-center justify-between text-left py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Advanced Accounting Details (TallyPrime Integration)
              </span>
              {showAdvancedDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvancedDetails && (
              <div className="mt-3 space-y-4 p-4 bg-gray-50 dark:bg-gray-900/60 rounded-md border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Technical double-entry parameters automatically assigned per Indian accounting standards.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ledger Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Accounting Ledger Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank - Delhi Office"
                      value={formLedgerName}
                      onChange={(e) => setFormLedgerName(e.target.value)}
                      className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Ledger Group */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Accounting Group (TallyPrime)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formLedgerGroup}
                      className="w-full text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md p-2 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                    />
                  </div>

                  {/* Opening Balance */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Opening Balance (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formOpeningBalance}
                      onChange={(e) => setFormOpeningBalance(e.target.value)}
                      className="w-full text-sm font-mono border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Opening Balance Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Opening Balance Type
                    </label>
                    <select
                      value={formOpeningType}
                      onChange={(e) => setFormOpeningType(e.target.value as "DR" | "CR")}
                      className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="DR">Debit (Asset / In Hand)</option>
                      <option value="CR">Credit (Liability / Overdrawn)</option>
                    </select>
                  </div>

                  {/* Opening Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Opening Balance Date
                    </label>
                    <input
                      type="date"
                      value={formOpeningDate}
                      onChange={(e) => setFormOpeningDate(e.target.value)}
                      className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Bank Reconciliation Start Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Reconciliation Start Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formReconciliationDate}
                      onChange={(e) => setFormReconciliationDate(e.target.value)}
                      className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Account Status */}
                  <div className="flex items-center gap-3 md:col-span-2 pt-2">
                    <input
                      type="checkbox"
                      id="formIsActive"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="formIsActive" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Active Account (uncheck to deactivate without deleting transaction history)
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDrawerOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? "Saving..." : editingAccount ? "Update Bank Account" : "Save Bank Account"}
            </Button>
          </div>
        </form>
      </EntityDrawer>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false })}
        onConfirm={handleDelete}
        title="Delete Bank Account"
        description={`Are you sure you want to delete ${deleteDialog.account?.bank_name} (${deleteDialog.account?.account_number_masked})?`}
        consequence="If this bank account has recorded vouchers or transactions, deletion will be blocked to maintain historical ledger integrity. You can deactivate it instead."
        confirmText={deleteDialog.isDeleting ? "Deleting..." : "Delete Account"}
        variant="danger"
        isLoading={deleteDialog.isDeleting}
      />
    </div>
  );
}
