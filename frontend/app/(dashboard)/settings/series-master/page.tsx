"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Hash,
  Layers,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  SlidersHorizontal,
  Settings,
  ShieldAlert,
  FileText,
  Truck,
  CreditCard,
  Receipt,
  BookOpen,
  Edit2,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef, RowAction } from "@/types/table";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { KpiCard } from "@/components/ui/kpi-card";
import { apiClient } from "@/lib/api-client";

interface SeriesMasterItem {
  id: number;
  category_id?: number | null;
  category_name?: string | null;
  document_type: string;
  prefix: string;
  suffix?: string | null;
  starting_number: number;
  current_number: number;
  end_number?: number | null;
  financial_year: string;
  series_mode: "AUTOMATIC" | "MANUAL";
  last_used_formatted?: string | null;
  next_number?: number;
  next_number_formatted?: string;
  is_mandatory_manual?: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SeriesCategoryItem {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
}

// 15 Standard Voucher Types Definition
const STANDARD_VOUCHERS = [
  {
    code: "LR",
    name: "Lorry Receipt (GR / LR)",
    category: "TRANSPORT",
    categoryLabel: "Transport Documents",
    isMandatoryManual: true,
    defaultPrefix: "LR-2026-",
    defaultSuffix: "",
    description: "Consignment note issued to shipper / consignee for cargo transit.",
  },
  {
    code: "HIRE_CHALLAN",
    name: "Truck Hire Challan (HC)",
    category: "TRANSPORT",
    categoryLabel: "Transport Documents",
    isMandatoryManual: true,
    defaultPrefix: "HC-2026-",
    defaultSuffix: "",
    description: "Lorry hire contract slip issued to market truck owner / driver.",
  },
  {
    code: "TRANSPORT_INVOICE",
    name: "Transport / Freight Invoice",
    category: "BILLING",
    categoryLabel: "Customer Invoicing",
    isMandatoryManual: true,
    defaultPrefix: "TI-2026-",
    defaultSuffix: "",
    description: "Tax invoice issued for freight charges linked to delivered LRs.",
  },
  {
    code: "GENERAL_INVOICE",
    name: "General Commercial Invoice",
    category: "BILLING",
    categoryLabel: "Customer Invoicing",
    isMandatoryManual: true,
    defaultPrefix: "GI-2026-",
    defaultSuffix: "",
    description: "Direct sales & services invoice with balanced double-entry ledger postings.",
  },
  {
    code: "PROFORMA_INVOICE",
    name: "Proforma Invoice",
    category: "BILLING",
    categoryLabel: "Customer Invoicing",
    isMandatoryManual: false,
    defaultPrefix: "PI-2026-",
    defaultSuffix: "",
    description: "Preliminary quotation / proforma invoice for advance billing estimation.",
  },
  {
    code: "NORMAL_PURCHASE",
    name: "Purchase Invoice (Operational / Spares)",
    category: "ACCOUNTS",
    categoryLabel: "Accounting Vouchers",
    isMandatoryManual: false,
    defaultPrefix: "NP-2026-",
    defaultSuffix: "",
    description: "Vendor purchase invoice for fuel, tyres, lubricants, and spare parts.",
  },
  {
    code: "GENERAL_PURCHASE",
    name: "General Purchase (Admin / Expense)",
    category: "ACCOUNTS",
    categoryLabel: "Accounting Vouchers",
    isMandatoryManual: false,
    defaultPrefix: "GP-2026-",
    defaultSuffix: "",
    description: "General expense billings (office rent, utilities, legal fees).",
  },
  {
    code: "RECEIPT_VOUCHER",
    name: "Receipt Voucher (Customer / Cash-Bank)",
    category: "ACCOUNTS",
    categoryLabel: "Accounting Vouchers",
    isMandatoryManual: false,
    defaultPrefix: "RV-2026-",
    defaultSuffix: "",
    description: "Customer payments received via NEFT, RTGS, Cheque, or Cash.",
  },
  {
    code: "PAYMENT_VOUCHER",
    name: "Payment Voucher (Vendor / General)",
    category: "ACCOUNTS",
    categoryLabel: "Accounting Vouchers",
    isMandatoryManual: false,
    defaultPrefix: "PV-2026-",
    defaultSuffix: "",
    description: "General vendor and supplier payments made from company bank accounts.",
  },
  {
    code: "PAYMENT_ATH",
    name: "Advance To Hired (ATH Payment)",
    category: "ACCOUNTS",
    categoryLabel: "Accounting Vouchers",
    isMandatoryManual: false,
    defaultPrefix: "ATH-2026-",
    defaultSuffix: "",
    description: "Truck hire trip advance disbursed to vehicle owner / driver.",
  },
  {
    code: "PAYMENT_BTH",
    name: "Balance To Hired (BTH Settlement)",
    category: "ACCOUNTS",
    categoryLabel: "Accounting Vouchers",
    isMandatoryManual: false,
    defaultPrefix: "BTH-2026-",
    defaultSuffix: "",
    description: "Final balance settlement paid to hired truck owner upon POD receipt.",
  },
  {
    code: "CREDIT_NOTE",
    name: "Credit Note",
    category: "ACCOUNTS",
    categoryLabel: "Accounting Vouchers",
    isMandatoryManual: false,
    defaultPrefix: "CN-2026-",
    defaultSuffix: "",
    description: "Credit adjustment issued to customer for freight rebate or discount.",
  },
  {
    code: "DEBIT_NOTE",
    name: "Debit Note",
    category: "ACCOUNTS",
    categoryLabel: "Accounting Vouchers",
    isMandatoryManual: false,
    defaultPrefix: "DN-2026-",
    defaultSuffix: "",
    description: "Debit adjustment issued to vendor or transporter for shortage / penalty.",
  },
  {
    code: "GENERAL_VOUCHER",
    name: "Journal Voucher (General Journal)",
    category: "ACCOUNTS",
    categoryLabel: "Accounting Vouchers",
    isMandatoryManual: false,
    defaultPrefix: "JV-2026-",
    defaultSuffix: "",
    description: "General non-cash double-entry adjustment voucher.",
  },
  {
    code: "CONTRA_VOUCHER",
    name: "Contra Voucher (Bank-Cash Transfer)",
    category: "ACCOUNTS",
    categoryLabel: "Accounting Vouchers",
    isMandatoryManual: false,
    defaultPrefix: "CV-2026-",
    defaultSuffix: "",
    description: "Internal fund transfer between company bank accounts and cash drawers.",
  },
];

export default function SeriesMasterPage() {
  const [activeTab, setActiveTab] = useState<"series" | "categories">("series");
  const [seriesList, setSeriesList] = useState<SeriesMasterItem[]>([]);
  const [categoryList, setCategoryList] = useState<SeriesCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer / Form states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<SeriesMasterItem | null>(null);
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initializingDefaults, setInitializingDefaults] = useState(false);

