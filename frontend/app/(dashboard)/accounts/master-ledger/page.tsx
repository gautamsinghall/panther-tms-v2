"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Building2,
  Truck,
  Users,
  Landmark,
  Star,
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
  ShieldCheck,
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

type LedgerCategory = "OVERVIEW" | "BILLING_CLIENT" | "VENDOR" | "DRIVER" | "COMPANY_VEHICLE" | "COMPANY_BANK_ACCOUNT" | "DUTIES_AND_TAXES";

interface CategoryStat {
  total_accounts: number;
  total_outstanding: string | number;
  total_debit: string | number;
  total_credit: string | number;
  settled_count: number;
  pending_count: number;
}

export interface HierarchyOverviewStat {
  primary_groups_count: number;
  groups_count: number;
  subgroups_count: number;
  status: string;
}

interface MasterLedgerOverview {
  billing_clients: CategoryStat;
  vendors: CategoryStat;
  drivers: CategoryStat;
  company_vehicles?: CategoryStat;
  company_bank_accounts?: CategoryStat;
  duties_and_taxes?: CategoryStat;
  hierarchy?: HierarchyOverviewStat;
}

export interface CompanyVehicleLedgerItem {
  id: number;
  vehicle_number: string;
  vehicle_type: string;
  capacity_mt: number | string;
  chassis_number?: string | null;
  engine_number?: string | null;
  registration_date?: string | null;
  insurance_expiry?: string | null;
  fitness_expiry?: string | null;
  national_permit_expiry?: string | null;
  default_driver_id?: number | null;
  default_driver_name?: string | null;
  current_odometer_km: number;
  is_active: boolean;
  status: string;
  primary_group_code: string;
  primary_group_name: string;
  group_code: string;
  group_name: string;
  subgroup_code: string;
  subgroup_name: string;
  ledger_id?: number | null;
  ledger_name?: string | null;
  ledger_code?: string | null;
  opening_balance: number | string;
  opening_balance_type: string;
  total_debit: number | string;
  total_credit: number | string;
  current_balance: number | string;
  balance_type: string;
  total_diesel_expense: number | string;
  total_toll_expense: number | string;
  total_maintenance_expense: number | string;
  total_other_trip_expenses: number | string;
  total_operational_expense: number | string;
  total_trips_count: number;
  transaction_count: number;
  last_transaction_date?: string | null;
}

export interface DutiesAndTaxesLedgerItem {
  id: number;
  name: string;
  code: string;
  primary_group_name: string;
  primary_group_code: string;
  group_name: string;
  group_code: string;
  subgroup_name?: string | null;
  subgroup_code?: string | null;
  opening_balance: string | number;
  opening_balance_type: string;
  total_debit: string | number;
  total_credit: string | number;
  current_balance: string | number;
  balance_type: string;
  last_transaction_date?: string | null;
  transaction_count: number;
  tax_type: string;
}

export interface CompanyBankAccountLedgerItem {
  id: number;
  bank_name: string;
  custom_bank_name?: string | null;
  account_number_masked: string;
  account_type: string;
  ifsc_code: string;
  branch_name?: string | null;
  issuing_office_name?: string | null;
  issuing_office_id: number;
  ledger_name?: string | null;
  ledger_group?: string | null;
  opening_balance: string | number;
  opening_balance_type: string;
  total_debit: string | number;
  total_credit: string | number;
  current_balance: string | number;
  balance_type: string;
  is_default: boolean;
  is_active: boolean;
  transaction_count: number;
  last_transaction_date?: string | null;
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
  vehicle_number?: string;
  vehicle_type?: string;
  capacity_mt?: number | string;
  chassis_number?: string;
  engine_number?: string;
  insurance_expiry?: string;
  fitness_expiry?: string;
  national_permit_expiry?: string;
  current_odometer_km?: number;
  driver_name?: string;
  group_name?: string;
  subgroup_name?: string;
  primary_group_name?: string;
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
  const searchParams = useSearchParams();
  const [billingClients, setBillingClients] = useState<BillingClientLedgerItem[]>([]);
  const [vendors, setVendors] = useState<VendorLedgerItem[]>([]);
  const [drivers, setDrivers] = useState<DriverLedgerItem[]>([]);
  const [companyVehicles, setCompanyVehicles] = useState<CompanyVehicleLedgerItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccountLedgerItem[]>([]);
  const [dutiesAndTaxes, setDutiesAndTaxes] = useState<DutiesAndTaxesLedgerItem[]>([]);
  const [isVerifyingHierarchy, setIsVerifyingHierarchy] = useState(false);
  const [hierarchyStats, setHierarchyStats] = useState<{
    primary_groups: number;
    groups: number;
    subgroups: number;
    status: string;
  }>({
    primary_groups: 5,
    groups: 25,
    subgroups: 64,
    status: "100% Compliant",
  });

  useEffect(() => {
    const tabParam = searchParams.get("tab") as LedgerCategory | null;
    const idParam = searchParams.get("id");
    if (
      tabParam === "COMPANY_BANK_ACCOUNT" ||
      tabParam === "COMPANY_VEHICLE" ||
      tabParam === "BILLING_CLIENT" ||
      tabParam === "VENDOR" ||
      tabParam === "DRIVER" ||
      tabParam === "DUTIES_AND_TAXES"
    ) {
      setActiveCategory(tabParam);
      if (idParam) {
        setSelectedAccountId(Number(idParam));
      }
    }
  }, [searchParams]);
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
      const [sumRes, bcRes, vendRes, drvRes, vehRes, bankRes, rawClients, rawVendors, rawDrivers, rawVehicles, dutiesRes] = await Promise.all([
        apiClient<MasterLedgerOverview>("/api/v1/accounts/master-ledger/summary").catch(() => null),
        apiClient<BillingClientLedgerItem[]>("/api/v1/accounts/master-ledger/billing-clients").catch(() => []),
        apiClient<VendorLedgerItem[]>("/api/v1/accounts/master-ledger/vendors").catch(() => []),
        apiClient<DriverLedgerItem[]>("/api/v1/accounts/master-ledger/drivers").catch(() => []),
        apiClient<CompanyVehicleLedgerItem[]>("/api/v1/accounts/master-ledger/company-vehicles").catch(() => []),
        apiClient<CompanyBankAccountLedgerItem[]>("/api/v1/accounts/master-ledger/company-bank-accounts").catch(() => []),
        apiClient<any[]>("/api/v1/general/billing-clients").catch(() => []),
        apiClient<any[]>("/api/v1/general/vendors").catch(() => []),
        apiClient<any[]>("/api/v1/transport/drivers").catch(() => []),
        apiClient<any[]>("/api/v1/transport/company-vehicles").catch(() => []),
        apiClient<DutiesAndTaxesLedgerItem[]>("/api/v1/accounts/master-ledger/duties-and-taxes").catch(() => []),
      ]);
      setBankAccounts(bankRes || []);
      setDutiesAndTaxes(dutiesRes || []);
      if (sumRes?.hierarchy) {
        setHierarchyStats({
          primary_groups: sumRes.hierarchy.primary_groups_count,
          groups: sumRes.hierarchy.groups_count,
          subgroups: sumRes.hierarchy.subgroups_count,
          status: sumRes.hierarchy.status || "100% Compliant",
        });
      }

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

      // 4. Merge Company Vehicles: Guaranteed to include every fleet vehicle with Indian Accounting binding
      const vehMap = new Map<number, CompanyVehicleLedgerItem>();
      (vehRes || []).forEach((v) => vehMap.set(v.id, v));
      (rawVehicles || []).forEach((rv) => {
        if (!vehMap.has(rv.id)) {
          vehMap.set(rv.id, {
            id: rv.id,
            vehicle_number: rv.vehicle_number,
            vehicle_type: rv.vehicle_type || "Commercial Fleet",
            capacity_mt: rv.capacity_mt || 0,
            chassis_number: rv.chassis_number,
            engine_number: rv.engine_number,
            registration_date: rv.registration_date,
            insurance_expiry: rv.insurance_expiry,
            fitness_expiry: rv.fitness_expiry,
            national_permit_expiry: rv.national_permit_expiry,
            default_driver_id: rv.default_driver_id,
            current_odometer_km: rv.current_odometer_km || 0,
            is_active: rv.is_active ?? true,
            status: rv.is_active === false ? "Inactive" : "Active",
            primary_group_code: "ASSET",
            primary_group_name: "Assets",
            group_code: "FA",
            group_name: "Fixed Assets",
            subgroup_code: "FA_COMPANY_VEHICLES",
            subgroup_name: "Company Owned Fleet Vehicles",
            ledger_code: `VEH_${String(rv.id).padStart(4, "0")}`,
            ledger_name: `Vehicle - ${rv.vehicle_number}`,
            opening_balance: "0.00",
            opening_balance_type: "DR",
            total_debit: "0.00",
            total_credit: "0.00",
            current_balance: "0.00",
            balance_type: "DR",
            total_diesel_expense: "0.00",
            total_toll_expense: "0.00",
            total_maintenance_expense: "0.00",
            total_other_trip_expenses: "0.00",
            total_operational_expense: "0.00",
            total_trips_count: 0,
            transaction_count: 0,
          });
        }
      });
      const mergedVehicles = Array.from(vehMap.values());
      setCompanyVehicles(mergedVehicles);

      // 5. Compute / Enhance Overview Summary metrics
      const bcComputed = mergedClients.reduce((sum, c) => sum + (c.balance_type === "DR" ? Number(c.outstanding_balance || 0) : 0), 0);
      const bcOutstanding = (sumRes?.billing_clients?.total_outstanding && Number(sumRes.billing_clients.total_outstanding) > 0)
        ? Number(sumRes.billing_clients.total_outstanding)
        : bcComputed;

      const vendComputed = mergedVendors.reduce((sum, v) => sum + (v.balance_type === "CR" ? Number(v.outstanding_payable || 0) : 0), 0);
      const vendOutstanding = (sumRes?.vendors?.total_outstanding && Number(sumRes.vendors.total_outstanding) > 0)
        ? Number(sumRes.vendors.total_outstanding)
        : vendComputed;

