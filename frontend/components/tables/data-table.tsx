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
 * Enterprise DataTable per docs/design.md §5:
 * - Sticky header with --gray-50 (#F8F9FB) bg, uppercase Label-style header text
 * - Row hover with subtle --gray-50 bg
 * - Selected row with --primary-50 (#EEF2FF) bg and checkbox
 * - Right-aligned numeric/currency columns with tabular numbers
 * - Single kebab menu ("...") row actions
 * - Contextual bulk-action bar on selection
 * - Empty state with centered icon + one-line explanation + primary CTA
 * - Loading state with animated skeleton rows
 * - Page-number pagination
 * - Comfortable (12px/16px) vs Compact (8px/12px) density toggle
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
  const [density, setDensity] = useState<TableDensity>(defaultDensity);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // Helper to extract unique ID for row
  const resolveRowId = (row: T, index: number): string | number => {
    if (getRowId) return getRowId(row, index);
    return row.id ?? row.code ?? row.uuid ?? index;
  };

  // Sorting handler
  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortKey(null);
      setSortDirection(null);
    }
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let result = Array.isArray(data) ? [...data] : [];

    // Search filter
    if (searchable && searchTerm.trim()) {
      const lower = searchTerm.toLowerCase().trim();
      result = result.filter((item) => {
        if (activeSearchCol) {
          const val = item[activeSearchCol as string];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(lower);
        }
        return Object.values(item).some(
          (val) => val !== undefined && val !== null && String(val).toLowerCase().includes(lower)
        );
      });
    }

    // Sorting
    if (sortKey && sortDirection) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        const isNum = !isNaN(Number(valA)) && !isNaN(Number(valB));
        if (isNum) {
          return sortDirection === "asc"
            ? Number(valA) - Number(valB)
            : Number(valB) - Number(valA);
        }

        const comp = String(valA).localeCompare(String(valB));
        return sortDirection === "asc" ? comp : -comp;
      });
    }

    return result;
  }, [data, searchTerm, activeSearchCol, searchable, sortKey, sortDirection]);

  // Pagination calculation
  const totalItems = filteredAndSortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedData = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredAndSortedData.slice(start, start + pageSize);
  }, [filteredAndSortedData, validPage, pageSize]);

  // Selection handlers
  const allCurrentPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((row, idx) => selectedIds.has(resolveRowId(row, idx)));

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      const next = new Set(selectedIds);
      paginatedData.forEach((row, idx) => next.delete(resolveRowId(row, idx)));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      paginatedData.forEach((row, idx) => next.add(resolveRowId(row, idx)));
      setSelectedIds(next);
    }
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

  // Default export selected as CSV
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

  // Density padding styles per docs/design.md §3:
  // Comfortable: 12px vertical / 16px horizontal
  // Compact: 8px vertical / 12px horizontal
  const cellPaddingClass = density === "comfortable" ? "py-3 px-4" : "py-2 px-3";

  // Generate numbered pagination buttons
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#EEF2FF] border border-[#C7D2FE] px-4 py-2.5 rounded-card transition-all duration-150 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#4338CA]">
              {selectedIds.size} {selectedIds.size === 1 ? "record" : "records"} selected
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-[#667085] hover:text-[#101828] underline transition-colors"
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
              >
                {action.icon}
                {action.label}
              </Button>
            ))}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportSelected}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export Selected
            </Button>
          </div>
        </div>
      ) : (
        (searchable || toolbarExtra) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-card border border-[#E4E7EC]">
            {/* Search Input */}
            {searchable && (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085] pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-8 py-1.5 text-xs rounded-control border border-[#E4E7EC] bg-white text-[#101828] placeholder:text-[#667085] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:border-[#4F46E5] transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#667085] hover:text-[#101828]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Right Tools: Extra Controls + Density Toggle */}
            <div className="flex items-center gap-2 justify-end shrink-0">
              {toolbarExtra}

              {/* Density Toggle per docs/design.md §3 */}
              <button
                type="button"
                onClick={() => setDensity(density === "comfortable" ? "compact" : "comfortable")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#344054] bg-white hover:bg-[#F8F9FB] border border-[#E4E7EC] rounded-control transition-colors"
                title={`Current: ${density}. Click to switch.`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#667085]" />
                <span className="hidden sm:inline capitalize">{density}</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* Main Table Container */}
      <div className="rounded-card border border-[#E4E7EC] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Sticky Header per docs/design.md §5: --gray-50 bg, Label-style header text */}
            <thead className="sticky top-0 z-10 bg-[#F8F9FB] border-b border-[#E4E7EC]">
              <tr>
                {/* Select All Checkbox Column */}
                {selectable && (
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-[#D0D5DD] text-[#4F46E5] focus:ring-[#4F46E5] cursor-pointer"
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
                        "text-xs font-medium uppercase tracking-[0.02em] text-[#667085] select-none",
                        cellPaddingClass,
                        col.align === "right" || col.isNumeric ? "text-right" : "",
                        col.align === "center" ? "text-center" : "",
                        col.sortable ? "cursor-pointer hover:text-[#101828]" : ""
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
                          <span className="text-[#667085]">
                            {isSorted && sortDirection === "asc" && (
                              <ChevronUp className="w-3.5 h-3.5 text-[#4F46E5]" />
                            )}
                            {isSorted && sortDirection === "desc" && (
                              <ChevronDown className="w-3.5 h-3.5 text-[#4F46E5]" />
                            )}
                            {!isSorted && <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* Actions Column */}
                {actions.length > 0 && (
                  <th className="w-12 px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.02em] text-[#667085]">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#E4E7EC]">
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
                    className="py-12 text-center"
                  >
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-10 h-10 rounded-full bg-[#FEF3F2] flex items-center justify-center mx-auto text-[#F04438]">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-[#101828]">
                        Unable to load records
                      </p>
                      <p className="text-xs text-[#667085]">
                        {errorMessage || "An unexpected network or database error occurred."}
                      </p>
                      {onRetry && (
                        <Button variant="secondary" size="sm" onClick={onRetry} className="gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Retry
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* 3. Empty State per docs/design.md §5 */}
              {!isLoading && !isError && paginatedData.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                    className="py-16 text-center"
                  >
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-control bg-[#F8F9FB] border border-[#E4E7EC] flex items-center justify-center mx-auto text-[#667085]">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-[#101828]">
                        {emptyMessage}
                      </h4>
                      <p className="text-xs text-[#667085]">
                        {emptySubtext}
                      </p>
                      {emptyAction && (
                        <Button variant="primary" size="sm" onClick={emptyAction.onClick}>
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
                          ? "bg-[#EEF2FF] hover:bg-[#E0E7FF]"
                          : "hover:bg-[#F8F9FB]"
                      )}
                    >
                      {/* Checkbox Column */}
                      {selectable && (
                        <td className="w-10 px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(rowId)}
                            className="rounded border-[#D0D5DD] text-[#4F46E5] focus:ring-[#4F46E5] cursor-pointer"
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
                              "text-xs text-[#344054]",
                              cellPaddingClass,
                              col.align === "right" || col.isNumeric ? "text-right tabular-nums font-mono" : "",
                              col.align === "center" ? "text-center" : ""
                            )}
                          >
                            {col.cell ? col.cell(row, rIndex) : (row[col.key] ?? "-")}
                          </td>
                        );
                      })}

                      {/* Row Actions: Kebab Menu per docs/design.md §5 */}
                      {actions.length > 0 && (
                        <td className="w-12 px-4 py-3 text-right">
                          <DropdownMenu
                            align="right"
                            trigger={
                              <button
                                type="button"
                                className="p-1 rounded-control text-[#667085] hover:text-[#101828] hover:bg-[#E4E7EC]/50 transition-colors"
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

        {/* Numbered Pagination per docs/design.md §5 */}
        {!isLoading && !isError && totalItems > 0 && (
          <div className="px-4 py-3 border-t border-[#E4E7EC] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#667085]">
            {/* Range info */}
            <div>
              Showing{" "}
              <span className="font-semibold text-[#101828]">
                {(validPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-[#101828]">
                {Math.min(validPage * pageSize, totalItems)}
              </span>{" "}
              of <span className="font-semibold text-[#101828]">{totalItems}</span> records
            </div>

            {/* Page Buttons & Page Size */}
            <div className="flex items-center gap-3">
              {/* Page size selector */}
              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 border border-[#E4E7EC] rounded-control bg-white text-xs text-[#101828] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
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
                  className="p-1 rounded-control border border-[#E4E7EC] text-[#667085] hover:text-[#101828] hover:bg-[#F8F9FB] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {paginationButtons.map((btn, idx) => {
                  if (btn === "...") {
                    return (
                      <span key={`dots-${idx}`} className="px-1.5 text-[#667085]">
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
                        "min-w-[28px] h-7 px-2 rounded-control text-xs font-medium transition-colors",
                        isCurrent
                          ? "bg-[#4F46E5] text-white font-semibold"
                          : "border border-[#E4E7EC] text-[#344054] hover:bg-[#F8F9FB]"
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
                  className="p-1 rounded-control border border-[#E4E7EC] text-[#667085] hover:text-[#101828] hover:bg-[#F8F9FB] disabled:opacity-40 disabled:pointer-events-none transition-colors"
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
