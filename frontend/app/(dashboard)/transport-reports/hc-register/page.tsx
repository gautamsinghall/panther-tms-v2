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
  AlertCircle,
  FileText,
  Truck,
  Wallet,
  Scale,
  Filter,
  FileSpreadsheet,
  IndianRupee,
  CreditCard,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { HireChallanViewModal, HireChallanRecord } from "@/components/modals/hire-challan-view-modal";
import { Button } from "@/components/ui/button";

// ------------------------------------------------------------------------------
// Types & Column Definitions
// ------------------------------------------------------------------------------

export interface HireChallanRegisterRow {
  id: number;
  challan_number: string;
  challan_date: string;
  vehicle_number: string;
  owner_id?: number | null;
  owner_name?: string | null;
  driver_id?: number | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  from_location?: string | null;
  to_location?: string | null;
  hire_rate: string | number;
  advance_amount: string | number;
  balance_amount: string | number;
  net_payable_amount?: string | number;
  tds_category?: string | null;
  tds_rate?: string | number;
  tds_amount?: string | number;
  vendor_ref_no?: string | null;
  detention_charge?: string | number;
  mamul_charges?: string | number;
  status: string;
  issuing_office_id?: number | null;
  issuing_office_name?: string | null;
  issuing_office_code?: string | null;
  remarks?: string | null;
  lr_id?: number | null;
  lr_number?: string | null;
}

interface OwnerOption {
  id: number;
  name: string;
}

interface ColumnConfig {
  key: keyof HireChallanRegisterRow;
  label: string;
  defaultVisible: boolean;
  align?: "left" | "right" | "center";
  minWidth?: string;
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: "challan_number", label: "HC No.", defaultVisible: true, minWidth: "130px" },
  { key: "challan_date", label: "Date", defaultVisible: true, minWidth: "110px" },
  { key: "issuing_office_name", label: "Issuing Office", defaultVisible: true, minWidth: "120px" },
  { key: "status", label: "Status", defaultVisible: true, minWidth: "100px" },
  { key: "vehicle_number", label: "Vehicle No.", defaultVisible: true, minWidth: "120px" },
  { key: "owner_name", label: "Owner / Vendor", defaultVisible: true, minWidth: "180px" },
  { key: "driver_name", label: "Driver", defaultVisible: true, minWidth: "140px" },
  { key: "from_location", label: "From", defaultVisible: true, minWidth: "130px" },
  { key: "to_location", label: "To", defaultVisible: true, minWidth: "130px" },
  { key: "hire_rate", label: "Hire Rate", defaultVisible: true, align: "right", minWidth: "110px" },
  { key: "advance_amount", label: "Advance", defaultVisible: true, align: "right", minWidth: "110px" },
  { key: "balance_amount", label: "Balance Due", defaultVisible: true, align: "right", minWidth: "110px" },
  // Additional toggleable columns from Hire Challan section
  { key: "driver_phone", label: "Driver Phone", defaultVisible: false, minWidth: "120px" },
  { key: "vendor_ref_no", label: "Vendor Ref No.", defaultVisible: false, minWidth: "130px" },
  { key: "lr_number", label: "Linked LR No.", defaultVisible: false, minWidth: "120px" },
  { key: "tds_category", label: "TDS Category", defaultVisible: false, minWidth: "140px" },
  { key: "tds_rate", label: "TDS Rate (%)", defaultVisible: false, align: "right", minWidth: "100px" },
  { key: "tds_amount", label: "TDS Amount", defaultVisible: false, align: "right", minWidth: "110px" },
  { key: "net_payable_amount", label: "Net Payable", defaultVisible: false, align: "right", minWidth: "110px" },
  { key: "detention_charge", label: "Detention Charge", defaultVisible: false, align: "right", minWidth: "120px" },
  { key: "mamul_charges", label: "Mamul Charges", defaultVisible: false, align: "right", minWidth: "110px" },
  { key: "remarks", label: "Remarks", defaultVisible: false, minWidth: "160px" },
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

