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
  ShieldAlert,
  Edit2,
  Check,
  Star,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef, RowAction } from "@/types/table";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { apiClient } from "@/lib/api-client";

interface SeriesMasterItem {
  id: number;
  category_id?: number | null;
  category_name?: string | null;
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
  // 2. Billing & Invoicing
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Inline Row Edits state: { [seriesId]: { prefix: string, suffix: string } }
  const [inlineEdits, setInlineEdits] = useState<Record<number, { prefix: string; suffix: string }>>({});
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [savedRowId, setSavedRowId] = useState<number | null>(null);

  // Drawer / Form states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<SeriesMasterItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [initializingDefaults, setInitializingDefaults] = useState(false);

  // Form Fields
  const [docType, setDocType] = useState("LR");
  const [seriesName, setSeriesName] = useState("");
  const [prefix, setPrefix] = useState("LR-2026-");
  const [suffix, setSuffix] = useState("");
  const [startingNum, setStartingNum] = useState(1);
  const [endNum, setEndNum] = useState<number | undefined>(undefined);
  const [currentNum, setCurrentNum] = useState(0);
  const [finYear, setFinYear] = useState("2026-2027");
  const [seriesMode, setSeriesMode] = useState<"AUTOMATIC" | "MANUAL">("MANUAL");
  const [isDefault, setIsDefault] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<number | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);

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
    setSeriesName("");
    setPrefix("LR-2026-");
    setSuffix("");
    setStartingNum(1001);
    setEndNum(1200);
    setCurrentNum(0);
    setFinYear("2026-2027");
    setSeriesMode("MANUAL");
    setIsDefault(true);
    setIsActive(true);
    setSelectedCatId(undefined);
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

  const isSelectedMandatoryManual = useMemo(() => {
    const raw = docType.toUpperCase().trim();
    return ["LR", "HIRE_CHALLAN", "HC", "TRANSPORT_INVOICE", "GENERAL_INVOICE"].includes(raw);
  }, [docType]);

  const handleSaveSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const mode = isSelectedMandatoryManual ? "MANUAL" : seriesMode;
      const payload = {
        document_type: docType,
        series_name: seriesName.trim() || null,
        prefix: prefix.trim(),
        suffix: suffix ? suffix.trim() : "",
        starting_number: startingNum,
        current_number: currentNum,
        end_number: endNum ? Number(endNum) : null,
        financial_year: finYear,
        series_mode: mode,
        is_default: Boolean(isDefault),
        category_id: selectedCatId || null,
        is_active: isActive,
      };

      if (editingSeries) {
        await apiClient(`/api/v1/settings/series/${editingSeries.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`Series range for ${docType} updated successfully.`);
      } else {
        await apiClient("/api/v1/settings/series", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`New series range for ${docType} added successfully.`);
      }

      setIsDrawerOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save series master.");
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
      setSuccessMessage("Series set as current active series.");
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
      const res = await apiClient<any>("/api/v1/settings/series/initialize", {
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

  // Inline Prefix / Postfix configuration from table row
  const handleInlineChange = (id: number, field: "prefix" | "suffix", value: string, defaultRow: SeriesMasterItem) => {
    setInlineEdits((prev) => ({
      ...prev,
      [id]: {
        prefix: field === "prefix" ? value : (prev[id]?.prefix ?? defaultRow.prefix),
        suffix: field === "suffix" ? value : (prev[id]?.suffix ?? (defaultRow.suffix || "")),
      },
    }));
  };

  const handleSaveInline = async (seriesId: number) => {
    const row = seriesList.find((s) => s.id === seriesId);
    if (!row) return;
    const edit = inlineEdits[seriesId];
    if (!edit) return;

    setSavingRowId(seriesId);
    setError(null);
    try {
      const updated = await apiClient<SeriesMasterItem>(`/api/v1/settings/series/${seriesId}`, {
        method: "PUT",
        body: JSON.stringify({
          prefix: edit.prefix.trim(),
          suffix: edit.suffix.trim(),
        }),
      });
      setSeriesList((prev) => prev.map((s) => (s.id === seriesId ? { ...s, ...updated } : s)));
      setInlineEdits((prev) => {
        const copy = { ...prev };
        delete copy[seriesId];
        return copy;
      });
      setSavedRowId(seriesId);
      setTimeout(() => setSavedRowId((curr) => (curr === seriesId ? null : curr)), 2500);
      setSuccessMessage(`Prefix / Postfix saved for ${row.document_type}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update series prefix / postfix.");
    } finally {
      setSavingRowId(null);
    }
  };

  // Filtered series list
  const filteredSeries = useMemo(() => {
    return seriesList.filter((item) => {
      const doc = item.document_type.toUpperCase();
      if (filterCategory === "MANDATORY_MANUAL") {
        if (!item.is_mandatory_manual) return false;
      } else if (filterCategory === "AUTOMATIC") {
        if (item.series_mode !== "AUTOMATIC") return false;
      } else if (filterCategory === "TRANSPORT") {
        if (!["JOB", "LR", "HIRE_CHALLAN", "HC"].includes(doc)) return false;
      } else if (filterCategory === "BILLING") {
        if (!["TRANSPORT_INVOICE", "GENERAL_INVOICE", "PROFORMA_INVOICE"].includes(doc))
          return false;
      } else if (filterCategory === "ACCOUNTS") {
        if (["JOB", "LR", "HIRE_CHALLAN", "HC", "TRANSPORT_INVOICE", "GENERAL_INVOICE", "PROFORMA_INVOICE"].includes(doc))
          return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDoc = item.document_type.toLowerCase().includes(q);
        const matchesName = (item.series_name || "").toLowerCase().includes(q);
        const matchesPrefix = item.prefix.toLowerCase().includes(q);
        const matchesSuffix = (item.suffix || "").toLowerCase().includes(q);
        const matchesCategory = (item.category_name || "").toLowerCase().includes(q);
        if (!matchesDoc && !matchesName && !matchesPrefix && !matchesSuffix && !matchesCategory) return false;
      }

      return true;
    });
  }, [seriesList, filterCategory, searchQuery]);

  const seriesColumns: ColumnDef<SeriesMasterItem>[] = [
    {
      key: "document_type",
      header: "Voucher / Series Range",
      sortable: true,
      cell: (row) => {
        const std = STANDARD_VOUCHERS.find(
          (v) => v.code === row.document_type || v.code === row.document_type.toUpperCase()
        );
        const displayName = std?.name || row.document_type.replace(/_/g, " ");

        return (
          <div className="flex flex-col gap-1 py-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-xs text-[#172033]">{displayName}</span>
              {row.is_default && (
                <span
                  title="Currently active series selected by default when creating vouchers"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                >
                  <Star className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" />
                  Active As Of Now
                </span>
              )}
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
              <span className="font-mono font-semibold text-slate-700">{row.document_type}</span>
              {row.series_name && (
                <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium text-[10px] border border-indigo-200">
                  {row.series_name}
                </span>
              )}
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
        if (row.series_mode === "AUTOMATIC") {
          return (
            <Badge variant="success" className="gap-1 font-semibold text-[11px]">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Automatic
            </Badge>
          );
        }
        return (
          <Badge variant="warning" className="gap-1 font-semibold text-[11px]">
            <Edit2 className="w-3 h-3 text-amber-700" />
            Manual Range
          </Badge>
        );
      },
    },
    {
      key: "prefix",
      header: "Configured Prefix & Postfix",
      cell: (row) => {
        const currentPrefix = inlineEdits[row.id]?.prefix ?? row.prefix;
        const currentSuffix = inlineEdits[row.id]?.suffix ?? (row.suffix || "");
        const isModified =
          inlineEdits[row.id] !== undefined &&
          (inlineEdits[row.id].prefix !== row.prefix || inlineEdits[row.id].suffix !== (row.suffix || ""));
        const isSaving = savingRowId === row.id;
        const isSaved = savedRowId === row.id;

        return (
          <div className="flex items-center gap-1.5 py-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <input
                type="text"
                value={currentPrefix}
                onChange={(e) => handleInlineChange(row.id, "prefix", e.target.value, row)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveInline(row.id);
                }}
                placeholder="Prefix"
                title="Configure Prefix directly from list"
                className="w-28 sm:w-32 px-2 py-1 text-xs font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[10px] font-mono text-slate-400 font-semibold px-0.5">#</span>
              <input
                type="text"
                value={currentSuffix}
                onChange={(e) => handleInlineChange(row.id, "suffix", e.target.value, row)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveInline(row.id);
                }}
                placeholder="Postfix"
                title="Configure Postfix directly from list"
                className="w-20 sm:w-24 px-2 py-1 text-xs font-mono font-medium text-slate-700 bg-white border border-slate-300 rounded shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {isSaving ? (
              <span className="p-1 text-indigo-600">
                <Loader2 className="w-4 h-4 animate-spin" />
              </span>
            ) : isSaved ? (
              <span className="p-1 text-emerald-600 font-semibold text-xs flex items-center gap-1 bg-emerald-50 rounded border border-emerald-200 px-1.5 py-0.5">
                <Check className="w-3.5 h-3.5" />
                <span className="text-[10px]">Saved</span>
              </span>
            ) : isModified ? (
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => handleSaveInline(row.id)}
                className="h-7 px-2 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
              >
                Save
              </Button>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "current_number",
      header: "Batch Range / Used Till",
      align: "left",
      sortable: true,
      cell: (row) => {
        const isManual = row.series_mode === "MANUAL";
        const hasRange = isManual && row.end_number;

        return (
          <div className="flex flex-col gap-0.5">
            {hasRange ? (
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-800">
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px]">
                  Batch #{row.starting_number} – #{row.end_number}
                </span>
              </div>
            ) : null}

            {row.last_used_formatted && row.current_number > 0 ? (
              <span className="font-mono text-[11px] text-slate-600">
                Last Used: <strong className="text-slate-900">{row.last_used_formatted}</strong> (#{row.current_number})
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-medium italic">
                Not used yet (0 vouchers)
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "next_number_formatted",
      header: "Next Series Number",
      cell: (row) => {
        const currentPrefix = inlineEdits[row.id]?.prefix ?? row.prefix;
        const currentSuffix = inlineEdits[row.id]?.suffix ?? (row.suffix || "");
        const nextNum = row.next_number || (row.starting_number || 1);
        const previewNumber = `${currentPrefix}${String(nextNum).padStart(4, "0")}${currentSuffix}`;

        return (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 font-mono text-xs font-bold text-indigo-700 shadow-2xs">
              {previewNumber}
            </span>
          </div>
        );
      },
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
      label: "Use As Active Now",
      icon: <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />,
      onClick: (row) => handleSetDefault(row.id),
      hidden: (row) => Boolean(row.is_default),
    },
    {
      label: "Edit Configuration",
      icon: <Edit2 className="w-3.5 h-3.5" />,
      onClick: (row) => handleOpenEdit(row),
    },
    {
      label: "Delete Range",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
      onClick: (row) => handleDeleteSeries(row.id),
      variant: "danger",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Series Master"
        description="Unified sequence numbering engine: configure custom batch ranges, booklets, prefix/postfix, and set active series for manual & automatic vouchers."
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL", label: `All Series (${seriesList.length})` },
            {
              id: "MANDATORY_MANUAL",
              label: `Manual Ranges (${seriesList.filter((s) => s.series_mode === "MANUAL" || s.is_mandatory_manual).length})`,
            },
            { id: "TRANSPORT", label: "Transport (JOB, LR, HC)" },
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

        {/* Right side: Search & Reset Defaults */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search series or prefix..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleInitializeDefaults}
            disabled={initializingDefaults}
            className="gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 shrink-0"
            title="Ensure standard document series exist in catalog"
          >
            {initializingDefaults ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            )}
            Verify / Seed Defaults
          </Button>
        </div>
      </div>

      {/* Main Series Table */}
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
          emptyMessage="No document series matching filter"
          emptySubtext="Click 'Add Series Range / Batch' to create a manual series booklet or verify default sequences."
        />
      )}

      {/* Series Configure / Edit Drawer */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingSeries ? `Edit Series: ${editingSeries.document_type}` : "Add Document Series Range / Batch"}
        description="Configure batch range limits (start & end number), custom prefix, and optionally set as the active series."
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
                  label: `${v.name} (${v.code}) — ${v.categoryLabel}${v.isMandatoryManual ? " [Manual Range]" : ""}`,
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

            {/* Series Mode Selection */}
            {isSelectedMandatoryManual ? (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Manual Series Range Workflow Enforced</span>
                  <span>
                    LR, HC, General Invoice, and Transport Invoice operate on manual batch ranges. You can configure multiple series ranges/booklets with custom prefixes.
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
                    onClick={() => setSeriesMode("MANUAL")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      seriesMode === "MANUAL"
                        ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#172033]">Manual Batch Range</span>
                      <Edit2 className="w-4 h-4 text-amber-700" />
                    </div>
                    <span className="text-[11px] text-[#667085] block">
                      Define batch start and end range. Users select this series and pick available unused numbers when creating vouchers.
                    </span>
                  </button>

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
                      <span className="font-bold text-xs text-[#172033]">Automatic Series</span>
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-[11px] text-[#667085] block">
                      Sequence increments automatically (1, 2, 3...) and voucher number is non-editable.
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Series Batch Name (e.g. Delhi Booklet #1) */}
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                Series Range / Booklet Name <span className="text-slate-400 font-normal">(Optional Label)</span>
              </label>
              <input
                type="text"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                placeholder="e.g. Delhi Branch Book #1, Market Fleet Book, South Region"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-[#667085] mt-1 block">
                Helps dispatchers identify this batch range when selecting from the series list during voucher creation.
              </span>
            </div>

            {/* Custom Prefix & Postfix Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                  Custom Prefix <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="e.g. LR-DEL- or HC-MUM-"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                  Custom Postfix (Suffix)
                </label>
                <input
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder="e.g. -HO or /26 (optional)"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Batch Range: Start & End Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                  Range Start Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={startingNum}
                  onChange={(e) => setStartingNum(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. 1001"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                  Range End Number <span className="text-slate-400 font-normal">({seriesMode === "MANUAL" ? "Required for batch" : "Optional"})</span>
                </label>
                <input
                  type="number"
                  min={startingNum}
                  value={endNum ?? ""}
                  onChange={(e) => setEndNum(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. 1200"
                />
                <span className="text-[11px] text-[#667085] mt-1 block">
                  Defines the upper bound of available leaves/numbers in this booklet.
                </span>
              </div>
            </div>

            {/* Use as of now (Default Series Option) */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-start gap-3">
              <input
                type="checkbox"
                id="isDefaultSeries"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div>
                <label htmlFor="isDefaultSeries" className="text-xs font-bold text-indigo-950 block cursor-pointer">
                  Use this series as of now (Set as Active Default Series)
                </label>
                <span className="text-[11px] text-indigo-800/80 block mt-0.5">
                  When creating new {docType} vouchers, this series will be pre-selected automatically so the user can stick to this booklet for the time being.
                </span>
              </div>
            </div>

            {/* Financial Year */}
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                Financial Year <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={finYear}
                onChange={(e) => setFinYear(e.target.value)}
                placeholder="2026-2027"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDrawerOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
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
