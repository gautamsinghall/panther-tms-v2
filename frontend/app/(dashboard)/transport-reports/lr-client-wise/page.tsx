"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  RefreshCw,
  Download,
  Printer,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Calendar,
  X,
  FileSpreadsheet,
  Building2,
  Truck,
  Scale,
  Wallet,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { LRViewModal, LRViewRecord } from "@/components/modals/lr-view-modal";

// ------------------------------------------------------------------------------
// Types & Column Definitions
// ------------------------------------------------------------------------------

export interface LRClientWiseRecord {
  id: number;
  lr_number: string;
  month?: string | null;
  lr_date?: string | null;
  vehicle_number?: string | null;
  vehicle_type?: string | null;
  eta?: string | null;
  site_from?: string | null;
  site_to?: string | null;
  party_invoice_no?: string | null;
  party_invoice_date?: string | null;
  invoice_value?: string | number | null;
  weight?: string | number | null;
  pkts?: number | null;
  consigner_name?: string | null;
  consignee_name?: string | null;
  billing_customer?: string | null;
  billing_status?: string | null;
  bill_amount?: string | number | null;
  bill_no?: string | null;
  bill_date?: string | null;
  booking_status?: string | null;
  payment_type?: string | null;
}

export interface LRClientWiseGroup {
  client_id?: number | null;
  client_name: string;
  client_type: string;
  total_lrs: number;
  total_weight_mt: string | number;
  total_freight_amount: string | number;
  delivered_count: number;
  in_transit_count: number;
  records: LRClientWiseRecord[];
}

interface ColumnConfig {
  key: keyof LRClientWiseRecord;
  label: string;
  align?: "left" | "right" | "center";
  minWidth?: string;
}

// Exactly 22 columns from reference UI, in exact order, all enabled by default
const TABLE_COLUMNS: ColumnConfig[] = [
  { key: "lr_number", label: "Gr No", align: "left", minWidth: "130px" },
  { key: "month", label: "Month", align: "left", minWidth: "110px" },
  { key: "lr_date", label: "GR/LR Date", align: "left", minWidth: "115px" },
  { key: "vehicle_number", label: "Vehicle No", align: "left", minWidth: "125px" },
  { key: "vehicle_type", label: "Vehicle Type", align: "left", minWidth: "120px" },
  { key: "eta", label: "ETA", align: "left", minWidth: "110px" },
  { key: "site_from", label: "Site From", align: "left", minWidth: "130px" },
  { key: "site_to", label: "Site To", align: "left", minWidth: "130px" },
  { key: "party_invoice_no", label: "Party Invoice No.", align: "left", minWidth: "140px" },
  { key: "party_invoice_date", label: "Date", align: "left", minWidth: "110px" },
  { key: "invoice_value", label: "Inv. Value", align: "right", minWidth: "115px" },
  { key: "weight", label: "Weight", align: "right", minWidth: "100px" },
  { key: "pkts", label: "Pkts", align: "right", minWidth: "80px" },
  { key: "consigner_name", label: "Consigner Name", align: "left", minWidth: "180px" },
  { key: "consignee_name", label: "Consignee Name", align: "left", minWidth: "180px" },
  { key: "billing_customer", label: "Billing Customer", align: "left", minWidth: "180px" },
  { key: "billing_status", label: "Billing Status", align: "center", minWidth: "110px" },
  { key: "bill_amount", label: "Bill Amount", align: "right", minWidth: "115px" },
  { key: "bill_no", label: "Bill No", align: "left", minWidth: "120px" },
  { key: "bill_date", label: "Bill Date", align: "left", minWidth: "110px" },
  { key: "booking_status", label: "Booking Status", align: "center", minWidth: "120px" },
  { key: "payment_type", label: "Payment Type", align: "center", minWidth: "120px" },
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Helper: Format date string cleanly; return "" if absent (NEVER "-" or "N/A")
function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "";
  const trimmed = String(dateStr).trim();
  if (!trimmed) return "";
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
  return trimmed;
}

