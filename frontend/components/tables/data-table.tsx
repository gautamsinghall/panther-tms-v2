"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Download,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { DataState, DataStateKind } from "@/components/ui/data-state";
import { ColumnDef, RowAction, SortDirection, TableDensity } from "@/types/table";

export interface BulkActionDef<T> {
  key: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  onClick?: (selectedRows: T[]) => void;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchColumn?: keyof T | string;
  searchField?: keyof T | string;
  actions?: RowAction<T>[];
  actionLayout?: "dropdown" | "inline";
  pageSizeOptions?: number[];
  initialPageSize?: number;
  emptyMessage?: string;
  emptySubtext?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  emptyKind?: Extract<DataStateKind, "not-configured" | "not-selected" | "no-records">;
  emptyState?: React.ReactNode;
  tableClassName?: string;
  defaultDensity?: TableDensity;
  toolbarExtra?: React.ReactNode;
  selectable?: boolean;
  bulkActions?: BulkActionDef<T>[];
  getRowId?: (row: T, index: number) => string | number;
  enableColumnToggle?: boolean;
  enableColumnSlider?: boolean;
  tableId?: string;
}

/**
 * Enterprise DataTable:
 * - Sticky header with slate-50 background, uppercase tracking
 * - High-clarity hover states and selected row highlights
 * - Right-aligned numeric/currency columns with tabular font-mono
 * - Row actions kebab menu
 * - Contextual bulk-action toolbar
 * - Refined empty, loading skeleton, and error states
 * - High-precision pagination controls
 */
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
  searchable = true,
  searchPlaceholder = "Search records...",
  searchColumn,
  searchField,
  actions = [],
  actionLayout = "dropdown",
  pageSizeOptions = [10, 25, 50, 100],
  initialPageSize = 10,
  emptyMessage = "No records yet",
  emptySubtext,
  emptyAction,
  emptyKind = "no-records",
  emptyState,
  tableClassName,
  defaultDensity = "comfortable",
  toolbarExtra,
  selectable = true,
  bulkActions = [],
  getRowId,
  enableColumnToggle = true,
  enableColumnSlider = true,
  tableId,
}: DataTableProps<T>) {
  const activeSearchCol = searchColumn || searchField;
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [density, setDensity] = useState<TableDensity>(defaultDensity);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // 1. Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    columns.forEach((c, idx) => {
      const k = (c.key || c.id || `col-${idx}`) as string;
      initial[k] = c.defaultVisible !== false;
    });
    if (typeof window !== "undefined" && tableId) {
      try {
        const saved = localStorage.getItem(`dt_cols_${tableId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...initial, ...parsed };
        }
      } catch {}
    }
    return initial;
  });

  useEffect(() => {
    setVisibleColumns((prev) => {
      const next = { ...prev };
      let changed = false;
      columns.forEach((c, idx) => {
        const k = (c.key || c.id || `col-${idx}`) as string;
        if (next[k] === undefined) {
          next[k] = c.defaultVisible !== false;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [columns]);

  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(event.target as Node)) {
        setIsColMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== "undefined" && tableId) {
        try {
          localStorage.setItem(`dt_cols_${tableId}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const handleSelectAllColumns = () => {
    const all: Record<string, boolean> = {};
    columns.forEach((c, idx) => {
      const k = (c.key || c.id || `col-${idx}`) as string;
      all[k] = true;
    });
    setVisibleColumns(all);
    if (typeof window !== "undefined" && tableId) {
      try {
        localStorage.setItem(`dt_cols_${tableId}`, JSON.stringify(all));
      } catch {}
    }
  };

  const handleResetColumns = () => {
    const reset: Record<string, boolean> = {};
    columns.forEach((c, idx) => {
      const k = (c.key || c.id || `col-${idx}`) as string;
      reset[k] = c.defaultVisible !== false;
    });
    setVisibleColumns(reset);
    if (typeof window !== "undefined" && tableId) {
      try {
        localStorage.removeItem(`dt_cols_${tableId}`);
      } catch {}
    }
  };

  const activeColumns = useMemo(() => {
    if (!enableColumnToggle) return columns;
    return columns.filter((col, idx) => {
      const k = (col.key || col.id || `col-${idx}`) as string;
      return visibleColumns[k] !== false;
    });
  }, [columns, visibleColumns, enableColumnToggle]);


  const resolveRowId = (row: T, index: number): string | number => {
    if (getRowId) return getRowId(row, index);
    return row.id ?? row._id ?? index;
  };

  const handleSort = (columnKey: string) => {
    if (sortKey === columnKey) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(columnKey);
      setSortDirection("asc");
    }
  };

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase().trim();

    return data.filter((row) => {
      if (activeSearchCol && row[activeSearchCol] !== undefined) {
        return String(row[activeSearchCol]).toLowerCase().includes(term);
      }
      return Object.values(row).some((val) =>
        String(val ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm, activeSearchCol]);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData;

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

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedData = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, validPage, pageSize]);

  // 2. Table Horizontal Scroll & Column Slider State
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rafScrollRef = useRef<number | null>(null);
  const [canScrollHorizontally, setCanScrollHorizontally] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScrollLeft, setMaxScrollLeft] = useState(0);

  const checkScrollable = useCallback(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 4;
    setCanScrollHorizontally(hasOverflow);
    setMaxScrollLeft(Math.max(0, el.scrollWidth - el.clientWidth));
    setScrollPosition(el.scrollLeft);
  }, []);

  useEffect(() => {
    if (!enableColumnSlider) return;
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
  }, [checkScrollable, enableColumnSlider, activeColumns, paginatedData]);

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

  const allCurrentPageSelected = useMemo(() => {
    if (paginatedData.length === 0) return false;
    return paginatedData.every((row, idx) => selectedIds.has(resolveRowId(row, idx)));
  }, [paginatedData, selectedIds]);

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allCurrentPageSelected) {
      paginatedData.forEach((row, idx) => next.delete(resolveRowId(row, idx)));
    } else {
      paginatedData.forEach((row, idx) => next.add(resolveRowId(row, idx)));
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id: string | number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const selectedRowsList = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return data.filter((row, idx) => selectedIds.has(resolveRowId(row, idx)));
  }, [data, selectedIds]);

  const handleExportSelected = () => {
    if (selectedRowsList.length === 0) return;
    const headers = activeColumns.map((c) => c.header || c.label || c.key || c.id || "").join(",");
    const rows = selectedRowsList.map((row) =>
      activeColumns.map((c) => `"${String(row[c.key || c.id || ""] ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `panther_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cellPaddingClass = density === "comfortable" ? "py-2.5 px-3" : "py-1.5 px-2";
  const checkboxPaddingClass = density === "comfortable" ? "py-2.5 px-3" : "py-1.5 px-2";

  const paginationButtons = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (validPage > 3) pages.push("...");
      const start = Math.max(2, validPage - 1);
      const end = Math.min(totalPages - 1, validPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (validPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [validPage, totalPages]);

  return (
    <div className="space-y-3">
      {/* Contextual Bulk Action Bar OR Standard Search & Density Bar */}
      {selectedIds.size > 0 ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 px-4 py-2.5 rounded-2xl transition-all duration-150 animate-in fade-in shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-indigo-700">
              {selectedIds.size} {selectedIds.size === 1 ? "record" : "records"} selected
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
            >
              Cancel selection
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {bulkActions.map((action) => (
              <Button
                key={action.key}
                variant={action.variant || "secondary"}
                size="sm"
                onClick={() => action.onClick && action.onClick(selectedRowsList)}
                className="h-8 text-xs font-semibold rounded-xl"
              >
                {action.icon}
                <span>{action.label}</span>
              </Button>
            ))}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportSelected}
              className="gap-1.5 h-8 text-xs font-semibold rounded-xl"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Selected</span>
            </Button>
          </div>
        </div>
      ) : (
        (searchable || toolbarExtra || enableColumnToggle) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-white dark:bg-[#17171B] p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 dark:border-[#303036] shadow-2xs">
            {/* Search Input */}
            {searchable && (
              <div className="relative w-full sm:max-w-md flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#333546] bg-white dark:bg-[#111219] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Right Tools: Extra Controls + Columns Toggle + Density Toggle */}
            <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0 w-full sm:w-auto ml-auto">
              {toolbarExtra}

              {/* Columns Visibility Dropdown */}
              {enableColumnToggle && (
                <div className="relative" ref={colMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsColMenuOpen(!isColMenuOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#181922] hover:bg-slate-100 dark:hover:bg-[#20222E] border border-slate-200 dark:border-[#2B2C37] rounded-xl transition-all shadow-2xs cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Columns</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isColMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-[#181922] border border-slate-200 dark:border-[#2D2E3A] rounded-xl shadow-xl p-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-[#272835] font-semibold text-slate-900 dark:text-slate-200">
                        <span>Columns Visibility</span>
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={handleSelectAllColumns}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            All
                          </button>
                          <span className="text-slate-400">·</span>
                          <button
                            type="button"
                            onClick={handleResetColumns}
                            className="text-slate-400 hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                        {columns.map((col, idx) => {
                          const colKey = (col.key || col.id || `col-${idx}`) as string;
                          const colLabel = col.header || col.label || colKey;
                          return (
                            <label
                              key={colKey}
                              className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 dark:hover:bg-[#20222E] rounded-md cursor-pointer text-slate-700 dark:text-slate-300 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={visibleColumns[colKey] !== false}
                                onChange={() => toggleColumn(colKey)}
                                className="rounded border-slate-300 dark:border-[#3D3E4E] text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer accent-indigo-600"
                              />
                              <span className="select-none truncate">{colLabel}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Density Toggle */}
              <button
                type="button"
                onClick={() => setDensity(density === "comfortable" ? "compact" : "comfortable")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#181922] hover:bg-slate-100 dark:hover:bg-[#20222E] border border-slate-200 dark:border-[#2B2C37] rounded-xl transition-all shadow-2xs cursor-pointer"
                title={`Current: ${density}. Click to switch.`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline capitalize">{density}</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* Main Table Container */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-[#2D303E] bg-white dark:bg-[#111219] shadow-2xs overflow-hidden">
        {/* Horizontal Column Slider (Rendered whenever columns overflow) */}
        {enableColumnSlider && canScrollHorizontally && (
          <div className="px-4 py-2 bg-slate-50/90 dark:bg-[#0F1015] border-b border-slate-200/80 dark:border-[#22232E] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 print:hidden animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Columns Slider</span>
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                (Slide horizontally to view all columns)
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleScrollBy(-240)}
                disabled={scrollPosition <= 0}
                aria-label="Slide Left"
                className="w-7 h-7 rounded-lg bg-white dark:bg-[#171821] hover:bg-slate-100 dark:hover:bg-[#20222E] border border-slate-200 dark:border-[#2B2C37] text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
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
                  className="w-36 sm:w-64 h-2 bg-slate-200 dark:bg-[#1A1B24] border border-slate-300 dark:border-[#2B2C37] rounded-lg appearance-none cursor-pointer accent-indigo-600 transition-all"
                />
              </div>

              <button
                type="button"
                onClick={() => handleScrollBy(240)}
                disabled={scrollPosition >= maxScrollLeft - 2}
                aria-label="Slide Right"
                className="w-7 h-7 rounded-lg bg-white dark:bg-[#171821] hover:bg-slate-100 dark:hover:bg-[#20222E] border border-slate-200 dark:border-[#2B2C37] text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div ref={tableContainerRef} className="overflow-x-auto [webkit-overflow-scrolling:touch] custom-scrollbar">
          <table className={cn("w-full text-left border-collapse", tableClassName)}>
            {/* Sticky Header */}
            <thead className="sticky top-0 z-10 bg-slate-50/90 border-b border-slate-200/80 backdrop-blur-xs">
              <tr>
                {/* Select All Checkbox Column */}
                {selectable && (
                  <th className={cn("w-9 text-center", checkboxPaddingClass)}>
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      aria-label="Select all current page"
                    />
                  </th>
                )}

                {activeColumns.map((col, cIdx) => {
                  const colKey = (col.key || col.id || `col-${cIdx}`) as string;
                  const isSorted = sortKey === colKey;
                  return (
                    <th
                      key={colKey}
                      style={{ width: col.width, minWidth: col.minWidth || col.width }}
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none font-mono whitespace-nowrap",
                        cellPaddingClass,
                        col.align === "right" || col.isNumeric ? "text-right" : "",
                        col.align === "center" ? "text-center" : "",
                        col.sortable ? "cursor-pointer hover:text-slate-900 dark:hover:text-white" : ""
                      )}
                      onClick={() => col.sortable && handleSort(colKey)}
                    >
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          col.align === "right" || col.isNumeric ? "justify-end w-full" : "",
                          col.align === "center" ? "justify-center w-full" : ""
                        )}
                      >
                        <span>{col.header || col.label}</span>
                        {col.sortable && (
                          <span className="text-slate-400">
                            {isSorted && sortDirection === "asc" && (
                              <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                            {isSorted && sortDirection === "desc" && (
                              <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                            {!isSorted && <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* Actions Column */}
                {actions.length > 0 && (
                  <th
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono sticky right-0 bg-white dark:bg-[#17171B] z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.3)]",
                      cellPaddingClass,
                      actionLayout === "inline" ? "w-28 text-center" : "w-12 text-right"
                    )}
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {/* 1. Loading Skeleton State */}
              {isLoading &&
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skel-${idx}`} className="bg-white">
                    {selectable && (
                      <td className={cn("text-center", checkboxPaddingClass)}>
                        <Skeleton className="w-4 h-4 rounded mx-auto" />
                      </td>
                    )}
                    {activeColumns.map((c, idx) => (
                      <td key={(c.key || c.id || `col-${idx}`) as string} className={cellPaddingClass}>
                        <Skeleton className="h-4 w-3/4 rounded" />
                      </td>
                    ))}
                    {actions.length > 0 && (
                      <td className={cn(cellPaddingClass, "sticky right-0 bg-white dark:bg-[#17171B] z-10", actionLayout === "inline" ? "w-28 text-center" : "w-12 text-right")}>
                        <Skeleton className={cn("h-4 rounded", actionLayout === "inline" ? "w-16 mx-auto" : "w-6 ml-auto")} />
                      </td>
                    )}
                  </tr>
                ))}

              {/* 2. Error State */}
              {!isLoading && isError && (
                <tr>
                  <td
                    colSpan={activeColumns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                    className="py-14 text-center"
                  >
                    <DataState
                      kind="error"
                      description={errorMessage || "The records could not be loaded. Check your connection and try again."}
                      action={onRetry ? { label: "Retry", onClick: onRetry } : undefined}
                    />
                  </td>
                </tr>
              )}

              {/* 3. Empty State */}
              {!isLoading && !isError && paginatedData.length === 0 && (
                <tr>
                  <td
                    colSpan={activeColumns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                    className="py-16 text-center"
                  >
                    {emptyState && !searchTerm.trim() ? (
                      emptyState
                    ) : (
                    <DataState
                      kind={searchTerm.trim() ? "no-results" : emptyKind}
                      title={searchTerm.trim() ? "No search results" : emptyMessage}
                      description={
                        searchTerm.trim()
                          ? `No records match “${searchTerm.trim()}”. Clear the search or try another term.`
                          : emptySubtext || "Records will appear here after they are created."
                      }
                      action={
                        searchTerm.trim()
                          ? { label: "Clear search", onClick: () => setSearchTerm("") }
                          : emptyAction
                      }
                    />
                    )}
                  </td>
                </tr>
              )}

              {/* 4. Normal Data Rows */}
              {!isLoading &&
                !isError &&
                paginatedData.map((row, rIndex) => {
                  const rowId = resolveRowId(row, rIndex);
                  const isSelected = selectedIds.has(rowId);

                  return (
                    <tr
                      key={rowId}
                      className={cn(
                        "transition-colors",
                        isSelected
                          ? "bg-indigo-50/70 hover:bg-indigo-100/70"
                          : "hover:bg-slate-50/80"
                      )}
                    >
                      {/* Checkbox Column */}
                      {selectable && (
                        <td className={cn("w-9 text-center", checkboxPaddingClass)}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(rowId)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            aria-label={`Select row ${rowId}`}
                          />
                        </td>
                      )}

                      {/* Data Columns */}
                      {columns.map((col, cIdx) => {
                        const colKey = (col.key || col.id || `col-${cIdx}`) as string;
                        return (
                          <td
                            key={colKey}
                            style={{ width: col.width }}
                            className={cn(
                              "text-xs sm:text-[13px] text-slate-800 font-medium",
                              cellPaddingClass,
                              col.align === "right" || col.isNumeric ? "text-right tabular-nums font-mono" : "",
                              col.align === "center" ? "text-center" : ""
                            )}
                          >
                            {col.cell ? col.cell(row, rIndex) : col.render ? col.render(row, rIndex) : (row[colKey] ?? "-")}
                          </td>
                        );
                      })}

                      {/* Row Actions: Kebab Menu or Inline Icons */}
                      {actions.length > 0 && (
                        <td
                          className={cn(
                            cellPaddingClass,
                            "sticky right-0 bg-white dark:bg-[#17171B] z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.3)]",
                            actionLayout === "inline" ? "w-28 text-center" : "w-12 text-right"
                          )}
                        >
                          {actionLayout === "inline" ? (
                            <div className="inline-flex items-center justify-center gap-1">
                              {actions
                                .filter((a) => (a.hidden ? !a.hidden(row) : true))
                                .map((a, aIdx) => {
                                  const isDisabled = a.disabled ? a.disabled(row) : false;
                                  return (
                                    <button
                                      key={aIdx}
                                      type="button"
                                      disabled={isDisabled}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isDisabled) a.onClick(row);
                                      }}
                                      title={a.label}
                                      aria-label={a.label}
                                      className={cn(
                                        "p-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center",
                                        isDisabled
                                          ? "opacity-30 cursor-not-allowed text-slate-300"
                                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                      )}
                                    >
                                      {a.icon}
                                    </button>
                                  );
                                })}
                            </div>
                          ) : (
                            <DropdownMenu
                              align="right"
                              trigger={
                                <button
                                  type="button"
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Actions"
                                  aria-label="Row actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              }
                              items={actions
                                .filter((a) => (a.hidden ? !a.hidden(row) : true))
                                .map((a) => ({
                                  label: a.label,
                                  icon: a.icon,
                                  disabled: a.disabled ? a.disabled(row) : false,
                                  variant: a.variant === "danger" ? "danger" : "default",
                                  onClick: () => a.onClick(row),
                                }))}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Numbered Pagination */}
        {!isLoading && !isError && totalItems > 0 && (
          <div className="px-3.5 sm:px-4 py-3 border-t border-slate-100 dark:border-[#26262D] bg-white dark:bg-[#17171B] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-[#898991]">
            {/* Range info */}
            <div className="text-center sm:text-left">
              Showing{" "}
              <span className="font-semibold text-slate-900 dark:text-white font-mono">
                {(validPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900 dark:text-white font-mono">
                {Math.min(validPage * pageSize, totalItems)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900 dark:text-white font-mono">
                {totalItems}
              </span>{" "}
              records
            </div>

            {/* Page Buttons & Page Size */}
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Page size selector */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="hidden xs:inline">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 px-2 border border-slate-200 dark:border-[#303036] rounded-lg bg-white dark:bg-[#101013] text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile Compact Page Indicator (< sm) */}
              <div className="sm:hidden text-xs font-mono text-slate-600 dark:text-slate-400 font-semibold px-2">
                {validPage} / {totalPages}
              </div>

              {/* Numbered Buttons (Hidden on mobile < sm, visible on desktop >= sm) */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  disabled={validPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded-lg border border-slate-200 dark:border-[#303036] text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {paginationButtons.map((btn, idx) => {
                  if (btn === "...") {
                    return (
                      <span key={`dots-${idx}`} className="px-1.5 text-slate-400">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = btn === validPage;
                  return (
                    <button
                      key={`page-${btn}`}
                      type="button"
                      onClick={() => setCurrentPage(Number(btn))}
                      className={cn(
                        "min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer font-mono",
                        isCurrent
                          ? "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-xs border border-indigo-700/30 font-semibold"
                          : "border border-slate-200 dark:border-[#303036] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#202026] hover:text-slate-900"
                      )}
                    >
                      {btn}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={validPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded-lg border border-slate-200 dark:border-[#303036] text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mobile Prev / Next Buttons (< sm) */}
              <div className="flex sm:hidden items-center gap-1">
                <button
                  type="button"
                  disabled={validPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-[#303036] text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={validPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-[#303036] text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
