"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  Search,
  Edit2,
  Check,
  Star,
  Trash2,
  Building2,
  X,
  Layers,
  Settings2,
  FileText,
  SlidersHorizontal,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef, RowAction } from "@/types/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { KpiCard } from "@/components/ui/kpi-card";
import { apiClient } from "@/lib/api-client";
import { getActiveOffice, getAssignedOffices } from "@/lib/auth";

interface SeriesMasterItem {
  id: number;
  category_id?: number | null;
  category_name?: string | null;
  issuing_office_id?: number | null;
  issuing_office_name?: string | null;
  document_type: string;
  series_name?: string | null;
  prefix: string;
  suffix?: string | null;
  starting_number: number;
  current_number: number;
  end_number?: number | null;
  financial_year: string;
  series_mode: "AUTOMATIC" | "MANUAL";
  is_default?: boolean;
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

// 16 Standard Voucher Types Definition (including JOB Trip Order)
const STANDARD_VOUCHERS = [
  // 1. Transport Operations
  {
    code: "JOB",
    name: "Trip Order / Job (Job Creation)",
    category: "TRANSPORT",
    categoryLabel: "Transport Documents",
    isMandatoryManual: false,
    defaultPrefix: "JOB-2026-",
    defaultSuffix: "",
    description: "Operational dispatch movement and freight booking order.",
  },
  {
    code: "LR",
    name: "Lorry Receipt (GR / LR)",
    category: "TRANSPORT",
    categoryLabel: "Transport Documents",
    isMandatoryManual: false,
    defaultPrefix: "LR-2026-",
    defaultSuffix: "",
    description: "Consignment note issued to shipper / consignee for cargo transit.",
  },
  {
    code: "HIRE_CHALLAN",
    name: "Truck Hire Challan (HC)",
    category: "TRANSPORT",
    categoryLabel: "Transport Documents",
    isMandatoryManual: false,
    defaultPrefix: "HC-2026-",
    defaultSuffix: "",
    description: "Lorry hire contract slip issued to market truck owner / driver.",
  },
  // 2. Billing & Invoicing
  {
    code: "TRANSPORT_INVOICE",
    name: "Transport / Freight Invoice",
    category: "BILLING",
    categoryLabel: "Customer Invoicing",
    isMandatoryManual: false,
    defaultPrefix: "TI-2026-",
    defaultSuffix: "",
    description: "Tax invoice issued for freight charges linked to delivered LRs.",
  },
  {
    code: "GENERAL_INVOICE",
    name: "General Commercial Invoice",
    category: "BILLING",
    categoryLabel: "Customer Invoicing",
    isMandatoryManual: false,
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
  // 3. Accounts & Double-Entry Vouchers
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
  const [seriesList, setSeriesList] = useState<SeriesMasterItem[]>([]);
  const [categoryList, setCategoryList] = useState<SeriesCategoryItem[]>([]);
  const [branchList, setBranchList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [filterOfficeId, setFilterOfficeId] = useState<string>(() => {
    const active = getActiveOffice();
    return active ? String(active.id) : "ALL";
  });
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Format Modal State (Isolated to avoid table re-renders & layout shifts)
  const [quickFormatSeries, setQuickFormatSeries] = useState<SeriesMasterItem | null>(null);
  const [quickPrefix, setQuickPrefix] = useState("");
  const [quickSuffix, setQuickSuffix] = useState("");
  const [isSavingQuickFormat, setIsSavingQuickFormat] = useState(false);
  const [quickFormatError, setQuickFormatError] = useState<string | null>(null);

  // Drawer / Creation Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<SeriesMasterItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [initializingDefaults, setInitializingDefaults] = useState(false);

  // Form Fields
  const [docType, setDocType] = useState("LR");
  const [issuingOfficeId, setIssuingOfficeId] = useState<number | undefined>(undefined);
  const [seriesName, setSeriesName] = useState("");
  const [prefix, setPrefix] = useState("LR-2026-");
  const [suffix, setSuffix] = useState("");
  const [startingNum, setStartingNum] = useState(1);
  const [endNum, setEndNum] = useState<number | undefined>(undefined);
  const [currentNum, setCurrentNum] = useState(0);
  const [finYear, setFinYear] = useState("2026-2027");
  const [seriesMode, setSeriesMode] = useState<"AUTOMATIC" | "MANUAL">("AUTOMATIC");
  const [isDefault, setIsDefault] = useState(true);
  const [selectedCatId, setSelectedCatId] = useState<number | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);

  const loadData = async (targetOffice?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const officeParam = targetOffice !== undefined ? targetOffice : filterOfficeId;
      const seriesUrl =
        officeParam && officeParam !== "ALL"
          ? `/api/v1/settings/series?office_id=${officeParam}`
          : "/api/v1/settings/series";
      const [seriesRes, catRes, branchesRes] = await Promise.all([
        apiClient<SeriesMasterItem[]>(seriesUrl),
        apiClient<SeriesCategoryItem[]>("/api/v1/settings/series-categories"),
        apiClient<any[]>("/api/v1/profile/branches").catch(() => []),
      ]);
      setSeriesList(Array.isArray(seriesRes) ? seriesRes : []);
      setCategoryList(Array.isArray(catRes) ? catRes : []);
      if (Array.isArray(branchesRes) && branchesRes.length > 0) {
        setBranchList(branchesRes);
      } else {
        const storedOffices = getAssignedOffices();
        if (storedOffices.length > 0) {
          setBranchList(storedOffices);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load series configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick Format Handlers (Pencil button / Modal)
  const handleOpenQuickFormat = (series: SeriesMasterItem) => {
    setQuickFormatSeries(series);
    setQuickPrefix(series.prefix || "");
    setQuickSuffix(series.suffix || "");
    setQuickFormatError(null);
  };

  const handleSaveQuickFormat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFormatSeries) return;
    if (!quickPrefix.trim()) {
      setQuickFormatError("Prefix is required.");
      return;
    }

    setIsSavingQuickFormat(true);
    setQuickFormatError(null);
    try {
      const updated = await apiClient<SeriesMasterItem>(
        `/api/v1/settings/series/${quickFormatSeries.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            prefix: quickPrefix.trim(),
            suffix: quickSuffix.trim(),
          }),
        }
      );
      setSeriesList((prev) =>
        prev.map((s) => (s.id === quickFormatSeries.id ? { ...s, ...updated } : s))
      );
      setSuccessMessage(`Number format updated for ${quickFormatSeries.document_type}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setQuickFormatSeries(null);
    } catch (err: any) {
      setQuickFormatError(err.message || "Failed to update format.");
    } finally {
      setIsSavingQuickFormat(false);
    }
  };

  // Drawer Open Handlers
  const handleOpenCreate = () => {
    setEditingSeries(null);
    setDocType("LR");
    setSeriesName("");
    setPrefix("LR-2026-");
    setSuffix("");
    setStartingNum(1);
    setEndNum(undefined);
    setCurrentNum(0);
    setFinYear("2026-2027");
    setSeriesMode("AUTOMATIC");
    setIsDefault(true);
    setIsActive(true);
    setSelectedCatId(undefined);
    const defaultOffice =
      filterOfficeId !== "ALL" ? Number(filterOfficeId) : getActiveOffice()?.id || undefined;
    setIssuingOfficeId(defaultOffice);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (series: SeriesMasterItem) => {
    setEditingSeries(series);
    setDocType(series.document_type);
    setSeriesName(series.series_name || "");
    setPrefix(series.prefix);
    setSuffix(series.suffix || "");
    setStartingNum(series.starting_number);
    setEndNum(series.end_number || undefined);
    setCurrentNum(series.current_number);
    setFinYear(series.financial_year);
    setSeriesMode(series.series_mode);
    setIsDefault(Boolean(series.is_default));
    setIsActive(series.is_active);
    setSelectedCatId(series.category_id || undefined);
    setIssuingOfficeId(series.issuing_office_id || undefined);
    setIsDrawerOpen(true);
  };

  const handleDocTypeChange = (selectedCode: string) => {
    setDocType(selectedCode);
    const standard = STANDARD_VOUCHERS.find((v) => v.code === selectedCode);
    if (standard) {
      if (!editingSeries) {
        setPrefix(standard.defaultPrefix);
        setSuffix(standard.defaultSuffix);
        setSeriesMode("AUTOMATIC");
      }
      if (standard.category) {
        const matchingCat = categoryList.find((c) => c.code === standard.category);
        if (matchingCat) setSelectedCatId(matchingCat.id);
      }
    }
  };

  const handleAppendPrefixTag = (tag: string) => {
    setPrefix((prev) => (prev ? `${prev}${tag}` : tag));
  };

  const handleResetToStandardPrefix = () => {
    const std = STANDARD_VOUCHERS.find((v) => v.code === docType);
    if (std) setPrefix(std.defaultPrefix);
  };

  const handleSaveSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (seriesMode === "MANUAL" && (!endNum || Number(endNum) < startingNum)) {
        throw new Error(
          "For manual booklet series, Range End Number is required and must be greater than or equal to Range Start Number."
        );
      }
      const payload = {
        document_type: docType,
        issuing_office_id: issuingOfficeId || null,
        series_name: seriesName.trim() || null,
        prefix: prefix.trim(),
        suffix: suffix ? suffix.trim() : "",
        starting_number: startingNum,
        current_number: currentNum,
        end_number: endNum ? Number(endNum) : null,
        financial_year: finYear,
        series_mode: seriesMode,
        is_default: Boolean(isDefault),
        category_id: selectedCatId || null,
        is_active: isActive,
      };

      if (editingSeries) {
        await apiClient(`/api/v1/settings/series/${editingSeries.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`Series configuration for ${docType} updated successfully.`);
      } else {
        await apiClient("/api/v1/settings/series", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`New series range for ${docType} created successfully.`);
      }

      setIsDrawerOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save series configuration.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (seriesId: number) => {
    setError(null);
    try {
      await apiClient(`/api/v1/settings/series/${seriesId}/set-default`, {
        method: "POST",
      });
      setSuccessMessage("Series activated as default sequence.");
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to set default series.");
    }
  };

  const handleDeleteSeries = async (seriesId: number) => {
    if (!confirm("Are you sure you want to delete this series range? This cannot be undone.")) return;
    setError(null);
    try {
      await apiClient(`/api/v1/settings/series/${seriesId}`, {
        method: "DELETE",
      });
      setSuccessMessage("Series range deleted successfully.");
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete series.");
    }
  };

  const handleInitializeDefaults = async () => {
    setInitializingDefaults(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const officeParam = filterOfficeId !== "ALL" ? `?office_id=${filterOfficeId}` : "";
      const res = await apiClient<any>(`/api/v1/settings/series/import-template${officeParam}`, {
        method: "POST",
      });
      setSuccessMessage(res.message || "All standard voucher series verified and configured.");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to initialize standard series.");
    } finally {
      setInitializingDefaults(false);
    }
  };

  // Filtered series list
  const filteredSeries = useMemo(() => {
    return seriesList.filter((item) => {
      const doc = item.document_type.toUpperCase();
      if (filterCategory === "MANDATORY_MANUAL") {
        if (item.series_mode !== "MANUAL" && !item.is_mandatory_manual) return false;
      } else if (filterCategory === "AUTOMATIC") {
        if (item.series_mode !== "AUTOMATIC") return false;
      } else if (filterCategory === "TRANSPORT") {
        if (!["JOB", "LR", "HIRE_CHALLAN", "HC"].includes(doc)) return false;
      } else if (filterCategory === "BILLING") {
        if (!["TRANSPORT_INVOICE", "GENERAL_INVOICE", "PROFORMA_INVOICE"].includes(doc))
          return false;
      } else if (filterCategory === "ACCOUNTS") {
        if (
          ["JOB", "LR", "HIRE_CHALLAN", "HC", "TRANSPORT_INVOICE", "GENERAL_INVOICE", "PROFORMA_INVOICE"].includes(
            doc
          )
        )
          return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDoc = item.document_type.toLowerCase().includes(q);
        const matchesName = (item.series_name || "").toLowerCase().includes(q);
        const matchesPrefix = item.prefix.toLowerCase().includes(q);
        const matchesSuffix = (item.suffix || "").toLowerCase().includes(q);
        const matchesCategory = (item.category_name || "").toLowerCase().includes(q);
        const matchesOffice = (item.issuing_office_name || "").toLowerCase().includes(q);
        if (
          !matchesDoc &&
          !matchesName &&
          !matchesPrefix &&
          !matchesSuffix &&
          !matchesCategory &&
          !matchesOffice
        )
          return false;
      }

      return true;
    });
  }, [seriesList, filterCategory, searchQuery]);

  // Metric stats
  const totalConfigured = seriesList.length;
  const activeDefaults = seriesList.filter((s) => s.is_default && s.is_active).length;
  const manualCount = seriesList.filter((s) => s.series_mode === "MANUAL").length;
  const activeBranchName =
    filterOfficeId !== "ALL"
      ? branchList.find((b) => String(b.id) === filterOfficeId)?.name || "Selected Branch"
      : "All Offices (Global)";

  // Helper to determine if series_name is a redundant duplication of company/document name
  const isRedundantSeriesName = (row: SeriesMasterItem, displayName: string) => {
    if (!row.series_name) return true;
    const name = row.series_name.trim().toLowerCase();
    const docLower = row.document_type.toLowerCase();
    const displayLower = displayName.toLowerCase();
    const officeLower = (row.issuing_office_name || "").toLowerCase();

    if (name === docLower || name === displayLower) return true;
    if (name.includes("demo logistics") || name.includes("logistics pvt ltd")) return true;
    if (officeLower && name.startsWith(officeLower) && (name.includes(docLower) || name.includes(displayLower))) {
      return true;
    }
    return false;
  };

  // Table Columns Definition (Clean, modern, zero-jitter, fixed widths)
  const seriesColumns: ColumnDef<SeriesMasterItem>[] = [
    {
      key: "document_type",
      header: "Document / Voucher Type",
      sortable: true,
      cell: (row) => {
        const std = STANDARD_VOUCHERS.find(
          (v) => v.code === row.document_type || v.code === row.document_type.toUpperCase()
        );
        const displayName = std?.name || row.document_type.replace(/_/g, " ");
        const categoryLabel = std?.categoryLabel || row.category_name || "General";
        const showCustomBooklet = !isRedundantSeriesName(row, displayName);

        return (
          <div className="flex flex-col gap-1 py-1 max-w-[280px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-xs text-slate-900 tracking-tight">
                {displayName}
              </span>
              {row.is_default && (
                <span
                  title="Default active sequence used automatically when booking this document"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                  Active Default
                </span>
              )}
              {row.is_mandatory_manual && (
                <span
                  title="Mandatory Manual Sequence"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                >
                  <Lock className="w-2.5 h-2.5" />
                  Mandatory
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                {categoryLabel}
              </span>
              {showCustomBooklet && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 truncate max-w-[150px]">
                  {row.series_name}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "issuing_office_name",
      header: "Issuing Office",
      cell: (row) => {
        if (row.issuing_office_name) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 text-slate-800 text-xs font-semibold border border-slate-200/70 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{row.issuing_office_name}</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-slate-400 font-medium">
            All Offices (Global)
          </span>
        );
      },
    },
    {
      key: "series_mode",
      header: "Mode",
      cell: (row) => {
        if (row.series_mode === "AUTOMATIC") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-2xs">
              <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
              Automatic
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold shadow-2xs">
            <Edit2 className="w-3 h-3 text-amber-700 shrink-0" />
            Manual Booklet
          </span>
        );
      },
    },
    {
      key: "prefix",
      header: "Format & Next Sequence",
      cell: (row) => {
        const nextNum = row.next_number || row.starting_number || 1;
        const previewNumber =
          row.next_number_formatted ||
          `${row.prefix}${String(nextNum).padStart(4, "0")}${row.suffix || ""}`;

        return (
          <div className="flex items-center gap-2 py-1">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200/90 font-mono text-xs font-bold text-indigo-700 shadow-2xs tracking-wide">
                  {previewNumber}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenQuickFormat(row);
                  }}
                  title="Quick Edit Prefix & Postfix (No screen jumping)"
                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                <span>
                  Pre: <strong className="text-slate-700">{row.prefix}</strong>
                </span>
                {row.suffix ? (
                  <span>
                    · Post: <strong className="text-slate-700">{row.suffix}</strong>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "current_number",
      header: "Range & Usage",
      cell: (row) => {
        const isManual = row.series_mode === "MANUAL";
        const hasRange = isManual && row.end_number;

        return (
          <div className="flex flex-col gap-0.5">
            {isManual ? (
              hasRange ? (
                <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 w-fit">
                  #{row.starting_number} – #{row.end_number}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 w-fit">
                  Range Not Configured
                </span>
              )
            ) : null}

            {row.current_number > 0 ? (
              <span className="text-xs text-slate-600">
                Used: <strong className="font-mono text-slate-900">#{row.current_number}</strong>
                {row.last_used_formatted && (
                  <span className="font-mono text-slate-500 ml-1">
                    ({row.last_used_formatted})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-medium">0 vouchers issued</span>
            )}
          </div>
        );
      },
    },
    {
      key: "financial_year",
      header: "Fiscal Year",
      cell: (row) => (
        <span className="font-mono text-xs text-slate-600 font-medium">
          {row.financial_year}
        </span>
      ),
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
      label: "Configure Full Series",
      icon: <Settings2 className="w-3.5 h-3.5 text-indigo-600" />,
      onClick: (row) => handleOpenEdit(row),
    },
    {
      label: "Quick Edit Prefix / Postfix",
      icon: <Edit2 className="w-3.5 h-3.5 text-slate-600" />,
      onClick: (row) => handleOpenQuickFormat(row),
    },
    {
      label: "Use As Active Default",
      icon: <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />,
      onClick: (row) => handleSetDefault(row.id),
      hidden: (row) => Boolean(row.is_default),
    },
    {
      label: "Delete Range",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
      onClick: (row) => handleDeleteSeries(row.id),
      variant: "danger",
    },
  ];

  // Live computed voucher number in the Creation / Edit Drawer
  const livePreviewDoc = STANDARD_VOUCHERS.find((v) => v.code === docType);
  const livePreviewNumber = `${prefix || ""}${String(startingNum || 1).padStart(4, "0")}${
    suffix || ""
  }`;
  const selectedOfficeBranch = branchList.find((b) => b.id === issuingOfficeId);
  const selectedOfficeCode = selectedOfficeBranch?.code || "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Series Master"
        description="Unified sequence numbering engine: configure automatic sequence rules, prefixes, and physical batch booklets across branches."
        breadcrumbs={[
          { label: "Settings", href: "/settings/users" },
          { label: "Series Master" },
        ]}
        primaryAction={{
          label: "Add Series Range / Batch",
          icon: <Plus className="w-4 h-4" />,
          onClick: handleOpenCreate,
        }}
      />

      {/* Enterprise KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Configured Series"
          value={totalConfigured}
          subtext="Active system document sequences"
          icon={<Layers className="w-4 h-4" />}
        />
        <KpiCard
          title="Active Defaults"
          value={activeDefaults}
          subtext="Ready for direct voucher booking"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
        <KpiCard
          title="Manual Booklets"
          value={manualCount}
          subtext="Pre-printed manual paper ranges"
          icon={<FileText className="w-4 h-4 text-amber-600" />}
        />
        <KpiCard
          title="Branch Scope"
          value={activeBranchName}
          subtext="Operational issuing office"
          icon={<Building2 className="w-4 h-4 text-indigo-600" />}
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

      {/* Filters Bar & Quick Action */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL", label: `All Series (${seriesList.length})` },
            { id: "AUTOMATIC", label: "Automatic" },
            {
              id: "MANDATORY_MANUAL",
              label: `Manual Ranges (${
                seriesList.filter((s) => s.series_mode === "MANUAL" || s.is_mandatory_manual)
                  .length
              })`,
            },
            { id: "TRANSPORT", label: "Transport (JOB, LR, HC)" },
            { id: "BILLING", label: "Invoicing & Billing" },
            { id: "ACCOUNTS", label: "Accounting Vouchers" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterCategory(pill.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterCategory === pill.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Office Selector, Search & Import Defaults */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Office Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={filterOfficeId}
              onChange={(e) => {
                setFilterOfficeId(e.target.value);
                loadData(e.target.value);
              }}
              className="text-xs font-semibold text-slate-800 bg-transparent border-0 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Issuing Offices</option>
              {branchList.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code || `OFF${b.id}`})
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search series or prefix..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleInitializeDefaults}
            disabled={initializingDefaults}
            className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs shrink-0 rounded-xl"
            title="Import all 16 standard automatic voucher templates for this issuing office"
          >
            {initializingDefaults ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Import Default Templates
          </Button>
        </div>
      </div>

      {/* Unconfigured Office Warning Banner */}
      {!isLoading && filteredSeries.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                No Series Configured for{" "}
                {filterOfficeId !== "ALL"
                  ? branchList.find((b) => String(b.id) === filterOfficeId)?.name ||
                    "Selected Office"
                  : "Current Office"}
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Vouchers, LRs, and Challans cannot be booked or saved without an active series.
                Click <strong>&quot;Import Default Templates&quot;</strong> to set up all 16 standard
                automatic series with branch code prefixes.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleInitializeDefaults}
            disabled={initializingDefaults}
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 font-semibold text-xs rounded-xl"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Import Default Templates
          </Button>
        </div>
      )}

      {/* Main Series Table (Selectable = false removes useless checkboxes; stable column widths eliminate jumping) */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-xs">Loading series records and real voucher usage...</span>
        </div>
      ) : (
        <DataTable
          columns={seriesColumns}
          data={filteredSeries}
          actions={seriesActions}
          selectable={false}
          searchable={false}
          emptyMessage="No document series matching filter"
          emptySubtext="Click 'Add Series Range / Batch' to create a manual series booklet or verify default sequences."
        />
      )}

      {/* Quick Edit Format Modal (Isolated state: ZERO layout shifting or screen dancing!) */}
      {quickFormatSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Edit Sequence Prefix & Postfix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {STANDARD_VOUCHERS.find((v) => v.code === quickFormatSeries.document_type)
                    ?.name || quickFormatSeries.document_type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickFormatSeries(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickFormat} className="mt-4 space-y-4">
              {/* Real-time Voucher Number Preview */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/60 border border-indigo-200 flex flex-col gap-1">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-600">
                  Live Resulting Number Preview
                </span>
                <span className="text-xl font-mono font-extrabold text-indigo-900 tracking-wide">
                  {quickPrefix}
                  {String(
                    quickFormatSeries.next_number || quickFormatSeries.starting_number || 1
                  ).padStart(4, "0")}
                  {quickSuffix}
                </span>
              </div>

              {quickFormatError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{quickFormatError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Prefix <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickPrefix}
                  onChange={(e) => setQuickPrefix(e.target.value)}
                  placeholder="e.g. LR-2026- or GI-DEL-"
                  className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Postfix (Suffix) <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={quickSuffix}
                  onChange={(e) => setQuickSuffix(e.target.value)}
                  placeholder="e.g. -HO or /26"
                  className="w-full px-3 py-2 text-sm font-mono font-semibold rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuickFormatSeries(null)}
                  disabled={isSavingQuickFormat}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSavingQuickFormat}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  {isSavingQuickFormat ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    "Save Format"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Series Configure / Edit Workspace Drawer */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={
          editingSeries
            ? `Configure Series: ${
                STANDARD_VOUCHERS.find((v) => v.code === editingSeries.document_type)?.name ||
                editingSeries.document_type
              }`
            : "Create Document Numbering Series"
        }
        description="Configure custom sequence prefix/postfix, batch booklet range limits, and set active default series."
        width="lg"
      >
        <div className="space-y-6 pb-8">
          {/* Live Voucher Number Preview Hero Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-indigo-800/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Live Sequence Number Preview
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                {seriesMode === "AUTOMATIC" ? "Automatic Sequence" : "Manual Range Booklet"}
              </span>
            </div>

            {/* Generated Sequence Output */}
            <div className="text-2xl sm:text-3xl font-mono font-extrabold tracking-wider text-white py-1">
              {livePreviewNumber}
            </div>

            {/* Structural Breakdown Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-indigo-800/60 text-xs">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-indigo-100 font-mono text-[11px]">
                <span className="text-indigo-300 text-[10px]">Prefix:</span>
                <strong>{prefix || "(none)"}</strong>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-indigo-100 font-mono text-[11px]">
                <span className="text-indigo-300 text-[10px]">Start No:</span>
                <strong>{String(startingNum).padStart(4, "0")}</strong>
              </div>
              {suffix && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-indigo-100 font-mono text-[11px]">
                  <span className="text-indigo-300 text-[10px]">Suffix:</span>
                  <strong>{suffix}</strong>
                </div>
              )}
              <div className="ml-auto text-[11px] text-indigo-300 hidden sm:block">
                Applies to: <strong>{livePreviewDoc?.name || docType}</strong>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveSeries} className="space-y-6">
            {/* Section 1: Document & Scope */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                1. Document Type & Branch Scope
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Voucher Document Type */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Voucher / Document Type <span className="text-rose-600">*</span>
                  </label>
                  <SearchableSelect
                    value={docType}
                    onChange={(val) => handleDocTypeChange(String(val))}
                    options={STANDARD_VOUCHERS.map((v) => ({
                      value: v.code,
                      label: `${v.name} (${v.code}) — ${v.categoryLabel}`,
                    }))}
                    placeholder="Select or enter voucher type..."
                    searchPlaceholder="Search voucher type..."
                    disabled={!!editingSeries}
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {livePreviewDoc?.description ||
                      "Unified number sequence engine for this operational document."}
                  </span>
                </div>

                {/* Issuing Office */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Issuing Office / Branch
                  </label>
                  <select
                    value={issuingOfficeId || ""}
                    onChange={(e) =>
                      setIssuingOfficeId(e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="w-full h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  >
                    <option value="">-- All Offices (Global Default) --</option>
                    {branchList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code || `OFF${b.id}`})
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Sequence operates strictly within this issuing branch.
                  </span>
                </div>

                {/* Financial Year */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Financial Year <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={finYear}
                    onChange={(e) => setFinYear(e.target.value)}
                    placeholder="2026-2027"
                    className="w-full h-9 px-3 text-xs font-mono font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Numbering Mode */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                2. Numbering Mode
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSeriesMode("AUTOMATIC")}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    seriesMode === "AUTOMATIC"
                      ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">Automatic Sequence</span>
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-[11px] text-slate-600 block leading-relaxed">
                    Auto-increments consecutive numbers (1, 2, 3...) upon voucher creation.
                    Tamper-proof and sequential.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSeriesMode("MANUAL")}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    seriesMode === "MANUAL"
                      ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">Manual Batch Booklet</span>
                    <Edit2 className="w-4 h-4 text-amber-700" />
                  </div>
                  <span className="text-[11px] text-slate-600 block leading-relaxed">
                    Define start and end range for physical pre-printed books. Users select leaves
                    from this batch.
                  </span>
                </button>
              </div>
            </div>

            {/* Section 3: Sequence Pattern & Prefix Rules */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-600" />
                3. Prefix & Postfix Configuration
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Sequence Prefix <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="e.g. LR-2026- or GI-DEL-"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                  {/* Smart helper chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[11px] text-slate-400">Append:</span>
                    <button
                      type="button"
                      onClick={() => handleAppendPrefixTag("2026-")}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      + 2026-
                    </button>
                    {selectedOfficeCode && (
                      <button
                        type="button"
                        onClick={() => handleAppendPrefixTag(`${selectedOfficeCode}-`)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        + {selectedOfficeCode}-
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleResetToStandardPrefix}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                    >
                      Reset Standard
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Sequence Postfix (Suffix)
                  </label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="e.g. -HO or /26 (optional)"
                    className="w-full px-3 py-2 text-xs font-mono font-semibold rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Optional suffix tag appended to the end of voucher numbers.
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4: Range & Booklet Limits */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                4. Sequence Range & Booklet Limits
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Range Starting Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={startingNum}
                    onChange={(e) => setStartingNum(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    placeholder="e.g. 1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Range Ending Number{" "}
                    <span className="text-slate-400 font-normal">
                      ({seriesMode === "MANUAL" ? "Required for batch" : "Optional"})
                    </span>
                  </label>
                  <input
                    type="number"
                    min={startingNum}
                    value={endNum ?? ""}
                    onChange={(e) =>
                      setEndNum(e.target.value ? parseInt(e.target.value, 10) : undefined)
                    }
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    placeholder="e.g. 1000"
                  />
                  {seriesMode === "MANUAL" && endNum && endNum >= startingNum && (
                    <span className="text-[11px] text-emerald-700 mt-1 block font-medium">
                      Total {endNum - startingNum + 1} physical leaves configured in this booklet.
                    </span>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Series Range / Booklet Label{" "}
                    <span className="text-slate-400 font-normal">(Optional Description)</span>
                  </label>
                  <input
                    type="text"
                    value={seriesName}
                    onChange={(e) => setSeriesName(e.target.value)}
                    placeholder="e.g. Delhi Counter Book #1, Market Fleet Booklet"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Distinguishes physical booklets when dispatchers pick from series options.
                  </span>
                </div>
              </div>
            </div>

            {/* Section 5: Default & Status Configuration */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-start gap-3 shadow-2xs">
              <input
                type="checkbox"
                id="isDefaultSeries"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="flex-1">
                <label
                  htmlFor="isDefaultSeries"
                  className="text-xs font-bold text-indigo-950 block cursor-pointer"
                >
                  Set as Active Default Series for {livePreviewDoc?.name || docType}
                </label>
                <span className="text-[11px] text-indigo-800/80 block mt-0.5 leading-relaxed">
                  When users book new {livePreviewDoc?.name || docType} vouchers under this branch,
                  this series will be selected automatically.
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDrawerOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Series Range"
                )}
              </Button>
            </div>
          </form>
        </div>
      </EntityDrawer>
    </div>
  );
}
