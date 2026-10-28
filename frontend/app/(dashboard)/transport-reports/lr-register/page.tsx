"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Calendar,
  Check,
  X,
  ExternalLink,
  Eye,
  AlertCircle,
  FileText,
  DollarSign,
  Truck,
  Hash,
  Scale,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

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
  { key: "lr_number", label: "Gr No", defaultVisible: true, minWidth: "100px" },
  { key: "lr_date", label: "GR/LR Date", defaultVisible: true, minWidth: "110px" },
  { key: "issuing_office_name", label: "Issuing Office", defaultVisible: true, minWidth: "140px" },
  { key: "booking_status", label: "GR Status", defaultVisible: true, minWidth: "100px" },
  { key: "client_name", label: "Client Name", defaultVisible: true, minWidth: "220px" },
  { key: "party_invoice_no", label: "Party Invoice No.", defaultVisible: true, minWidth: "140px" },
  { key: "vehicle_number", label: "Vehicle No", defaultVisible: true, minWidth: "120px" },
  { key: "site_from", label: "Site From", defaultVisible: true, minWidth: "180px" },
  { key: "site_to", label: "Site To", defaultVisible: true, minWidth: "180px" },
  { key: "consigner_name", label: "Consigner Name", defaultVisible: true, minWidth: "200px" },
  { key: "consignee_name", label: "Consignee Name", defaultVisible: true, minWidth: "200px" },
  { key: "package_count", label: "Pkgs", defaultVisible: false, align: "right", minWidth: "80px" },
  { key: "actual_weight_mt", label: "Weight (MT)", defaultVisible: false, align: "right", minWidth: "110px" },
  { key: "total_freight_amount", label: "Freight Amount", defaultVisible: false, align: "right", minWidth: "120px" },
  { key: "advance_amount", label: "Advance", defaultVisible: false, align: "right", minWidth: "110px" },
  { key: "balance_amount", label: "Balance", defaultVisible: false, align: "right", minWidth: "110px" },
  { key: "eway_bill_number", label: "E-Way Bill No", defaultVisible: false, minWidth: "130px" },
  { key: "payment_terms", label: "Payment Terms", defaultVisible: false, minWidth: "110px" },
];

// Helper: Format YYYY-MM-DD to DD-MM-YYYY
function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const trimmed = dateStr.trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split("T")[0].split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

