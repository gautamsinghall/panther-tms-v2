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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/badge";
import { ColumnDef, RowAction, SortDirection, TableDensity } from "@/types/table";

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
}

/**
 * Enterprise DataTable conforming to docs/design.md §7, §12, §13, §23:
 * 
 * - Density: 52–60px comfortable, 48–52px compact
 * - Restrained typography and horizontal borders
 * - Right-aligned tabular numbers
 * - Kebab row actions
 * - Robust Loading, Empty, and Error states
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
}: DataTableProps<T>) {
  const activeSearchCol = searchColumn || searchField;
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [density, setDensity] = useState<TableDensity>(defaultDensity);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

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

    // Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) => {
        if (activeSearchCol && row[activeSearchCol] !== undefined) {
          return String(row[activeSearchCol]).toLowerCase().includes(term);
        }
        return Object.values(row).some((val) =>
          String(val ?? "").toLowerCase().includes(term)
        );
      });
    }

    // Sort
    if (sortKey && sortDirection) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === valB) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return result;
  }, [data, searchTerm, activeSearchCol, sortKey, sortDirection]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedData.slice(start, start + pageSize);
  }, [filteredAndSortedData, currentPage, pageSize]);

  // Reset page when search or pageSize changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  // Density padding: 52-60px comfortable, 48-52px compact
  const cellPadding = density === "comfortable" ? "py-3.5 px-4 text-xs sm:text-sm" : "py-2.5 px-3 text-xs";
  const headerPadding = density === "comfortable" ? "py-3 px-4 text-xs" : "py-2 px-3 text-[11px]";

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* Table Toolbar */}
      {(searchable || toolbarExtra) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-card border border-[#E4E7EC] shadow-card">
          {searchable ? (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B3] pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-control border border-[#E4E7EC] bg-[#F7F8FA] text-[#172033] placeholder:text-[#98A2B3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#172033] focus:border-[#172033] transition-colors"
              />
            </div>
          ) : <div />}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {toolbarExtra}

            {/* Density toggle button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDensity(density === "comfortable" ? "compact" : "comfortable")}
              className="text-xs h-8"
              title="Toggle density"
            >
              <SlidersHorizontal className="w-3 h-3 mr-1 text-[#667085]" />
              <span className="capitalize">{density}</span>
            </Button>

            {/* Page size selector */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 px-2 text-xs rounded-control border border-[#E4E7EC] bg-white text-[#172033] focus:outline-none focus:ring-1 focus:ring-[#172033] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / page
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Table Surface */}
      <div className="relative w-full overflow-x-auto rounded-card border border-[#E4E7EC] bg-white shadow-card">
        <table className="w-full text-left border-collapse">
          {/* Header */}
          <thead className="bg-[#F7F8FA] border-b border-[#E4E7EC] text-xs font-semibold uppercase tracking-wider text-[#667085]">
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={cn(
                      headerPadding,
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.sortable && "cursor-pointer select-none hover:text-[#172033] transition-colors"
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        col.align === "right" && "justify-end w-full",
                        col.align === "center" && "justify-center w-full"
                      )}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-[#98A2B3]">
                          {isSorted ? (
                            sortDirection === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-[#172033]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#172033]" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
              {actions.length > 0 && (
                <th className={cn(headerPadding, "w-14 text-center")}>Actions</th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#E4E7EC]/60 text-sm text-[#172033]">
            {isError ? (
              // Error State per docs/design.md §23
              <tr>
                <td
                  colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                  className="py-12 px-4 text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-[#FEF2F2] flex items-center justify-center text-[#DC2626]">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#172033]">
                        Unable to load data
                      </p>
                      <p className="text-xs text-[#667085] max-w-sm">
                        {errorMessage || "An unexpected error occurred while fetching records."}
                      </p>
                    </div>
                    {onRetry && (
                      <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Retry
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : isLoading ? (
              // Loading Skeleton State per docs/design.md §23
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx}>
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className={cellPadding}>
                      <Skeleton className="h-4 w-3/4 bg-[#E4E7EC]/70" />
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className={cellPadding}>
                      <Skeleton className="h-4 w-6 mx-auto bg-[#E4E7EC]/70" />
                    </td>
                  )}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              // Empty State per docs/design.md §23
              <tr>
                <td
                  colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                  className="py-14 px-4 text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#F2F4F7] flex items-center justify-center text-[#98A2B3]">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#172033]">
                        {emptyMessage}
                      </p>
                      <p className="text-xs text-[#667085] max-w-sm">
                        {emptySubtext}
                      </p>
                    </div>
                    {emptyAction && (
                      <Button variant="primary" size="sm" onClick={emptyAction.onClick}>
                        {emptyAction.label}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              // Real Data Rows
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-[#F7F8FA]/80 transition-colors"
                >
                  {columns.map((col) => {
                    const value = row[col.key];
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          cellPadding,
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          col.isNumeric && "tabular-nums font-mono font-medium"
                        )}
                      >
                        {col.cell ? (
                          col.cell(row, rowIndex)
                        ) : col.key.toLowerCase().includes("status") ? (
                          <StatusBadge status={String(value || "default")} />
                        ) : (
                          String(value ?? "-")
                        )}
                      </td>
                    );
                  })}

                  {/* Row Actions Menu */}
                  {actions.length > 0 && (
                    <td className={cn(cellPadding, "text-center")}>
                      <DropdownMenu
                        trigger={
                          <button
                            type="button"
                            className="p-1 rounded-control hover:bg-[#F2F4F7] text-[#667085] hover:text-[#172033] transition-colors"
                            aria-label="Row actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        }
                        items={actions
                          .filter((act) => !(act.hidden && act.hidden(row)))
                          .map((act) => ({
                            label: act.label,
                            icon: act.icon,
                            onClick: () => act.onClick(row),
                            variant: act.variant,
                            disabled: act.disabled ? act.disabled(row) : false,
                          }))}
                      />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && !isError && filteredAndSortedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1 text-xs text-[#667085]">
          <div>
            Showing{" "}
            <span className="font-semibold text-[#172033]">
              {Math.min(filteredAndSortedData.length, (currentPage - 1) * pageSize + 1)}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-[#172033]">
              {Math.min(filteredAndSortedData.length, currentPage * pageSize)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-[#172033]">
              {filteredAndSortedData.length}
            </span>{" "}
            records
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="px-2 py-1 font-medium text-[#172033]">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2.5"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