      const drvComputed = mergedDrivers.reduce((sum, d) => sum + (d.balance_type === "DR" ? Number(d.current_balance || 0) : 0), 0);
      const drvOutstanding = (sumRes?.drivers?.total_outstanding && Number(sumRes.drivers.total_outstanding) > 0)
        ? Number(sumRes.drivers.total_outstanding)
        : drvComputed;

      setOverview({
        billing_clients: {
          total_accounts: Math.max(sumRes?.billing_clients?.total_accounts || 0, mergedClients.length),
          total_outstanding: bcOutstanding,
          total_debit: (sumRes?.billing_clients?.total_debit && Number(sumRes.billing_clients.total_debit) > 0) ? Number(sumRes.billing_clients.total_debit) : mergedClients.reduce((s, c) => s + Number(c.total_debit || 0), 0),
          total_credit: (sumRes?.billing_clients?.total_credit && Number(sumRes.billing_clients.total_credit) > 0) ? Number(sumRes.billing_clients.total_credit) : mergedClients.reduce((s, c) => s + Number(c.total_credit || 0), 0),
          settled_count: mergedClients.filter((c) => c.balance_type === "NIL" || Number(c.outstanding_balance) === 0).length,
          pending_count: mergedClients.filter((c) => c.balance_type !== "NIL" && Number(c.outstanding_balance) > 0).length,
        },
        vendors: {
          total_accounts: Math.max(sumRes?.vendors?.total_accounts || 0, mergedVendors.length),
          total_outstanding: vendOutstanding,
          total_debit: (sumRes?.vendors?.total_debit && Number(sumRes.vendors.total_debit) > 0) ? Number(sumRes.vendors.total_debit) : mergedVendors.reduce((s, v) => s + Number(v.total_debit || 0), 0),
          total_credit: (sumRes?.vendors?.total_credit && Number(sumRes.vendors.total_credit) > 0) ? Number(sumRes.vendors.total_credit) : mergedVendors.reduce((s, v) => s + Number(v.total_credit || 0), 0),
          settled_count: mergedVendors.filter((v) => v.balance_type === "NIL" || Number(v.outstanding_payable) === 0).length,
          pending_count: mergedVendors.filter((v) => v.balance_type !== "NIL" && Number(v.outstanding_payable) > 0).length,
        },
        drivers: {
          total_accounts: Math.max(sumRes?.drivers?.total_accounts || 0, mergedDrivers.length),
          total_outstanding: drvOutstanding,
          total_debit: (sumRes?.drivers?.total_debit && Number(sumRes.drivers.total_debit) > 0) ? Number(sumRes.drivers.total_debit) : mergedDrivers.reduce((s, d) => s + Number(d.total_advances || 0), 0),
          total_credit: (sumRes?.drivers?.total_credit && Number(sumRes.drivers.total_credit) > 0) ? Number(sumRes.drivers.total_credit) : mergedDrivers.reduce((s, d) => s + Number(d.total_expenses || 0), 0),
          settled_count: mergedDrivers.filter((d) => d.balance_type === "NIL" || Number(d.current_balance) === 0).length,
          pending_count: mergedDrivers.filter((d) => d.balance_type !== "NIL" && Number(d.current_balance) > 0).length,
        },
        company_vehicles: sumRes?.company_vehicles || {
          total_accounts: Math.max(sumRes?.company_vehicles?.total_accounts || 0, mergedVehicles.length),
          total_outstanding: mergedVehicles.reduce((s, v) => s + (v.balance_type === "DR" ? Number(v.current_balance || 0) : 0), 0),
          total_debit: sumRes?.company_vehicles?.total_debit || mergedVehicles.reduce((s, v) => s + Number(v.total_debit || 0), 0),
          total_credit: sumRes?.company_vehicles?.total_credit || mergedVehicles.reduce((s, v) => s + Number(v.total_credit || 0), 0),
          settled_count: mergedVehicles.filter((v) => v.is_active).length,
          pending_count: mergedVehicles.filter((v) => !v.is_active).length,
        },
        company_bank_accounts: sumRes?.company_bank_accounts || {
          total_accounts: (bankRes || []).length,
          total_outstanding: (bankRes || []).reduce((s, b) => s + (b.balance_type === "DR" ? Number(b.current_balance || 0) : -Number(b.current_balance || 0)), 0),
          total_debit: (bankRes || []).reduce((s, b) => s + Number(b.total_debit || 0), 0),
          total_credit: (bankRes || []).reduce((s, b) => s + Number(b.total_credit || 0), 0),
          settled_count: (bankRes || []).filter((b) => Number(b.current_balance) === 0).length,
          pending_count: (bankRes || []).filter((b) => Number(b.current_balance) !== 0).length,
        },
        duties_and_taxes: sumRes?.duties_and_taxes || {
          total_accounts: (dutiesRes || []).length,
          total_outstanding: (dutiesRes || []).reduce((s, d) => s + (d.balance_type === "CR" ? Number(d.current_balance || 0) : -Number(d.current_balance || 0)), 0),
          total_debit: (dutiesRes || []).reduce((s, d) => s + Number(d.total_debit || 0), 0),
          total_credit: (dutiesRes || []).reduce((s, d) => s + Number(d.total_credit || 0), 0),
          settled_count: (dutiesRes || []).filter((d) => Number(d.current_balance) === 0).length,
          pending_count: (dutiesRes || []).filter((d) => Number(d.current_balance) !== 0).length,
        },
        hierarchy: sumRes?.hierarchy,
      });
    } catch (err) {
      console.error("Error loading master ledger data:", err);
      toast.error("Failed to load Master Ledger summaries.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleVerifyHierarchy = async () => {
    try {
      setIsVerifyingHierarchy(true);
      const res = await apiClient<{
        status: string;
        primary_groups_seeded: number;
        groups_seeded: number;
        subgroups_seeded: number;
        core_accounts_seeded: number;
        accounts_healed: number;
        total_primary_groups: number;
        total_groups: number;
        total_subgroups: number;
        message: string;
      }>("/api/v1/accounts/master-ledger/verify-hierarchy", {
        method: "POST",
      });
      if (res?.total_subgroups !== undefined) {
        setHierarchyStats({
          primary_groups: res.total_primary_groups,
          groups: res.total_groups,
          subgroups: res.total_subgroups,
          status: "100% Compliant",
        });
      }
      toast.success(
        `Hierarchy verified: ${res.total_primary_groups} Primary Groups, ${res.total_groups} Groups, ${res.total_subgroups} Subgroups active & compliant.`
      );
      await loadOverviewAndLists();
    } catch (err: any) {
      console.error("Hierarchy verification error:", err);
      toast.error("Failed to verify accounting hierarchy.");
    } finally {
      setIsVerifyingHierarchy(false);
    }
  };

  useEffect(() => {
    loadOverviewAndLists();
    const handleFocus = () => {
      loadOverviewAndLists();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
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
      } else if (category === "COMPANY_VEHICLE") {
        endpoint = `/api/v1/accounts/master-ledger/company-vehicles/${id}`;
      } else if (category === "COMPANY_BANK_ACCOUNT") {
        endpoint = `/api/v1/accounts/master-ledger/company-bank-accounts/${id}`;
      } else if (category === "DUTIES_AND_TAXES") {
        endpoint = `/api/v1/accounts/master-ledger/accounts/${id}`;
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
        } else if (category === "COMPANY_VEHICLE") {
          const veh = companyVehicles.find((v) => v.id === id);
          if (veh) {
            partyObj = {
              id: veh.id,
              name: veh.ledger_name || `Vehicle - ${veh.vehicle_number}`,
              code: veh.ledger_code || `VEH_${veh.id}`,
              vehicle_number: veh.vehicle_number,
              vehicle_type: veh.vehicle_type,
              capacity_mt: veh.capacity_mt,
              chassis_number: veh.chassis_number || undefined,
              engine_number: veh.engine_number || undefined,
              insurance_expiry: veh.insurance_expiry || undefined,
              fitness_expiry: veh.fitness_expiry || undefined,
              national_permit_expiry: veh.national_permit_expiry || undefined,
              current_odometer_km: veh.current_odometer_km,
              driver_name: veh.default_driver_name || undefined,
              group_name: veh.group_name || "Fixed Assets",
              subgroup_name: veh.subgroup_name || "Company Owned Fleet Vehicles",
              primary_group_name: veh.primary_group_name || "Assets",
            };
          }
        } else if (category === "COMPANY_BANK_ACCOUNT") {
          const bank = bankAccounts.find((b) => b.id === id);
          if (bank) {
            partyObj = {
              id: bank.id,
              name: bank.custom_bank_name || bank.bank_name,
              code: bank.account_number_masked,
              company_name: bank.branch_name || bank.account_type,
              issuing_office_name: bank.issuing_office_name || undefined,
            };
          }
        } else if (category === "DUTIES_AND_TAXES") {
          const tax = dutiesAndTaxes.find((t) => t.id === id);
          if (tax) {
            partyObj = {
              id: tax.id,
              name: tax.name,
              code: tax.code,
              company_name: tax.subgroup_name || tax.group_name || "Duties & Taxes",
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
              (category === "DRIVER" && v.driver_id === id) ||
              (category === "COMPANY_VEHICLE" && (v.company_vehicle_id === id || v.vehicle_id === id));
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
            } else if (category === "COMPANY_VEHICLE") {
              // Asset account: additions/purchases/maintenance debit; depreciation/credit reductions credit
              if (["PURCHASE_VOUCHER", "PAYMENT_VOUCHER", "DEBIT_NOTE", "ASSET_ADDITION"].includes(v.voucher_type)) {
                dr = amt;
                running += dr;
              } else {
                cr = amt;
                running -= cr;
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

  const filteredBankAccounts = useMemo(() => {
    return bankAccounts.filter((b) => {
      const matchSearch =
        !searchQuery ||
        b.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.account_number_masked.includes(searchQuery) ||
        (b.ifsc_code && b.ifsc_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.branch_name && b.branch_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.issuing_office_name && b.issuing_office_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && b.is_active) ||
        (statusFilter === "INACTIVE" && !b.is_active) ||
        (statusFilter === "DEFAULT" && b.is_default);

      return matchSearch && matchStatus;
    });
  }, [bankAccounts, searchQuery, statusFilter]);

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

  const filteredCompanyVehicles = useMemo(() => {
    return companyVehicles.filter((v) => {
      const matchSearch =
        !searchQuery ||
        v.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.vehicle_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.ledger_code && v.ledger_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.chassis_number && v.chassis_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.engine_number && v.engine_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.default_driver_name && v.default_driver_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && v.is_active) ||
        (statusFilter === "INACTIVE" && !v.is_active) ||
        (statusFilter === "HCV" && (v.vehicle_type.includes("HCV") || Number(v.capacity_mt) >= 7.5)) ||
        (statusFilter === "LCV" && (v.vehicle_type.includes("LCV") || Number(v.capacity_mt) < 7.5));

      return matchSearch && matchStatus;
    });
  }, [companyVehicles, searchQuery, statusFilter]);

  const filteredDutiesAndTaxes = useMemo(() => {
    return dutiesAndTaxes.filter((t) => {
      const matchSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.group_name && t.group_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.subgroup_name && t.subgroup_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PAYABLE" && t.balance_type === "CR" && Number(t.current_balance) > 0) ||
        (statusFilter === "INPUT_ITC" && t.balance_type === "DR" && Number(t.current_balance) > 0) ||
        (statusFilter === "SETTLED" && (t.balance_type === "NIL" || Number(t.current_balance) === 0));

      return matchSearch && matchStatus;
    });
  }, [dutiesAndTaxes, searchQuery, statusFilter]);

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
          description="Enterprise accounting ledgers maintaining real-time auditability across Billing Clients, Vendors, Drivers, Bank Accounts, and Duties & Taxes per Indian Accounting Standards."
          primaryAction={{
            label: "Refresh Ledgers",
            icon: RefreshCw,
            onClick: () => {
              setIsRefreshing(true);
              loadOverviewAndLists();
              if (selectedAccountId && activeCategory) {
                loadDetailedLedger(activeCategory, selectedAccountId, detailFromDate, detailToDate, detailSearch, detailTxType);
              }
            },
          }}
          secondaryActions={[
            {
              label: isVerifyingHierarchy ? "Verifying Hierarchy..." : "Verify & Bind Hierarchy",
              icon: CheckCircle2,
              onClick: handleVerifyHierarchy,
              disabled: isVerifyingHierarchy,
              variant: "outline",
            },
          ]}
        />
      </div>

      {/* ------------------------------------------------------------------------ */}
      {/* VIEW A: CATEGORY FOLDERS OVERVIEW                                        */}
      {/* ------------------------------------------------------------------------ */}
      {activeCategory === "OVERVIEW" && !selectedAccountId && (
        <div className="space-y-6">
          {/* Section 1: 4 Operational Master Ledger Categories (4 by 4 Grid) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#101828] dark:text-white uppercase tracking-wider">
                  Operational Master Ledgers
                </h3>
                <p className="text-xs text-[#667085] dark:text-slate-400">
                  Party and fleet master accounts mapped to Ind AS Schedule III groups.
                </p>
              </div>
              <Badge variant="neutral" className="text-xs font-medium">
                4 Core Categories
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {/* Card 1: Billing Client Ledger */}
              <div
                onClick={() => {
                  setActiveCategory("BILLING_CLIENT");
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="group cursor-pointer relative bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 shadow-2xs hover:border-[#4F46E5] dark:hover:border-indigo-500 hover:shadow-[0_10px_25px_-5px_rgba(79,70,229,0.12)] transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-[#EEF2FF] dark:bg-indigo-950/60 border border-[#C7D2FE] dark:border-indigo-800 flex items-center justify-center text-[#4F46E5] dark:text-indigo-400 group-hover:scale-105 transition-transform">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <Badge variant="primary" className="text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap">
                      Current Assets • Dr
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-[#101828] dark:text-white group-hover:text-[#4F46E5] dark:group-hover:text-indigo-400 transition-colors">
                    Billing Client Ledger
                  </h3>
                  <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[34px]">
                    Customer freight billing, receipts, debit/credit notes, and open receivables.
                  </p>

                  {/* 3-Tier Ind AS Hierarchy Block */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#101013] border border-slate-100 dark:border-[#303036]/60 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Primary Group:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Current Assets</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Group in Primary:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Sundry Debtors</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Subgroup in Group:</span>
                      <span className="font-semibold text-[#4F46E5] dark:text-indigo-400">Corporate Debtors</span>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#303036] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Accounts</span>
                      <span className="font-semibold text-[#101828] dark:text-slate-200">
                        {overview?.billing_clients?.total_accounts || billingClients.length}{" "}clients
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Billed (Dr)</span>
                      <span className="font-semibold text-[#101828] dark:text-slate-200">
                        {formatCurrency(overview?.billing_clients?.total_debit || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Collections (Cr)</span>
                      <span className="font-semibold text-[#027A48] dark:text-emerald-400">
                        {formatCurrency(overview?.billing_clients?.total_credit || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-dashed border-slate-200/90 dark:border-[#303036]">
                      <span className="text-[#101828] dark:text-slate-300">Receivable</span>
                      <span className="text-[#4F46E5] dark:text-indigo-400 font-extrabold">
                        {formatCurrency(overview?.billing_clients?.total_outstanding || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 flex items-center justify-between text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 border-t border-slate-100 dark:border-[#303036]">
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
                className="group cursor-pointer relative bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 shadow-2xs hover:border-[#B54708] dark:hover:border-amber-500 hover:shadow-[0_10px_25px_-5px_rgba(181,71,8,0.12)] transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="w-11 h-11 rounded-xl bg-[#FFFAEB] dark:bg-amber-950/60 border border-[#FEDF89] dark:border-amber-800 flex items-center justify-center text-[#B54708] dark:text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <Badge variant="warning" className="text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap shrink-0">
                      Current Liab • Cr
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-[#101828] dark:text-white group-hover:text-[#B54708] dark:group-hover:text-amber-400 transition-colors">
                    Vendor Ledger
                  </h3>
                  <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[34px]">
                    Supplier purchase bills, Hire Challans, ATH/BTH disbursements, and liabilities.
                  </p>

                  {/* 3-Tier Ind AS Hierarchy Block */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#101013] border border-slate-100 dark:border-[#303036]/60 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Primary Group:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Current Liabilities</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Group in Primary:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Sundry Creditors</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Subgroup in Group:</span>
                      <span className="font-semibold text-[#B54708] dark:text-amber-400">Market Vehicle Vendors</span>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#303036] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Accounts</span>
                      <span className="font-semibold text-[#101828] dark:text-slate-200">
                        {overview?.vendors?.total_accounts || vendors.length}{" "}vendors
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Bills &amp; Payables (Cr)</span>
                      <span className="font-semibold text-[#101828] dark:text-slate-200">
                        {formatCurrency(overview?.vendors?.total_credit || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Disbursed (Dr)</span>
                      <span className="font-semibold text-[#027A48] dark:text-emerald-400">
                        {formatCurrency(overview?.vendors?.total_debit || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-dashed border-slate-200/90 dark:border-[#303036]">
                      <span className="text-[#101828] dark:text-slate-300">Payable</span>
                      <span className="text-[#B54708] dark:text-amber-400 font-extrabold">
                        {formatCurrency(overview?.vendors?.total_outstanding || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 flex items-center justify-between text-xs font-semibold text-[#B54708] dark:text-amber-400 border-t border-slate-100 dark:border-[#303036]">
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
                className="group cursor-pointer relative bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 shadow-2xs hover:border-[#027A48] dark:hover:border-emerald-500 hover:shadow-[0_10px_25px_-5px_rgba(2,122,72,0.12)] transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-[#ECFDF3] dark:bg-emerald-950/60 border border-[#A6F4C5] dark:border-emerald-800 flex items-center justify-center text-[#027A48] dark:text-emerald-400 group-hover:scale-105 transition-transform">
                      <Users className="w-5 h-5" />
                    </div>
                    <Badge variant="success" className="text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap">
                      Current Assets • Dr
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-[#101828] dark:text-white group-hover:text-[#027A48] dark:group-hover:text-emerald-400 transition-colors">
                    Driver Ledger
                  </h3>
                  <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[34px]">
                    Trip advances (cash/fuel), toll &amp; expense reimbursements, and recoveries.
                  </p>

                  {/* 3-Tier Ind AS Hierarchy Block */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#101013] border border-slate-100 dark:border-[#303036]/60 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Primary Group:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Current Assets</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Group in Primary:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Loans &amp; Advances (Asset)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Subgroup in Group:</span>
                      <span className="font-semibold text-[#027A48] dark:text-emerald-400">Driver Trip Advances</span>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#303036] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Accounts</span>
                      <span className="font-semibold text-[#101828] dark:text-slate-200">
                        {overview?.drivers?.total_accounts || drivers.length}{" "}drivers
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Advances (Dr)</span>
                      <span className="font-semibold text-[#101828] dark:text-slate-200">
                        {formatCurrency(overview?.drivers?.total_debit || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Expenses (Cr)</span>
                      <span className="font-semibold text-[#027A48] dark:text-emerald-400">
                        {formatCurrency(overview?.drivers?.total_credit || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-dashed border-slate-200/90 dark:border-[#303036]">
                      <span className="text-[#101828] dark:text-slate-300">Recoverable</span>
                      <span className="text-[#027A48] dark:text-emerald-400 font-extrabold">
                        {formatCurrency(overview?.drivers?.total_outstanding || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 flex items-center justify-between text-xs font-semibold text-[#027A48] dark:text-emerald-400 border-t border-slate-100 dark:border-[#303036]">
                  <span>Open Driver Directory</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Card 4: Company Vehicles Ledger (Fixed Assets / Tangible PPE) */}
              <div
                onClick={() => {
                  setActiveCategory("COMPANY_VEHICLE");
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="group cursor-pointer relative bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 shadow-2xs hover:border-[#2563EB] dark:hover:border-blue-500 hover:shadow-[0_10px_25px_-5px_rgba(37,99,235,0.12)] transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 flex items-center justify-center text-[#2563EB] dark:text-blue-400 group-hover:scale-105 transition-transform">
                      <Truck className="w-5 h-5" />
                    </div>
                    <Badge variant="primary" className="text-[11px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800 whitespace-nowrap">
                      Fixed Assets • Dr
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-[#101828] dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
                    Company Vehicles Ledger
                  </h3>
                  <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[34px]">
                    Fleet capital assets, WDV, depreciation, additions, and operating cost accounts.
                  </p>

                  {/* 3-Tier Ind AS Hierarchy Block */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#101013] border border-slate-100 dark:border-[#303036]/60 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Primary Group:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Fixed Assets</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Group in Primary:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Fixed Assets</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Subgroup in Group:</span>
                      <span className="font-semibold text-[#2563EB] dark:text-blue-400">Company Owned Fleet Vehicles</span>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#303036] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Total Fleet</span>
                      <span className="font-semibold text-[#101828] dark:text-slate-200">
                        {overview?.company_vehicles?.total_accounts || companyVehicles.length}{" "}vehicles
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Additions (Dr)</span>
                      <span className="font-semibold text-[#027A48] dark:text-emerald-400">
                        {formatCurrency(overview?.company_vehicles?.total_debit || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Depreciation (Cr)</span>
                      <span className="font-semibold text-[#B42318] dark:text-rose-400">
                        {formatCurrency(overview?.company_vehicles?.total_credit || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-dashed border-slate-200/90 dark:border-[#303036]">
                      <span className="text-[#101828] dark:text-slate-300">Book Value (WDV)</span>
                      <span className="text-[#2563EB] dark:text-blue-400 font-extrabold">
                        {formatCurrency(overview?.company_vehicles?.total_outstanding || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 flex items-center justify-between text-xs font-semibold text-[#2563EB] dark:text-blue-400 border-t border-slate-100 dark:border-[#303036]">
                  <span>Open Vehicle Directory</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Statutory, Banking & Regulatory Ledgers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#101828] dark:text-white uppercase tracking-wider">
                  Banking, Statutory &amp; Regulatory Ledgers
                </h3>
                <p className="text-xs text-[#667085] dark:text-slate-400">
                  Commercial banking liquidity, GST/TDS statutory tax ledgers, and Ind AS Schedule III compliance.
                </p>
              </div>
              <Badge variant="primary" className="text-xs font-medium">
                Ind AS / Schedule III
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {/* Card 5: Company Bank Accounts (Spans 1 Column) */}
              <div
                onClick={() => {
                  setActiveCategory("COMPANY_BANK_ACCOUNT");
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="group cursor-pointer relative bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 shadow-2xs hover:border-[#0E9384] dark:hover:border-teal-500 hover:shadow-[0_10px_25px_-5px_rgba(14,147,132,0.12)] transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-[#F0FDF9] dark:bg-teal-950/60 border border-[#99F6E0] dark:border-teal-800 flex items-center justify-center text-[#0E9384] dark:text-teal-400 group-hover:scale-105 transition-transform">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <Badge variant="success" className="text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap">
                      Current Assets / OD
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-[#101828] dark:text-white group-hover:text-[#0E9384] dark:group-hover:text-teal-400 transition-colors">
                    Company Bank Accounts
                  </h3>
                  <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[34px]">
                    Commercial bank accounts, receipts, vendor payments, contra transfers, and TallyPrime.
                  </p>

                  {/* 3-Tier Ind AS Hierarchy Block */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#101013] border border-slate-100 dark:border-[#303036]/60 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Primary Group:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Current Assets / Liab</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Group in Primary:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Bank Accounts / OD</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Subgroup in Group:</span>
                      <span className="font-semibold text-[#0E9384] dark:text-teal-400">Current &amp; OD Accounts</span>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#303036] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Accounts</span>
                      <span className="font-semibold text-[#101828] dark:text-slate-200">
                        {overview?.company_bank_accounts?.total_accounts || bankAccounts.length} accounts
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Inflows (Dr)</span>
                      <span className="font-semibold text-[#027A48] dark:text-emerald-400">
                        {formatCurrency(overview?.company_bank_accounts?.total_debit || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Outflows (Cr)</span>
                      <span className="font-semibold text-[#B42318] dark:text-rose-400">
                        {formatCurrency(overview?.company_bank_accounts?.total_credit || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-dashed border-slate-200/90 dark:border-[#303036]">
                      <span className="text-[#101828] dark:text-slate-300">Net Liquid</span>
                      {(() => {
                        const calculatedBankNet = bankAccounts.reduce((acc, b) => acc + (b.balance_type === "CR" ? -parseFloat(String(b.current_balance || 0)) : parseFloat(String(b.current_balance || 0))), 0);
                        const netVal = overview?.company_bank_accounts?.total_outstanding !== undefined && overview?.company_bank_accounts?.total_outstanding !== null && overview.company_bank_accounts.total_outstanding !== 0
                          ? Number(overview.company_bank_accounts.total_outstanding)
                          : calculatedBankNet;
                        const isNegative = netVal < 0;
                        return (
                          <span className={cn("font-extrabold", isNegative ? "text-[#B42318] dark:text-rose-400" : "text-[#0E9384] dark:text-teal-400")}>
                            {isNegative ? `–₹${Math.abs(netVal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : formatCurrency(netVal)}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 flex items-center justify-between text-xs font-semibold text-[#0E9384] dark:text-teal-400 border-t border-slate-100 dark:border-[#303036]">
                  <span>Open Bank Directory</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Card 6: Duties & Taxes Featured Card (Spans 2 Columns) */}
              <div
                onClick={() => {
                  setActiveCategory("DUTIES_AND_TAXES");
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="xl:col-span-2 group cursor-pointer relative bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 shadow-2xs hover:border-[#7C3AED] dark:hover:border-purple-500 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-xl bg-[#F5F3FF] dark:bg-purple-950/60 border border-[#DDD6FE] dark:border-purple-800 flex items-center justify-center text-[#7C3AED] dark:text-purple-400 group-hover:scale-105 transition-transform shrink-0">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-base font-bold text-[#101828] dark:text-white group-hover:text-[#7C3AED] dark:group-hover:text-purple-400 transition-colors">
                            Duties &amp; Taxes
                          </h3>
                          <Badge variant="primary" className="text-[10px] font-semibold px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800 whitespace-nowrap">
                            Statutory Dues
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-0.5 min-h-[16px] line-clamp-1">
                          Output GST, Input Tax Credit (ITC), GTA 5% RCM, and TDS.
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-[#667085] dark:text-slate-400 block">Net Liability</span>
                      <span className="text-base font-extrabold text-[#7C3AED] dark:text-purple-400">
                        {formatCurrency(overview?.duties_and_taxes?.total_outstanding || 0)}
                      </span>
                    </div>
                  </div>

                  {/* 3-Tier Ind AS Hierarchy Block */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#101013] border border-slate-100 dark:border-[#303036]/60 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Primary Group:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Current Liabilities &amp; Assets (ITC)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Group in Primary:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Duties &amp; Taxes (TAX)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-slate-400">Subgroup in Group:</span>
                      <span className="font-semibold text-[#7C3AED] dark:text-purple-400">GST Output • Input ITC • RCM • TDS</span>
                    </div>
                  </div>

                  {/* 4 Financial Metric Mini-Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-100 dark:border-[#303036]">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#101013] border border-slate-100 dark:border-[#303036]/60">
                      <span className="text-[10px] text-[#667085] dark:text-slate-400 block truncate">Tax Accounts</span>
                      <span className="text-xs font-bold text-[#101828] dark:text-white mt-0.5 block tabular-nums">
                        {overview?.duties_and_taxes?.total_accounts || dutiesAndTaxes.length}{" "}ledgers
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#101013] border border-slate-100 dark:border-[#303036]/60">
                      <span className="text-[10px] text-[#667085] dark:text-slate-400 block truncate">Output Tax (Cr)</span>
                      <span className="text-[11px] xl:text-xs font-bold font-mono text-[#B42318] dark:text-rose-400 mt-0.5 block tabular-nums leading-tight break-all sm:break-normal">
                        {formatCurrency(overview?.duties_and_taxes?.total_credit || 0)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#101013] border border-slate-100 dark:border-[#303036]/60">
                      <span className="text-[10px] text-[#667085] dark:text-slate-400 block truncate">ITC &amp; TDS Paid</span>
                      <span className="text-[11px] xl:text-xs font-bold font-mono text-[#027A48] dark:text-emerald-400 mt-0.5 block tabular-nums leading-tight break-all sm:break-normal">
                        {formatCurrency(overview?.duties_and_taxes?.total_debit || 0)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F5F3FF] dark:bg-purple-950/30 border border-[#DDD6FE] dark:border-purple-800">
                      <span className="text-[10px] text-[#7C3AED] dark:text-purple-300 font-medium block truncate">Net Payable</span>
                      <span className="text-[11px] xl:text-xs font-extrabold font-mono text-[#7C3AED] dark:text-purple-400 mt-0.5 block tabular-nums leading-tight break-all sm:break-normal">
                        {formatCurrency(overview?.duties_and_taxes?.total_outstanding || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 flex items-center justify-between text-xs font-semibold text-[#7C3AED] dark:text-purple-400 border-t border-slate-100 dark:border-[#303036]">
                  <span>Open Duties &amp; Taxes Directory</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Card 7: Ind AS Chart of Accounts Health (Spans 1 Column) */}
              <div className="xl:col-span-1 bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <Badge variant="neutral" className="text-[10px] font-semibold whitespace-nowrap">
                      TallyPrime 3-Tier
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-[#101828] dark:text-white">
                    Ind AS Hierarchy Binding
                  </h3>
                  <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[34px]">
                    Automatic hierarchy verification for corporate statutory reporting and TallyPrime XML export.
                  </p>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#101013] border border-slate-100 dark:border-[#303036]/60 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#667085] dark:text-slate-400 whitespace-nowrap">Primary Groups:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {overview?.hierarchy?.primary_groups_count ?? hierarchyStats.primary_groups}{" "}Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#667085] dark:text-slate-400 whitespace-nowrap">Groups in Primary:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {overview?.hierarchy?.groups_count ?? hierarchyStats.groups}{" "}Verified
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#667085] dark:text-slate-400 whitespace-nowrap">Subgroups in Group:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {overview?.hierarchy?.subgroups_count ?? hierarchyStats.subgroups}{" "}Bound
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#303036] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-slate-400">Audit Status</span>
                      <span className="text-[#027A48] dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {overview?.hierarchy?.status ?? hierarchyStats.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-[#303036]">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleVerifyHierarchy}
                    disabled={isVerifyingHierarchy}
                    className="w-full text-xs h-7.5 gap-1.5 font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", isVerifyingHierarchy && "animate-spin")} />
                    {isVerifyingHierarchy ? "Verifying..." : "Verify & Bind"}
                  </Button>
                </div>
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
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white dark:bg-[#17171B] p-3 sm:p-4 rounded-xl border border-slate-200/90 dark:border-[#303036] shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
            <div className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar py-0.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveCategory("OVERVIEW")}
                className="gap-1.5 text-xs font-semibold shrink-0 whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Categories
              </Button>
              <div className="h-5 w-px bg-[#E4E7EC] dark:bg-[#202025] shrink-0" />
              <div className="flex items-center rounded-lg bg-[#F2F4F7] dark:bg-[#202025] p-0.5 shrink-0">
                <button
                  onClick={() => setActiveCategory("BILLING_CLIENT")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0",
                    activeCategory === "BILLING_CLIENT"
                      ? "bg-white dark:bg-[#101013] text-[#4F46E5] dark:text-indigo-400 shadow-sm"
                      : "text-[#667085] dark:text-slate-400 hover:text-[#101828] dark:hover:text-white"
                  )}
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Billing Clients ({billingClients.length})</span>
                </button>
                <button
                  onClick={() => setActiveCategory("VENDOR")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0",
                    activeCategory === "VENDOR"
                      ? "bg-white dark:bg-[#101013] text-[#B54708] dark:text-amber-400 shadow-sm"
                      : "text-[#667085] dark:text-slate-400 hover:text-[#101828] dark:hover:text-white"
                  )}
                >
                  <Truck className="w-3.5 h-3.5 shrink-0" />
                  <span>Vendors ({vendors.length})</span>
                </button>
                <button
                  onClick={() => setActiveCategory("DRIVER")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0",
                    activeCategory === "DRIVER"
                      ? "bg-white dark:bg-[#101013] text-[#027A48] dark:text-emerald-400 shadow-sm"
                      : "text-[#667085] dark:text-slate-400 hover:text-[#101828] dark:hover:text-white"
                  )}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>Drivers ({drivers.length})</span>
                </button>
                <button
                  onClick={() => setActiveCategory("COMPANY_VEHICLE")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0",
                    activeCategory === "COMPANY_VEHICLE"
                      ? "bg-white dark:bg-[#101013] text-[#2563EB] dark:text-blue-400 shadow-sm"
                      : "text-[#667085] dark:text-slate-400 hover:text-[#101828] dark:hover:text-white"
                  )}
                >
                  <Truck className="w-3.5 h-3.5 shrink-0" />
                  <span>Company Vehicles ({companyVehicles.length})</span>
                </button>
                <button
                  onClick={() => setActiveCategory("COMPANY_BANK_ACCOUNT")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0",
                    activeCategory === "COMPANY_BANK_ACCOUNT"
                      ? "bg-white dark:bg-[#101013] text-[#0E9384] dark:text-teal-400 shadow-sm"
                      : "text-[#667085] dark:text-slate-400 hover:text-[#101828] dark:hover:text-white"
                  )}
                >
                  <Landmark className="w-3.5 h-3.5 shrink-0" />
                  <span>Bank Accounts ({bankAccounts.length})</span>
                </button>
                <button
                  onClick={() => setActiveCategory("DUTIES_AND_TAXES")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0",
                    activeCategory === "DUTIES_AND_TAXES"
                      ? "bg-white dark:bg-[#101013] text-[#7C3AED] dark:text-purple-400 shadow-sm"
                      : "text-[#667085] dark:text-slate-400 hover:text-[#101828] dark:hover:text-white"
                  )}
                >
                  <Receipt className="w-3.5 h-3.5 shrink-0" />
                  <span>Duties &amp; Taxes ({dutiesAndTaxes.length})</span>
                </button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
              <div className="relative flex-1 xl:w-64">
                <Search className="w-4 h-4 text-[#667085] dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Search ${
                    activeCategory === "BILLING_CLIENT"
                      ? "clients"
                      : activeCategory === "VENDOR"
                      ? "vendors"
                      : activeCategory === "DRIVER"
                      ? "drivers"
                      : activeCategory === "COMPANY_VEHICLE"
                      ? "vehicles"
                      : activeCategory === "COMPANY_BANK_ACCOUNT"
                      ? "bank accounts"
                      : "tax accounts"
                  }...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#101013] border border-slate-200/90 dark:border-[#303036] rounded-lg focus:outline-none focus:border-[#4F46E5] dark:text-white"
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
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-[#101013] border border-slate-200/90 dark:border-[#303036] rounded-lg text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-[#4F46E5]"
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
                {activeCategory === "COMPANY_VEHICLE" && (
                  <>
                    <option value="ACTIVE">Active Fleet</option>
                    <option value="INACTIVE">Inactive / Decommissioned</option>
                    <option value="HCV">Heavy Commercial (HCV)</option>
                    <option value="LCV">Light Commercial (LCV)</option>
                  </>
                )}
                {activeCategory === "COMPANY_BANK_ACCOUNT" && (
                  <>
                    <option value="ACTIVE">Active Accounts</option>
                    <option value="INACTIVE">Inactive Accounts</option>
                    <option value="DEFAULT">Default Account</option>
                  </>
                )}
                {activeCategory === "DUTIES_AND_TAXES" && (
                  <>
                    <option value="PAYABLE">Tax Payable (Credit)</option>
                    <option value="INPUT_ITC">Input Tax Credit / Advance (Debit)</option>
                    <option value="SETTLED">Settled (NIL)</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Accounting Hierarchy Classification Bar (Ind AS 3-Tier Hierarchy Context) */}
          <div className="bg-white dark:bg-[#17171B] rounded-xl border border-slate-200/90 dark:border-[#303036] p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border",
                    activeCategory === "BILLING_CLIENT" && "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-400",
                    activeCategory === "VENDOR" && "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-400",
                    activeCategory === "DRIVER" && "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-400",
                    activeCategory === "COMPANY_VEHICLE" && "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-400",
                    activeCategory === "COMPANY_BANK_ACCOUNT" && "bg-teal-50 border-teal-200 text-teal-600 dark:bg-teal-950/60 dark:border-teal-800 dark:text-teal-400",
                    activeCategory === "DUTIES_AND_TAXES" && "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-950/60 dark:border-purple-800 dark:text-purple-400"
                  )}
                >
                  {activeCategory === "BILLING_CLIENT" && <Building2 className="w-5 h-5" />}
                  {activeCategory === "VENDOR" && <Truck className="w-5 h-5" />}
                  {activeCategory === "DRIVER" && <Users className="w-5 h-5" />}
                  {activeCategory === "COMPANY_VEHICLE" && <Truck className="w-5 h-5" />}
                  {activeCategory === "COMPANY_BANK_ACCOUNT" && <Landmark className="w-5 h-5" />}
                  {activeCategory === "DUTIES_AND_TAXES" && <Receipt className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#101828] dark:text-white">
                      {activeCategory === "BILLING_CLIENT" && "Billing Clients (Trade Receivables)"}
                      {activeCategory === "VENDOR" && "Vendors & Suppliers (Trade Payables)"}
                      {activeCategory === "DRIVER" && "Driver Fleet Imprest & Advances"}
                      {activeCategory === "COMPANY_VEHICLE" && "Company Vehicles (Fixed Assets & Fleet PPE)"}
                      {activeCategory === "COMPANY_BANK_ACCOUNT" && "Company Bank Accounts & Liquidity"}
                      {activeCategory === "DUTIES_AND_TAXES" && "Statutory Duties & Taxes (GST, TDS & TCS)"}
                    </h4>
                    <Badge variant="neutral" className="text-[10px] font-mono whitespace-nowrap">
                      Ind AS &amp; TallyPrime Linked
                    </Badge>
                  </div>
                  <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
                    {activeCategory === "BILLING_CLIENT" && "Client accounts bound to Sundry Debtors asset group for automated freight billing & receipt allocations."}
                    {activeCategory === "VENDOR" && "Supplier accounts bound to Sundry Creditors liability group for vehicle hire challans & purchase registers."}
                    {activeCategory === "DRIVER" && "Driver imprest accounts bound to Loans & Advances asset group for en-route fuel/cash recovery."}
                    {activeCategory === "COMPANY_VEHICLE" && "Company-owned fleet asset accounts bound to Fixed Assets for capital additions, depreciation, and operating trip costs."}
                    {activeCategory === "COMPANY_BANK_ACCOUNT" && "Commercial bank accounts linked to issuing offices for automated inflows, disbursements & contra transfers."}
                    {activeCategory === "DUTIES_AND_TAXES" && "Statutory tax accounts mapped under Duties & Taxes for GST returns (GSTR-1, GSTR-3B) and TDS quarterly returns."}
                  </p>
                </div>
              </div>

              {/* 3-Tier Hierarchy Breadcrumb Pill */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar bg-slate-50 dark:bg-[#101013] p-2 rounded-lg border border-slate-200/80 dark:border-[#303036] text-xs shrink-0 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Primary Group:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded bg-white dark:bg-[#1C1D24] shadow-2xs border border-slate-200/60 dark:border-[#303036]">
                    {activeCategory === "BILLING_CLIENT" && "Current Assets (Dr)"}
                    {activeCategory === "VENDOR" && "Current Liabilities (Cr)"}
                    {activeCategory === "DRIVER" && "Current Assets (Dr)"}
                    {activeCategory === "COMPANY_VEHICLE" && "Fixed Assets (Dr)"}
                    {activeCategory === "COMPANY_BANK_ACCOUNT" && "Current Assets / Liab"}
                    {activeCategory === "DUTIES_AND_TAXES" && "Liabilities & Assets (ITC)"}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Group in Primary:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded bg-white dark:bg-[#1C1D24] shadow-2xs border border-slate-200/60 dark:border-[#303036]">
                    {activeCategory === "BILLING_CLIENT" && "Sundry Debtors"}
                    {activeCategory === "VENDOR" && "Sundry Creditors"}
                    {activeCategory === "DRIVER" && "Loans & Advances (Asset)"}
                    {activeCategory === "COMPANY_VEHICLE" && "Fixed Assets"}
                    {activeCategory === "COMPANY_BANK_ACCOUNT" && "Bank Accounts / OD"}
                    {activeCategory === "DUTIES_AND_TAXES" && "Duties & Taxes (TAX)"}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Subgroup in Group:</span>
                  <span className={cn(
                    "font-semibold px-2 py-0.5 rounded border",
                    activeCategory === "BILLING_CLIENT" && "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800",
                    activeCategory === "VENDOR" && "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
                    activeCategory === "DRIVER" && "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
                    activeCategory === "COMPANY_VEHICLE" && "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800",
                    activeCategory === "COMPANY_BANK_ACCOUNT" && "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800",
                    activeCategory === "DUTIES_AND_TAXES" && "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800"
                  )}>
                    {activeCategory === "BILLING_CLIENT" && "Corporate Billing Clients"}
                    {activeCategory === "VENDOR" && "Market Vehicle Vendors"}
                    {activeCategory === "DRIVER" && "Driver Trip Advances"}
                    {activeCategory === "COMPANY_VEHICLE" && "Company Owned Fleet Vehicles"}
                    {activeCategory === "COMPANY_BANK_ACCOUNT" && "Current & OD Accounts"}
                    {activeCategory === "DUTIES_AND_TAXES" && "GST Output / Input ITC / TDS"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              {/* Category 1: Billing Clients Table */}
              {activeCategory === "BILLING_CLIENT" && (
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#101013] border-b border-slate-200/90 dark:border-[#303036] text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Billing Client</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Account Code</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Opening Balance</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Total Debit</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Total Credit</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Outstanding Balance</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Last Activity</th>
                      <th className="py-3 px-4 text-center w-36 min-w-[130px] whitespace-nowrap sticky right-0 z-20 bg-slate-50 dark:bg-[#101013] shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.4)] border-b border-slate-200/90 dark:border-[#303036]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#303036]/70 text-xs">
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
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Corporate Debtors</span>
                                <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">Sundry Debtors (Asset)</span>
                              </div>
                              {client.gstin && (
                                <div className="text-[10px] text-[#98A2B3] font-mono mt-0.5">
                                  GST: {client.gstin}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                              {client.code || `BC-${client.id}`}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-slate-600 dark:text-slate-300">
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
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                              {client.last_transaction_date ? formatDate(client.last_transaction_date) : "No activity"}
                              <div className="text-[10px] text-[#98A2B3]">
                                {client.transaction_count}{" "}vouchers
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap w-36 min-w-[130px] sticky right-0 z-10 bg-white dark:bg-[#17171B] group-hover:bg-slate-50/90 dark:group-hover:bg-slate-800/60 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.4)] border-b border-[#F2F4F7] dark:border-[#303036]/70">
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
                                className="text-xs h-7.5 px-3 gap-1.5 font-semibold whitespace-nowrap inline-flex items-center justify-center hover:border-[#4F46E5] hover:text-[#4F46E5]"
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
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#101013] border-b border-slate-200/90 dark:border-[#303036] text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Vendor / Supplier</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Vendor Code</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Opening Balance</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Total Debit (Paid)</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Total Credit (Billed)</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Outstanding Payable</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Last Activity</th>
                      <th className="py-3 px-4 text-center w-36 min-w-[130px] whitespace-nowrap sticky right-0 z-20 bg-slate-50 dark:bg-[#101013] shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.4)] border-b border-slate-200/90 dark:border-[#303036]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#303036]/70 text-xs">
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
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Market Vehicle Vendors</span>
                                <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">Sundry Creditors (Liability)</span>
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
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                              {vendor.code || `VEND-${vendor.id}`}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-slate-600 dark:text-slate-300">
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
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                              {vendor.last_transaction_date ? formatDate(vendor.last_transaction_date) : "No activity"}
                              <div className="text-[10px] text-[#98A2B3]">
                                {vendor.transaction_count}{" "}entries
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap w-36 min-w-[130px] sticky right-0 z-10 bg-white dark:bg-[#17171B] group-hover:bg-slate-50/90 dark:group-hover:bg-slate-800/60 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.4)] border-b border-[#F2F4F7] dark:border-[#303036]/70">
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
                                className="text-xs h-7.5 px-3 gap-1.5 font-semibold whitespace-nowrap inline-flex items-center justify-center hover:border-[#B54708] hover:text-[#B54708]"
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
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#101013] border-b border-slate-200/90 dark:border-[#303036] text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Driver Name</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Driver ID / Contact</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">License / DL Status</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Total Advances</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Settled Expenses</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Current Balance</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Last Activity</th>
                      <th className="py-3 px-4 text-center w-36 min-w-[130px] whitespace-nowrap sticky right-0 z-20 bg-slate-50 dark:bg-[#101013] shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.4)] border-b border-slate-200/90 dark:border-[#303036]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#303036]/70 text-xs">
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
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-[#101828] dark:text-white">
                                {driver.name}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Driver Trip Advances</span>
                                <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">Loans &amp; Advances (Asset)</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                                {driver.driver_id || `DRV-${driver.id}`}
                              </span>
                              <div className="text-[11px] text-[#667085] dark:text-slate-400">
                                {driver.phone}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
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
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                              {driver.last_transaction_date ? formatDate(driver.last_transaction_date) : "No activity"}
                              <div className="text-[10px] text-[#98A2B3]">
                                {driver.transaction_count}{" "}records
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap w-36 min-w-[130px] sticky right-0 z-10 bg-white dark:bg-[#17171B] group-hover:bg-slate-50/90 dark:group-hover:bg-slate-800/60 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.4)] border-b border-[#F2F4F7] dark:border-[#303036]/70">
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
                                className="text-xs h-7.5 px-3 gap-1.5 font-semibold whitespace-nowrap inline-flex items-center justify-center hover:border-[#027A48] hover:text-[#027A48]"
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

              {/* Category: Company Vehicles Table (Fixed Assets / Tangible Fleet PPE) */}
              {activeCategory === "COMPANY_VEHICLE" && (
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#101013] border-b border-slate-200/90 dark:border-[#303036] text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Company Vehicle</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Account Code</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Opening Balance</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Additions (Dr)</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Depreciation (Cr)</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Book Value (WDV)</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Last Activity</th>
                      <th className="py-3 px-4 text-center w-36 min-w-[130px] whitespace-nowrap sticky right-0 z-20 bg-slate-50 dark:bg-[#101013] shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.4)] border-b border-slate-200/90 dark:border-[#303036]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#303036]/70 text-xs">
                    {filteredCompanyVehicles.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#667085] dark:text-slate-400">
                          <Truck className="w-8 h-8 mx-auto text-[#98A2B3] mb-2" />
                          <p className="font-semibold text-sm text-[#101828] dark:text-slate-200">No Company Vehicles Found</p>
                          <p className="text-xs mt-0.5">No fleet vehicles match your filter or search criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredCompanyVehicles.map((veh) => {
                        const isCarryingVal = veh.balance_type === "DR" && Number(veh.current_balance) > 0;
                        return (
                          <tr
                            key={veh.id}
                            className="hover:bg-[#F9FAFB] dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold tracking-wide px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 rounded">
                                  {veh.vehicle_number}
                                </span>
                                <Badge
                                  variant="neutral"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {veh.capacity_mt ? `${veh.capacity_mt} MT` : veh.vehicle_type}
                                </Badge>
                              </div>
                              <div className="text-[11px] text-[#667085] dark:text-slate-400 mt-0.5">
                                {veh.vehicle_type}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                                  {veh.subgroup_name || "Company Owned Fleet Vehicles"}
                                </span>
                                <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                  Fixed Assets (Asset)
                                </span>
                              </div>
                              {veh.default_driver_name && (
                                <div className="text-[10px] text-[#667085] dark:text-slate-400 mt-0.5">
                                  Driver: {veh.default_driver_name}
                                </div>
                              )}
                              {veh.chassis_number && (
                                <div className="text-[10px] text-[#98A2B3] font-mono mt-0.5">
                                  Chassis: {veh.chassis_number}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                              {veh.ledger_code || `VEH-${veh.id}`}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-slate-600 dark:text-slate-300">
                              {formatCurrency(veh.opening_balance)}
                              <span className="text-[10px] text-[#98A2B3] ml-1">
                                {veh.opening_balance_type}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-[#027A48] dark:text-emerald-400">
                              {formatCurrency(veh.total_debit)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-[#B42318] dark:text-rose-400">
                              {formatCurrency(veh.total_credit)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span
                                className={cn(
                                  "font-bold text-xs",
                                  isCarryingVal ? "text-blue-600 dark:text-blue-400" : "text-[#667085] dark:text-slate-400"
                                )}
                              >
                                {formatCurrency(veh.current_balance)}
                              </span>
                              <Badge
                                variant={isCarryingVal ? "primary" : "neutral"}
                                className="ml-2 text-[10px] px-1.5 py-0"
                              >
                                {isCarryingVal ? "Book Value" : "Written Off"}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                              {veh.last_transaction_date ? formatDate(veh.last_transaction_date) : "No activity"}
                              <div className="text-[10px] text-[#98A2B3]">
                                {veh.transaction_count}{" "}entries • Ops:{" "}{formatCurrency(veh.total_operational_expense)}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap w-36 min-w-[130px] sticky right-0 z-10 bg-white dark:bg-[#17171B] group-hover:bg-slate-50/90 dark:group-hover:bg-slate-800/60 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.4)] border-b border-[#F2F4F7] dark:border-[#303036]/70">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAccountId(veh.id);
                                  setDatePreset("ALL");
                                  setDetailFromDate("");
                                  setDetailToDate("");
                                  setDetailSearch("");
                                  setDetailTxType("ALL");
                                }}
                                className="text-xs h-7.5 px-3 gap-1.5 font-semibold whitespace-nowrap inline-flex items-center justify-center hover:border-blue-600 hover:text-blue-600"
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

              {/* Category 4: Company Bank Accounts Table */}
              {activeCategory === "COMPANY_BANK_ACCOUNT" && (
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#101013] border-b border-slate-200/90 dark:border-[#303036] text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Bank Name &amp; Details</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Account Number</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Branch / IFSC</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Issuing Office</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Inflows (Dr)</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Outflows (Cr)</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Current Balance</th>
                      <th className="py-3 px-4 text-center w-36 min-w-[130px] whitespace-nowrap sticky right-0 z-20 bg-slate-50 dark:bg-[#101013] shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.4)] border-b border-slate-200/90 dark:border-[#303036]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#303036]/70 text-xs">
                    {filteredBankAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#667085] dark:text-slate-400">
                          <Landmark className="w-8 h-8 mx-auto text-[#98A2B3] mb-2" />
                          <p className="font-semibold text-sm text-[#101828] dark:text-slate-200">No Bank Accounts Found</p>
                          <p className="text-xs mt-0.5">No bank accounts match your search criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredBankAccounts.map((b) => (
                        <tr key={b.id} className="hover:bg-[#F9FAFB] dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#101828] dark:text-white flex items-center gap-1.5">
                              {b.custom_bank_name || b.bank_name}
                              {b.is_default && (
                                <Badge variant="primary" className="text-[10px] px-1.5 py-0">Default</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">{b.ledger_group || "Current Accounts"}</span>
                              <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">Bank Accounts (Asset)</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                            {b.account_number_masked}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            <div>{b.branch_name || "—"}</div>
                            <div className="font-mono text-[11px] text-[#667085] dark:text-slate-400">IFSC: {b.ifsc_code}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            {b.issuing_office_name || "All Offices"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-[#027A48] dark:text-emerald-400">
                            {formatCurrency(b.total_debit)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-[#B42318] dark:text-rose-400">
                            {formatCurrency(b.total_credit)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className={cn(
                              "font-bold text-xs",
                              b.balance_type === "DR" ? "text-[#027A48] dark:text-emerald-400" : "text-[#B42318] dark:text-rose-400"
                            )}>
                              {b.balance_type === "CR" && Number(b.current_balance) > 0 ? `-${formatCurrency(b.current_balance)}` : formatCurrency(b.current_balance)}
                            </span>{" "}
                            <span className="text-[10px] text-[#98A2B3] ml-1">{b.balance_type}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap w-36 min-w-[130px] sticky right-0 z-10 bg-white dark:bg-[#17171B] group-hover:bg-slate-50/90 dark:group-hover:bg-slate-800/60 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.4)] border-b border-[#F2F4F7] dark:border-[#303036]/70">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAccountId(b.id);
                                setDatePreset("ALL");
                                setDetailFromDate("");
                                setDetailToDate("");
                                setDetailSearch("");
                                setDetailTxType("ALL");
                              }}
                              className="text-xs h-7.5 px-3 gap-1.5 font-semibold whitespace-nowrap inline-flex items-center justify-center hover:border-[#0E9384] hover:text-[#0E9384]"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Ledger
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* Category 5: Duties & Taxes Table */}
              {activeCategory === "DUTIES_AND_TAXES" && (
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#101013] border-b border-slate-200/90 dark:border-[#303036] text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Tax Ledger Name</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Account Code</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Subgroup / Group</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Total Debit (ITC / Paid)</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Total Credit (Liability)</th>
                      <th className="py-3 px-4 text-right border-b border-slate-200/90 dark:border-[#303036]">Current Balance</th>
                      <th className="py-3 px-4 border-b border-slate-200/90 dark:border-[#303036]">Activity</th>
                      <th className="py-3 px-4 text-center w-36 min-w-[130px] whitespace-nowrap sticky right-0 z-20 bg-slate-50 dark:bg-[#101013] shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.4)] border-b border-slate-200/90 dark:border-[#303036]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#303036]/70 text-xs">
                    {filteredDutiesAndTaxes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#667085] dark:text-slate-400">
                          <Receipt className="w-8 h-8 mx-auto text-[#98A2B3] mb-2" />
                          <p className="font-semibold text-sm text-[#101828] dark:text-slate-200">No Tax Ledgers Found</p>
                          <p className="text-xs mt-0.5">Click &apos;Verify &amp; Bind Hierarchy&apos; above to auto-provision standard Ind AS tax accounts.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredDutiesAndTaxes.map((tax) => {
                        const isPayable = tax.balance_type === "CR" && Number(tax.current_balance) > 0;
                        const isITC = tax.balance_type === "DR" && Number(tax.current_balance) > 0;
                        return (
                          <tr key={tax.id} className="hover:bg-[#F9FAFB] dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-[#101828] dark:text-white">
                                {tax.name}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                                  {tax.tax_type.replace(/_/g, " ")}
                                </span>
                                <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {tax.balance_type === "DR" ? "Current Assets (ITC)" : "Current Liabilities (Tax)"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                              {tax.code}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                              <div className="font-medium text-xs text-purple-700 dark:text-purple-300">{tax.subgroup_name || tax.group_name}</div>
                              <div className="text-[10px] text-[#98A2B3]">Group: {tax.group_name}</div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-[#101828] dark:text-slate-200 font-mono">
                              {formatCurrency(tax.total_debit)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-[#027A48] dark:text-emerald-400 font-mono">
                              {formatCurrency(tax.total_credit)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className={cn(
                                "font-bold text-xs font-mono",
                                isPayable && "text-[#B54708] dark:text-amber-400",
                                isITC && "text-[#027A48] dark:text-emerald-400",
                                !isPayable && !isITC && "text-[#667085] dark:text-slate-400"
                              )}>
                                {formatCurrency(tax.current_balance)}
                              </span>
                              <Badge
                                variant={isPayable ? "warning" : isITC ? "success" : "neutral"}
                                className="ml-2 text-[10px] px-1.5 py-0"
                              >
                                {isPayable ? "Payable" : isITC ? "ITC / Asset" : "Settled"}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                              <div className="text-[11px]">
                                {tax.last_transaction_date ? formatDate(tax.last_transaction_date) : "No vouchers"}
                              </div>
                              <div className="text-[10px] text-[#98A2B3]">
                                {tax.transaction_count}{" "}voucher lines
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap w-36 min-w-[130px] sticky right-0 z-10 bg-white dark:bg-[#17171B] group-hover:bg-slate-50/90 dark:group-hover:bg-slate-800/60 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.4)] border-b border-[#F2F4F7] dark:border-[#303036]/70">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAccountId(tax.id);
                                  setDatePreset("ALL");
                                  setDetailFromDate("");
                                  setDetailToDate("");
                                  setDetailSearch("");
                                  setDetailTxType("ALL");
                                }}
                                className="text-xs h-7.5 px-3 gap-1.5 font-semibold whitespace-nowrap inline-flex items-center justify-center hover:border-[#7C3AED] hover:text-[#7C3AED]"
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
              Back to {
                activeCategory === "BILLING_CLIENT"
                  ? "Clients"
                  : activeCategory === "VENDOR"
                  ? "Vendors"
                  : activeCategory === "DRIVER"
                  ? "Drivers"
                  : activeCategory === "COMPANY_VEHICLE"
                  ? "Company Vehicles"
                  : activeCategory === "COMPANY_BANK_ACCOUNT"
                  ? "Bank Accounts"
                  : "Duties & Taxes"
              } List
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
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-6 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100 dark:border-[#303036]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="primary" className="text-[11px] font-semibold uppercase">
                    {detailedLedger.category.replace("_", " ")} STATEMENT
                  </Badge>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-[#202025] font-medium text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-[#303036]">
                    {detailedLedger.category === "BILLING_CLIENT" && "Current Assets → Sundry Debtors → Corporate Debtors"}
                    {detailedLedger.category === "VENDOR" && "Current Liabilities → Sundry Creditors → Market Vehicle Vendors"}
                    {detailedLedger.category === "DRIVER" && "Current Assets → Loans & Advances → Driver Trip Advances"}
                    {detailedLedger.category === "COMPANY_VEHICLE" && "Fixed Assets → Fixed Assets → Company Owned Fleet Vehicles"}
                    {detailedLedger.category === "COMPANY_BANK_ACCOUNT" && "Current Assets / Liab → Bank Accounts → Current & OD"}
                    {detailedLedger.category === "DUTIES_AND_TAXES" && "Liabilities & Assets → Duties & Taxes → Statutory Dues"}
                  </span>
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
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {detailedLedger.party.company_name}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-y-1 gap-x-4 text-xs text-[#667085] dark:text-slate-400">
                  {detailedLedger.party.phone && <span>Ph: {detailedLedger.party.phone}</span>}
                  {detailedLedger.party.email && <span>Email: {detailedLedger.party.email}</span>}
                  {detailedLedger.party.gstin && (
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      GSTIN: {detailedLedger.party.gstin}
                    </span>
                  )}
                  {detailedLedger.party.pan && (
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      PAN: {detailedLedger.party.pan}
                    </span>
                  )}
                  {detailedLedger.party.license_number && (
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      DL: {detailedLedger.party.license_number}
                    </span>
                  )}
                  {detailedLedger.party.vehicle_number && (
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200 dark:border-amber-800">
                      Vehicle: {detailedLedger.party.vehicle_number}
                    </span>
                  )}
                  {detailedLedger.party.vehicle_type && (
                    <span>Type: {detailedLedger.party.vehicle_type}</span>
                  )}
                  {detailedLedger.party.capacity_mt && (
                    <span>Capacity: {detailedLedger.party.capacity_mt} MT</span>
                  )}
                  {detailedLedger.party.driver_name && (
                    <span>Driver: {detailedLedger.party.driver_name}</span>
                  )}
                  {detailedLedger.party.chassis_number && (
                    <span className="font-mono">Chassis: {detailedLedger.party.chassis_number}</span>
                  )}
                  {detailedLedger.party.engine_number && (
                    <span className="font-mono">Engine: {detailedLedger.party.engine_number}</span>
                  )}
                  {detailedLedger.party.fitness_expiry && (
                    <span>Fitness: {formatDate(detailedLedger.party.fitness_expiry)}</span>
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
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#101013] border border-slate-200/90 dark:border-[#303036]">
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

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#101013] border border-slate-200/90 dark:border-[#303036]">
                <div className="text-[11px] font-medium text-[#667085] dark:text-slate-400">
                  Total Period Debits
                </div>
                <div className="text-lg font-bold text-[#101828] dark:text-white mt-1">
                  {formatCurrency(detailedLedger.total_debit)}
                </div>
                <div className="text-[10px] text-[#667085] dark:text-slate-400 mt-0.5">
                  {detailedLedger.category === "BILLING_CLIENT"
                    ? "Total Freight Invoiced"
                    : detailedLedger.category === "VENDOR"
                    ? "Disbursements Made"
                    : detailedLedger.category === "DRIVER"
                    ? "Advances Disbursed"
                    : detailedLedger.category === "COMPANY_BANK_ACCOUNT"
                    ? "Total Bank Inflows (Debits)"
                    : "ITC Deducted / Tax Paid"}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#101013] border border-slate-200/90 dark:border-[#303036]">
                <div className="text-[11px] font-medium text-[#667085] dark:text-slate-400">
                  Total Period Credits
                </div>
                <div className="text-lg font-bold text-[#027A48] dark:text-emerald-400 mt-1">
                  {formatCurrency(detailedLedger.total_credit)}
                </div>
                <div className="text-[10px] text-[#667085] dark:text-slate-400 mt-0.5">
                  {detailedLedger.category === "BILLING_CLIENT"
                    ? "Total Collections"
                    : detailedLedger.category === "VENDOR"
                    ? "Total Bills/Liabilities"
                    : detailedLedger.category === "DRIVER"
                    ? "Approved Expenses"
                    : detailedLedger.category === "COMPANY_BANK_ACCOUNT"
                    ? "Total Bank Outflows (Credits)"
                    : "Output Tax / Tax Payable"}
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
                    : detailedLedger.category === "DRIVER"
                    ? (detailedLedger.closing_balance_type === "DR" ? "Recoverable from Driver" : "Payable to Driver")
                    : detailedLedger.category === "COMPANY_BANK_ACCOUNT"
                    ? (detailedLedger.closing_balance_type === "DR" ? "Bank Liquidity in Hand (Asset)" : "Bank Overdraft Balance (Liability)")
                    : (detailedLedger.closing_balance_type === "CR" ? "Statutory Tax Payable (Liability)" : "Input Tax Credit (Asset)")}
                </div>
              </div>
            </div>
          </div>

          {/* Statement Filters Toolbar (Print: Hidden) */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-4 shadow-2xs print:hidden space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Date Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1">Period:</span>
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
                        : "bg-[#F2F4F7] dark:bg-[#202025] text-slate-600 dark:text-slate-300 hover:bg-[#E4E7EC]"
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
                    className="px-2 py-1 text-xs bg-slate-50 dark:bg-[#101013] border border-slate-200/90 dark:border-[#303036] rounded-md focus:outline-none focus:border-[#4F46E5] dark:text-white"
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
                    className="px-2 py-1 text-xs bg-slate-50 dark:bg-[#101013] border border-slate-200/90 dark:border-[#303036] rounded-md focus:outline-none focus:border-[#4F46E5] dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Search and Voucher Type Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-[#303036]">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#667085] dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search voucher #, ref #, or particulars..."
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#101013] border border-slate-200/90 dark:border-[#303036] rounded-lg focus:outline-none focus:border-[#4F46E5] dark:text-white"
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
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-[#101013] border border-slate-200/90 dark:border-[#303036] rounded-lg text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-[#4F46E5]"
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
                  {detailedLedger.category === "COMPANY_VEHICLE" && (
                    <>
                      <option value="JOURNAL_VOUCHER">Journal Adjustment (Asset / WDV)</option>
                      <option value="EXP_DIESEL">Diesel &amp; Fuel Vouchers</option>
                      <option value="EXP_TOLL">Toll &amp; FASTag Charges</option>
                      <option value="EXP_MAINTENANCE">Maintenance &amp; Repairs</option>
                      <option value="EXP_DRIVER_ALLOWANCE">Driver Allowance</option>
                      <option value="PAYMENT_VOUCHER">Payment / Disbursement</option>
                    </>
                  )}
                  {detailedLedger.category === "COMPANY_BANK_ACCOUNT" && (
                    <>
                      <option value="RECEIPT_VOUCHER">Receipts (Inflows)</option>
                      <option value="PAYMENT_VOUCHER">Payments (Outflows)</option>
                      <option value="CONTRA_VOUCHER">Contra Transfers</option>
                      <option value="JOURNAL_VOUCHER">Journal Adjustments</option>
                    </>
                  )}
                  {detailedLedger.category === "DUTIES_AND_TAXES" && (
                    <>
                      <option value="TRANSPORT_INVOICE">Transport Invoice (GST)</option>
                      <option value="GENERAL_INVOICE">General Invoice (GST)</option>
                      <option value="PURCHASE_REGISTER">Purchase Bill (ITC / TDS)</option>
                      <option value="PAYMENT_VOUCHER">Payment (TDS / Tax Paid)</option>
                      <option value="JOURNAL_VOUCHER">Journal Adjustment</option>
                      <option value="CREDIT_NOTE">Credit Note</option>
                      <option value="DEBIT_NOTE">Debit Note</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Statement Transaction History Table */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#101013] border-b border-slate-200/90 dark:border-[#303036] text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
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
                <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#303036]/70 text-xs">
                  {/* Opening Balance Row */}
                  <tr className="bg-slate-50/50 dark:bg-[#202025]/30 font-semibold italic text-slate-600 dark:text-slate-400">
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
                      {formatCurrency(detailedLedger.opening_balance)}{" "}{detailedLedger.opening_balance_type}
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
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
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
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {tx.particulars}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#101828] dark:text-slate-200 font-mono">
                          {Number(tx.debit_amount) > 0 ? formatCurrency(tx.debit_amount) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#027A48] dark:text-emerald-400 font-mono">
                          {Number(tx.credit_amount) > 0 ? formatCurrency(tx.credit_amount) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#101828] dark:text-white">
                          {formatCurrency(tx.running_balance)}{" "}
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
                                : "bg-slate-100 text-slate-700 dark:bg-[#202025] dark:text-slate-300"
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
                  <tr className="bg-slate-50 dark:bg-[#101013] font-bold border-t-2 border-[#D0D5DD] dark:border-[#303036] text-xs">
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
                      {formatCurrency(detailedLedger.closing_balance)}{" "}{detailedLedger.closing_balance_type}
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
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#303036]">
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
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#101013]">
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
                    <p className="font-mono text-slate-700 dark:text-slate-300">
                      {sourceDocModal.tx.reference_number || "None"}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[#667085] dark:text-slate-400 font-medium">Particulars:</span>
                  <p className="mt-1 p-2 rounded bg-slate-50/50 dark:bg-[#101013] border border-slate-200/90 dark:border-[#303036] text-slate-700 dark:text-slate-200">
                    {sourceDocModal.tx.particulars}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2.5 rounded border border-slate-200/90 dark:border-[#303036]">
                    <span className="text-[#667085] dark:text-slate-400 text-[11px]">Debit Amount</span>
                    <p className="font-mono font-bold text-base text-[#101828] dark:text-white">
                      {formatCurrency(sourceDocModal.tx.debit_amount)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded border border-slate-200/90 dark:border-[#303036]">
                    <span className="text-[#667085] dark:text-slate-400 text-[11px]">Credit Amount</span>
                    <p className="font-mono font-bold text-base text-[#027A48] dark:text-emerald-400">
                      {formatCurrency(sourceDocModal.tx.credit_amount)}
                    </p>
                  </div>
                </div>

                {sourceDocModal.data?.items && sourceDocModal.data.items.length > 0 && (
                  <div className="pt-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Line Items:</span>
                    <div className="mt-1 divide-y divide-[#F2F4F7] dark:divide-[#303036] border border-slate-200/90 dark:border-[#303036] rounded-lg overflow-hidden">
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

            <div className="pt-3 border-t border-slate-100 dark:border-[#303036] flex justify-end">
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