// Compute initial default dates (Indian Financial Year: 01-04-YYYY to current date)
function getDefaultFinancialYearDates() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (3 = April)
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
  const [pageSize, setPageSize] = useState<number>(50);

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

  // Quick View Drawer Modal
  const [selectedRowForDrawer, setSelectedRowForDrawer] = useState<LRRegisterRow | null>(null);

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
        // Fallback silently if clients endpoint is restricted
      }
    };
    loadCustomers();
  }, []);

  // 2. Fetch LR Register Data from Backend
  const loadData = async (fDate = fromDate, tDate = toDate, custId = selectedCustomer) => {
    // Validation
    if (fDate && tDate && fDate > tDate) {
      setDateValidationError("From date cannot be later than To date.");
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
    loadData();
  }, []);

  // Handle Filter Submit Button
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    loadData(fromDate, toDate, selectedCustomer);
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

  // Calculations & Totals for filtered records
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
  const isShowAll = pageSize >= totalEntries || pageSize === -1;
  const totalPages = isShowAll ? 1 : Math.ceil(totalEntries / pageSize) || 1;
  const currentPageSafe = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedData = useMemo(() => {
    if (isShowAll) return sortedData;
    const startIndex = (currentPageSafe - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPageSafe, pageSize, isShowAll]);

  const startIndexDisplay = totalEntries === 0 ? 0 : (currentPageSafe - 1) * pageSize + 1;
  const endIndexDisplay = isShowAll ? totalEntries : Math.min(currentPageSafe * pageSize, totalEntries);

  // 3. Export to Excel / CSV with UTF-8 BOM
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
          if (c.key === "lr_date") val = formatDisplayDate(val as string);
          if (val === null || val === undefined) val = "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",");
    });

    // \uFEFF ensures Excel recognizes UTF-8 properly (currency symbols, regional text)
    const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const fromFmt = formatDisplayDate(fromDate).replace(/-/g, "");
    const toFmt = formatDisplayDate(toDate).replace(/-/g, "");
    link.setAttribute("download", `LR_Booking_Register_${fromFmt}_to_${toFmt}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sortedData.length} entries to Excel/CSV`);
  };

  // 4. Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 print:p-0 print:m-0">
      {/* Page Header (Screen only) */}
      <div className="print:hidden">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Transport Reports", href: "/transport-reports" },
            { label: "LR Booking Register" },
          ]}
          title={`LR BOOKING REGISTER From ${formatDisplayDate(fromDate)} To ${formatDisplayDate(toDate)}`}
          description="Operational register of all booked consignments, routes, vehicles, party references, and freight balances."
          primaryAction={{
            label: "Refresh Register",
            icon: RefreshCw,
            onClick: () => loadData(fromDate, toDate, selectedCustomer),
          }}
        />
      </div>

      {/* Printable Title (Print only) */}
      <div className="hidden print:block mb-4 pb-2 border-b border-black">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          LR BOOKING REGISTER From {formatDisplayDate(fromDate)} To {formatDisplayDate(toDate)}
        </h1>
        <p className="text-xs text-gray-600 mt-1">
          Generated on: {new Date().toLocaleString("en-IN")} | Total Entries: {totalEntries}
        </p>
      </div>

      {/* Date Validation Banner */}
      {dateValidationError && (
        <div className="p-3 bg-[#FEF3F2] dark:bg-rose-950/40 border border-[#FECDCA] dark:border-rose-900 text-[#B42318] dark:text-rose-300 text-xs rounded-xl font-medium flex items-center gap-2 print:hidden">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{dateValidationError}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-[#FEF3F2] dark:bg-rose-950/40 border border-[#FECDCA] dark:border-rose-900 text-[#B42318] dark:text-rose-300 text-xs rounded-xl font-medium flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadData(fromDate, toDate, selectedCustomer)}
            className="h-7 text-xs bg-white dark:bg-slate-900"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Top Filter Bar (Directly matching Reference Image) */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-[#E4E7EC] dark:border-slate-800 p-4 shadow-sm print:hidden">
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-3 sm:gap-4">
          {/* From Date */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold text-[#344054] dark:text-slate-300">
              From
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40 sm:w-44 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-[#D0D5DD] dark:border-slate-700 rounded-lg text-[#101828] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* To Date */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold text-[#344054] dark:text-slate-300">
              To
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40 sm:w-44 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-[#D0D5DD] dark:border-slate-700 rounded-lg text-[#101828] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Select Customer */}
          <div className="flex flex-col space-y-1 flex-1 min-w-[200px] max-w-sm">
            <label className="text-xs font-semibold text-[#344054] dark:text-slate-300">
              Select Customer
            </label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-[#D0D5DD] dark:border-slate-700 rounded-lg text-[#101828] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent transition-all"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button (Purple, reference image style) */}
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#7F56D9] hover:bg-[#6941C6] active:bg-[#53389E] rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer h-[34px]"
          >
            {isSubmitting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            <span>Submit</span>
          </button>
        </form>
      </div>

      {/* KPI Summary Strip (Live calculations) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 print:grid-cols-5 print:gap-2">
        <div className="bg-white dark:bg-[#111827] p-3 rounded-xl border border-[#E4E7EC] dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-medium text-[#667085] dark:text-slate-400">Total Bookings</div>
          <div className="text-lg font-bold text-[#101828] dark:text-white mt-0.5">
            {totals.count.toLocaleString("en-IN")} <span className="text-xs font-normal text-[#667085]">LRs</span>
          </div>
        </div>
        <div className="bg-white dark:bg-[#111827] p-3 rounded-xl border border-[#E4E7EC] dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-medium text-[#667085] dark:text-slate-400">Total Weight (MT)</div>
          <div className="text-lg font-bold text-[#101828] dark:text-white mt-0.5 font-mono">
            {totals.weight.toFixed(3)} <span className="text-xs font-normal text-[#667085]">MT</span>
          </div>
        </div>
        <div className="bg-white dark:bg-[#111827] p-3 rounded-xl border border-[#E4E7EC] dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-medium text-[#667085] dark:text-slate-400">Total Freight</div>
          <div className="text-lg font-bold text-[#101828] dark:text-white mt-0.5 font-mono">
            {formatCurrency(totals.freight)}
          </div>
        </div>
        <div className="bg-white dark:bg-[#111827] p-3 rounded-xl border border-[#E4E7EC] dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-medium text-[#667085] dark:text-slate-400">Total Advance</div>
          <div className="text-lg font-bold text-[#027A48] dark:text-emerald-400 mt-0.5 font-mono">
            {formatCurrency(totals.advance)}
          </div>
        </div>
        <div className="bg-white dark:bg-[#111827] p-3 rounded-xl border border-[#E4E7EC] dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-[#667085] dark:text-slate-400">Total Balance</div>
          <div className="text-lg font-bold text-[#B54708] dark:text-amber-400 mt-0.5 font-mono">
            {formatCurrency(totals.balance)}
          </div>
        </div>
      </div>

      {/* Main Register Table Card */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-[#E4E7EC] dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Actions Toolbar (Directly matching Reference Image: Column Visibility, Excel, Print, Search) */}
        <div className="p-3 border-b border-[#E4E7EC] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#FCFCFD] dark:bg-slate-900/50 print:hidden">
          {/* Left Buttons: Column Visibility, Excel, Print */}
          <div className="flex items-center gap-2">
            {/* Column Visibility Dropdown */}
            <div className="relative" ref={colMenuRef}>
              <button
                type="button"
                onClick={() => setIsColMenuOpen(!isColMenuOpen)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#344054] hover:bg-[#1D2939] active:bg-[#101828] rounded-md transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Column Visibility</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isColMenuOpen && (
                <div className="absolute left-0 mt-1 w-64 bg-white dark:bg-[#1F2A37] border border-[#D0D5DD] dark:border-slate-700 rounded-xl shadow-lg p-2.5 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F2F4F7] dark:border-slate-700 font-semibold text-[#344054] dark:text-slate-200">
                    <span>Toggle Columns</span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={handleSelectAllColumns}
                        className="text-[#7F56D9] hover:underline"
                      >
                        All
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={handleResetColumns}
                        className="text-[#667085] hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {AVAILABLE_COLUMNS.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 px-1.5 py-1 hover:bg-[#F9FAFB] dark:hover:bg-slate-800 rounded cursor-pointer text-[#344054] dark:text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(visibleColumns[col.key])}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded border-[#D0D5DD] text-[#7F56D9] focus:ring-[#7F56D9] w-3.5 h-3.5"
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0E7490] hover:bg-[#155E75] active:bg-[#164E63] rounded-md transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#D97706] hover:bg-[#B45309] active:bg-[#92400E] rounded-md transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>

          {/* Right Search Input (matching reference image: "Search: [      ]") */}
          <div className="flex items-center gap-1.5 ml-auto">
            <label className="text-xs font-medium text-[#475467] dark:text-slate-400">
              Search:
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-44 sm:w-56 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-[#D0D5DD] dark:border-slate-700 rounded-md text-[#101828] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9] focus:border-[#7F56D9]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Responsive Table Scroll Area */}
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-xs text-left border-collapse">
            {/* Table Header with Amber/Golden styling matching Reference Image */}
            <thead className="bg-[#F7B928] dark:bg-amber-600 text-[#101828] font-bold select-none border-b border-[#E0A015]">
              <tr>
                {AVAILABLE_COLUMNS.map((col) => {
                  if (!visibleColumns[col.key]) return null;
                  const isSorted = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{ minWidth: col.minWidth }}
                      className={cn(
                        "py-2.5 px-3 uppercase text-[11px] font-bold tracking-tight cursor-pointer hover:bg-black/10 transition-colors whitespace-nowrap",
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                      )}
                    >
                      <div className={cn("inline-flex items-center gap-1", col.align === "right" && "justify-end")}>
                        <span>{col.label}</span>
                        {isSorted ? (
                          sortOrder === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-black font-extrabold" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-black font-extrabold" />
                          )
                        ) : (
                          <span className="opacity-40 text-[10px]">▲</span>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="py-2.5 px-3 uppercase text-[11px] font-bold tracking-tight text-center w-16 print:hidden">
                  Action
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#EAECF0] dark:divide-slate-800">
              {isLoading ? (
                // Loading Skeleton Rows
                Array.from({ length: 10 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse bg-white dark:bg-[#111827]">
                    {AVAILABLE_COLUMNS.map((col) => {
                      if (!visibleColumns[col.key]) return null;
                      return (
                        <td key={col.key} className="py-2.5 px-3">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 print:hidden">
                      <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-8 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                // Empty State
                <tr>
                  <td
                    colSpan={AVAILABLE_COLUMNS.filter((c) => visibleColumns[c.key]).length + 1}
                    className="py-12 text-center text-[#667085] dark:text-slate-400 bg-white dark:bg-[#111827]"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileSpreadsheet className="w-8 h-8 text-[#98A2B3]" />
                      <div className="text-sm font-semibold text-[#101828] dark:text-white">
                        No LR entries found
                      </div>
                      <p className="text-xs text-[#667085] max-w-sm">
                        No lorry receipts booked for the selected date range and customer. Try widening your dates or searching another term.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                // Data Rows
                paginatedData.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className={cn(
                      "hover:bg-[#F9FAFB] dark:hover:bg-slate-800/50 transition-colors",
                      idx % 2 === 0 ? "bg-white dark:bg-[#111827]" : "bg-[#FAFAFA] dark:bg-[#161F2E]/60"
                    )}
                  >
                    {visibleColumns["lr_number"] && (
                      <td className="py-2 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedRowForDrawer(row)}
                          className="font-mono font-bold text-[#101828] dark:text-white hover:text-[#7F56D9] dark:hover:text-indigo-400 cursor-pointer underline decoration-dotted decoration-slate-300"
                        >
                          {row.lr_number}
                        </button>
                      </td>
                    )}

                    {visibleColumns["lr_date"] && (
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[#344054] dark:text-slate-300">
                        {formatDisplayDate(row.lr_date)}
                      </td>
                    )}

                    {visibleColumns["issuing_office_name"] && (
                      <td className="py-2 px-3 whitespace-nowrap text-[#344054] dark:text-slate-300 uppercase font-medium">
                        {row.issuing_office_name || "HEAD OFFICE-DELHI"}
                      </td>
                    )}

                    {visibleColumns["booking_status"] && (
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-semibold tracking-tight",
                            row.booking_status?.toLowerCase() === "delivered"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : row.booking_status?.toLowerCase() === "in transit"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : row.booking_status?.toLowerCase() === "cancelled"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          )}
                        >
                          {row.booking_status || "Booked"}
                        </span>
                      </td>
                    )}

                    {visibleColumns["client_name"] && (
                      <td className="py-2 px-3 text-[#101828] dark:text-slate-200 font-medium max-w-[240px] truncate" title={row.client_name || ""}>
                        {row.client_name || "N/A"}
                      </td>
                    )}

                    {visibleColumns["party_invoice_no"] && (
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[#475467] dark:text-slate-400">
                        {row.party_invoice_no || "-"}
                      </td>
                    )}

                    {visibleColumns["vehicle_number"] && (
                      <td className="py-2 px-3 whitespace-nowrap font-mono font-semibold uppercase text-[#101828] dark:text-white">
                        {row.vehicle_number}
                      </td>
                    )}

                    {visibleColumns["site_from"] && (
                      <td className="py-2 px-3 text-[#344054] dark:text-slate-300 whitespace-nowrap" title={row.site_from || ""}>
                        {row.site_from || "-"}
                      </td>
                    )}

                    {visibleColumns["site_to"] && (
                      <td className="py-2 px-3 text-[#344054] dark:text-slate-300 whitespace-nowrap" title={row.site_to || ""}>
                        {row.site_to || "-"}
                      </td>
                    )}

                    {visibleColumns["consigner_name"] && (
                      <td className="py-2 px-3 text-[#344054] dark:text-slate-300 max-w-[200px] truncate" title={row.consigner_name || ""}>
                        {row.consigner_name || "-"}
                      </td>
                    )}

                    {visibleColumns["consignee_name"] && (
                      <td className="py-2 px-3 text-[#344054] dark:text-slate-300 max-w-[200px] truncate" title={row.consignee_name || ""}>
                        {row.consignee_name || "-"}
                      </td>
                    )}

                    {visibleColumns["package_count"] && (
                      <td className="py-2 px-3 text-right tabular-nums font-mono text-[#344054] dark:text-slate-300">
                        {row.package_count || 0}
                      </td>
                    )}

                    {visibleColumns["actual_weight_mt"] && (
                      <td className="py-2 px-3 text-right tabular-nums font-mono text-[#344054] dark:text-slate-300">
                        {Number(row.actual_weight_mt || 0).toFixed(3)}
                      </td>
                    )}

                    {visibleColumns["total_freight_amount"] && (
                      <td className="py-2 px-3 text-right tabular-nums font-mono font-semibold text-[#101828] dark:text-white">
                        {formatCurrency(row.total_freight_amount)}
                      </td>
                    )}

                    {visibleColumns["advance_amount"] && (
                      <td className="py-2 px-3 text-right tabular-nums font-mono text-[#027A48] dark:text-emerald-400">
                        {formatCurrency(row.advance_amount)}
                      </td>
                    )}

                    {visibleColumns["balance_amount"] && (
                      <td className="py-2 px-3 text-right tabular-nums font-mono font-semibold text-[#B54708] dark:text-amber-400">
                        {formatCurrency(row.balance_amount)}
                      </td>
                    )}

                    {visibleColumns["eway_bill_number"] && (
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[#475467] dark:text-slate-400">
                        {row.eway_bill_number || "-"}
                      </td>
                    )}

                    {visibleColumns["payment_terms"] && (
                      <td className="py-2 px-3 whitespace-nowrap text-[#475467] dark:text-slate-400">
                        {row.payment_terms || "-"}
                      </td>
                    )}

                    {/* Action Column */}
                    <td className="py-2 px-3 text-center whitespace-nowrap print:hidden">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRowForDrawer(row)}
                          title="View LR Details"
                          className="p-1 rounded text-slate-500 hover:text-[#7F56D9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/transport/lr-booking?id=${row.id}`}
                          title="Edit in LR Booking"
                          className="p-1 rounded text-slate-500 hover:text-[#7F56D9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Totals Summary Footer Row (visible if items exist) */}
            {paginatedData.length > 0 && (
              <tfoot className="bg-[#F8F9FA] dark:bg-slate-900 border-t-2 border-[#D0D5DD] dark:border-slate-700 font-bold text-[#101828] dark:text-white">
                <tr>
                  <td colSpan={2} className="py-2.5 px-3 uppercase text-[11px]">
                    Filtered Total ({totals.count} LRs)
                  </td>
                  {AVAILABLE_COLUMNS.slice(2).map((col) => {
                    if (!visibleColumns[col.key]) return null;
                    if (col.key === "actual_weight_mt") {
                      return (
                        <td key={col.key} className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {totals.weight.toFixed(3)} MT
                        </td>
                      );
                    }
                    if (col.key === "package_count") {
                      return (
                        <td key={col.key} className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {totals.pkgs.toLocaleString("en-IN")}
                        </td>
                      );
                    }
                    if (col.key === "total_freight_amount") {
                      return (
                        <td key={col.key} className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {formatCurrency(totals.freight)}
                        </td>
                      );
                    }
                    if (col.key === "advance_amount") {
                      return (
                        <td key={col.key} className="py-2.5 px-3 text-right font-mono tabular-nums text-[#027A48]">
                          {formatCurrency(totals.advance)}
                        </td>
                      );
                    }
                    if (col.key === "balance_amount") {
                      return (
                        <td key={col.key} className="py-2.5 px-3 text-right font-mono tabular-nums text-[#B54708]">
                          {formatCurrency(totals.balance)}
                        </td>
                      );
                    }
                    return <td key={col.key} className="py-2.5 px-3"></td>;
                  })}
                  <td className="py-2.5 px-3 print:hidden"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Table Footer with exact entry count format: "Showing 1 to 403 of 403 entries" */}
        <div className="p-3 border-t border-[#E4E7EC] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#475467] dark:text-slate-400 bg-white dark:bg-[#111827] print:hidden">
          {/* Exact Entry Count Display */}
          <div>
            Showing <span className="font-semibold text-[#101828] dark:text-white">{startIndexDisplay}</span> to{" "}
            <span className="font-semibold text-[#101828] dark:text-white">{endIndexDisplay}</span> of{" "}
            <span className="font-semibold text-[#101828] dark:text-white">{totalEntries}</span> entries
          </div>

          {/* Pagination and Rows Per Page */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white dark:bg-slate-900 border border-[#D0D5DD] dark:border-slate-700 rounded text-xs text-[#344054] dark:text-slate-300"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={403}>403</option>
                <option value={500}>500</option>
                <option value={-1}>All</option>
              </select>
            </div>

            {!isShowAll && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPageSafe <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 border border-[#D0D5DD] dark:border-slate-700 rounded hover:bg-[#F9FAFB] dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium cursor-pointer"
                >
                  Previous
                </button>
                <span className="px-2 py-1 font-medium text-[#101828] dark:text-white">
                  {currentPageSafe} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPageSafe >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 border border-[#D0D5DD] dark:border-slate-700 rounded hover:bg-[#F9FAFB] dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Details Drawer Modal */}
      {selectedRowForDrawer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#111827] h-full shadow-2xl flex flex-col justify-between border-l border-[#E4E7EC] dark:border-slate-800">
            {/* Header */}
            <div className="p-4 border-b border-[#E4E7EC] dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#101828] dark:text-white flex items-center gap-2">
                  <span>GR / LR #{selectedRowForDrawer.lr_number}</span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-semibold",
                      selectedRowForDrawer.booking_status?.toLowerCase() === "delivered"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    )}
                  >
                    {selectedRowForDrawer.booking_status || "Booked"}
                  </span>
                </h3>
                <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
                  Booked on {formatDisplayDate(selectedRowForDrawer.lr_date)} · {selectedRowForDrawer.issuing_office_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowForDrawer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Client & Parties */}
              <div className="bg-[#F8F9FB] dark:bg-slate-900 p-3.5 rounded-xl border border-[#E4E7EC] dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-[#344054] dark:text-slate-300 uppercase tracking-wide">
                  Client & Parties
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[#667085] block text-[10px]">Client / Billing</span>
                    <span className="font-semibold text-[#101828] dark:text-white">
                      {selectedRowForDrawer.client_name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#667085] block text-[10px]">Party Invoice No.</span>
                    <span className="font-mono font-semibold text-[#101828] dark:text-white">
                      {selectedRowForDrawer.party_invoice_no || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#667085] block text-[10px]">Consigner</span>
                    <span className="text-[#344054] dark:text-slate-300">
                      {selectedRowForDrawer.consigner_name || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#667085] block text-[10px]">Consignee</span>
                    <span className="text-[#344054] dark:text-slate-300">
                      {selectedRowForDrawer.consignee_name || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transit & Route */}
              <div className="bg-[#F8F9FB] dark:bg-slate-900 p-3.5 rounded-xl border border-[#E4E7EC] dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-[#344054] dark:text-slate-300 uppercase tracking-wide">
                  Route & Vehicle
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[#667085] block text-[10px]">Site From</span>
                    <span className="font-medium text-[#101828] dark:text-white">
                      {selectedRowForDrawer.site_from || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#667085] block text-[10px]">Site To</span>
                    <span className="font-medium text-[#101828] dark:text-white">
                      {selectedRowForDrawer.site_to || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#667085] block text-[10px]">Vehicle Number</span>
                    <span className="font-mono font-bold uppercase text-[#101828] dark:text-white">
                      {selectedRowForDrawer.vehicle_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#667085] block text-[10px]">E-Way Bill</span>
                    <span className="font-mono text-[#101828] dark:text-white">
                      {selectedRowForDrawer.eway_bill_number || "-"}
                    </span>
                  </div>
                  {selectedRowForDrawer.driver_name && (
                    <div className="col-span-2">
                      <span className="text-[#667085] block text-[10px]">Driver</span>
                      <span className="text-[#344054] dark:text-slate-300">
                        {selectedRowForDrawer.driver_name} {selectedRowForDrawer.driver_phone ? `(${selectedRowForDrawer.driver_phone})` : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cargo & Financials */}
              <div className="bg-[#F8F9FB] dark:bg-slate-900 p-3.5 rounded-xl border border-[#E4E7EC] dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-[#344054] dark:text-slate-300 uppercase tracking-wide">
                  Cargo & Financial Breakdown
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[#667085] block text-[10px]">Package Count</span>
                    <span className="font-mono font-semibold text-[#101828] dark:text-white">
                      {selectedRowForDrawer.package_count || 0} pkgs
                    </span>
                  </div>
                  <div>
                    <span className="text-[#667085] block text-[10px]">Actual Weight</span>
                    <span className="font-mono font-semibold text-[#101828] dark:text-white">
                      {Number(selectedRowForDrawer.actual_weight_mt || 0).toFixed(3)} MT
                    </span>
                  </div>
                  <div>
                    <span className="text-[#667085] block text-[10px]">Total Freight</span>
                    <span className="font-mono font-bold text-[#101828] dark:text-white">
                      {formatCurrency(selectedRowForDrawer.total_freight_amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#667085] block text-[10px]">Advance Paid</span>
                    <span className="font-mono font-bold text-[#027A48]">
                      {formatCurrency(selectedRowForDrawer.advance_amount)}
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-semibold text-[#344054] dark:text-slate-300">Balance Payable / Due</span>
                    <span className="font-mono text-sm font-extrabold text-[#B54708]">
                      {formatCurrency(selectedRowForDrawer.balance_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-[#E4E7EC] dark:border-slate-800 flex items-center justify-end gap-2 bg-[#FCFCFD] dark:bg-slate-900">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRowForDrawer(null)}
              >
                Close
              </Button>
              <Link href={`/transport/lr-booking?id=${selectedRowForDrawer.id}`}>
                <Button size="sm" className="bg-[#7F56D9] hover:bg-[#6941C6] text-white gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in LR Booking</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