export default function HCRegisterPage() {
  const defaultDates = useMemo(() => getDefaultFinancialYearDates(), []);
  const [fromDate, setFromDate] = useState<string>(defaultDates.fromDate);
  const [toDate, setToDate] = useState<string>(defaultDates.toDate);
  const [appliedFromDate, setAppliedFromDate] = useState<string>(defaultDates.fromDate);
  const [appliedToDate, setAppliedToDate] = useState<string>(defaultDates.toDate);

  const [selectedOwner, setSelectedOwner] = useState<string>("");
  const [owners, setOwners] = useState<OwnerOption[]>([]);

  const [data, setData] = useState<HireChallanRegisterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  // Search & Sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<keyof HireChallanRegisterRow>("challan_number");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  // Full Hire Challan View Modal
  const [selectedChallanForView, setSelectedChallanForView] = useState<HireChallanRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleOpenChallanView = async (row: HireChallanRegisterRow) => {
    try {
      const full = await apiClient<any>(`/api/v1/transport/hire-challans/${row.id}`);
      setSelectedChallanForView(full || (row as any));
    } catch {
      setSelectedChallanForView(row as any);
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

  // 1. Fetch Vehicle Owners / Vendors List for Dropdown
  useEffect(() => {
    const loadOwners = async () => {
      try {
        const res = await apiClient<any[]>("/api/v1/transport/vehicle-owners");
        if (Array.isArray(res)) {
          const list: OwnerOption[] = res.map((o) => ({
            id: o.id,
            name: o.name || `Owner #${o.id}`,
          }));
          setOwners(list);
        }
      } catch {
        // Fallback silently if restricted; distinct owners from data will supplement
      }
    };
    loadOwners();
  }, []);

  // 2. Fetch Hire Challan Register Data from Backend
  const loadData = async (fDate = fromDate, tDate = toDate, ownerId = selectedOwner) => {
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
      if (ownerId) params.append("owner_id", ownerId);

      const qs = params.toString();
      const endpoint = `/api/v1/transport-reports/hc-register${qs ? `?${qs}` : ""}`;
      const res = await apiClient<HireChallanRegisterRow[]>(endpoint);
      const rows = Array.isArray(res) ? res : [];
      setData(rows);
      setAppliedFromDate(fDate);
      setAppliedToDate(tDate);
      setCurrentPage(1);

      // If owners list was empty, extract distinct owner names from data
      setOwners((prev) => {
        if (prev.length > 0) return prev;
        const seen = new Map<number, string>();
        rows.forEach((r) => {
          if (r.owner_id && r.owner_name && !seen.has(r.owner_id)) {
            seen.set(r.owner_id, r.owner_name);
          }
        });
        return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load hire challan register from server.");
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
    loadData(fromDate, toDate, selectedOwner);
  };

  // Reset all filters to default financial year
  const handleResetFilters = () => {
    setFromDate(defaultDates.fromDate);
    setToDate(defaultDates.toDate);
    setSelectedOwner("");
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
  const handleSort = (key: keyof HireChallanRegisterRow) => {
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
        String(row.challan_number || "").toLowerCase().includes(term) ||
        String(row.vehicle_number || "").toLowerCase().includes(term) ||
        String(row.owner_name || "").toLowerCase().includes(term) ||
        String(row.driver_name || "").toLowerCase().includes(term) ||
        String(row.driver_phone || "").toLowerCase().includes(term) ||
        String(row.from_location || "").toLowerCase().includes(term) ||
        String(row.to_location || "").toLowerCase().includes(term) ||
        String(row.vendor_ref_no || "").toLowerCase().includes(term) ||
        String(row.lr_number || "").toLowerCase().includes(term) ||
        String(row.issuing_office_name || "").toLowerCase().includes(term) ||
        String(row.status || "").toLowerCase().includes(term) ||
        String(row.remarks || "").toLowerCase().includes(term)
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
    let hireRate = 0;
    let advance = 0;
    let balance = 0;
    let netPayable = 0;
    let tdsAmount = 0;

    filteredData.forEach((row) => {
      hireRate += Number(row.hire_rate) || 0;
      advance += Number(row.advance_amount) || 0;
      balance += Number(row.balance_amount) || 0;
      netPayable += Number(row.net_payable_amount) || (Number(row.hire_rate) || 0) - (Number(row.tds_amount) || 0);
      tdsAmount += Number(row.tds_amount) || 0;
    });

    return {
      count: filteredData.length,
      hireRate,
      advance,
      balance,
      netPayable,
      tdsAmount,
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
          if (c.key === "challan_date") val = formatDateDisplay(val as string);
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
    link.setAttribute("download", `Hire_Challan_Register_${appliedFromDate}_to_${appliedToDate}.csv`);
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
          <span className="text-slate-200 font-semibold">Hire Challan Register</span>
        </nav>

        {/* Title, Date Pill, Description, and Refresh Action */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Hire Challan Register
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
              Manage and review hire challans, vehicle hires, advances, and balances.
            </p>
          </div>

          {/* Top-Right Secondary Action: Refresh Register */}
          <div className="shrink-0 pt-0.5">
            <Button
              variant="outline"
              size="md"
              onClick={() => loadData(fromDate, toDate, selectedOwner)}
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
          HIRE CHALLAN REGISTER
        </h1>
        <p className="text-xs text-gray-700 mt-1">
          Period: {formatDateDisplay(appliedFromDate)} – {formatDateDisplay(appliedToDate)} | Total Challans: {totalEntries}
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
            onClick={() => loadData(fromDate, toDate, selectedOwner)}
            className="border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300"
          >
            Retry
          </Button>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Unified Filter Section (Matching Reference Style)                   */}
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

          {/* Vehicle Owner / Vendor Selection */}
          <div className="flex flex-col space-y-1.5 flex-1 min-w-[200px] max-w-sm">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Vehicle Owner / Vendor
            </label>
            <div className="relative">
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="w-full h-10 appearance-none px-3.5 pr-8 text-xs sm:text-sm bg-slate-50 dark:bg-[#0D0E12] border border-slate-200 dark:border-[#2B2C37] rounded-xl text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-[#3D3E4E] focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF] transition-colors cursor-pointer"
              >
                <option value="">All Owners / Vendors</option>
                {owners.map((o) => (
                  <option key={o.id} value={String(o.id)} className="bg-white dark:bg-[#121319] text-slate-900 dark:text-white">
                    {o.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Action Buttons: Reset & Apply Filters */}
          <div className="flex items-center gap-2.5 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleResetFilters}
              disabled={isLoading || isSubmitting}
            >
              Reset
            </Button>

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
      {/* 3. Summary KPI Cards                                                   */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 print:grid-cols-5 print:gap-2">
        {/* 1. Total Challans */}
        <div className="bg-white dark:bg-[#121319] rounded-xl border border-slate-200 dark:border-[#22232E] p-3.5 sm:p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-[#241A3A] border border-purple-200 dark:border-[#3B2B5F] flex items-center justify-center shrink-0 text-[#7F56D9] dark:text-[#9D7CF7]">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Challans</div>
            <div className="text-xl sm:text-[22px] font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight flex items-baseline">
              <span>{totals.count.toLocaleString("en-IN")}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1.5">HCs</span>
            </div>
          </div>
        </div>

        {/* 2. Total Hire Rate */}
        <div className="bg-white dark:bg-[#121319] rounded-xl border border-slate-200 dark:border-[#22232E] p-3.5 sm:p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-[#181D28] border border-slate-200 dark:border-[#273245] flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Hire Rate</div>
            <div className="text-xl sm:text-[22px] font-bold text-slate-900 dark:text-white mt-0.5 font-mono tracking-tight">
              {formatCurrency(totals.hireRate)}
            </div>
          </div>
        </div>

        {/* 3. Net Payable */}
        <div className="bg-white dark:bg-[#121319] rounded-xl border border-slate-200 dark:border-[#22232E] p-3.5 sm:p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-[#181D28] border border-slate-200 dark:border-[#273245] flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Net Payable</div>
            <div className="text-xl sm:text-[22px] font-bold text-slate-900 dark:text-white mt-0.5 font-mono tracking-tight">
              {formatCurrency(totals.netPayable)}
            </div>
          </div>
        </div>

        {/* 4. Total Advance Paid */}
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

        {/* 5. Total Balance Due */}
        <div className="bg-white dark:bg-[#121319] rounded-xl border border-slate-200 dark:border-[#22232E] p-3.5 sm:p-4 flex items-center gap-3.5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-[#181D28] border border-slate-200 dark:border-[#273245] flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
            <Scale className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Balance Due</div>
            <div className={cn(
              "text-xl sm:text-[22px] font-bold mt-0.5 font-mono tracking-tight",
              totals.balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
            )}>
              {formatCurrency(totals.balance)}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. Hire Challan Records Table Card                                     */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-[#121319] rounded-xl border border-slate-200 dark:border-[#22232E] shadow-sm overflow-hidden">
        {/* Table Toolbar Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-[#22232E] flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#121319] print:hidden">
          {/* Left: Heading + Total records indicator badge */}
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Challan Records
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
                placeholder="Search HC, vehicle, owner, route..."
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

            {/* Export Excel Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Export Excel
            </Button>

            {/* Print Button */}
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
            <thead className="bg-slate-100 dark:bg-[#101116] text-slate-600 dark:text-slate-400 select-none border-b border-slate-200 dark:border-[#22232E]">
              <tr>
                {AVAILABLE_COLUMNS.map((col) => {
                  if (!visibleColumns[col.key]) return null;
                  const isSorted = sortKey === col.key;
                  const isFirstSticky = col.key === "challan_number";
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
                        No hire challan records found
                      </div>
                      <p className="text-xs text-slate-500 max-w-sm">
                        No hire challans found for the selected reporting period and vendor filter.
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
                    {/* 1. HC No. (Purple link with underline opening view modal) */}
                    {visibleColumns["challan_number"] && (
                      <td
                        className={cn(
                          "py-3 px-3.5 whitespace-nowrap sticky left-0 z-10 transition-colors bg-white dark:bg-[#121319] group-hover:bg-slate-50/90 dark:group-hover:bg-[#161720]",
                          canScrollHorizontally && scrollPosition > 10 && "shadow-[3px_0_6px_-2px_rgba(0,0,0,0.35)]"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenChallanView(row)}
                          className="font-mono font-medium text-[#7F56D9] dark:text-[#9370DB] hover:text-[#5249E6] dark:hover:text-[#A78BFA] underline underline-offset-2 decoration-[#7F56D9]/40 hover:decoration-[#A78BFA] cursor-pointer transition-colors"
                        >
                          {row.challan_number}
                        </button>
                      </td>
                    )}

                    {/* 2. Date */}
                    {visibleColumns["challan_date"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                        {formatDateDisplay(row.challan_date)}
                      </td>
                    )}

                    {/* 3. Issuing Office */}
                    {visibleColumns["issuing_office_name"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {formatOfficeName(row.issuing_office_name)}
                      </td>
                    )}

                    {/* 4. Status Badge */}
                    {visibleColumns["status"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {(() => {
                          const statusStr = (row.status || "Draft").trim();
                          const lower = statusStr.toLowerCase();

                          if (lower === "draft") {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Draft
                              </span>
                            );
                          }
                          if (lower === "issued") {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-[#271E11] text-amber-700 dark:text-[#F59E0B] border border-amber-200 dark:border-[#453316]">
                                Issued
                              </span>
                            );
                          }
                          if (lower === "in transit" || lower === "in_transit" || lower === "transit") {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-[#121D33] text-blue-700 dark:text-[#60A5FA] border border-blue-200 dark:border-[#1E2E4E]">
                                In Transit
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
                          if (lower === "settled") {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-[#0E2417] text-emerald-700 dark:text-[#34D399] border border-emerald-200 dark:border-[#1B432B]">
                                Settled
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

                    {/* 5. Vehicle No. */}
                    {visibleColumns["vehicle_number"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono font-medium uppercase text-slate-800 dark:text-slate-200">
                        {row.vehicle_number || "-"}
                      </td>
                    )}

                    {/* 6. Owner / Vendor */}
                    {visibleColumns["owner_name"] && (
                      <td className="py-3 px-3.5 text-slate-800 dark:text-slate-200 font-medium max-w-[200px] truncate" title={row.owner_name || ""}>
                        {row.owner_name || "Direct Driver"}
                      </td>
                    )}

                    {/* 7. Driver */}
                    {visibleColumns["driver_name"] && (
                      <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[160px] truncate" title={row.driver_name || ""}>
                        {row.driver_name || "Unassigned"}
                      </td>
                    )}

                    {/* 8. From */}
                    {visibleColumns["from_location"] && (
                      <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap" title={row.from_location || ""}>
                        {row.from_location || "-"}
                      </td>
                    )}

                    {/* 9. To */}
                    {visibleColumns["to_location"] && (
                      <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap" title={row.to_location || ""}>
                        {row.to_location || "-"}
                      </td>
                    )}

                    {/* 10. Hire Rate */}
                    {visibleColumns["hire_rate"] && (
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(row.hire_rate)}
                      </td>
                    )}

                    {/* 11. Advance Paid */}
                    {visibleColumns["advance_amount"] && (
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.advance_amount)}
                      </td>
                    )}

                    {/* 12. Balance Due */}
                    {visibleColumns["balance_amount"] && (
                      <td className={cn(
                        "py-3 px-3.5 text-right tabular-nums font-mono font-medium",
                        Number(row.balance_amount) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {formatCurrency(row.balance_amount)}
                      </td>
                    )}

                    {/* Additional Toggleable Columns */}
                    {visibleColumns["driver_phone"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                        {row.driver_phone || "-"}
                      </td>
                    )}

                    {visibleColumns["vendor_ref_no"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                        {row.vendor_ref_no || "-"}
                      </td>
                    )}

                    {visibleColumns["lr_number"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[#7F56D9] dark:text-[#9370DB]">
                        {row.lr_number || "-"}
                      </td>
                    )}

                    {visibleColumns["tds_category"] && (
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {row.tds_category || "-"}
                      </td>
                    )}

                    {visibleColumns["tds_rate"] && (
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono text-slate-600 dark:text-slate-400">
                        {Number(row.tds_rate || 0).toFixed(2)}%
                      </td>
                    )}

                    {visibleColumns["tds_amount"] && (
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(row.tds_amount || 0)}
                      </td>
                    )}

                    {visibleColumns["net_payable_amount"] && (
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono font-medium text-slate-800 dark:text-slate-200">
                        {formatCurrency(row.net_payable_amount || 0)}
                      </td>
                    )}

                    {visibleColumns["detention_charge"] && (
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(row.detention_charge || 0)}
                      </td>
                    )}

                    {visibleColumns["mamul_charges"] && (
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(row.mamul_charges || 0)}
                      </td>
                    )}

                    {visibleColumns["remarks"] && (
                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={row.remarks || ""}>
                        {row.remarks || "-"}
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
          {/* Exact Entry Count Display: "Showing 1–X of Y challans" */}
          <div>
            Showing <span className="font-semibold text-slate-900 dark:text-white">{startIndexDisplay}–{endIndexDisplay}</span> of{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{totalEntries}</span> challans
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
      {/* 5. Full Hire Challan View Modal                                        */}
      {/* ---------------------------------------------------------------------- */}
      <HireChallanViewModal
        isOpen={isViewModalOpen}
        challan={selectedChallanForView}
        onClose={() => setIsViewModalOpen(false)}
      />
    </div>
  );
}
