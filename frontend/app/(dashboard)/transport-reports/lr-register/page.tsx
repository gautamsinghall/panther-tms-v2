"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Download,
  Printer,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ArrowUpDown,
  Calendar,
  X,
  ExternalLink,
  AlertCircle,
  FileText,
  Truck,
  Wallet,
  Scale,
  Filter,
  FileSpreadsheet,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { LRViewModal, LRViewRecord } from "@/components/modals/lr-view-modal";
import { Button } from "@/components/ui/button";

// ------------------------------------------------------------------------------
// Types & Column Definitions
// ------------------------------------------------------------------------------

export interface LRRegisterRow {
  id: number;
  lr_number: string;
  lr_date?: string | null;
  consigner_name?: string | null;
  consignee_name?: string | null;
  origin_city?: string | null;
  destination_city?: string | null;
  vehicle_number: string;
  package_count?: number;
  actual_weight_mt?: string | number;
  chargeable_weight_mt?: string | number;
  freight_rate?: string | number;
  freight_amount?: string | number;
  total_freight_amount: string | number;
  advance_amount: string | number;
  balance_amount: string | number;
  status: string;
  issuing_office_name?: string | null;
  booking_status?: string | null;
  client_name?: string | null;
  party_invoice_no?: string | null;
  site_from?: string | null;
  site_to?: string | null;
  eway_bill_number?: string | null;
  payment_terms?: string | null;
  payment_type?: string | null;
  vehicle_type?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
}

interface CustomerOption {
  id: number;
  name: string;
}

interface ColumnConfig {
  key: keyof LRRegisterRow;
  label: string;
  defaultVisible: boolean;
  align?: "left" | "right" | "center";
  minWidth?: string;
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: "lr_number", label: "GR / LR No.", defaultVisible: true, minWidth: "130px" },
  { key: "lr_date", label: "Date", defaultVisible: true, minWidth: "110px" },
  { key: "issuing_office_name", label: "Issuing Office", defaultVisible: true, minWidth: "120px" },
  { key: "booking_status", label: "Status", defaultVisible: true, minWidth: "100px" },
  { key: "client_name", label: "Customer", defaultVisible: true, minWidth: "200px" },
  { key: "vehicle_number", label: "Vehicle No.", defaultVisible: true, minWidth: "120px" },
  { key: "site_from", label: "Origin", defaultVisible: true, minWidth: "140px" },
  { key: "site_to", label: "Destination", defaultVisible: true, minWidth: "140px" },
  { key: "balance_amount", label: "Balance", defaultVisible: true, align: "right", minWidth: "100px" },
  // Preserved additional report columns (toggleable via Columns dropdown)
  { key: "consigner_name", label: "Consigner", defaultVisible: false, minWidth: "180px" },
  { key: "consignee_name", label: "Consignee", defaultVisible: false, minWidth: "180px" },
  { key: "party_invoice_no", label: "Party Invoice No.", defaultVisible: false, minWidth: "140px" },
  { key: "package_count", label: "Pkgs", defaultVisible: false, align: "right", minWidth: "80px" },
  { key: "actual_weight_mt", label: "Weight (MT)", defaultVisible: false, align: "right", minWidth: "110px" },
  { key: "total_freight_amount", label: "Freight Amount", defaultVisible: false, align: "right", minWidth: "120px" },
  { key: "advance_amount", label: "Advance", defaultVisible: false, align: "right", minWidth: "110px" },
  { key: "eway_bill_number", label: "E-Way Bill No", defaultVisible: false, minWidth: "130px" },
  { key: "payment_terms", label: "Payment Terms", defaultVisible: false, minWidth: "110px" },
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Helper: Format YYYY-MM-DD or DD-MM-YYYY to DD MMM YYYY (e.g. 06 Oct 2026)
function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const trimmed = String(dateStr).trim();
  const isoParts = trimmed.split("T")[0].split("-");
  if (isoParts.length === 3 && isoParts[0].length === 4) {
    const year = isoParts[0];
    const monthIdx = parseInt(isoParts[1], 10) - 1;
    const day = isoParts[2].padStart(2, "0");
    const month = MONTH_NAMES[monthIdx] || isoParts[1];
    return `${day} ${month} ${year}`;
  }
  const parts = trimmed.split("-");
  if (parts.length === 3 && parts[2].length === 4) {
    const day = parts[0].padStart(2, "0");
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[2];
    const month = MONTH_NAMES[monthIdx] || parts[1];
    return `${day} ${month} ${year}`;
  }
  return dateStr;
}