  // Form Fields
  const [docType, setDocType] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [startingNum, setStartingNum] = useState(1);
  const [currentNum, setCurrentNum] = useState(0);
  const [finYear, setFinYear] = useState("2026-2027");
  const [seriesMode, setSeriesMode] = useState<"AUTOMATIC" | "MANUAL">("AUTOMATIC");
  const [selectedCatId, setSelectedCatId] = useState<number | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);

  // Category form
  const [catName, setCatName] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catDesc, setCatDesc] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [seriesRes, catRes] = await Promise.all([
        apiClient<SeriesMasterItem[]>("/api/v1/settings/series"),
        apiClient<SeriesCategoryItem[]>("/api/v1/settings/series-categories"),
      ]);
      setSeriesList(Array.isArray(seriesRes) ? seriesRes : []);
      setCategoryList(Array.isArray(catRes) ? catRes : []);
    } catch (err: any) {
      setError(err.message || "Failed to load series configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingSeries(null);
    setDocType("LR");
    setPrefix("LR-2026-");
    setSuffix("");
    setStartingNum(1);
    setCurrentNum(0);
    setFinYear("2026-2027");
    setSeriesMode("MANUAL");
    setIsActive(true);
    setSelectedCatId(undefined);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (series: SeriesMasterItem) => {
    setEditingSeries(series);
    setDocType(series.document_type);
    setPrefix(series.prefix);
    setSuffix(series.suffix || "");
    setStartingNum(series.starting_number);
    setCurrentNum(series.current_number);
    setFinYear(series.financial_year);
    setSeriesMode(series.series_mode);
    setIsActive(series.is_active);
    setSelectedCatId(series.category_id || undefined);
    setIsDrawerOpen(true);
  };

  const handleDocTypeChange = (selectedCode: string) => {
    setDocType(selectedCode);
    const standard = STANDARD_VOUCHERS.find((v) => v.code === selectedCode);
    if (standard) {
      if (!editingSeries) {
        setPrefix(standard.defaultPrefix);
        setSuffix(standard.defaultSuffix);
        setSeriesMode(standard.isMandatoryManual ? "MANUAL" : "AUTOMATIC");
      } else {
        if (standard.isMandatoryManual) {
          setSeriesMode("MANUAL");
        }
      }
      if (standard.category) {
        const matchingCat = categoryList.find((c) => c.code === standard.category);
        if (matchingCat) setSelectedCatId(matchingCat.id);
      }
    }
  };

  // Check if currently selected docType is mandatory manual
  const isSelectedMandatoryManual = useMemo(() => {
    const raw = docType.toUpperCase().trim();
    return ["LR", "HIRE_CHALLAN", "HC", "TRANSPORT_INVOICE", "GENERAL_INVOICE"].includes(raw);
  }, [docType]);

  // Live Sequence Preview calculations
  const livePreview = useMemo(() => {
    const p = prefix || "";
    const s = suffix || "";
    const curr = currentNum >= 0 ? currentNum : 0;
    const start = startingNum >= 1 ? startingNum : 1;
    const nextVal = curr >= start ? curr + 1 : start;

    const formatPadded = (n: number) => `${p}${String(n).padStart(4, "0")}${s}`;

    return {
      lastUsed: curr >= start ? formatPadded(curr) : "None yet (New Series)",
      nextNumber: nextVal,
      nextFormatted: formatPadded(nextVal),
      template: `${p}XXXX${s}`,
    };
  }, [prefix, suffix, startingNum, currentNum]);

  const handleSaveSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const mode = isSelectedMandatoryManual ? "MANUAL" : seriesMode;
      const payload = {
        document_type: docType,
        prefix,
        suffix: suffix || "",
        starting_number: startingNum,
        current_number: currentNum,
        financial_year: finYear,
        series_mode: mode,
        category_id: selectedCatId || null,
        is_active: isActive,
      };

      if (editingSeries) {
        await apiClient(`/api/v1/settings/series/${editingSeries.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`Series for ${docType} updated successfully.`);
      } else {
        await apiClient("/api/v1/settings/series", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`Series for ${docType} configured successfully.`);
      }

      setIsDrawerOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save series master.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitializeDefaults = async () => {
    setInitializingDefaults(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await apiClient<any>("/api/v1/settings/series/initialize", {
        method: "POST",
      });
      setSuccessMessage(res.message || "All 15 standard voucher series verified and configured.");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to initialize standard series.");
    } finally {
      setInitializingDefaults(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient("/api/v1/settings/series-categories", {
        method: "POST",
        body: JSON.stringify({
          name: catName,
          code: catCode.toUpperCase(),
          description: catDesc || null,
          is_active: true,
        }),
      });
      setShowAddCatModal(false);
      setCatName("");
      setCatCode("");
      setCatDesc("");
      setSuccessMessage("Series Category created successfully.");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create category.");
    } finally {
      setSubmitting(false);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const total = seriesList.length;
    const manualMandatoryTypes = ["LR", "HIRE_CHALLAN", "HC", "TRANSPORT_INVOICE", "GENERAL_INVOICE"];
    const mandatoryConfigured = seriesList.filter((s) =>
      manualMandatoryTypes.includes(s.document_type.toUpperCase())
    ).length;
    const automaticCount = seriesList.filter((s) => s.series_mode === "AUTOMATIC").length;
    const manualCount = seriesList.filter((s) => s.series_mode === "MANUAL").length;
    return { total, mandatoryConfigured, automaticCount, manualCount };
  }, [seriesList]);

  // Filtered series list
  const filteredSeries = useMemo(() => {
    return seriesList.filter((item) => {
      // Category filter
      if (filterCategory === "MANDATORY_MANUAL") {
        if (!item.is_mandatory_manual) return false;
      } else if (filterCategory === "AUTOMATIC") {
        if (item.series_mode !== "AUTOMATIC") return false;
      } else if (filterCategory === "TRANSPORT") {
        if (!["LR", "HIRE_CHALLAN", "HC"].includes(item.document_type.toUpperCase())) return false;
      } else if (filterCategory === "BILLING") {
        if (!["TRANSPORT_INVOICE", "GENERAL_INVOICE", "PROFORMA_INVOICE"].includes(item.document_type.toUpperCase()))
          return false;
      } else if (filterCategory === "ACCOUNTS") {
        if (
          ["LR", "HIRE_CHALLAN", "HC", "TRANSPORT_INVOICE", "GENERAL_INVOICE", "PROFORMA_INVOICE"].includes(
            item.document_type.toUpperCase()
          )
        )
          return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDoc = item.document_type.toLowerCase().includes(q);
        const matchesPrefix = item.prefix.toLowerCase().includes(q);
        const matchesSuffix = (item.suffix || "").toLowerCase().includes(q);
        const matchesCategory = (item.category_name || "").toLowerCase().includes(q);
        if (!matchesDoc && !matchesPrefix && !matchesSuffix && !matchesCategory) return false;
      }

      return true;
    });
  }, [seriesList, filterCategory, searchQuery]);

  const seriesColumns: ColumnDef<SeriesMasterItem>[] = [
    {
      key: "document_type",
      header: "Voucher / Document Type",
      sortable: true,
      cell: (row) => {
        const std = STANDARD_VOUCHERS.find(
          (v) => v.code === row.document_type || v.code === row.document_type.toUpperCase()
        );
        const displayName = std?.name || row.document_type.replace(/_/g, " ");

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-[#172033]">{displayName}</span>
              {row.is_mandatory_manual && (
                <span
                  title="Mandatory Manual Series"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                >
                  <Lock className="w-2.5 h-2.5" />
                  Mandatory
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#667085]">
              <span className="font-mono font-medium">{row.document_type}</span>
              {row.category_name && <span>· {row.category_name}</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: "series_mode",
      header: "Series Mode",
      cell: (row) => {
        if (row.is_mandatory_manual) {
          return (
            <Badge variant="warning" className="gap-1 font-semibold text-[11px]">
              <Lock className="w-3 h-3 text-amber-600" />
              Manual Series (Mandatory)
            </Badge>
          );
        }
        if (row.series_mode === "AUTOMATIC") {
          return (
            <Badge variant="success" className="gap-1 font-semibold text-[11px]">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Automatic Series
            </Badge>
          );
        }
        return (
          <Badge variant="primary" className="gap-1 font-semibold text-[11px]">
            <Edit2 className="w-3 h-3 text-blue-600" />
            Manual Series
          </Badge>
        );
      },
    },
    {
      key: "prefix",
      header: "Configured Prefix & Postfix",
      cell: (row) => (
        <div className="flex items-center gap-1 font-mono text-xs">
          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold text-slate-800">
            {row.prefix}
          </span>
          <span className="text-slate-400 font-bold">XXXX</span>
          {row.suffix ? (
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold text-slate-800">
              {row.suffix}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-sans italic">—</span>
          )}
        </div>
      ),
    },
    {
      key: "current_number",
      header: "Current / Last Used #",
      align: "right",
      isNumeric: true,
      sortable: true,
      cell: (row) => (
        <div className="text-right">
          <span className="font-mono text-xs font-bold text-[#172033] block">
            #{row.current_number}
          </span>
          <span className="font-mono text-[11px] text-[#667085]">
            {row.last_used_formatted || "None yet"}
          </span>
        </div>
      ),
    },
    {
      key: "next_number_formatted",
      header: "Next Series Number",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 font-mono text-xs font-bold text-indigo-700 shadow-2xs">
            {row.next_number_formatted || `${row.prefix}0001${row.suffix || ""}`}
          </span>
        </div>
      ),
    },
    {
      key: "financial_year",
      header: "Fiscal Year",
      cell: (row) => <span className="font-mono text-xs text-[#667085]">{row.financial_year}</span>,
    },
    {
      key: "is_active",
      header: "Status",
      cell: (row) => (
        <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} variant="active" />
      ),
    },
  ];

  const seriesActions: RowAction<SeriesMasterItem>[] = [
    {
      label: "Edit Configuration",
      icon: <Edit2 className="w-3.5 h-3.5" />,
      onClick: (row) => handleOpenEdit(row),
    },
  ];

  const categoryColumns: ColumnDef<SeriesCategoryItem>[] = [
    {
      key: "code",
      header: "Category Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-slate-800">{row.code}</span>
      ),
    },
    {
      key: "name",
      header: "Category Name",
      sortable: true,
      cell: (row) => <span className="font-semibold text-xs text-[#172033]">{row.name}</span>,
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => <span className="text-xs text-slate-500">{row.description || "—"}</span>,
    },
    {
      key: "is_active",
      header: "Status",
      cell: (row) => (
        <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} variant="active" />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Series Master"
        description="Unified sequence numbering engine: configure custom Prefix, Postfix, and sequence counters with policy enforcement for Manual vs Automatic voucher generation."
        breadcrumbs={[
          { label: "Settings", href: "/settings/users" },
          { label: "Series Master" },
        ]}
        primaryAction={{
          label: activeTab === "series" ? "Configure Series" : "Add Series Category",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {
            if (activeTab === "series") handleOpenCreate();
            else setShowAddCatModal(true);
          },
        }}
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Configured Document Series"
          value={`${stats.total} / 15`}
          subtext="Voucher types in active catalog"
          icon={<Layers className="w-4 h-4 text-indigo-600" />}
        />
        <KpiCard
          title="Mandatory Manual Vouchers"
          value={`${stats.mandatoryConfigured} / 4`}
          subtext="LR, HC, General & Transport Invoices"
          icon={<Lock className="w-4 h-4 text-amber-600" />}
        />
        <KpiCard
          title="Automatic Series Vouchers"
          value={stats.automaticCount.toString()}
          subtext="Auto-incremented on creation"
          icon={<Sparkles className="w-4 h-4 text-emerald-600" />}
        />
        <KpiCard
          title="Active Financial Year"
          value="2026-2027"
          subtext="April 1, 2026 – March 31, 2027"
          icon={<Hash className="w-4 h-4 text-slate-600" />}
        />
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-rose-600 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-emerald-700 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("series")}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "series"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            All Document Series ({seriesList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "categories"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Series Categories ({categoryList.length})
          </button>
        </div>

        {activeTab === "series" && (
          <div className="pb-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleInitializeDefaults}
              disabled={initializingDefaults}
              className="gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            >
              {initializingDefaults ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              )}
              Initialize All 15 Standard Series
            </Button>
          </div>
        )}
      </div>

      {activeTab === "series" && (
        <>
          {/* Filters & Quick Category Pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL", label: `All Vouchers (${seriesList.length})` },
                {
                  id: "MANDATORY_MANUAL",
                  label: `Mandatory Manual (${seriesList.filter((s) => s.is_mandatory_manual).length})`,
                },
                { id: "TRANSPORT", label: "Transport (LR & HC)" },
                { id: "BILLING", label: "Invoicing & Billing" },
                { id: "ACCOUNTS", label: "Accounting Vouchers" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setFilterCategory(pill.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterCategory === pill.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search series or prefix..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Loading series records...</span>
            </div>
          ) : (
            <DataTable
              columns={seriesColumns}
              data={filteredSeries}
              actions={seriesActions}
              emptyMessage="No document series matching filter"
              emptySubtext="Click 'Initialize All 15 Standard Series' or 'Configure Series' to setup numbering sequence formats."
            />
          )}
        </>
      )}

      {activeTab === "categories" && (
        <>
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Loading series categories...</span>
            </div>
          ) : (
            <DataTable columns={categoryColumns} data={categoryList} />
          )}
        </>
      )}

      {/* Series Configure / Edit Drawer */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingSeries ? `Edit Series: ${editingSeries.document_type}` : "Configure Document Series"}
        description="Configure prefix, postfix, starting sequence, and enforce Automatic vs Manual numbering mode."
        width="lg"
      >
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 lg:p-7 shadow-2xs">
          <form onSubmit={handleSaveSeries} className="space-y-5">
            {/* Voucher Document Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                Voucher / Document Type <span className="text-rose-600">*</span>
              </label>
              <SearchableSelect
                value={docType}
                onChange={(val) => handleDocTypeChange(String(val))}
                options={STANDARD_VOUCHERS.map((v) => ({
                  value: v.code,
                  label: `${v.name} (${v.code}) — ${v.categoryLabel}${v.isMandatoryManual ? " [Manual Mandatory]" : ""}`,
                }))}
                placeholder="Select or enter voucher type..."
                searchPlaceholder="Search voucher type..."
                disabled={!!editingSeries}
              />
              <span className="text-[11px] text-[#667085] mt-1 block">
                {STANDARD_VOUCHERS.find((v) => v.code === docType)?.description ||
                  "Configure number sequencing for this system document."}
              </span>
            </div>

            {/* Mandatory Manual Series Policy Notice */}
            {isSelectedMandatoryManual ? (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Mandatory Manual Series Enforced</span>
                  <span>
                    LR, HC, General Invoice, and Transport Invoice require Manual Series. Document creation
                    will be blocked until this series is configured and active.
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                  Series Mode / Numbering Type <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSeriesMode("AUTOMATIC")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      seriesMode === "AUTOMATIC"
                        ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Automatic Series
                      </span>
                      {seriesMode === "AUTOMATIC" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <span className="text-[11px] text-slate-500 block leading-relaxed">
                      System automatically allocates the next running number upon voucher creation.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSeriesMode("MANUAL")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      seriesMode === "MANUAL"
                        ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        Manual Series
                      </span>
                      {seriesMode === "MANUAL" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <span className="text-[11px] text-slate-500 block leading-relaxed">
                      User inputs the document number, formatted with prefix & postfix.
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Prefix & Postfix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Prefix (Leading Scheme) <span className="text-rose-600">*</span>
                </label>
                <Input
                  placeholder="e.g. LR-2026- or TI/"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">e.g. TI-2026- or EXP/</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Postfix / Suffix (Trailing Scheme)
                </label>
                <Input
                  placeholder="e.g. /DEL or -HQ (Optional)"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Appended after sequence number</span>
              </div>
            </div>

            {/* Starting Number, Current Number & Financial Year */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Starting Number
                </label>
                <Input
                  type="number"
                  min={1}
                  value={String(startingNum)}
                  onChange={(e) => setStartingNum(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Current / Last Used #
                </label>
                <Input
                  type="number"
                  min={0}
                  value={String(currentNum)}
                  onChange={(e) => setCurrentNum(parseInt(e.target.value) || 0)}
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">0 if brand new series</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Financial Year
                </label>
                <Input
                  placeholder="2026-2027"
                  value={finYear}
                  onChange={(e) => setFinYear(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Series Category */}
            {categoryList.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Series Category
                </label>
                <SearchableSelect
                  value={selectedCatId ? String(selectedCatId) : ""}
                  onChange={(val) => setSelectedCatId(val ? parseInt(String(val)) : undefined)}
                  options={categoryList.map((cat) => ({
                    value: String(cat.id),
                    label: `${cat.name} (${cat.code})`,
                  }))}
                  placeholder="Select Category (Optional)"
                  searchPlaceholder="Search category..."
                />
              </div>
            )}

            {/* Live Interactive Sequence Preview Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Live Sequence Preview
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">Current / Last Used Number</span>
                  <span className="font-mono font-bold text-slate-700 block mt-0.5">
                    {livePreview.lastUsed}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-indigo-600 font-semibold block">
                    Next Generated Document Number
                  </span>
                  <span className="font-mono font-bold text-indigo-700 block mt-0.5 text-sm bg-white px-2 py-0.5 rounded border border-indigo-200 w-fit">
                    {livePreview.nextFormatted}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 flex items-center justify-between">
                <span>
                  Pattern Template: <code className="font-mono text-slate-700 font-bold">{livePreview.template}</code>
                </span>
                <span className="font-medium text-slate-600">
                  Mode:{" "}
                  <strong>{isSelectedMandatoryManual ? "MANUAL (Mandatory)" : seriesMode}</strong>
                </span>
              </div>
            </div>

            {/* Submit / Cancel Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDrawerOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                {submitting ? "Saving Configuration..." : editingSeries ? "Update Series" : "Save Series"}
              </Button>
            </div>
          </form>
        </div>
      </EntityDrawer>

      {/* Add Category Drawer */}
      <EntityDrawer
        isOpen={showAddCatModal}
        onClose={() => setShowAddCatModal(false)}
        title="Add Series Category"
        description="Group and organize document series by department or operations."
      >
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 lg:p-7 shadow-2xs">
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <Input
              label="Category Name"
              placeholder="e.g. Transport Logistics"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
            />

            <Input
              label="Category Code (Uppercase)"
              placeholder="e.g. LOGISTICS"
              value={catCode}
              onChange={(e) => setCatCode(e.target.value.toUpperCase())}
              required
            />

            <Input
              label="Description (Optional)"
              placeholder="Dispatches, haulage and hire orders"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddCatModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                {submitting ? "Saving..." : "Create Category"}
              </Button>
            </div>
          </form>
        </div>
      </EntityDrawer>
    </div>
  );
}
