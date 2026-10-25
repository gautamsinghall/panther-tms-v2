"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BookOpen,
  Building2,
  Truck,
  Users,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Calendar,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Eye,
  AlertCircle,
  X,
  CreditCard,
  RefreshCw,
  SlidersHorizontal,
  DollarSign,
  Wallet,
  Receipt,
  FileCheck,
  FolderOpen,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

// ------------------------------------------------------------------------------
// Types
// ------------------------------------------------------------------------------

type LedgerCategory = "OVERVIEW" | "BILLING_CLIENT" | "VENDOR" | "DRIVER";

interface CategoryStat {
  total_accounts: number;
  total_outstanding: string | number;
  total_debit: string | number;
  total_credit: string | number;
  settled_count: number;
  pending_count: number;
}

interface MasterLedgerOverview {
  billing_clients: CategoryStat;
  vendors: CategoryStat;
  drivers: CategoryStat;
}

interface BillingClientLedgerItem {
  id: number;
  name: string;
  code?: string;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  opening_balance: string | number;
  opening_balance_type: string;
  total_debit: string | number;
  total_credit: string | number;
  outstanding_balance: string | number;
  balance_type: string;
  last_transaction_date?: string;
  transaction_count: number;
  issuing_office_name?: string;
}

interface VendorLedgerItem {
  id: number;
  name: string;
  code?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  opening_balance: string | number;
  opening_balance_type: string;
  total_debit: string | number;
  total_credit: string | number;
  outstanding_payable: string | number;
  balance_type: string;
  last_transaction_date?: string;
  transaction_count: number;
  issuing_office_name?: string;
}

interface DriverLedgerItem {
  id: number;
  name: string;
  driver_id?: string;
  phone: string;
  license_number?: string;
  dl_status?: string;
  opening_balance: string | number;
  opening_balance_type: string;
  total_advances: string | number;
  total_expenses: string | number;
  current_balance: string | number;
  balance_type: string;
  last_transaction_date?: string;
  transaction_count: number;
}

interface LedgerTx {
  id: number | string;
  entry_date: string;
  voucher_id?: number;
  voucher_number: string;
  voucher_type: string;
  reference_number?: string;
  particulars: string;
  debit_amount: string | number;
  credit_amount: string | number;
  running_balance: string | number;
  balance_type: string;
  status: string;
  is_void: boolean;
  is_reversal: boolean;
  source_type?: string;
  source_id?: number;
}

interface PartyDetails {
  id: number;
  name: string;
  code?: string;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  license_number?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  credit_period_days?: number;
  credit_limit?: number | string;
  payment_terms?: string;
  issuing_office_name?: string;
}

interface DetailedLedgerData {
  category: LedgerCategory;
  party: PartyDetails;
  from_date?: string;
  to_date?: string;
  opening_balance: string | number;
  opening_balance_type: string;
  total_debit: string | number;
  total_credit: string | number;
  closing_balance: string | number;
  closing_balance_type: string;
  total_transactions: number;
  transactions: LedgerTx[];
}