// Helper: Format location string "City(State)" to "City, State"
function formatLocation(loc?: string | null): string {
  if (!loc) return "-";
  const str = String(loc).trim();
  const match = str.match(/^(.*?)\((.*?)\)$/);
  if (match) {
    return `${match[1].trim()}, ${match[2].trim()}`;
  }
  return str;
}

// Helper: Format office name (e.g. "HEAD OFFICE-DELHI" -> "Delhi")
function formatOfficeName(name?: string | null): string {
  if (!name) return "Delhi";
  const cleaned = name.replace(/^HEAD OFFICE[\s\-_:]*/i, "").trim();
  if (!cleaned) return name;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

// Compute Indian Financial Year: 01-04-YYYY to current date
function getDefaultFinancialYearDates() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

  const fromDate = `${fyStartYear}-04-01`;
  const toMonth = String(now.getMonth() + 1).padStart(2, "0");
  const toDay = String(now.getDate()).padStart(2, "0");
  const toDate = `${currentYear}-${toMonth}-${toDay}`;

  return { fromDate, toDate };
}

export default function LRRegisterPage() {
  const defaultDates = useMemo(() => getDefaultFinancialYearDates(), []);
  const [fromDate, setFromDate] = useState<string>(defaultDates.fromDate);
  const [toDate, setToDate] = useState<string>(defaultDates.toDate);
  const [appliedFromDate, setAppliedFromDate] = useState<string>(defaultDates.fromDate);
  const [appliedToDate, setAppliedToDate] = useState<string>(defaultDates.toDate);

  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  const [data, setData] = useState<LRRegisterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  // Search & Sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<keyof LRRegisterRow>("lr_number");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    AVAILABLE_COLUMNS.forEach((col) => {
      initial[col.key] = col.defaultVisible;
    });
    return initial;
  });
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  // Table Horizontal Scroll & Column Slider State
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rafScrollRef = useRef<number | null>(null);
  const [canScrollHorizontally, setCanScrollHorizontally] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScrollLeft, setMaxScrollLeft] = useState(0);

  // Full LR Consignment Note View Modal (Matching Reference UI)
  const [selectedLrForView, setSelectedLrForView] = useState<LRViewRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleOpenLRView = async (row: LRRegisterRow) => {
    try {
      const full = await apiClient<any>(`/api/v1/transport/lrs/${row.id}`);
      setSelectedLrForView(full || (row as any));
    } catch {
      setSelectedLrForView(row as any);
    }
    setIsViewModalOpen(true);
  };

  // Close column menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(event.target as Node)) {
        setIsColMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Fetch Customers List for Dropdown
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await apiClient<any[]>("/api/v1/general/billing-clients");
        if (Array.isArray(res)) {
          const list: CustomerOption[] = res.map((c) => ({
            id: c.id,
            name: c.name || c.company_name || `Client #${c.id}`,
          }));
          setCustomers(list);
        }
      } catch {
        // Fallback silently if restricted
      }
    };
    loadCustomers();
  }, []);

  // 2. Fetch LR Register Data from Backend
  const loadData = async (fDate = fromDate, tDate = toDate, custId = selectedCustomer) => {
    if (fDate && tDate && fDate > tDate) {
      setDateValidationError("From Date cannot be later than To Date.");
      return;
    }
    setDateValidationError(null);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      if (fDate) params.append("from_date", fDate);
      if (tDate) params.append("to_date", tDate);
      if (custId) params.append("customer_id", custId);

      const qs = params.toString();
      const endpoint = `/api/v1/transport-reports/lr-register${qs ? `?${qs}` : ""}`;
      const res = await apiClient<LRRegisterRow[]>(endpoint);
      setData(Array.isArray(res) ? res : []);
      setAppliedFromDate(fDate);
      setAppliedToDate(tDate);
      setCurrentPage(1);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load LR register from server.");
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData(defaultDates.fromDate, defaultDates.toDate, "");
  }, []);

  // Handle Filter Submit Button
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    loadData(fromDate, toDate, selectedCustomer);
  };

  // Reset all filters to default financial year
  const handleResetFilters = () => {
    setFromDate(defaultDates.fromDate);
    setToDate(defaultDates.toDate);
    setSelectedCustomer("");
    setDateValidationError(null);
    setSearchTerm("");
    setCurrentPage(1);
    loadData(defaultDates.fromDate, defaultDates.toDate, "");
    toast.success("Filters reset to default reporting period");
  };

  // Toggle Column Visibility
  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleResetColumns = () => {
    const reset: Record<string, boolean> = {};
    AVAILABLE_COLUMNS.forEach((col) => {
      reset[col.key] = col.defaultVisible;
    });
    setVisibleColumns(reset);
  };

  const handleSelectAllColumns = () => {
    const all: Record<string, boolean> = {};
    AVAILABLE_COLUMNS.forEach((col) => {
      all[col.key] = true;
    });
    setVisibleColumns(all);
  };

  // Handle Sort
  const handleSort = (key: keyof LRRegisterRow) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  // Search filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase().trim();

    return data.filter((row) => {
      return (
        String(row.lr_number || "").toLowerCase().includes(term) ||
        String(row.client_name || "").toLowerCase().includes(term) ||
        String(row.consigner_name || "").toLowerCase().includes(term) ||
        String(row.consignee_name || "").toLowerCase().includes(term) ||
        String(row.vehicle_number || "").toLowerCase().includes(term) ||
        String(row.party_invoice_no || "").toLowerCase().includes(term) ||
        String(row.site_from || "").toLowerCase().includes(term) ||
        String(row.site_to || "").toLowerCase().includes(term) ||
        String(row.issuing_office_name || "").toLowerCase().includes(term) ||
        String(row.booking_status || "").toLowerCase().includes(term) ||
        String(row.eway_bill_number || "").toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm]);

  // Sorting
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortOrder]);

  // Totals calculated from actual filtered report data
  const totals = useMemo(() => {
    let weight = 0;
    let pkgs = 0;
    let freight = 0;
    let advance = 0;
    let balance = 0;

    filteredData.forEach((row) => {
      weight += Number(row.actual_weight_mt) || 0;
      pkgs += Number(row.package_count) || 0;
      freight += Number(row.total_freight_amount) || 0;
      advance += Number(row.advance_amount) || 0;
      balance += Number(row.balance_amount) || 0;
    });

    return {
      count: filteredData.length,
      weight,
      pkgs,
      freight,
      advance,
      balance,
    };
  }, [filteredData]);

  // Pagination
  const totalEntries = sortedData.length;
  const isShowAll = pageSize === -1 || pageSize >= totalEntries;
  const totalPages = isShowAll ? 1 : Math.ceil(totalEntries / pageSize) || 1;
  const currentPageSafe = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedData = useMemo(() => {
    if (isShowAll) return sortedData;
    const startIndex = (currentPageSafe - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPageSafe, pageSize, isShowAll]);

  const startIndexDisplay = totalEntries === 0 ? 0 : (currentPageSafe - 1) * (pageSize === -1 ? totalEntries : pageSize) + 1;
  const endIndexDisplay = isShowAll ? totalEntries : Math.min(currentPageSafe * pageSize, totalEntries);

  // Horizontal Scroll calculation & sync for Column Slider
  const checkScrollable = useCallback(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 4;
    setCanScrollHorizontally(hasOverflow);
    setMaxScrollLeft(Math.max(0, el.scrollWidth - el.clientWidth));
    setScrollPosition(el.scrollLeft);
  }, []);

  useEffect(() => {
    checkScrollable();
    const el = tableContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (rafScrollRef.current) cancelAnimationFrame(rafScrollRef.current);
      rafScrollRef.current = requestAnimationFrame(() => {
        if (tableContainerRef.current) {
          setScrollPosition(tableContainerRef.current.scrollLeft);
        }
      });
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", checkScrollable);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        checkScrollable();
      });
      resizeObserver.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", checkScrollable);
      if (resizeObserver) resizeObserver.disconnect();
      if (rafScrollRef.current) cancelAnimationFrame(rafScrollRef.current);
    };
  }, [checkScrollable, visibleColumns, paginatedData, data]);

  const handleScrollBy = (offset: number) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handleSliderChange = (newVal: number) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = newVal;
    }
    if (rafScrollRef.current) cancelAnimationFrame(rafScrollRef.current);
    rafScrollRef.current = requestAnimationFrame(() => {
      setScrollPosition(newVal);
    });
  };

  // Export to Excel / CSV with UTF-8 BOM
  const handleExportExcel = () => {
    if (sortedData.length === 0) {
      toast.error("No records to export.");
      return;
    }

    const activeCols = AVAILABLE_COLUMNS.filter((col) => visibleColumns[col.key]);
    const headers = activeCols.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");

    const rows = sortedData.map((row) => {
      return activeCols
        .map((c) => {
          let val = row[c.key];
          if (c.key === "lr_date") val = formatDateDisplay(val as string);
          if (c.key === "site_from" || c.key === "site_to") val = formatLocation(val as string);
          if (c.key === "issuing_office_name") val = formatOfficeName(val as string);
          if (val === null || val === undefined) val = "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",");
    });

    const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `LR_Booking_Register_${appliedFromDate}_to_${appliedToDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sortedData.length} records to Excel/CSV`);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 print:p-0 print:m-0 font-sans">
      {/* ---------------------------------------------------------------------- */}
      {/* 1. Header Section (Matching reference UI)                              */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex flex-col gap-2.5 print:hidden">
        {/* Breadcrumb Bar */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
          <Link href="/" className="hover:text-slate-200 transition-colors">
            Dashboard
          </Link>
          <span className="text-slate-600">›</span>
          <Link href="/transport-reports" className="hover:text-slate-200 transition-colors">
            Transport Reports
          </Link>
          <span className="text-slate-600">›</span>
          <span className="text-slate-200 font-semibold">LR Booking Register</span>
        </nav>

        {/* Title, Date Pill, Description, and Refresh Action */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              LR Booking Register
            </h1>

            {/* Reporting Period Badge */}
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F1F3F6] dark:bg-[#15161D] border border-slate-200 dark:border-[#272835] text-xs font-medium text-slate-700 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <span>
                {formatDateDisplay(appliedFromDate)} – {formatDateDisplay(appliedToDate)}
              </span>
            </div>

            {/* Muted Subtitle */}
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-2">
              Manage and review LR bookings, freight and balances.
            </p>
          </div>

          {/* Top-Right Secondary Action: Refresh Register */}
          <div className="shrink-0 pt-0.5">
            <Button
              variant="outline"
              size="md"
              onClick={() => loadData(fromDate, toDate, selectedCustomer)}
              disabled={isLoading}
              isLoading={isLoading}
              icon={<RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />}
            >
              Refresh Register
            </Button>
          </div>
        </div>
      </div>

      {/* Printable Title (Print only) */}
      <div className="hidden print:block mb-4 pb-2 border-b border-black">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          LR BOOKING REGISTER
        </h1>
        <p className="text-xs text-gray-700 mt-1">
          Period: {formatDateDisplay(appliedFromDate)} – {formatDateDisplay(appliedToDate)} | Total Bookings: {totalEntries}
        </p>
      </div>

      {/* Date Validation Alert Banner */}
      {dateValidationError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium flex items-center gap-2 print:hidden">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{dateValidationError}</span>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(fromDate, toDate, selectedCustomer)}
            className="border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300"
          >
            Retry
          </Button>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Unified Filter Section (Matching Reference Image)                   */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-[#121319] rounded-xl border border-slate-200 dark:border-[#22232E] p-4 shadow-sm print:hidden">
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-3 sm:gap-4">
          {/* From Date Filter */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              From Date
            </label>
            <div className="relative flex items-center h-10 w-44 sm:w-48 bg-slate-50 dark:bg-[#0D0E12] border border-slate-200 dark:border-[#2B2C37] rounded-xl px-3 hover:border-slate-300 dark:hover:border-[#3D3E4E] transition-colors focus-within:border-[#635BFF] focus-within:ring-1 focus-within:ring-[#635BFF]">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0 mr-2.5 pointer-events-none" />
              <span className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium select-none truncate">
                {formatDateDisplay(fromDate) || "Select Date"}
              </span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDateValidationError(null);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
          </div>

          {/* To Date Filter */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              To Date
            </label>
            <div className="relative flex items-center h-10 w-44 sm:w-48 bg-slate-50 dark:bg-[#0D0E12] border border-slate-200 dark:border-[#2B2C37] rounded-xl px-3 hover:border-slate-300 dark:hover:border-[#3D3E4E] transition-colors focus-within:border-[#635BFF] focus-within:ring-1 focus-within:ring-[#635BFF]">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0 mr-2.5 pointer-events-none" />
              <span className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium select-none truncate">
                {formatDateDisplay(toDate) || "Select Date"}
              </span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDateValidationError(null);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
          </div>

          {/* Customer Selection */}
          <div className="flex flex-col space-y-1.5 flex-1 min-w-[200px] max-w-sm">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Customer
            </label>
            <div className="relative">
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full h-10 appearance-none px-3.5 pr-8 text-xs sm:text-sm bg-slate-50 dark:bg-[#0D0E12] border border-slate-200 dark:border-[#2B2C37] rounded-xl text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-[#3D3E4E] focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF] transition-colors cursor-pointer"
              >
                <option value="">All Customers</option>
                {customers.map((c) => (
                  <option key={c.id} value={String(c.id)} className="bg-white dark:bg-[#121319] text-slate-900 dark:text-white">
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Action Buttons: Reset & Apply Filters */}
          <div className="flex items-center gap-2.5 ml-auto">
            {/* Neutral Outlined Reset Button */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleResetFilters}
              disabled={isLoading || isSubmitting}
            >
              Reset
            </Button>

            {/* Primary Violet Apply Filters Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting || isLoading}
              isLoading={isSubmitting}
              icon={isSubmitting ? undefined : <Filter className="w-4 h-4 text-white" />}
            >
              Apply Filters
            </Button>
          </div>
        </form>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. Summary KPI Cards (Matching Reference Dimensions & Icons)           */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 print:grid-cols-5 print:gap-2">
        {/* 1. Total Bookings */}
        <div className="bg-white dark:bg-[#121319] rounded-xl border border-slate-200 dark:border-[#22232E] p-3.5 sm:p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-[#241A3A] border border-purple-200 dark:border-[#3B2B5F] flex items-center justify-center shrink-0 text-[#7F56D9] dark:text-[#9D7CF7]">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Bookings</div>
            <div className="text-xl sm:text-[22px] font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight flex items-baseline">
              <span>{totals.count.toLocaleString("en-IN")}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1.5">LRs</span>
            </div>
          </div>
        </div>

        {/* 2. Total Weight */}
        <div className="bg-white dark:bg-[#121319] rounded-xl border border-slate-200 dark:border-[#22232E] p-3.5 sm:p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-[#181D28] border border-slate-200 dark:border-[#273245] flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
            {/* Metric Weight Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 10h10l2 10H5l2-10z" />
              <path d="M12 4a3 3 0 0 0-3 3v3h6V7a3 3 0 0 0-3-3z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Weight</div>
            <div className="text-xl sm:text-[22px] font-bold text-slate-900 dark:text-white mt-0.5 font-mono tracking-tight flex items-baseline">
              <span>{totals.weight.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-sans ml-1.5">MT</span>
            </div>
          </div>
        </div>

        {/* 3. Total Freight */}
        <div className="bg-white dark:bg-[#121319] rounded-xl border border-slate-200 dark:border-[#22232E] p-3.5 sm:p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-[#181D28] border border-slate-200 dark:border-[#273245] flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Freight</div>
            <div className="text-xl sm:text-[22px] font-bold text-slate-900 dark:text-white mt-0.5 font-mono tracking-tight">
              {formatCurrency(totals.freight)}
            </div>
          </div>
        </div>

        {/* 4. Total Advance */}
        <div className="bg-white dark:bg-[#121319] rounded-xl border border-slate-200 dark:border-[#22232E] p-3.5 sm:p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-[#181D28] border border-slate-200 dark:border-[#273245] flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Advance</div>
            <div className="text-xl sm:text-[22px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono tracking-tight">
              {formatCurrency(totals.advance)}
            </div>
          </div>
        </div>

        {/* 5. Total Balance */}
        <div className="bg-white dark:bg-[#121319] rounded-xl border border-slate-200 dark:border-[#22232E] p-3.5 sm:p-4 flex items-center gap-3.5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-[#181D28] border border-slate-200 dark:border-[#273245] flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
            <Scale className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Balance</div>
            <div className="text-xl sm:text-[22px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono tracking-tight">
              {formatCurrency(totals.balance)}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. Booking Records Table Card                                          */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-[#121319] rounded-xl border border-slate-200 dark:border-[#22232E] shadow-sm overflow-hidden">
        {/* Table Toolbar Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-[#22232E] flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#121319] print:hidden">
          {/* Left: Heading + Total records indicator badge */}
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Booking Records
            </h2>
            <span className="px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#1C1D26] border border-slate-200 dark:border-[#2D2E3A] rounded-md font-medium">
              {totalEntries} records
            </span>
          </div>

          {/* Right Toolbar Controls: Search, Columns, Export Excel, Print */}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Integrated Search Input */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search GR, customer, vehicle..."
                className="h-9 w-52 sm:w-64 pl-9 pr-7 text-xs bg-slate-50 dark:bg-[#0D0E12] border border-slate-200 dark:border-[#2B2C37] rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#635BFF] focus:border-[#635BFF] transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Column Visibility Dropdown */}
            <div className="relative" ref={colMenuRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsColMenuOpen(!isColMenuOpen)}
                icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
              >
                <span>Columns</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>

              {isColMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-[#181922] border border-slate-200 dark:border-[#2D2E3A] rounded-xl shadow-xl p-3 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-[#272835] font-semibold text-slate-900 dark:text-slate-200">
                    <span>Columns Visibility</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={handleSelectAllColumns}
                        className="text-[#635BFF] hover:underline"
                      >
                        All
                      </button>
                      <span className="text-slate-500">·</span>
                      <button
                        type="button"
                        onClick={handleResetColumns}
                        className="text-slate-400 hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {AVAILABLE_COLUMNS.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 dark:hover:bg-[#20222E] rounded-md cursor-pointer text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(visibleColumns[col.key])}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded border-slate-300 dark:border-[#3D3E4E] text-[#635BFF] focus:ring-[#635BFF] w-3.5 h-3.5 cursor-pointer accent-[#635BFF]"
                        />
                        <span className="select-none">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Neutral Outlined Export Excel Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Export Excel
            </Button>

            {/* Neutral Outlined Print Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              icon={<Printer className="w-3.5 h-3.5" />}
            >
              Print
            </Button>
          </div>
        </div>

        {/* -------------------------------------------------------------------- */}
        {/* Column Slider (Visible ONLY when columns overflow container width)   */}
        {/* -------------------------------------------------------------------- */}
        {canScrollHorizontally && (
          <div className="px-4 py-2 bg-slate-50 dark:bg-[#0F1015] border-b border-slate-200 dark:border-[#22232E] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 print:hidden animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#635BFF]" />
                <span>Columns Slider</span>
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                (Slide to view all columns)
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleScrollBy(-240)}
                disabled={scrollPosition <= 0}
                aria-label="Slide Left"
                className="w-7 h-7 rounded-md bg-white dark:bg-[#171821] hover:bg-slate-100 dark:hover:bg-[#20222E] border border-slate-200 dark:border-[#2B2C37] text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="relative flex items-center">
                <input
                  type="range"
                  min={0}
                  max={maxScrollLeft}
                  value={scrollPosition}
                  onChange={(e) => handleSliderChange(Number(e.target.value))}
                  className="w-36 sm:w-64 h-2 bg-slate-200 dark:bg-[#1A1B24] border border-slate-300 dark:border-[#2B2C37] rounded-lg appearance-none cursor-pointer accent-[#635BFF] transition-all"
                />
              </div>

              <button
                type="button"
                onClick={() => handleScrollBy(240)}
                disabled={scrollPosition >= maxScrollLeft - 2}
                aria-label="Slide Right"
                className="w-7 h-7 rounded-md bg-white dark:bg-[#171821] hover:bg-slate-100 dark:hover:bg-[#20222E] border border-slate-200 dark:border-[#2B2C37] text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 w-10 text-right tabular-nums">
                {maxScrollLeft > 0 ? `${Math.round((scrollPosition / maxScrollLeft) * 100)}%` : "0%"}
              </span>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------- */}
        {/* Table Container with Horizontal Scroll                               */}
        {/* -------------------------------------------------------------------- */}
        <div ref={tableContainerRef} className="overflow-x-auto min-w-full">
          <table className="w-full text-xs text-left border-collapse">
            {/* Table Header: Dark Graphite Header matching Redesign Target */}
            <thead className="bg-slate-100 dark:bg-[#101116] text-slate-600 dark:text-slate-400 select-none border-b border-slate-200 dark:border-[#22232E]">
              <tr>
                {AVAILABLE_COLUMNS.map((col) => {
                  if (!visibleColumns[col.key]) return null;
                  const isSorted = sortKey === col.key;
                  const isFirstSticky = col.key === "lr_number";
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{ minWidth: col.minWidth }}
                      className={cn(
                        "py-3 px-3.5 font-medium tracking-normal cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap",
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                        isFirstSticky && "sticky left-0 z-20 bg-slate-100 dark:bg-[#101116]",
                        isFirstSticky && canScrollHorizontally && scrollPosition > 10 && "shadow-[3px_0_6px_-2px_rgba(0,0,0,0.35)]"
                      )}
                    >
                      <div className={cn("inline-flex items-center gap-1", col.align === "right" && "justify-end")}>
                        <span>{col.label}</span>
                        {isSorted ? (
                          sortOrder === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-900 dark:text-white font-bold" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-900 dark:text-white font-bold" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-600 opacity-70" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 dark:divide-[#1C1D26]">
              {isLoading ? (
                // Skeleton loading state
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse bg-white dark:bg-[#121319]">
                    {AVAILABLE_COLUMNS.map((col) => {
                      if (!visibleColumns[col.key]) return null;
                      return (
                        <td key={col.key} className="py-3 px-3.5">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                // Clean Empty State
                <tr>
                  <td
                    colSpan={AVAILABLE_COLUMNS.filter((c) => visibleColumns[c.key]).length}
                    className="py-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-[#121319]"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2.5">
                      <FileSpreadsheet className="w-9 h-9 text-slate-400 dark:text-slate-600" />
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        No LR booking records found
                      </div>
                      <p className="text-xs text-slate-500 max-w-sm">
                        No lorry receipts booked for the selected reporting period and customer filter.
                      </p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-2 text-xs font-medium text-[#635BFF] hover:underline cursor-pointer"
                      >
                        Reset filters to view all entries
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                // Populated Data Rows
                paginatedData.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-[#161720]/80 transition-colors group"
                  >
                    {/* 1. GR / LR No. (Purple link with underline) */}
                    {visibleColumns["lr_number"] && (
                      <td
                        className={cn(
                          "py-3 px-3.5 whitespace-nowrap sticky left-0 z-10 transition-colors bg-white dark:bg-[#121319] group-hover:bg-slate-50/90 dark:group-hover:bg-[#161720]",
                          canScrollHorizontally && scrollPosition > 10 && "shadow-[3px_0_6px_-2px_rgba(0,0,0,0.35)]"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenLRView(row)}
                          className="font-mono font-medium text-[#7F56D9] dark:text-[#9370DB] hover:text-[#5249E6] dark:hover:text-[#A78BFA] underline underline-offset-2 decoration-[#7F56D9]/40 hover:decoration-[#A78BFA] cursor-pointer transition-colors"
                        >
                          {row.lr_number}
                        </button>
                      </td>
                    )}

                    {/* 2. Date */}
                    {visibleColumns["lr_date"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                        {formatDateDisplay(row.lr_date)}
                      </td>
                    )}

                    {/* 3. Issuing Office */}
                    {visibleColumns["issuing_office_name"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {formatOfficeName(row.issuing_office_name)}
                      </td>
                    )}

                    {/* 4. Status Badge */}
                    {visibleColumns["booking_status"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {(() => {
                          const statusStr = (row.booking_status || "Booked").trim();
                          const lower = statusStr.toLowerCase();

                          if (lower === "reserved") {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-[#271E11] text-amber-700 dark:text-[#F59E0B] border border-amber-200 dark:border-[#453316]">
                                Reserved
                              </span>
                            );
                          }
                          if (lower === "booked") {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-[#0E2417] text-emerald-700 dark:text-[#34D399] border border-emerald-200 dark:border-[#1B432B]">
                                Booked
                              </span>
                            );
                          }
                          if (lower === "delivered") {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-[#0E2417] text-emerald-700 dark:text-[#34D399] border border-emerald-200 dark:border-[#1B432B]">
                                Delivered
                              </span>
                            );
                          }
                          if (lower === "in transit" || lower === "in_transit") {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-[#121D33] text-blue-700 dark:text-[#60A5FA] border border-blue-200 dark:border-[#1E2E4E]">
                                In Transit
                              </span>
                            );
                          }
                          if (lower === "cancelled") {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 dark:bg-[#2B1417] text-rose-700 dark:text-[#F87171] border border-rose-200 dark:border-[#482025]">
                                Cancelled
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {statusStr}
                            </span>
                          );
                        })()}
                      </td>
                    )}

                    {/* 5. Customer */}
                    {visibleColumns["client_name"] && (
                      <td className="py-3 px-3.5 text-slate-800 dark:text-slate-200 font-medium max-w-[220px] truncate" title={row.client_name || ""}>
                        {row.client_name || "N/A"}
                      </td>
                    )}

                    {/* 6. Vehicle No. */}
                    {visibleColumns["vehicle_number"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono font-medium uppercase text-slate-700 dark:text-slate-300">
                        {row.vehicle_number || "-"}
                      </td>
                    )}

                    {/* 7. Origin */}
                    {visibleColumns["site_from"] && (
                      <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap" title={row.site_from || ""}>
                        {formatLocation(row.site_from)}
                      </td>
                    )}

                    {/* 8. Destination */}
                    {visibleColumns["site_to"] && (
                      <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap" title={row.site_to || ""}>
                        {formatLocation(row.site_to)}
                      </td>
                    )}

                    {/* 9. Balance Amount (in emerald green) */}
                    {visibleColumns["balance_amount"] && (
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.balance_amount)}
                      </td>
                    )}

                    {/* Preserved Additional Columns */}
                    {visibleColumns["consigner_name"] && (
                      <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={row.consigner_name || ""}>
                        {row.consigner_name || "-"}
                      </td>
                    )}

                    {visibleColumns["consignee_name"] && (
                      <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={row.consignee_name || ""}>
                        {row.consignee_name || "-"}
                      </td>
                    )}

                    {visibleColumns["party_invoice_no"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                        {row.party_invoice_no || "-"}
                      </td>
                    )}

                    {visibleColumns["package_count"] && (
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono text-slate-700 dark:text-slate-300">
                        {row.package_count || 0}
                      </td>
                    )}

                    {visibleColumns["actual_weight_mt"] && (
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono text-slate-700 dark:text-slate-300">
                        {Number(row.actual_weight_mt || 0).toFixed(3)}
                      </td>
                    )}

                    {visibleColumns["total_freight_amount"] && (
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(row.total_freight_amount)}
                      </td>
                    )}

                    {visibleColumns["advance_amount"] && (
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.advance_amount)}
                      </td>
                    )}

                    {visibleColumns["eway_bill_number"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                        {row.eway_bill_number || "-"}
                      </td>
                    )}

                    {visibleColumns["payment_terms"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {row.payment_terms || "-"}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* -------------------------------------------------------------------- */}
        {/* Table Footer with Exact Pagination Format                            */}
        {/* -------------------------------------------------------------------- */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-[#22232E] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[#121319] print:hidden">
          {/* Exact Entry Count Display: "Showing 1–3 of 3 bookings" */}
          <div>
            Showing <span className="font-semibold text-slate-900 dark:text-white">{startIndexDisplay}–{endIndexDisplay}</span> of{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{totalEntries}</span> bookings
          </div>

          {/* Rows per page & Page Navigation Chevrons */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none h-8 pl-2.5 pr-6 bg-slate-50 dark:bg-[#0D0E12] border border-slate-200 dark:border-[#2B2C37] rounded-md text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#635BFF] transition-colors cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={-1}>All</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Previous and Next Navigation */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPageSafe <= 1 || isShowAll}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous Page"
                className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-[#2B2C37] bg-slate-50 dark:bg-[#171821] hover:bg-slate-100 dark:hover:bg-[#20222E] text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={currentPageSafe >= totalPages || isShowAll}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next Page"
                className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-[#2B2C37] bg-slate-50 dark:bg-[#171821] hover:bg-slate-100 dark:hover:bg-[#20222E] text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 5. Full LR Consignment Note View Modal                                 */}
      {/* ---------------------------------------------------------------------- */}
      <LRViewModal
        isOpen={isViewModalOpen}
        lr={selectedLrForView}
        onClose={() => setIsViewModalOpen(false)}
      />
    </div>
  );
}
