import React from "react";
import { Search, X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";

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
 * Standardized Enterprise FilterBar:
 * [ Search records... ] [ Filter Selectors ] [ Reset Filters ]
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
        "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs",
        className
      )}
    >
      {/* Search & Filter Group */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1">
        {onSearchChange && (
          <div className="relative w-full sm:w-64 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-700 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Dynamic Select Filters */}
        {filters.map((filter) => {
          const isActive = filter.value && filter.value !== "ALL" && filter.value !== "";
          return (
            <div key={filter.id} className="relative min-w-[140px] sm:w-auto">
              <SearchableSelect
                size="sm"
                value={filter.value}
                onChange={(val) => filter.onChange(String(val))}
                options={filter.options}
                placeholder={filter.label}
                searchPlaceholder={`Filter ${filter.label}...`}
                buttonClassName={cn(
                  "h-9 rounded-xl pr-2.5",
                  isActive
                    ? "border-indigo-300 font-semibold bg-indigo-50/80 text-indigo-700"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                )}
              />
            </div>
          );
        })}

        {/* Active Filter Clear Button */}
        {showClear && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
            {activeCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold font-mono">
                {activeCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Right Extra Controls (View toggle, custom export, etc.) */}
      {extraControls && (
        <div className="flex items-center gap-2 shrink-0">{extraControls}</div>
      )}
    </div>
  );
}
