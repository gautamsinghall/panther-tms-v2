import React from "react";
import { Search, X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterItem {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: FilterItem[];
  onClear?: () => void;
  hasActiveFilters?: boolean;
  extraControls?: React.ReactNode;
  className?: string;
}

/**
 * FilterBar pattern per docs/design.md §4:
 * [ Search... ] [ Filter ▼ ] [ Clear ]
 */
export function FilterBar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search records...",
  filters = [],
  onClear,
  hasActiveFilters,
  extraControls,
  className,
}: FilterBarProps) {
  const activeCount =
    (searchValue.trim() ? 1 : 0) +
    filters.filter((f) => f.value && f.value !== "ALL" && f.value !== "").length;

  const showClear = hasActiveFilters ?? activeCount > 0;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-card border border-[#E4E7EC]",
        className
      )}
    >
      {/* Search & Filter Group */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1">
        {onSearchChange && (
          <div className="relative w-full sm:w-64 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085] pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-control border border-[#E4E7EC] bg-white text-[#101828] placeholder:text-[#667085] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:border-[#4F46E5] transition-colors"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#667085] hover:text-[#101828]"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Dynamic Select Filters */}
        {filters.map((filter) => (
          <div key={filter.id} className="relative">
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className={cn(
                "h-8 px-2.5 pr-7 text-xs rounded-control border bg-white text-[#101828] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] appearance-none cursor-pointer transition-colors",
                filter.value && filter.value !== "ALL" && filter.value !== ""
                  ? "border-[#4F46E5] font-medium bg-[#EEF2FF] text-[#4338CA]"
                  : "border-[#E4E7EC] text-[#667085]"
              )}
            >
              <option value="">{filter.label}</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#667085] text-[10px]">
              ▼
            </div>
          </div>
        ))}

        {/* Clear Filters Button */}
        {showClear && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#B42318] hover:bg-[#FEF3F2] rounded-control transition-colors font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear filters</span>
          </button>
        )}
      </div>

      {/* Extra Right Controls */}
      {extraControls && (
        <div className="flex items-center gap-2 justify-end shrink-0">
          {extraControls}
        </div>
      )}
    </div>
  );
}