export default function MasterLedgerPage() {
  // Navigation State
  const [activeCategory, setActiveCategory] = useState<LedgerCategory>("OVERVIEW");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // Data States
  const [overview, setOverview] = useState<MasterLedgerOverview | null>(null);
  const [billingClients, setBillingClients] = useState<BillingClientLedgerItem[]>([]);
  const [vendors, setVendors] = useState<VendorLedgerItem[]>([]);
  const [drivers, setDrivers] = useState<DriverLedgerItem[]>([]);
  const [detailedLedger, setDetailedLedger] = useState<DetailedLedgerData | null>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters for Listing
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Filters for Detailed Ledger
  const [detailFromDate, setDetailFromDate] = useState("");
  const [detailToDate, setDetailToDate] = useState("");
  const [detailSearch, setDetailSearch] = useState("");
  const [detailTxType, setDetailTxType] = useState("ALL");
  const [datePreset, setDatePreset] = useState("ALL");

  // Source Document Viewer Modal
  const [sourceDocModal, setSourceDocModal] = useState<{
    isOpen: boolean;
    tx?: LedgerTx;
    isLoading?: boolean;
    data?: any;
  }>({ isOpen: false });

  // ----------------------------------------------------------------------------
  // ----------------------------------------------------------------------------
  // Load Overview & Category Lists
  // ----------------------------------------------------------------------------
  const loadOverviewAndLists = async () => {
    try {
      setIsLoading(true);
      // Fetch master ledger summaries as well as primary entity masters in parallel
      const [sumRes, bcRes, vendRes, drvRes, rawClients, rawVendors, rawDrivers] = await Promise.all([
        apiClient<MasterLedgerOverview>("/api/v1/accounts/master-ledger/summary").catch(() => null),
        apiClient<BillingClientLedgerItem[]>("/api/v1/accounts/master-ledger/billing-clients").catch(() => []),
        apiClient<VendorLedgerItem[]>("/api/v1/accounts/master-ledger/vendors").catch(() => []),
        apiClient<DriverLedgerItem[]>("/api/v1/accounts/master-ledger/drivers").catch(() => []),
        apiClient<any[]>("/api/v1/general/billing-clients").catch(() => []),
        apiClient<any[]>("/api/v1/general/vendors").catch(() => []),
        apiClient<any[]>("/api/v1/transport/drivers").catch(() => []),
      ]);

      // 1. Merge Billing Clients: Every client created in Billing Client Master is guaranteed to appear
      const bcMap = new Map<number, BillingClientLedgerItem>();
      (bcRes || []).forEach((c) => bcMap.set(c.id, c));
      (rawClients || []).forEach((rc) => {
        if (!bcMap.has(rc.id)) {
          const openBal = rc.opening_balance || "0.00";
          const openType = rc.opening_balance_type || "DR";
          bcMap.set(rc.id, {
            id: rc.id,
            name: rc.name,
            code: rc.code || `BC-${String(rc.id).padStart(4, "0")}`,
            company_name: rc.company_name,
            contact_person: rc.contact_person,
            phone: rc.phone,
            email: rc.email,
            gstin: rc.gstin,
            pan: rc.pan,
            opening_balance: openBal,
            opening_balance_type: openType,
            total_debit: "0.00",
            total_credit: "0.00",
            outstanding_balance: openBal,
            balance_type: Number(openBal) > 0 ? openType : "NIL",
            transaction_count: 0,
            issuing_office_name: rc.issuing_office?.name || rc.issuing_office_name,
          });
        }
      });
      const mergedClients = Array.from(bcMap.values());
      setBillingClients(mergedClients);

      // 2. Merge Vendors: Every vendor created in Vendor Master is guaranteed to appear
      const vendMap = new Map<number, VendorLedgerItem>();
      (vendRes || []).forEach((v) => vendMap.set(v.id, v));
      (rawVendors || []).forEach((rv) => {
        if (!vendMap.has(rv.id)) {
          const openBal = rv.opening_balance || "0.00";
          const openType = rv.opening_balance_type || "CR";
          vendMap.set(rv.id, {
            id: rv.id,
            name: rv.name,
            code: rv.code || `VEND-${String(rv.id).padStart(4, "0")}`,
            phone: rv.phone,
            email: rv.email,
            gstin: rv.gstin,
            pan: rv.pan,
            opening_balance: openBal,
            opening_balance_type: openType,
            total_debit: "0.00",
            total_credit: "0.00",
            outstanding_payable: openBal,
            balance_type: Number(openBal) > 0 ? openType : "NIL",
            transaction_count: 0,
            issuing_office_name: rv.issuing_office?.name || rv.issuing_office_name,
          });
        }
      });
      const mergedVendors = Array.from(vendMap.values());
      setVendors(mergedVendors);

      // 3. Merge Drivers: Every driver created in Driver Master is guaranteed to appear
      const drvMap = new Map<number, DriverLedgerItem>();
      (drvRes || []).forEach((d) => drvMap.set(d.id, d));
      (rawDrivers || []).forEach((rd) => {
        if (!drvMap.has(rd.id)) {
          drvMap.set(rd.id, {
            id: rd.id,
            name: rd.name,
            driver_id: rd.driver_id || (rd.id ? `DRV-${rd.id}` : undefined),
            phone: rd.phone || "",
            license_number: rd.license_number,
            dl_status: rd.dl_status || "Active",
            opening_balance: "0.00",
            opening_balance_type: "DR",
            total_advances: "0.00",
            total_expenses: "0.00",
            current_balance: "0.00",
            balance_type: "NIL",
            transaction_count: 0,
          });
        }
      });
      const mergedDrivers = Array.from(drvMap.values());
      setDrivers(mergedDrivers);

      // 4. Compute / Enhance Overview Summary metrics
      const bcOutstanding = sumRes?.billing_clients?.total_outstanding ??
        mergedClients.reduce((sum, c) => sum + (c.balance_type === "DR" ? Number(c.outstanding_balance || 0) : 0), 0);
      const vendOutstanding = sumRes?.vendors?.total_outstanding ??
        mergedVendors.reduce((sum, v) => sum + (v.balance_type === "CR" ? Number(v.outstanding_payable || 0) : 0), 0);
      const drvOutstanding = sumRes?.drivers?.total_outstanding ??
        mergedDrivers.reduce((sum, d) => sum + (d.balance_type === "DR" ? Number(d.current_balance || 0) : 0), 0);

      setOverview({
        billing_clients: {
          total_accounts: Math.max(sumRes?.billing_clients?.total_accounts || 0, mergedClients.length),
          total_outstanding: bcOutstanding,
          total_debit: sumRes?.billing_clients?.total_debit || mergedClients.reduce((s, c) => s + Number(c.total_debit || 0), 0),
          total_credit: sumRes?.billing_clients?.total_credit || mergedClients.reduce((s, c) => s + Number(c.total_credit || 0), 0),
          settled_count: mergedClients.filter((c) => c.balance_type === "NIL" || Number(c.outstanding_balance) === 0).length,
          pending_count: mergedClients.filter((c) => c.balance_type !== "NIL" && Number(c.outstanding_balance) > 0).length,
        },
        vendors: {
          total_accounts: Math.max(sumRes?.vendors?.total_accounts || 0, mergedVendors.length),
          total_outstanding: vendOutstanding,
          total_debit: sumRes?.vendors?.total_debit || mergedVendors.reduce((s, v) => s + Number(v.total_debit || 0), 0),
          total_credit: sumRes?.vendors?.total_credit || mergedVendors.reduce((s, v) => s + Number(v.total_credit || 0), 0),
          settled_count: mergedVendors.filter((v) => v.balance_type === "NIL" || Number(v.outstanding_payable) === 0).length,
          pending_count: mergedVendors.filter((v) => v.balance_type !== "NIL" && Number(v.outstanding_payable) > 0).length,
        },
        drivers: {
          total_accounts: Math.max(sumRes?.drivers?.total_accounts || 0, mergedDrivers.length),
          total_outstanding: drvOutstanding,
          total_debit: sumRes?.drivers?.total_debit || mergedDrivers.reduce((s, d) => s + Number(d.total_advances || 0), 0),
          total_credit: sumRes?.drivers?.total_credit || mergedDrivers.reduce((s, d) => s + Number(d.total_expenses || 0), 0),
          settled_count: mergedDrivers.filter((d) => d.balance_type === "NIL" || Number(d.current_balance) === 0).length,
          pending_count: mergedDrivers.filter((d) => d.balance_type !== "NIL" && Number(d.current_balance) > 0).length,
        },
      });
    } catch (err) {
      console.error("Error loading master ledger data:", err);
      toast.error("Failed to load Master Ledger summaries.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadOverviewAndLists();
  }, []);

  // ----------------------------------------------------------------------------
  // Load Detailed Ledger Statement
  // ----------------------------------------------------------------------------
  const loadDetailedLedger = async (
    category: LedgerCategory,
    id: number,
    fromDate?: string,
    toDate?: string,
    search?: string,
    txType?: string
  ) => {
    setIsLoadingDetail(true);
    try {
      let endpoint = "";
      if (category === "BILLING_CLIENT") {
        endpoint = `/api/v1/accounts/master-ledger/billing-clients/${id}`;
      } else if (category === "VENDOR") {
        endpoint = `/api/v1/accounts/master-ledger/vendors/${id}`;
      } else if (category === "DRIVER") {
        endpoint = `/api/v1/accounts/master-ledger/drivers/${id}`;
      }

      const params = new URLSearchParams();
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);
      if (search) params.append("search", search);
      if (txType && txType !== "ALL") params.append("tx_type", txType);

      const queryString = params.toString();
      const url = queryString ? `${endpoint}?${queryString}` : endpoint;

      try {
        const res = await apiClient<DetailedLedgerData>(url);
        setDetailedLedger(res);
        setSelectedAccountId(id);
      } catch (apiErr) {
        // Fallback: Construct client statement from master details & available vouchers
        let partyObj: PartyDetails = { id, name: `Account #${id}` };
        if (category === "BILLING_CLIENT") {
          const client = billingClients.find((c) => c.id === id);
          if (client) {
            partyObj = {
              id: client.id,
              name: client.name,
              code: client.code,
              company_name: client.company_name,
              contact_person: client.contact_person,
              phone: client.phone,
              email: client.email,
              gstin: client.gstin,
              pan: client.pan,
              issuing_office_name: client.issuing_office_name,
            };
          }
        } else if (category === "VENDOR") {
          const vendor = vendors.find((v) => v.id === id);
          if (vendor) {
            partyObj = {
              id: vendor.id,
              name: vendor.name,
              code: vendor.code,
              phone: vendor.phone,
              email: vendor.email,
              gstin: vendor.gstin,
              pan: vendor.pan,
              issuing_office_name: vendor.issuing_office_name,
            };
          }
        } else if (category === "DRIVER") {
          const driver = drivers.find((d) => d.id === id);
          if (driver) {
            partyObj = {
              id: driver.id,
              name: driver.name,
              code: driver.driver_id,
              phone: driver.phone,
              license_number: driver.license_number,
            };
          }
        }

        // Fetch general vouchers to extract matching entries if available
        let txs: LedgerTx[] = [];
        try {
          const allVouchers = await apiClient<any[]>("/api/v1/accounts/vouchers").catch(() => []);
          const matchVouchers = (allVouchers || []).filter((v: any) => {
            const partyMatch = v.party_name && v.party_name.trim().toLowerCase() === partyObj.name.trim().toLowerCase();
            const idMatch =
              (category === "BILLING_CLIENT" && (v.billing_client_id === id || v.lr?.billing_customer_id === id)) ||
              (category === "VENDOR" && (v.vendor_id === id || v.hire_challan?.vendor_id === id)) ||
              (category === "DRIVER" && v.driver_id === id);
            return partyMatch || idMatch;
          });

          let running = 0;
          txs = matchVouchers.map((v: any) => {
            const amt = Number(v.net_amount || 0);
            let dr = 0;
            let cr = 0;
            if (category === "BILLING_CLIENT") {
              if (["TRANSPORT_INVOICE", "GENERAL_INVOICE", "DEBIT_NOTE"].includes(v.voucher_type)) {
                dr = amt;
                running += dr;
              } else {
                cr = amt;
                running -= cr;
              }
            } else if (category === "VENDOR") {
              if (["PAYMENT_VOUCHER", "ATH_PAYMENT", "BTH_PAYMENT", "DEBIT_NOTE"].includes(v.voucher_type)) {
                dr = amt;
                running -= dr;
              } else {
                cr = amt;
                running += cr;
              }
            } else {
              if (["PAYMENT_VOUCHER", "ATH_PAYMENT", "BTH_PAYMENT"].includes(v.voucher_type)) {
                dr = amt;
                running += dr;
              } else {
                cr = amt;
                running += cr;
              }
            }
            return {
              id: v.id,
              entry_date: v.voucher_date || new Date().toISOString().split("T")[0],
              voucher_id: v.id,
              voucher_number: v.voucher_number,
              voucher_type: v.voucher_type,
              reference_number: v.reference_number || (v.lr?.lr_number ? `LR ${v.lr.lr_number}` : undefined),
              particulars: v.narration || `${v.voucher_type.replace(/_/g, " ")} - ${v.voucher_number}`,
              debit_amount: dr,
              credit_amount: cr,
              running_balance: Math.abs(running),
              balance_type: running >= 0 ? "DR" : "CR",
              status: v.is_void ? "VOID" : "CONFIRMED",
              is_void: !!v.is_void,
              is_reversal: false,
            };
          });
        } catch {
          // Keep empty transactions if vouchers endpoint fails
        }

        const totalDr = txs.reduce((sum, t) => sum + Number(t.debit_amount || 0), 0);
        const totalCr = txs.reduce((sum, t) => sum + Number(t.credit_amount || 0), 0);
        const netBal = totalDr - totalCr;

        setDetailedLedger({
          category,
          party: partyObj,
          from_date: fromDate,
          to_date: toDate,
          opening_balance: "0.00",
          opening_balance_type: "DR",
          total_debit: totalDr,
          total_credit: totalCr,
          closing_balance: Math.abs(netBal),
          closing_balance_type: netBal >= 0 ? "DR" : "CR",
          total_transactions: txs.length,
          transactions: txs,
        });
        setSelectedAccountId(id);
      }
    } catch (err) {
      console.error("Error loading detailed ledger statement:", err);
      toast.error("Failed to load ledger statement.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Trigger load when account selected or filters change
  useEffect(() => {
    if (selectedAccountId && activeCategory !== "OVERVIEW") {
      loadDetailedLedger(
        activeCategory,
        selectedAccountId,
        detailFromDate || undefined,
        detailToDate || undefined,
        detailSearch || undefined,
        detailTxType || undefined
      );
    }
  }, [selectedAccountId, activeCategory, detailFromDate, detailToDate, detailSearch, detailTxType]);

  // Date Preset Handler
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    const formatDateStr = (d: Date) => d.toISOString().split("T")[0];

    if (preset === "ALL") {
      setDetailFromDate("");
      setDetailToDate("");
    } else if (preset === "THIS_MONTH") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDetailFromDate(formatDateStr(firstDay));
      setDetailToDate(formatDateStr(lastDay));
    } else if (preset === "LAST_MONTH") {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setDetailFromDate(formatDateStr(firstDay));
      setDetailToDate(formatDateStr(lastDay));
    } else if (preset === "THIS_FY") {
      // Indian Financial Year: Apr 1 to Mar 31
      const currentYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      const startFY = new Date(currentYear, 3, 1);
      const endFY = new Date(currentYear + 1, 2, 31);
      setDetailFromDate(formatDateStr(startFY));
      setDetailToDate(formatDateStr(endFY));
    } else if (preset === "LAST_30_DAYS") {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      setDetailFromDate(formatDateStr(past));
      setDetailToDate(formatDateStr(today));
    }
  };

  // Open Source Document View
  const handleOpenSourceDoc = async (tx: LedgerTx) => {
    setSourceDocModal({ isOpen: true, tx, isLoading: true });
    try {
      if (tx.voucher_id) {
        const vData = await apiClient(`/api/v1/accounts/vouchers/${tx.voucher_id}`);
        setSourceDocModal({ isOpen: true, tx, isLoading: false, data: vData });
      } else {
        setSourceDocModal({ isOpen: true, tx, isLoading: false, data: null });
      }
    } catch (err) {
      setSourceDocModal({ isOpen: true, tx, isLoading: false, data: null });
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Export to CSV / Excel Handler
  const handleExportCSV = () => {
    if (!detailedLedger) return;
    const { party, transactions, opening_balance, closing_balance, closing_balance_type, total_debit, total_credit } = detailedLedger;

    const headers = [
      "Date",
      "Voucher/Tx Number",
      "Transaction Type",
      "Reference Number",
      "Particulars",
      "Debit Amount (INR)",
      "Credit Amount (INR)",
      "Running Balance (INR)",
      "Balance Type",
      "Status",
    ];

    const rows = transactions.map((t) => [
      t.entry_date,
      `"${t.voucher_number || ""}"`,
      `"${t.voucher_type || ""}"`,
      `"${t.reference_number || ""}"`,
      `"${(t.particulars || "").replace(/"/g, '""')}"`,
      Number(t.debit_amount || 0).toFixed(2),
      Number(t.credit_amount || 0).toFixed(2),
      Number(t.running_balance || 0).toFixed(2),
      t.balance_type,
      t.status,
    ]);

    const csvContent = [
      `"STATEMENT OF ACCOUNT - ${party.name.toUpperCase()}"`,
      `"Account Code: ${party.code || party.id}"`,
      `"Period: ${detailFromDate || "Inception"} to ${detailToDate || "Present"}"`,
      `"Opening Balance: INR ${Number(opening_balance || 0).toFixed(2)} (${detailedLedger.opening_balance_type})"`,
      "",
      headers.join(","),
      ...rows.map((r) => r.join(",")),
      "",
      `"Totals",,,,,"${Number(total_debit || 0).toFixed(2)}","${Number(total_credit || 0).toFixed(2)}"`,
      `"Closing Balance",,,,,,,"${Number(closing_balance || 0).toFixed(2)}","${closing_balance_type}"`,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Ledger_${party.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Ledger statement exported successfully!");
  };

  // Filtered lists for categories
  const filteredBillingClients = useMemo(() => {
    return billingClients.filter((c) => {
      const matchSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.gstin && c.gstin.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "RECEIVABLE" && c.balance_type === "DR" && Number(c.outstanding_balance) > 0) ||
        (statusFilter === "SETTLED" && (c.balance_type === "NIL" || Number(c.outstanding_balance) === 0)) ||
        (statusFilter === "ADVANCE" && c.balance_type === "CR");

      return matchSearch && matchStatus;
    });
  }, [billingClients, searchQuery, statusFilter]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchSearch =
        !searchQuery ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.code && v.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.phone && v.phone.includes(searchQuery)) ||
        (v.gstin && v.gstin.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PAYABLE" && v.balance_type === "CR" && Number(v.outstanding_payable) > 0) ||
        (statusFilter === "SETTLED" && (v.balance_type === "NIL" || Number(v.outstanding_payable) === 0)) ||
        (statusFilter === "ADVANCE" && v.balance_type === "DR");

      return matchSearch && matchStatus;
    });
  }, [vendors, searchQuery, statusFilter]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchSearch =
        !searchQuery ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.license_number && d.license_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.phone && d.phone.includes(searchQuery));

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "RECOVERABLE" && d.balance_type === "DR" && Number(d.current_balance) > 0) ||
        (statusFilter === "PAYABLE" && d.balance_type === "CR" && Number(d.current_balance) > 0) ||
        (statusFilter === "SETTLED" && (d.balance_type === "NIL" || Number(d.current_balance) === 0));

      return matchSearch && matchStatus;
    });
  }, [drivers, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="print:hidden">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Accounts", href: "/accounts" },
            { label: "Master Ledger" },
          ]}
          title="Master Ledger System"
          description="Enterprise accounting ledgers maintaining real-time auditability across Billing Clients, Vendors, and Drivers."
          primaryAction={{
            label: "Refresh Ledgers",
            icon: RefreshCw,
            onClick: () => {
              setIsRefreshing(true);
              loadOverviewAndLists();
            },
          }}
        />
      </div>

      {/* ------------------------------------------------------------------------ */}
      {/* VIEW A: CATEGORY FOLDERS OVERVIEW                                        */}
      {/* ------------------------------------------------------------------------ */}
      {activeCategory === "OVERVIEW" && !selectedAccountId && (
        <div className="space-y-6">
          {/* Category Cards - Interactive Folder-Style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Billing Client Ledger */}
            <div
              onClick={() => {
                setActiveCategory("BILLING_CLIENT");
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="group cursor-pointer relative bg-white dark:bg-[#111827] rounded-xl border border-[#E4E7EC] dark:border-slate-800 p-6 shadow-[0_1px_3px_rgba(16,24,40,0.05)] hover:border-[#4F46E5] dark:hover:border-indigo-500 hover:shadow-[0_10px_25px_-5px_rgba(79,70,229,0.12)] transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] dark:bg-indigo-950/60 border border-[#C7D2FE] dark:border-indigo-800 flex items-center justify-center text-[#4F46E5] dark:text-indigo-400 group-hover:scale-105 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <Badge variant="primary" className="text-xs font-semibold px-2.5 py-0.5">
                    Sundry Debtors • Asset
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-[#101828] dark:text-white group-hover:text-[#4F46E5] dark:group-hover:text-indigo-400 transition-colors">
                  Billing Client Ledger
                </h3>
                <p className="text-xs text-[#667085] dark:text-slate-400 mt-1 leading-relaxed">
                  Real-time customer freight billing, payment receipts, debit/credit notes, and open receivables.
                </p>

                {/* Financial Summary */}
                <div className="mt-5 pt-4 border-t border-[#F2F4F7] dark:border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-slate-400">Total Client Accounts</span>
                    <span className="font-semibold text-[#101828] dark:text-slate-200">
                      {overview?.billing_clients?.total_accounts || billingClients.length} accounts
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-slate-400">Total Billed (Debits)</span>
                    <span className="font-semibold text-[#101828] dark:text-slate-200">
                      {formatCurrency(overview?.billing_clients?.total_debit || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-slate-400">Total Collections (Credits)</span>
                    <span className="font-semibold text-[#027A48] dark:text-emerald-400">
                      {formatCurrency(overview?.billing_clients?.total_credit || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-dashed border-[#E4E7EC] dark:border-slate-800">
                    <span className="text-[#101828] dark:text-slate-300">Net Outstanding Receivable</span>
                    <span className="text-[#4F46E5] dark:text-indigo-400 font-extrabold text-base">
                      {formatCurrency(overview?.billing_clients?.total_outstanding || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 flex items-center justify-between text-xs font-semibold text-[#4F46E5] dark:text-indigo-400">
                <span>Open Client Directory</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: Vendor Ledger */}
            <div
              onClick={() => {
                setActiveCategory("VENDOR");
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="group cursor-pointer relative bg-white dark:bg-[#111827] rounded-xl border border-[#E4E7EC] dark:border-slate-800 p-6 shadow-[0_1px_3px_rgba(16,24,40,0.05)] hover:border-[#B54708] dark:hover:border-amber-500 hover:shadow-[0_10px_25px_-5px_rgba(181,71,8,0.12)] transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FFFAEB] dark:bg-amber-950/60 border border-[#FEDF89] dark:border-amber-800 flex items-center justify-center text-[#B54708] dark:text-amber-400 group-hover:scale-105 transition-transform">
                    <Truck className="w-6 h-6" />
                  </div>
                  <Badge variant="warning" className="text-xs font-semibold px-2.5 py-0.5">
                    Sundry Creditors • Liability
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-[#101828] dark:text-white group-hover:text-[#B54708] dark:group-hover:text-amber-400 transition-colors">
                  Vendor Ledger
                </h3>
                <p className="text-xs text-[#667085] dark:text-slate-400 mt-1 leading-relaxed">
                  Supplier purchase bills, Hire Challan freight payables, ATH/BTH disbursements, and liabilities.
                </p>

                {/* Financial Summary */}
                <div className="mt-5 pt-4 border-t border-[#F2F4F7] dark:border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-slate-400">Total Registered Vendors</span>
                    <span className="font-semibold text-[#101828] dark:text-slate-200">
                      {overview?.vendors?.total_accounts || vendors.length} vendors
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-slate-400">Total Bills & Payables</span>
                    <span className="font-semibold text-[#101828] dark:text-slate-200">
                      {formatCurrency(overview?.vendors?.total_credit || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-slate-400">Total Disbursements (Debits)</span>
                    <span className="font-semibold text-[#027A48] dark:text-emerald-400">
                      {formatCurrency(overview?.vendors?.total_debit || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-dashed border-[#E4E7EC] dark:border-slate-800">
                    <span className="text-[#101828] dark:text-slate-300">Total Outstanding Payable</span>
                    <span className="text-[#B54708] dark:text-amber-400 font-extrabold text-base">
                      {formatCurrency(overview?.vendors?.total_outstanding || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 flex items-center justify-between text-xs font-semibold text-[#B54708] dark:text-amber-400">
                <span>Open Vendor Directory</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: Driver Ledger */}
            <div
              onClick={() => {
                setActiveCategory("DRIVER");
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="group cursor-pointer relative bg-white dark:bg-[#111827] rounded-xl border border-[#E4E7EC] dark:border-slate-800 p-6 shadow-[0_1px_3px_rgba(16,24,40,0.05)] hover:border-[#027A48] dark:hover:border-emerald-500 hover:shadow-[0_10px_25px_-5px_rgba(2,122,72,0.12)] transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#ECFDF3] dark:bg-emerald-950/60 border border-[#A6F4C5] dark:border-emerald-800 flex items-center justify-center text-[#027A48] dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <Badge variant="success" className="text-xs font-semibold px-2.5 py-0.5">
                    Fleet Imprest & Settlements
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-[#101828] dark:text-white group-hover:text-[#027A48] dark:group-hover:text-emerald-400 transition-colors">
                  Driver Ledger
                </h3>
                <p className="text-xs text-[#667085] dark:text-slate-400 mt-1 leading-relaxed">
                  En-route trip advances (cash/fuel), toll & expense reimbursements, deductions, and balance recovery.
                </p>

                {/* Financial Summary */}
                <div className="mt-5 pt-4 border-t border-[#F2F4F7] dark:border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-slate-400">Total Active Drivers</span>
                    <span className="font-semibold text-[#101828] dark:text-slate-200">
                      {overview?.drivers?.total_accounts || drivers.length} drivers
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-slate-400">Total Advances Disbursed</span>
                    <span className="font-semibold text-[#101828] dark:text-slate-200">
                      {formatCurrency(overview?.drivers?.total_debit || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-slate-400">Approved Trip Expenses</span>
                    <span className="font-semibold text-[#027A48] dark:text-emerald-400">
                      {formatCurrency(overview?.drivers?.total_credit || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-dashed border-[#E4E7EC] dark:border-slate-800">
                    <span className="text-[#101828] dark:text-slate-300">Net Recoverable Imprest</span>
                    <span className="text-[#027A48] dark:text-emerald-400 font-extrabold text-base">
                      {formatCurrency(overview?.drivers?.total_outstanding || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 flex items-center justify-between text-xs font-semibold text-[#027A48] dark:text-emerald-400">
                <span>Open Driver Directory</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* VIEW B: LISTING VIEW (BILLING CLIENTS, VENDORS, DRIVERS)                 */}
      {/* ------------------------------------------------------------------------ */}
      {activeCategory !== "OVERVIEW" && !selectedAccountId && (
        <div className="space-y-4">
          {/* Top Bar with Category Tabs and Back to Folders */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-4 rounded-xl border border-[#E4E7EC] dark:border-slate-800 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveCategory("OVERVIEW")}
                className="gap-1.5 text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Categories
              </Button>
              <div className="h-5 w-px bg-[#E4E7EC] dark:bg-slate-800" />
              <div className="flex rounded-lg bg-[#F2F4F7] dark:bg-slate-800/80 p-0.5">
                <button
                  onClick={() => setActiveCategory("BILLING_CLIENT")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                    activeCategory === "BILLING_CLIENT"
                      ? "bg-white dark:bg-slate-900 text-[#4F46E5] dark:text-indigo-400 shadow-sm"
                      : "text-[#667085] dark:text-slate-400 hover:text-[#101828] dark:hover:text-white"
                  )}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Billing Clients ({billingClients.length})
                </button>
                <button
                  onClick={() => setActiveCategory("VENDOR")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                    activeCategory === "VENDOR"
                      ? "bg-white dark:bg-slate-900 text-[#B54708] dark:text-amber-400 shadow-sm"
                      : "text-[#667085] dark:text-slate-400 hover:text-[#101828] dark:hover:text-white"
                  )}
                >
                  <Truck className="w-3.5 h-3.5" />
                  Vendors ({vendors.length})
                </button>
                <button
                  onClick={() => setActiveCategory("DRIVER")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                    activeCategory === "DRIVER"
                      ? "bg-white dark:bg-slate-900 text-[#027A48] dark:text-emerald-400 shadow-sm"
                      : "text-[#667085] dark:text-slate-400 hover:text-[#101828] dark:hover:text-white"
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  Drivers ({drivers.length})
                </button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-[#667085] dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Search ${activeCategory === "BILLING_CLIENT" ? "clients" : activeCategory === "VENDOR" ? "vendors" : "drivers"}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F9FB] dark:bg-slate-900 border border-[#E4E7EC] dark:border-slate-800 rounded-lg focus:outline-none focus:border-[#4F46E5] dark:text-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#F8F9FB] dark:bg-slate-900 border border-[#E4E7EC] dark:border-slate-800 rounded-lg text-[#344054] dark:text-slate-300 font-medium focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="ALL">All Balances</option>
                {activeCategory === "BILLING_CLIENT" && (
                  <>
                    <option value="RECEIVABLE">Receivable (Pending)</option>
                    <option value="SETTLED">Settled (NIL)</option>
                    <option value="ADVANCE">Advance Balance</option>
                  </>
                )}
                {activeCategory === "VENDOR" && (
                  <>
                    <option value="PAYABLE">Payable (Pending)</option>
                    <option value="SETTLED">Settled (NIL)</option>
                    <option value="ADVANCE">Advance Paid</option>
                  </>
                )}
                {activeCategory === "DRIVER" && (
                  <>
                    <option value="RECOVERABLE">Recoverable (Advance Due)</option>
                    <option value="PAYABLE">Reimbursement Payable</option>
                    <option value="SETTLED">Settled</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-[#E4E7EC] dark:border-slate-800 shadow-[0_1px_3px_rgba(16,24,40,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              {/* Category 1: Billing Clients Table */}
              {activeCategory === "BILLING_CLIENT" && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] dark:bg-slate-800/60 border-b border-[#E4E7EC] dark:border-slate-800 text-[11px] font-semibold text-[#475467] dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-3 px-4">Billing Client</th>
                      <th className="py-3 px-4">Account Code</th>
                      <th className="py-3 px-4 text-right">Opening Balance</th>
                      <th className="py-3 px-4 text-right">Total Debit</th>
                      <th className="py-3 px-4 text-right">Total Credit</th>
                      <th className="py-3 px-4 text-right">Outstanding Balance</th>
                      <th className="py-3 px-4">Last Activity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7] dark:divide-slate-800/70 text-xs">
                    {filteredBillingClients.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#667085] dark:text-slate-400">
                          <Building2 className="w-8 h-8 mx-auto text-[#98A2B3] mb-2" />
                          <p className="font-semibold text-sm text-[#101828] dark:text-slate-200">No Billing Clients Found</p>
                          <p className="text-xs mt-0.5">No clients match your filter or search criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredBillingClients.map((client) => {
                        const isPending = client.balance_type === "DR" && Number(client.outstanding_balance) > 0;
                        const isAdvance = client.balance_type === "CR" && Number(client.outstanding_balance) > 0;
                        return (
                          <tr
                            key={client.id}
                            className="hover:bg-[#F9FAFB] dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-[#101828] dark:text-white">
                                {client.name}
                              </div>
                              {client.company_name && client.company_name !== client.name && (
                                <div className="text-[11px] text-[#667085] dark:text-slate-400">
                                  {client.company_name}
                                </div>
                              )}
                              {client.gstin && (
                                <div className="text-[10px] text-[#98A2B3] font-mono mt-0.5">
                                  GST: {client.gstin}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-[#344054] dark:text-slate-300">
                              {client.code || `BC-${client.id}`}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-[#475467] dark:text-slate-300">
                              {formatCurrency(client.opening_balance)}
                              <span className="text-[10px] text-[#98A2B3] ml-1">
                                {client.opening_balance_type}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-[#101828] dark:text-slate-200">
                              {formatCurrency(client.total_debit)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-[#027A48] dark:text-emerald-400">
                              {formatCurrency(client.total_credit)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span
                                className={cn(
                                  "font-bold text-xs",
                                  isPending && "text-[#4F46E5] dark:text-indigo-400",
                                  isAdvance && "text-[#B54708] dark:text-amber-400",
                                  !isPending && !isAdvance && "text-[#667085] dark:text-slate-400"
                                )}
                              >
                                {formatCurrency(client.outstanding_balance)}
                              </span>
                              <Badge
                                variant={isPending ? "primary" : isAdvance ? "warning" : "neutral"}
                                className="ml-2 text-[10px] px-1.5 py-0"
                              >
                                {isPending ? "Receivable" : isAdvance ? "Advance" : "Settled"}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-[#475467] dark:text-slate-300">
                              {client.last_transaction_date ? formatDate(client.last_transaction_date) : "No activity"}
                              <div className="text-[10px] text-[#98A2B3]">
                                {client.transaction_count} vouchers
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAccountId(client.id);
                                  setDatePreset("ALL");
                                  setDetailFromDate("");
                                  setDetailToDate("");
                                  setDetailSearch("");
                                  setDetailTxType("ALL");
                                }}
                                className="text-xs h-7 gap-1 font-semibold hover:border-[#4F46E5] hover:text-[#4F46E5]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Ledger
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {/* Category 2: Vendors Table */}
              {activeCategory === "VENDOR" && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] dark:bg-slate-800/60 border-b border-[#E4E7EC] dark:border-slate-800 text-[11px] font-semibold text-[#475467] dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-3 px-4">Vendor / Supplier</th>
                      <th className="py-3 px-4">Vendor Code</th>
                      <th className="py-3 px-4 text-right">Opening Balance</th>
                      <th className="py-3 px-4 text-right">Total Debit (Paid)</th>
                      <th className="py-3 px-4 text-right">Total Credit (Billed)</th>
                      <th className="py-3 px-4 text-right">Outstanding Payable</th>
                      <th className="py-3 px-4">Last Activity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7] dark:divide-slate-800/70 text-xs">
                    {filteredVendors.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#667085] dark:text-slate-400">
                          <Truck className="w-8 h-8 mx-auto text-[#98A2B3] mb-2" />
                          <p className="font-semibold text-sm text-[#101828] dark:text-slate-200">No Vendors Found</p>
                          <p className="text-xs mt-0.5">No vendors match your filter or search criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredVendors.map((vendor) => {
                        const isPayable = vendor.balance_type === "CR" && Number(vendor.outstanding_payable) > 0;
                        const isAdvance = vendor.balance_type === "DR" && Number(vendor.outstanding_payable) > 0;
                        return (
                          <tr
                            key={vendor.id}
                            className="hover:bg-[#F9FAFB] dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-[#101828] dark:text-white">
                                {vendor.name}
                              </div>
                              {vendor.phone && (
                                <div className="text-[11px] text-[#667085] dark:text-slate-400">
                                  Ph: {vendor.phone}
                                </div>
                              )}
                              {vendor.gstin && (
                                <div className="text-[10px] text-[#98A2B3] font-mono mt-0.5">
                                  GST: {vendor.gstin}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-[#344054] dark:text-slate-300">
                              {vendor.code || `VEND-${vendor.id}`}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-[#475467] dark:text-slate-300">
                              {formatCurrency(vendor.opening_balance)}
                              <span className="text-[10px] text-[#98A2B3] ml-1">
                                {vendor.opening_balance_type}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-[#027A48] dark:text-emerald-400">
                              {formatCurrency(vendor.total_debit)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-[#101828] dark:text-slate-200">
                              {formatCurrency(vendor.total_credit)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span
                                className={cn(
                                  "font-bold text-xs",
                                  isPayable && "text-[#B54708] dark:text-amber-400",
                                  isAdvance && "text-[#4F46E5] dark:text-indigo-400",
                                  !isPayable && !isAdvance && "text-[#667085] dark:text-slate-400"
                                )}
                              >
                                {formatCurrency(vendor.outstanding_payable)}
                              </span>
                              <Badge
                                variant={isPayable ? "warning" : isAdvance ? "primary" : "neutral"}
                                className="ml-2 text-[10px] px-1.5 py-0"
                              >
                                {isPayable ? "Payable" : isAdvance ? "Advance Paid" : "Settled"}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-[#475467] dark:text-slate-300">
                              {vendor.last_transaction_date ? formatDate(vendor.last_transaction_date) : "No activity"}
                              <div className="text-[10px] text-[#98A2B3]">
                                {vendor.transaction_count} entries
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAccountId(vendor.id);
                                  setDatePreset("ALL");
                                  setDetailFromDate("");
                                  setDetailToDate("");
                                  setDetailSearch("");
                                  setDetailTxType("ALL");
                                }}
                                className="text-xs h-7 gap-1 font-semibold hover:border-[#B54708] hover:text-[#B54708]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Ledger
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {/* Category 3: Drivers Table */}
              {activeCategory === "DRIVER" && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] dark:bg-slate-800/60 border-b border-[#E4E7EC] dark:border-slate-800 text-[11px] font-semibold text-[#475467] dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-3 px-4">Driver Name</th>
                      <th className="py-3 px-4">Driver ID / Contact</th>
                      <th className="py-3 px-4">License / DL Status</th>
                      <th className="py-3 px-4 text-right">Total Advances</th>
                      <th className="py-3 px-4 text-right">Settled Expenses</th>
                      <th className="py-3 px-4 text-right">Current Balance</th>
                      <th className="py-3 px-4">Last Activity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7] dark:divide-slate-800/70 text-xs">
                    {filteredDrivers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#667085] dark:text-slate-400">
                          <Users className="w-8 h-8 mx-auto text-[#98A2B3] mb-2" />
                          <p className="font-semibold text-sm text-[#101828] dark:text-slate-200">No Drivers Found</p>
                          <p className="text-xs mt-0.5">No drivers match your filter or search criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredDrivers.map((driver) => {
                        const isRecoverable = driver.balance_type === "DR" && Number(driver.current_balance) > 0;
                        const isPayable = driver.balance_type === "CR" && Number(driver.current_balance) > 0;
                        return (
                          <tr
                            key={driver.id}
                            className="hover:bg-[#F9FAFB] dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-semibold text-[#101828] dark:text-white">
                              {driver.name}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono text-xs text-[#344054] dark:text-slate-300">
                                {driver.driver_id || `DRV-${driver.id}`}
                              </span>
                              <div className="text-[11px] text-[#667085] dark:text-slate-400">
                                {driver.phone}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-[#475467] dark:text-slate-300">
                              <span className="font-mono text-xs">
                                {driver.license_number || "Not on file"}
                              </span>
                              {driver.dl_status && (
                                <span className="ml-1.5 text-[10px] text-[#027A48] font-semibold">
                                  ({driver.dl_status})
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-[#101828] dark:text-slate-200">
                              {formatCurrency(driver.total_advances)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-[#027A48] dark:text-emerald-400">
                              {formatCurrency(driver.total_expenses)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span
                                className={cn(
                                  "font-bold text-xs",
                                  isRecoverable && "text-[#027A48] dark:text-emerald-400",
                                  isPayable && "text-[#B42318] dark:text-rose-400",
                                  !isRecoverable && !isPayable && "text-[#667085] dark:text-slate-400"
                                )}
                              >
                                {formatCurrency(driver.current_balance)}
                              </span>
                              <Badge
                                variant={isRecoverable ? "success" : isPayable ? "danger" : "neutral"}
                                className="ml-2 text-[10px] px-1.5 py-0"
                              >
                                {isRecoverable ? "Recoverable" : isPayable ? "Reimbursement" : "Settled"}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-[#475467] dark:text-slate-300">
                              {driver.last_transaction_date ? formatDate(driver.last_transaction_date) : "No activity"}
                              <div className="text-[10px] text-[#98A2B3]">
                                {driver.transaction_count} records
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAccountId(driver.id);
                                  setDatePreset("ALL");
                                  setDetailFromDate("");
                                  setDetailToDate("");
                                  setDetailSearch("");
                                  setDetailTxType("ALL");
                                }}
                                className="text-xs h-7 gap-1 font-semibold hover:border-[#027A48] hover:text-[#027A48]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Ledger
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* VIEW C: INDIVIDUAL ACCOUNT DETAILED LEDGER STATEMENT                     */}
      {/* ------------------------------------------------------------------------ */}
      {selectedAccountId && detailedLedger && (
        <div className="space-y-6">
          {/* Top Bar with Back Button & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedAccountId(null)}
              className="gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to {activeCategory === "BILLING_CLIENT" ? "Clients" : activeCategory === "VENDOR" ? "Vendors" : "Drivers"} List
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs font-semibold"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Statement
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-1.5 text-xs font-semibold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export to Excel
              </Button>
            </div>
          </div>

          {/* Statement Header Card (Printable) */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-[#E4E7EC] dark:border-slate-800 p-6 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-[#F2F4F7] dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="primary" className="text-[11px] font-semibold uppercase">
                    {detailedLedger.category.replace("_", " ")} STATEMENT
                  </Badge>
                  {detailedLedger.party.code && (
                    <span className="font-mono text-xs text-[#667085] dark:text-slate-400">
                      #{detailedLedger.party.code}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-[#101828] dark:text-white mt-1.5">
                  {detailedLedger.party.name}
                </h2>
                {detailedLedger.party.company_name && detailedLedger.party.company_name !== detailedLedger.party.name && (
                  <p className="text-xs text-[#475467] dark:text-slate-300 font-medium">
                    {detailedLedger.party.company_name}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-y-1 gap-x-4 text-xs text-[#667085] dark:text-slate-400">
                  {detailedLedger.party.phone && <span>Ph: {detailedLedger.party.phone}</span>}
                  {detailedLedger.party.email && <span>Email: {detailedLedger.party.email}</span>}
                  {detailedLedger.party.gstin && (
                    <span className="font-mono text-[#344054] dark:text-slate-300">
                      GSTIN: {detailedLedger.party.gstin}
                    </span>
                  )}
                  {detailedLedger.party.pan && (
                    <span className="font-mono text-[#344054] dark:text-slate-300">
                      PAN: {detailedLedger.party.pan}
                    </span>
                  )}
                  {detailedLedger.party.license_number && (
                    <span className="font-mono text-[#344054] dark:text-slate-300">
                      DL: {detailedLedger.party.license_number}
                    </span>
                  )}
                </div>

                {detailedLedger.party.address && (
                  <p className="text-xs text-[#667085] dark:text-slate-400 mt-1">
                    {detailedLedger.party.address}
                    {detailedLedger.party.city && `, ${detailedLedger.party.city}`}
                    {detailedLedger.party.state && `, ${detailedLedger.party.state}`}
                    {detailedLedger.party.pincode && ` - ${detailedLedger.party.pincode}`}
                  </p>
                )}
              </div>

              {/* Statement Metadata */}
              <div className="text-left md:text-right space-y-1">
                <div className="text-xs text-[#667085] dark:text-slate-400">Statement Period</div>
                <div className="text-sm font-semibold text-[#101828] dark:text-slate-200">
                  {detailFromDate ? formatDate(detailFromDate) : "Beginning of records"} -{" "}
                  {detailToDate ? formatDate(detailToDate) : "Present"}
                </div>
                <div className="text-[11px] text-[#98A2B3]">
                  Generated on {formatDate(new Date())}
                </div>
              </div>
            </div>

            {/* Financial KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-lg bg-[#F8F9FB] dark:bg-slate-800/40 border border-[#E4E7EC] dark:border-slate-800">
                <div className="text-[11px] font-medium text-[#667085] dark:text-slate-400">
                  Opening Balance
                </div>
                <div className="text-lg font-bold text-[#101828] dark:text-white mt-1">
                  {formatCurrency(detailedLedger.opening_balance)}
                  <span className="text-xs font-semibold text-[#667085] dark:text-slate-400 ml-1">
                    {detailedLedger.opening_balance_type}
                  </span>
                </div>
                <div className="text-[10px] text-[#98A2B3] mt-0.5">
                  Effective prior balance
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#F8F9FB] dark:bg-slate-800/40 border border-[#E4E7EC] dark:border-slate-800">
                <div className="text-[11px] font-medium text-[#667085] dark:text-slate-400">
                  Total Period Debits
                </div>
                <div className="text-lg font-bold text-[#101828] dark:text-white mt-1">
                  {formatCurrency(detailedLedger.total_debit)}
                </div>
                <div className="text-[10px] text-[#667085] dark:text-slate-400 mt-0.5">
                  {detailedLedger.category === "BILLING_CLIENT" ? "Total Freight Invoiced" : detailedLedger.category === "VENDOR" ? "Disbursements Made" : "Advances Disbursed"}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#F8F9FB] dark:bg-slate-800/40 border border-[#E4E7EC] dark:border-slate-800">
                <div className="text-[11px] font-medium text-[#667085] dark:text-slate-400">
                  Total Period Credits
                </div>
                <div className="text-lg font-bold text-[#027A48] dark:text-emerald-400 mt-1">
                  {formatCurrency(detailedLedger.total_credit)}
                </div>
                <div className="text-[10px] text-[#667085] dark:text-slate-400 mt-0.5">
                  {detailedLedger.category === "BILLING_CLIENT" ? "Total Collections" : detailedLedger.category === "VENDOR" ? "Total Bills/Liabilities" : "Approved Expenses"}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#EEF2FF] dark:bg-indigo-950/40 border border-[#C7D2FE] dark:border-indigo-800">
                <div className="text-[11px] font-semibold text-[#4F46E5] dark:text-indigo-300">
                  Closing Balance
                </div>
                <div className="text-lg font-extrabold text-[#4F46E5] dark:text-indigo-300 mt-1">
                  {formatCurrency(detailedLedger.closing_balance)}
                  <span className="text-xs font-semibold ml-1">
                    {detailedLedger.closing_balance_type}
                  </span>
                </div>
                <div className="text-[10px] text-[#4F46E5] dark:text-indigo-300 font-medium mt-0.5">
                  {detailedLedger.category === "BILLING_CLIENT"
                    ? (detailedLedger.closing_balance_type === "DR" ? "Receivable from Client" : "Advance Received")
                    : detailedLedger.category === "VENDOR"
                    ? (detailedLedger.closing_balance_type === "CR" ? "Payable to Vendor" : "Advance Paid")
                    : (detailedLedger.closing_balance_type === "DR" ? "Recoverable from Driver" : "Payable to Driver")}
                </div>
              </div>
            </div>
          </div>

          {/* Statement Filters Toolbar (Print: Hidden) */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-[#E4E7EC] dark:border-slate-800 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)] print:hidden space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Date Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-[#475467] dark:text-slate-400 mr-1">Period:</span>
                {[
                  { label: "All Time", value: "ALL" },
                  { label: "This Month", value: "THIS_MONTH" },
                  { label: "Last Month", value: "LAST_MONTH" },
                  { label: "Last 30 Days", value: "LAST_30_DAYS" },
                  { label: "This FY (2026-27)", value: "THIS_FY" },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handleDatePresetChange(p.value)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md font-medium transition-colors",
                      datePreset === p.value
                        ? "bg-[#4F46E5] text-white"
                        : "bg-[#F2F4F7] dark:bg-slate-800 text-[#475467] dark:text-slate-300 hover:bg-[#E4E7EC]"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Pickers */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[#667085] dark:text-slate-400">From:</span>
                  <input
                    type="date"
                    value={detailFromDate}
                    onChange={(e) => {
                      setDatePreset("CUSTOM");
                      setDetailFromDate(e.target.value);
                    }}
                    className="px-2 py-1 text-xs bg-[#F8F9FB] dark:bg-slate-900 border border-[#E4E7EC] dark:border-slate-800 rounded-md focus:outline-none focus:border-[#4F46E5] dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[#667085] dark:text-slate-400">To:</span>
                  <input
                    type="date"
                    value={detailToDate}
                    onChange={(e) => {
                      setDatePreset("CUSTOM");
                      setDetailToDate(e.target.value);
                    }}
                    className="px-2 py-1 text-xs bg-[#F8F9FB] dark:bg-slate-900 border border-[#E4E7EC] dark:border-slate-800 rounded-md focus:outline-none focus:border-[#4F46E5] dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Search and Voucher Type Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#F2F4F7] dark:border-slate-800">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#667085] dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search voucher #, ref #, or particulars..."
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F9FB] dark:bg-slate-900 border border-[#E4E7EC] dark:border-slate-800 rounded-lg focus:outline-none focus:border-[#4F46E5] dark:text-white"
                />
                {detailSearch && (
                  <button
                    onClick={() => setDetailSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-[#667085] dark:text-slate-400 whitespace-nowrap">Filter Type:</span>
                <select
                  value={detailTxType}
                  onChange={(e) => setDetailTxType(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-[#F8F9FB] dark:bg-slate-900 border border-[#E4E7EC] dark:border-slate-800 rounded-lg text-[#344054] dark:text-slate-300 font-medium focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="ALL">All Transaction Types</option>
                  {detailedLedger.category === "BILLING_CLIENT" && (
                    <>
                      <option value="TRANSPORT_INVOICE">Transport Invoice</option>
                      <option value="GENERAL_INVOICE">General Invoice</option>
                      <option value="RECEIPT_VOUCHER">Receipt Voucher</option>
                      <option value="CREDIT_NOTE">Credit Note</option>
                      <option value="DEBIT_NOTE">Debit Note</option>
                    </>
                  )}
                  {detailedLedger.category === "VENDOR" && (
                    <>
                      <option value="NORMAL_PURCHASE">Normal Purchase</option>
                      <option value="GENERAL_PURCHASE">General Purchase</option>
                      <option value="HIRE_CHALLAN_LIABILITY">Hire Challan Liability</option>
                      <option value="PAYMENT_VOUCHER">Payment Voucher</option>
                      <option value="PAYMENT_ATH">Advance to Hired (ATH)</option>
                      <option value="PAYMENT_BTH">Balance to Hired (BTH)</option>
                      <option value="DEBIT_NOTE">Debit Note</option>
                      <option value="CREDIT_NOTE">Credit Note</option>
                    </>
                  )}
                  {detailedLedger.category === "DRIVER" && (
                    <>
                      <option value="TRIP_ADVANCE">Trip Advance</option>
                      <option value="TRIP_EXPENSE">Trip Expense</option>
                      <option value="ADVANCE_SETTLEMENT">Advance Settlement</option>
                      <option value="PAYMENT_VOUCHER">Driver Payment</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Statement Transaction History Table */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-[#E4E7EC] dark:border-slate-800 shadow-[0_1px_3px_rgba(16,24,40,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FB] dark:bg-slate-800/60 border-b border-[#E4E7EC] dark:border-slate-800 text-[11px] font-semibold text-[#475467] dark:text-slate-300 uppercase tracking-wider">
                    <th className="py-3 px-4 w-28">Date</th>
                    <th className="py-3 px-4 w-36">Voucher / Tx #</th>
                    <th className="py-3 px-4 w-32">Type</th>
                    <th className="py-3 px-4 w-36">Reference</th>
                    <th className="py-3 px-4">Particulars / Narration</th>
                    <th className="py-3 px-4 text-right w-28">Debit (₹)</th>
                    <th className="py-3 px-4 text-right w-28">Credit (₹)</th>
                    <th className="py-3 px-4 text-right w-36">Balance (₹)</th>
                    <th className="py-3 px-4 text-center w-20">Status</th>
                    <th className="py-3 px-4 text-right w-20 print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F4F7] dark:divide-slate-800/70 text-xs">
                  {/* Opening Balance Row */}
                  <tr className="bg-[#FAFBFD] dark:bg-slate-800/30 font-semibold italic text-[#475467] dark:text-slate-400">
                    <td className="py-3 px-4">{detailFromDate ? formatDate(detailFromDate) : "—"}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">OPENING</td>
                    <td className="py-3 px-4">
                      <Badge variant="neutral" className="text-[10px] px-1.5 py-0 font-normal">
                        Balance b/f
                      </Badge>
                    </td>
                    <td className="py-3 px-4">—</td>
                    <td className="py-3 px-4 font-normal">Opening balance brought forward</td>
                    <td className="py-3 px-4 text-right">
                      {detailedLedger.opening_balance_type === "DR" ? formatCurrency(detailedLedger.opening_balance) : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {detailedLedger.opening_balance_type === "CR" ? formatCurrency(detailedLedger.opening_balance) : "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#101828] dark:text-white">
                      {formatCurrency(detailedLedger.opening_balance)} {detailedLedger.opening_balance_type}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-medium text-[#667085]">b/f</span>
                    </td>
                    <td className="py-3 px-4 text-right print:hidden">—</td>
                  </tr>

                  {/* Transaction Rows */}
                  {detailedLedger.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-[#667085] dark:text-slate-400">
                        No transactions recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    detailedLedger.transactions.map((tx, idx) => (
                      <tr
                        key={tx.id || idx}
                        className={cn(
                          "hover:bg-[#F9FAFB] dark:hover:bg-slate-800/40 transition-colors",
                          tx.is_void && "opacity-50 line-through bg-rose-50/20 dark:bg-rose-950/20"
                        )}
                      >
                        <td className="py-3 px-4 text-[#475467] dark:text-slate-300 whitespace-nowrap">
                          {formatDate(tx.entry_date)}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-xs text-[#101828] dark:text-slate-200">
                          {tx.voucher_number}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              tx.voucher_type.includes("INVOICE") || tx.voucher_type.includes("ADVANCE")
                                ? "primary"
                                : tx.voucher_type.includes("RECEIPT") || tx.voucher_type.includes("EXPENSE")
                                ? "success"
                                : tx.voucher_type.includes("PAYMENT")
                                ? "warning"
                                : "neutral"
                            }
                            className="text-[10px] px-1.5 py-0 font-medium whitespace-nowrap"
                          >
                            {tx.voucher_type.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#667085] dark:text-slate-400">
                          {tx.reference_number || "—"}
                        </td>
                        <td className="py-3 px-4 text-[#344054] dark:text-slate-300">
                          {tx.particulars}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#101828] dark:text-slate-200 font-mono">
                          {Number(tx.debit_amount) > 0 ? formatCurrency(tx.debit_amount) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#027A48] dark:text-emerald-400 font-mono">
                          {Number(tx.credit_amount) > 0 ? formatCurrency(tx.credit_amount) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#101828] dark:text-white">
                          {formatCurrency(tx.running_balance)}
                          <span className="text-[10px] font-semibold text-[#667085] dark:text-slate-400 ml-1">
                            {tx.balance_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase",
                              tx.status === "VOIDED"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                                : tx.status === "SETTLED"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            )}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right print:hidden">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenSourceDoc(tx)}
                            className="h-6 w-6 p-0 hover:bg-[#EEF2FF] text-[#4F46E5]"
                            title="View Transaction Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Statement Grand Totals Row */}
                  <tr className="bg-[#F8F9FB] dark:bg-slate-800/60 font-bold border-t-2 border-[#D0D5DD] dark:border-slate-700 text-xs">
                    <td colSpan={5} className="py-3.5 px-4 text-right uppercase tracking-wider text-[#101828] dark:text-white">
                      Period Totals & Closing Balance:
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#101828] dark:text-white text-sm">
                      {formatCurrency(detailedLedger.total_debit)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#027A48] dark:text-emerald-400 text-sm">
                      {formatCurrency(detailedLedger.total_credit)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#4F46E5] dark:text-indigo-400 text-sm">
                      {formatCurrency(detailedLedger.closing_balance)} {detailedLedger.closing_balance_type}
                    </td>
                    <td colSpan={2} className="print:hidden"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* SOURCE DOCUMENT VIEWER MODAL                                             */}
      {/* ------------------------------------------------------------------------ */}
      {sourceDocModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-[#E4E7EC] dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F4F7] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-bold text-sm text-[#101828] dark:text-white">
                  Source Transaction Details
                </h3>
              </div>
              <button
                onClick={() => setSourceDocModal({ isOpen: false })}
                className="text-[#98A2B3] hover:text-[#667085] p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sourceDocModal.tx && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#F8F9FB] dark:bg-slate-800/40">
                  <div>
                    <span className="text-[#667085] dark:text-slate-400 text-[11px]">Voucher Number</span>
                    <p className="font-mono font-bold text-sm text-[#101828] dark:text-white">
                      {sourceDocModal.tx.voucher_number}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#667085] dark:text-slate-400 text-[11px]">Date</span>
                    <p className="font-semibold text-sm text-[#101828] dark:text-white">
                      {formatDate(sourceDocModal.tx.entry_date)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#667085] dark:text-slate-400 text-[11px]">Type</span>
                    <p className="font-semibold text-[#4F46E5] dark:text-indigo-400">
                      {sourceDocModal.tx.voucher_type}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#667085] dark:text-slate-400 text-[11px]">Reference</span>
                    <p className="font-mono text-[#344054] dark:text-slate-300">
                      {sourceDocModal.tx.reference_number || "None"}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[#667085] dark:text-slate-400 font-medium">Particulars:</span>
                  <p className="mt-1 p-2 rounded bg-[#FAFBFD] dark:bg-slate-900 border border-[#E4E7EC] dark:border-slate-800 text-[#344054] dark:text-slate-200">
                    {sourceDocModal.tx.particulars}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2.5 rounded border border-[#E4E7EC] dark:border-slate-800">
                    <span className="text-[#667085] dark:text-slate-400 text-[11px]">Debit Amount</span>
                    <p className="font-mono font-bold text-base text-[#101828] dark:text-white">
                      {formatCurrency(sourceDocModal.tx.debit_amount)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded border border-[#E4E7EC] dark:border-slate-800">
                    <span className="text-[#667085] dark:text-slate-400 text-[11px]">Credit Amount</span>
                    <p className="font-mono font-bold text-base text-[#027A48] dark:text-emerald-400">
                      {formatCurrency(sourceDocModal.tx.credit_amount)}
                    </p>
                  </div>
                </div>

                {sourceDocModal.data?.items && sourceDocModal.data.items.length > 0 && (
                  <div className="pt-2">
                    <span className="font-semibold text-[#344054] dark:text-slate-300 text-xs">Line Items:</span>
                    <div className="mt-1 divide-y divide-[#F2F4F7] dark:divide-slate-800 border border-[#E4E7EC] dark:border-slate-800 rounded-lg overflow-hidden">
                      {sourceDocModal.data.items.map((itm: any, idx: number) => (
                        <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
                          <span>{itm.description}</span>
                          <span className="font-mono font-semibold">{formatCurrency(itm.total_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-[#F2F4F7] dark:border-slate-800 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSourceDocModal({ isOpen: false })}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