// Financial year helper: 01-04-YYYY to today
function getDefaultFinancialYearDates() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  const from = `${fyStartYear}-04-01`;
  const to = now.toISOString().split("T")[0];
  return { from, to };
}

export default function LRClientWisePage() {
  const [data, setData] = useState<LRClientWiseGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters State
  const defaultDates = useMemo(() => getDefaultFinancialYearDates(), []);
  const [fromDate, setFromDate] = useState<string>(defaultDates.from);
  const [toDate, setToDate] = useState<string>(defaultDates.to);
  const [appliedFromDate, setAppliedFromDate] = useState<string>(defaultDates.from);
  const [appliedToDate, setAppliedToDate] = useState<string>(defaultDates.to);

  const [selectedClient, setSelectedClient] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grouped" | "consolidated">("grouped");

  // Column Visibility State (global toolbar dropdown)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    TABLE_COLUMNS.forEach((col) => {
      initial[col.key] = true;
    });
    return initial;
  });
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  // Close Column dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(event.target as Node)) {
        setIsColMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleResetColumns = () => {
    const reset: Record<string, boolean> = {};
    TABLE_COLUMNS.forEach((col) => {
      reset[col.key] = true;
    });
    setVisibleColumns(reset);
  };

  const handleSelectAllColumns = () => {
    const all: Record<string, boolean> = {};
    TABLE_COLUMNS.forEach((col) => {
      all[col.key] = true;
    });
    setVisibleColumns(all);
  };

  // Collapsed client groups state
  const [collapsedClients, setCollapsedClients] = useState<Record<string, boolean>>({});

  // Sorting
  const [sortKey, setSortKey] = useState<keyof LRClientWiseRecord>("lr_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Column Slider & Horizontal Scroll
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollHorizontally, setCanScrollHorizontally] = useState<boolean>(false);
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const [maxScrollLeft, setMaxScrollLeft] = useState<number>(0);
  const rafScrollRef = useRef<number | null>(null);

  // LR View Modal
  const [viewModalLR, setViewModalLR] = useState<LRViewRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Load Data from Backend
  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (appliedFromDate) params.append("from_date", appliedFromDate);
      if (appliedToDate) params.append("to_date", appliedToDate);

      const url = `/api/v1/transport-reports/lr-client-wise${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await apiClient<LRClientWiseGroup[]>(url);
      setData(res || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load LR Client-Wise report.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [appliedFromDate, appliedToDate]);

  // Handle Apply Date Filter
  const handleApplyFilter = () => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  };

  const handleResetFilters = () => {
    setFromDate(defaultDates.from);
    setToDate(defaultDates.to);
    setAppliedFromDate(defaultDates.from);
    setAppliedToDate(defaultDates.to);
    setSelectedClient("ALL");
    setSearchTerm("");
  };

  // Quick Preset Date Handlers
  const handleSetThisMonth = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const firstDay = `${y}-${m}-01`;
    const today = now.toISOString().split("T")[0];
    setFromDate(firstDay);
    setToDate(today);
    setAppliedFromDate(firstDay);
    setAppliedToDate(today);
  };

  const handleSetFY = () => {
    const defs = getDefaultFinancialYearDates();
    setFromDate(defs.from);
    setToDate(defs.to);
    setAppliedFromDate(defs.from);
    setAppliedToDate(defs.to);
  };

  const handleSetAllTime = () => {
    setFromDate("");
    setToDate("");
    setAppliedFromDate("");
    setAppliedToDate("");
  };

  // Toggle Collapse for a Client Group
  const toggleClientCollapse = (clientName: string) => {
    setCollapsedClients((prev) => ({
      ...prev,
      [clientName]: !prev[clientName],
    }));
  };

  const handleExpandAll = () => setCollapsedClients({});
  const handleCollapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    data.forEach((g) => {
      allCollapsed[g.client_name] = true;
    });
    setCollapsedClients(allCollapsed);
  };

  // Open LR View Modal
  const handleOpenLRView = async (rec: LRClientWiseRecord) => {
    try {
      const fullLR = await apiClient<LRViewRecord>(`/api/v1/transport/lrs/${rec.id}`);
      setViewModalLR(fullLR);
      setIsViewModalOpen(true);
    } catch {
      toast.error("Failed to fetch LR details.");
    }
  };

  // Sorting Handler
  const handleSort = (key: keyof LRClientWiseRecord) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  // Distinct Client Names for dropdown filter
  const clientOptions = useMemo(() => {
    return data.map((g) => g.client_name).sort();
  }, [data]);

  // Filter groups by selected client and search term
  const filteredGroups = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();

    return data
      .map((group) => {
        // If client filter is set and does not match, omit group
        if (selectedClient !== "ALL" && group.client_name !== selectedClient) {
          return null;
        }

        // Filter group records by search term
        const matchingRecords = (group.records || []).filter((r) => {
          if (!lowerSearch) return true;
          return (
            (r.lr_number && r.lr_number.toLowerCase().includes(lowerSearch)) ||
            (r.vehicle_number && r.vehicle_number.toLowerCase().includes(lowerSearch)) ||
            (r.party_invoice_no && r.party_invoice_no.toLowerCase().includes(lowerSearch)) ||
            (r.consigner_name && r.consigner_name.toLowerCase().includes(lowerSearch)) ||
            (r.consignee_name && r.consignee_name.toLowerCase().includes(lowerSearch)) ||
            (r.billing_customer && r.billing_customer.toLowerCase().includes(lowerSearch)) ||
            (r.bill_no && r.bill_no.toLowerCase().includes(lowerSearch)) ||
            (r.site_from && r.site_from.toLowerCase().includes(lowerSearch)) ||
            (r.site_to && r.site_to.toLowerCase().includes(lowerSearch)) ||
            (r.booking_status && r.booking_status.toLowerCase().includes(lowerSearch)) ||
            (r.payment_type && r.payment_type.toLowerCase().includes(lowerSearch))
          );
        });

        if (lowerSearch && matchingRecords.length === 0) {
          return null;
        }

        // Sort records within group
        const sortedRecords = [...matchingRecords].sort((a, b) => {
          const valA = a[sortKey];
          const valB = b[sortKey];

          if (valA === valB) return 0;
          if (valA === null || valA === undefined || valA === "") return 1;
          if (valB === null || valB === undefined || valB === "") return -1;

          if (typeof valA === "number" && typeof valB === "number") {
            return sortOrder === "asc" ? valA - valB : valB - valA;
          }

          const strA = String(valA).toLowerCase();
          const strB = String(valB).toLowerCase();
          return sortOrder === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
        });

        // Recalculate group subtotals from filtered records
        const subtotalWeight = sortedRecords.reduce((acc, r) => acc + Number(r.weight || 0), 0);
        const subtotalBill = sortedRecords.reduce((acc, r) => acc + Number(r.bill_amount || 0), 0);
        const subtotalPkts = sortedRecords.reduce((acc, r) => acc + Number(r.pkts || 0), 0);

        return {
          ...group,
          records: sortedRecords,
          filteredCount: sortedRecords.length,
          subtotalWeight,
          subtotalBill,
          subtotalPkts,
        };
      })
      .filter(Boolean) as (LRClientWiseGroup & {
        filteredCount: number;
        subtotalWeight: number;
        subtotalBill: number;
        subtotalPkts: number;
      })[];
  }, [data, selectedClient, searchTerm, sortKey, sortOrder]);

  // Overall Totals
  const overallTotals = useMemo(() => {
    let clientsCount = filteredGroups.length;
    let totalLrs = 0;
    let totalWeight = 0;
    let totalFreight = 0;
    let totalDelivered = 0;
    let totalInTransit = 0;

    for (const g of filteredGroups) {
      totalLrs += g.records.length;
      totalWeight += g.subtotalWeight;
      totalFreight += g.subtotalBill;
      totalDelivered += g.records.filter((r) =>
        ["delivered", "pod received", "pod verified"].includes(String(r.booking_status || "").toLowerCase())
      ).length;
      totalInTransit += g.records.filter((r) =>
        String(r.booking_status || "").toLowerCase().includes("transit")
      ).length;
    }

    return {
      clientsCount,
      totalLrs,
      totalWeight,
      totalFreight,
      totalDelivered,
      totalInTransit,
    };
  }, [filteredGroups]);

  // Consolidated Flat Records for Unified View
  const consolidatedRecords = useMemo(() => {
    const list: LRClientWiseRecord[] = [];
    filteredGroups.forEach((g) => {
      g.records.forEach((r) => list.push(r));
    });
    return list;
  }, [filteredGroups]);

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
      resizeObserver = new ResizeObserver(() => checkScrollable());
      resizeObserver.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", checkScrollable);
      if (resizeObserver) resizeObserver.disconnect();
      if (rafScrollRef.current) cancelAnimationFrame(rafScrollRef.current);
    };
  }, [checkScrollable, filteredGroups, viewMode, visibleColumns]);

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
    if (consolidatedRecords.length === 0) {
      toast.error("No records to export.");
      return;
    }

    const activeCols = TABLE_COLUMNS.filter((col) => visibleColumns[col.key]);
    const headers = activeCols.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");

    const rows = consolidatedRecords.map((r) => {
      return activeCols
        .map((col) => {
          let val: any = r[col.key];

          // Format rules - NEVER output placeholder like "-" or "N/A"
          if (col.key === "lr_date" || col.key === "party_invoice_date" || col.key === "bill_date") {
            val = formatDateDisplay(val);
          } else if (col.key === "weight") {
            val = val && Number(val) > 0 ? Number(val).toFixed(3) : "";
          } else if (col.key === "invoice_value" || col.key === "bill_amount") {
            val = val && Number(val) > 0 ? Number(val).toFixed(2) : "";
          } else if (col.key === "pkts") {
            val = val && Number(val) > 0 ? String(val) : "";
          }

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
    link.setAttribute(
      "download",
      `LR_Client_Wise_Report_${appliedFromDate || "all"}_to_${appliedToDate || "all"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${consolidatedRecords.length} records to Excel/CSV`);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Helper to render cell value strictly following empty-cell rule (never N/A, null, undefined, dash)
  const renderCellValue = (rec: LRClientWiseRecord, colKey: keyof LRClientWiseRecord) => {
    const raw = rec[colKey];

    if (raw === null || raw === undefined || raw === "") {
      return "";
    }

    switch (colKey) {
      case "lr_number":
        return (
          <button
            type="button"
            onClick={() => handleOpenLRView(rec)}
            className="font-mono font-semibold text-[#635BFF] dark:text-[#827DFF] hover:underline cursor-pointer"
          >
            {rec.lr_number}
          </button>
        );

      case "month":
        return <span className="font-medium text-slate-700 dark:text-slate-300">{rec.month}</span>;

      case "lr_date":
      case "party_invoice_date":
      case "bill_date":
        return <span className="font-mono text-slate-700 dark:text-slate-300">{formatDateDisplay(raw as string)}</span>;

      case "invoice_value":
      case "bill_amount":
        if (Number(raw) > 0) {
          return (
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200 tabular-nums">
              ₹{Number(raw).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          );
        }
        return "";

      case "weight":
        if (Number(raw) > 0) {
          return (
            <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
              {Number(raw).toFixed(3)}
            </span>
          );
        }
        return "";

      case "pkts":
        if (Number(raw) > 0) {
          return <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">{raw}</span>;
        }
        return "";

      case "billing_status":
        const bStatus = String(raw).trim();
        if (bStatus.toLowerCase() === "billed") {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              Billed
            </span>
          );
        } else if (bStatus.toLowerCase() === "unbilled") {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Unbilled
            </span>
          );
        }
        return bStatus;

      case "booking_status":
        const s = String(raw).trim();
        const lowerS = s.toLowerCase();
        let badgeColor = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700";
        if (lowerS.includes("deliver") || lowerS.includes("verified")) {
          badgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800";
        } else if (lowerS.includes("transit")) {
          badgeColor = "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border-blue-300 dark:border-blue-800";
        } else if (lowerS.includes("cancel")) {
          badgeColor = "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border-rose-300 dark:border-rose-800";
        }
        return (
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border", badgeColor)}>
            {s}
          </span>
        );

      default:
        return <span className="text-slate-700 dark:text-slate-300">{String(raw)}</span>;
    }
  };

  const activeColumns = useMemo(
    () => TABLE_COLUMNS.filter((col) => visibleColumns[col.key]),
    [visibleColumns]
  );

  return (
    <div className="space-y-4 print:p-0 print:m-0 font-sans">
      {/* ---------------------------------------------------------------------- */}
      {/* 1. Header Section                                                      */}
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
          <span className="text-slate-200 font-semibold">LR Client-Wise</span>
        </nav>

        {/* Title & Refresh Button */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              LR Client-Wise Report
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Consignment volume, freight turnover, and delivery performance grouped by client.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              icon={<RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />}
            >
              Refresh Report
            </Button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
          {errorMessage}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 2. KPI Summary Cards                                                   */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
        <div className="p-3.5 bg-white dark:bg-[#121319] border border-slate-200 dark:border-[#22232E] rounded-xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
            <Building2 className="w-3.5 h-3.5 text-[#635BFF]" />
            <span>Clients</span>
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {overallTotals.clientsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active billed parties</div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#121319] border border-slate-200 dark:border-[#22232E] rounded-xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
            <Truck className="w-3.5 h-3.5 text-[#027A48]" />
            <span>Total LRs</span>
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {overallTotals.totalLrs}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Consignments booked</div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#121319] border border-slate-200 dark:border-[#22232E] rounded-xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
            <Scale className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Total Weight</span>
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {overallTotals.totalWeight.toFixed(2)} MT
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Chargeable tonnage</div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#121319] border border-slate-200 dark:border-[#22232E] rounded-xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
            <Wallet className="w-3.5 h-3.5 text-[#027A48]" />
            <span>Total Freight</span>
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            ₹{overallTotals.totalFreight.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Freight turnover</div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#121319] border border-slate-200 dark:border-[#22232E] rounded-xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A]" />
            <span>Delivered</span>
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {overallTotals.totalDelivered}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">POD verified / arrived</div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#121319] border border-slate-200 dark:border-[#22232E] rounded-xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-[#B54708]" />
            <span>In Transit</span>
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
            {overallTotals.totalInTransit}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Vehicles on road</div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. Filter Bar                                                          */}
      {/* ---------------------------------------------------------------------- */}
      <div className="p-4 bg-white dark:bg-[#121319] border border-slate-200 dark:border-[#22232E] rounded-xl shadow-xs space-y-3.5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* From Date */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 px-2.5 text-xs bg-slate-50 dark:bg-[#0D0E12] border border-slate-300 dark:border-[#2B2C37] rounded-md text-slate-900 dark:text-white focus:ring-1 focus:ring-[#635BFF] focus:outline-none"
              />
            </div>

            {/* To Date */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 px-2.5 text-xs bg-slate-50 dark:bg-[#0D0E12] border border-slate-300 dark:border-[#2B2C37] rounded-md text-slate-900 dark:text-white focus:ring-1 focus:ring-[#635BFF] focus:outline-none"
              />
            </div>

            <Button size="sm" onClick={handleApplyFilter} className="h-8 text-xs font-medium">
              Apply
            </Button>

            {/* Preset Buttons */}
            <div className="flex items-center gap-1 pl-1">
              <button
                type="button"
                onClick={handleSetThisMonth}
                className="px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1F202B] rounded border border-slate-200 dark:border-[#2A2B37] transition-colors"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={handleSetFY}
                className="px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1F202B] rounded border border-slate-200 dark:border-[#2A2B37] transition-colors"
              >
                FY 2026-27
              </button>
              <button
                type="button"
                onClick={handleSetAllTime}
                className="px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1F202B] rounded border border-slate-200 dark:border-[#2A2B37] transition-colors"
              >
                All Time
              </button>
            </div>
          </div>

          {/* Client Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              Client:
            </span>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="h-8 px-2.5 text-xs bg-slate-50 dark:bg-[#0D0E12] border border-slate-300 dark:border-[#2B2C37] rounded-md text-slate-900 dark:text-white focus:ring-1 focus:ring-[#635BFF] focus:outline-none max-w-[220px]"
            >
              <option value="ALL">All Clients ({data.length})</option>
              {clientOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {(selectedClient !== "ALL" || searchTerm || appliedFromDate !== defaultDates.from) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:underline font-medium"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. Table Controls Toolbar                                              */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-[#121319] border border-slate-200 dark:border-[#22232E] rounded-xl shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 dark:border-[#22232E] flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>LR Records</span>
              <span className="px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#1C1D26] border border-slate-200 dark:border-[#2D2E3A] rounded-md font-medium">
                {overallTotals.totalLrs} LRs across {overallTotals.clientsCount} Clients
              </span>
            </h2>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-[#0D0E12] p-0.5 rounded-lg border border-slate-200 dark:border-[#2A2B37]">
              <button
                type="button"
                onClick={() => setViewMode("grouped")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  viewMode === "grouped"
                    ? "bg-white dark:bg-[#1F202B] text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Client Grouped
              </button>
              <button
                type="button"
                onClick={() => setViewMode("consolidated")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  viewMode === "consolidated"
                    ? "bg-white dark:bg-[#1F202B] text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Unified Table
              </button>
            </div>

            {viewMode === "grouped" && filteredGroups.length > 1 && (
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="text-[#635BFF] hover:underline font-medium"
                >
                  Expand All
                </button>
                <span className="text-slate-400">·</span>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="text-slate-500 hover:underline font-medium"
                >
                  Collapse All
                </button>
              </div>
            )}
          </div>

          {/* Right Toolbar Controls: Search, Columns Dropdown, Export Excel, Print */}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Integrated Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Gr No, vehicle, invoice, bill..."
                className="h-8 w-56 sm:w-64 pl-8 pr-7 text-xs bg-slate-50 dark:bg-[#0D0E12] border border-slate-200 dark:border-[#2B2C37] rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Column Visibility Dropdown (Global UI location & style matching lr-register) */}
            <div className="relative" ref={colMenuRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsColMenuOpen(!isColMenuOpen)}
                icon={<SlidersHorizontal className="w-3.5 h-3.5 text-[#635BFF]" />}
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
                    {TABLE_COLUMNS.map((col) => (
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
        {/* Column Slider (Global UI theme: #635BFF knob and icon)               */}
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
            {/* Table Header: Yellow/Amber matching the reference image */}
            <thead className="bg-[#f59e0b] dark:bg-[#d97706] text-slate-900 dark:text-slate-950 font-bold select-none border-b border-amber-600">
              <tr>
                {activeColumns.map((col) => {
                  const isSorted = sortKey === col.key;
                  const isFirstSticky = col.key === "lr_number";
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{ minWidth: col.minWidth }}
                      className={cn(
                        "py-3 px-3 font-semibold tracking-tight cursor-pointer hover:bg-amber-500 dark:hover:bg-amber-600 transition-colors whitespace-nowrap border-r border-amber-600/30 last:border-r-0",
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                        isFirstSticky && "sticky left-0 z-20 bg-[#f59e0b] dark:bg-[#d97706]",
                        isFirstSticky && canScrollHorizontally && scrollPosition > 10 && "shadow-[3px_0_6px_-2px_rgba(0,0,0,0.35)]"
                      )}
                    >
                      <div className={cn("inline-flex items-center gap-1.5", col.align === "right" && "justify-end")}>
                        <span>{col.label}</span>
                        {isSorted ? (
                          sortOrder === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-950 font-bold" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-950 font-bold" />
                          )
                        ) : (
                          <div className="flex flex-col text-[8px] leading-[6px] opacity-60">
                            <span>▲</span>
                            <span>▼</span>
                          </div>
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
                // Loading Skeleton Rows
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse bg-white dark:bg-[#121319]">
                    {activeColumns.map((col) => (
                      <td key={col.key} className="py-3 px-3">
                        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredGroups.length === 0 || overallTotals.totalLrs === 0 ? (
                // Clean Empty State: "No data available in table" (Exact string from reference UI)
                <tr>
                  <td
                    colSpan={activeColumns.length}
                    className="py-12 text-center text-slate-600 dark:text-slate-400 bg-white dark:bg-[#121319] font-medium"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileSpreadsheet className="w-8 h-8 text-amber-500/70" />
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        No data available in table
                      </div>
                      <p className="text-xs text-slate-400">
                        No LR records match the current reporting filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : viewMode === "grouped" ? (
                // Grouped By Client View
                filteredGroups.map((group) => {
                  const isCollapsed = Boolean(collapsedClients[group.client_name]);

                  return (
                    <React.Fragment key={group.client_name}>
                      {/* Client Group Banner Row */}
                      <tr className="bg-slate-100/90 dark:bg-[#181924] border-t-2 border-slate-300 dark:border-[#2D2E3F]">
                        <td
                          colSpan={activeColumns.length}
                          className="py-2.5 px-3.5 sticky left-0 z-10"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => toggleClientCollapse(group.client_name)}
                                className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#252636] transition-colors"
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>

                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {group.client_name}
                              </span>

                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                {group.client_type}
                              </span>

                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                ({group.records.length} LRs)
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                              <span>
                                Weight:{" "}
                                <strong className="text-slate-900 dark:text-white">
                                  {group.subtotalWeight.toFixed(3)} MT
                                </strong>
                              </span>
                              {group.subtotalBill > 0 && (
                                <span>
                                  Turnover:{" "}
                                  <strong className="text-emerald-600 dark:text-emerald-400">
                                    ₹{group.subtotalBill.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </strong>
                                </span>
                              )}
                              <span>
                                Delivered:{" "}
                                <strong className="text-slate-900 dark:text-white">
                                  {group.delivered_count}
                                </strong>
                              </span>
                              <span>
                                In Transit:{" "}
                                <strong className="text-amber-600 dark:text-amber-400">
                                  {group.in_transit_count}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Group's LR Records */}
                      {!isCollapsed &&
                        group.records.map((rec) => (
                          <tr
                            key={rec.id}
                            className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors group bg-white dark:bg-[#121319]"
                          >
                            {activeColumns.map((col) => {
                              const isFirstSticky = col.key === "lr_number";
                              return (
                                <td
                                  key={col.key}
                                  className={cn(
                                    "py-2.5 px-3 whitespace-nowrap border-r border-slate-100 dark:border-[#1E1F2A] last:border-r-0",
                                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                                    isFirstSticky && "sticky left-0 z-10 bg-white dark:bg-[#121319] group-hover:bg-amber-50/50 dark:group-hover:bg-[#161720]",
                                    isFirstSticky && canScrollHorizontally && scrollPosition > 10 && "shadow-[3px_0_6px_-2px_rgba(0,0,0,0.35)]"
                                  )}
                                >
                                  {renderCellValue(rec, col.key)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}

                      {/* Subtotal Footer per Client Group */}
                      {!isCollapsed && group.records.length > 1 && (
                        <tr className="bg-slate-50 dark:bg-[#14151E] font-semibold text-[11px] text-slate-700 dark:text-slate-300 border-b border-slate-300 dark:border-[#252636]">
                          {activeColumns.map((col, cIdx) => {
                            const isFirst = cIdx === 0;
                            const isFirstSticky = col.key === "lr_number";

                            if (isFirst) {
                              return (
                                <td
                                  key={col.key}
                                  className={cn(
                                    "py-2 px-3",
                                    isFirstSticky && "sticky left-0 z-10 bg-slate-50 dark:bg-[#14151E]"
                                  )}
                                >
                                  Subtotal ({group.records.length})
                                </td>
                              );
                            }

                            if (col.key === "weight") {
                              return (
                                <td key={col.key} className="py-2 px-3 text-right font-mono tabular-nums">
                                  {group.subtotalWeight.toFixed(3)}
                                </td>
                              );
                            }

                            if (col.key === "pkts") {
                              return (
                                <td key={col.key} className="py-2 px-3 text-right font-mono tabular-nums">
                                  {group.subtotalPkts > 0 ? group.subtotalPkts : ""}
                                </td>
                              );
                            }

                            if (col.key === "bill_amount") {
                              return (
                                <td key={col.key} className="py-2 px-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                                  {group.subtotalBill > 0
                                    ? `₹${group.subtotalBill.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                    : ""}
                                </td>
                              );
                            }

                            return <td key={col.key} className="py-2 px-3"></td>;
                          })}
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                // Consolidated Unified View
                consolidatedRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors group bg-white dark:bg-[#121319]"
                  >
                    {activeColumns.map((col) => {
                      const isFirstSticky = col.key === "lr_number";
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            "py-2.5 px-3 whitespace-nowrap border-r border-slate-100 dark:border-[#1E1F2A] last:border-r-0",
                            col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                            isFirstSticky && "sticky left-0 z-10 bg-white dark:bg-[#121319] group-hover:bg-amber-50/50 dark:group-hover:bg-[#161720]",
                            isFirstSticky && canScrollHorizontally && scrollPosition > 10 && "shadow-[3px_0_6px_-2px_rgba(0,0,0,0.35)]"
                          )}
                        >
                          {renderCellValue(rec, col.key)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>

            {/* Table Footer: Overall Totals across all visible data */}
            {overallTotals.totalLrs > 0 && (
              <tfoot className="bg-slate-100 dark:bg-[#171822] text-slate-800 dark:text-slate-200 font-bold border-t-2 border-slate-300 dark:border-[#2C2D3E]">
                <tr>
                  {activeColumns.map((col, cIdx) => {
                    const isFirst = cIdx === 0;
                    const isFirstSticky = col.key === "lr_number";

                    if (isFirst) {
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            "py-3 px-3",
                            isFirstSticky && "sticky left-0 z-20 bg-slate-100 dark:bg-[#171822]"
                          )}
                        >
                          Total ({overallTotals.totalLrs} LRs)
                        </td>
                      );
                    }

                    if (col.key === "weight") {
                      return (
                        <td key={col.key} className="py-3 px-3 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                          {overallTotals.totalWeight.toFixed(3)}
                        </td>
                      );
                    }

                    if (col.key === "pkts") {
                      const totalPkts = consolidatedRecords.reduce((acc, r) => acc + Number(r.pkts || 0), 0);
                      return (
                        <td key={col.key} className="py-3 px-3 text-right font-mono tabular-nums">
                          {totalPkts > 0 ? totalPkts : ""}
                        </td>
                      );
                    }

                    if (col.key === "bill_amount") {
                      return (
                        <td key={col.key} className="py-3 px-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                          {overallTotals.totalFreight > 0
                            ? `₹${overallTotals.totalFreight.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : ""}
                        </td>
                      );
                    }

                    return <td key={col.key} className="py-3 px-3"></td>;
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 5. LR View Modal                                                       */}
      {/* ---------------------------------------------------------------------- */}
      {viewModalLR && (
        <LRViewModal
          isOpen={isViewModalOpen}
          lr={viewModalLR}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewModalLR(null);
          }}
        />
      )}
    </div>
  );
}
