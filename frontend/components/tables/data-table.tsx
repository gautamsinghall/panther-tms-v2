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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/badge";
import { ColumnDef, RowAction, SortDirection, TableDensity } from "@/types/table";

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchColumn?: keyof T | string;
  searchField?: keyof T | string;
  actions?: RowAction<T>[];
  pageSizeOptions?: number[];
  initialPageSize?: number;
  emptyMessage?: string;
  emptySubtext?: string;
  defaultDensity?: TableDensity;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  searchable = true,
  searchPlaceholder = "Search records...",
  searchColumn,
  searchField,
  actions = [],
  pageSizeOptions = [10, 25, 50, 100],
  initialPageSize = 10,
  emptyMessage = "No records found",
  emptySubtext = "Try adjusting your search query or filters.",
  defaultDensity = "comfortable",
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
    let result = [...data];

    // Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) => {
        if (activeSearchCol && row[activeSearchCol] !== undefined) {
          return String(row[activeSearchCol]).toLowerCase().includes(term);
        }
        // Search across all string/number fields
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
  }, [data, searchTerm, searchColumn, sortKey, sortDirection]);

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

  const cellPadding = density === "comfortable" ? "py-3 px-4" : "py-1.5 px-3 text-xs";
  const headerPadding = density === "comfortable" ? "py-3 px-4" : "py-2 px-3 text-xs";

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* Top Filter & Density Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        {searchable && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Density toggle button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDensity(density === "comfortable" ? "compact" : "comfortable")}
            className="text-xs h-8"
            title="Toggle comfortable / compact density"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-slate-500" />
            <span className="capitalize">{density}</span>
          </Button>

          {/* Page size selector */}
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Surface */}
      <div className="relative w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/90 dark:border-slate-700 dark:text-slate-400">
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
                      col.sortable && "cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div
                      className={cn(
                        "inline-flex items-center gap-1",
                        col.align === "right" && "justify-end w-full",
                        col.align === "center" && "justify-center w-full"
                      )}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            sortDirection === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[var(--color-primary)]" />
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
          <tbody className="divide-y divide-slate-100 text-sm text-slate-800 dark:divide-slate-800/80 dark:text-slate-200">
            {isLoading ? (
              // Loading Skeleton State per design.md §3
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx}>
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className={cellPadding}>
                      <Skeleton className="h-4 w-3/4" />
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className={cellPadding}>
                      <Skeleton className="h-4 w-6 mx-auto" />
                    </td>
                  )}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              // Empty State per design.md §3
              <tr>
                <td
                  colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                  className="py-12 px-4 text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {emptyMessage}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm">{emptySubtext}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Real Data Rows
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
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
                            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 dark:hover:bg-slate-800 dark:text-slate-400"
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
      {!isLoading && filteredAndSortedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {Math.min(filteredAndSortedData.length, (currentPage - 1) * pageSize + 1)}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {Math.min(filteredAndSortedData.length, currentPage * pageSize)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
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
            <span className="px-2 py-1 font-medium text-slate-700 dark:text-slate-200">
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
