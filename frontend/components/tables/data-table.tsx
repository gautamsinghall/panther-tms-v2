"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  FileSpreadsheet,
  AlertCircle,
  RotateCcw,
  CheckSquare,
  Square,
  Download,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/badge";
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
  pageSizeOptions?: number[];
  initialPageSize?: number;
  emptyMessage?: string;
  emptySubtext?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  defaultDensity?: TableDensity;
  toolbarExtra?: React.ReactNode;
  selectable?: boolean;
  bulkActions?: BulkActionDef<T>[];
  getRowId?: (row: T, index: number) => string | number;
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
  pageSizeOptions = [10, 25, 50, 100],
  initialPageSize = 10,
  emptyMessage = "No records found",
  emptySubtext = "Try adjusting your search query or filters.",
  emptyAction,
  defaultDensity = "comfortable",
  toolbarExtra,
  selectable = true,
  bulkActions = [],
  getRowId,
}: DataTableProps<T>) {
  const activeSearchCol = searchColumn || searchField;
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [density, setDensity] = useState<TableDensity>(defaultDensity);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

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
    const headers = columns.map((c) => c.header).join(",");
    const rows = selectedRowsList.map((row) =>
      columns.map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(",")
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

  const cellPaddingClass = density === "comfortable" ? "py-3 px-4" : "py-2 px-3";

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
        (searchable || toolbarExtra) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            {/* Search Input */}
            {searchable && (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Right Tools: Extra Controls + Density Toggle */}
            <div className="flex items-center gap-2 justify-end shrink-0">
              {toolbarExtra}

              {/* Density Toggle */}
              <button
                type="button"
                onClick={() => setDensity(density === "comfortable" ? "compact" : "comfortable")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
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
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Sticky Header */}
            <thead className="sticky top-0 z-10 bg-slate-50/90 border-b border-slate-200/80 backdrop-blur-xs">
              <tr>
                {/* Select All Checkbox Column */}
                {selectable && (
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      aria-label="Select all current page"
                    />
                  </th>
                )}

                {columns.map((col) => {
                  const isSorted = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wider text-slate-500 select-none font-mono",
                        cellPaddingClass,
                        col.align === "right" || col.isNumeric ? "text-right" : "",
                        col.align === "center" ? "text-center" : "",
                        col.sortable ? "cursor-pointer hover:text-slate-900" : ""
                      )}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          col.align === "right" || col.isNumeric ? "justify-end w-full" : "",
                          col.align === "center" ? "justify-center w-full" : ""
                        )}
                      >
                        <span>{col.header}</span>
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
                  <th className="w-12 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
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
                      <td className="px-4 py-3 text-center">
                        <Skeleton className="w-4 h-4 rounded mx-auto" />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key} className={cellPaddingClass}>
                        <Skeleton className="h-4 w-3/4 rounded" />
                      </td>
                    ))}
                    {actions.length > 0 && (
                      <td className="px-4 py-3 text-right">
                        <Skeleton className="h-4 w-6 rounded ml-auto" />
                      </td>
                    )}
                  </tr>
                ))}

              {/* 2. Error State */}
              {!isLoading && isError && (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                    className="py-14 text-center"
                  >
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600 shadow-2xs">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        Unable to load records
                      </p>
                      <p className="text-xs text-slate-500 leading-normal">
                        {errorMessage || "An unexpected network or database error occurred."}
                      </p>
                      {onRetry && (
                        <Button variant="secondary" size="sm" onClick={onRetry} className="gap-1.5 rounded-xl">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* 3. Empty State */}
              {!isLoading && !isError && paginatedData.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                    className="py-16 text-center"
                  >
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center mx-auto text-slate-400 shadow-2xs">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {emptyMessage}
                      </h4>
                      <p className="text-xs text-slate-500 leading-normal">
                        {emptySubtext}
                      </p>
                      {emptyAction && (
                        <Button variant="primary" size="sm" onClick={emptyAction.onClick} className="rounded-xl shadow-xs">
                          {emptyAction.label}
                        </Button>
                      )}
                    </div>
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
                        <td className="w-10 px-4 py-3 text-center">
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
                      {columns.map((col) => {
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              "text-xs sm:text-[13px] text-slate-800 font-medium",
                              cellPaddingClass,
                              col.align === "right" || col.isNumeric ? "text-right tabular-nums font-mono" : "",
                              col.align === "center" ? "text-center" : ""
                            )}
                          >
                            {col.cell ? col.cell(row, rIndex) : (row[col.key] ?? "-")}
                          </td>
                        );
                      })}

                      {/* Row Actions: Kebab Menu */}
                      {actions.length > 0 && (
                        <td className="w-12 px-4 py-3 text-right">
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
          <div className="px-4 py-3 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            {/* Range info */}
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-900 font-mono">
                {(validPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900 font-mono">
                {Math.min(validPage * pageSize, totalItems)}
              </span>{" "}
              of <span className="font-semibold text-slate-900 font-mono">{totalItems}</span> records
            </div>

            {/* Page Buttons & Page Size */}
            <div className="flex items-center gap-3">
              {/* Page size selector */}
              <div className="flex items-center gap-1.5">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Numbered Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={validPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
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
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "border border-slate-200 text-slate-700 hover:bg-slate-50"
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
                  className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
