"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  label: string;
  value: string | number;
}

export interface SearchableSelectProps {
  id?: string;
  name?: string;
  value?: string | number;
  options?: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  onChange: (value: string | number) => void;
  onBlur?: () => void;
  className?: string;
}

/**
 * Enterprise SearchableSelect (Combobox):
 * - Guarantees dropdown ALWAYS opens downwards (top-full mt-1.5)
 * - Built-in search/text filtering so users can quickly locate items
 * - Auto-focuses search input when opened
 * - Keyboard (Escape) & click-outside dismiss handling
 * - Clean visual hierarchy with checkmark on active item
 */
export function SearchableSelect({
  id,
  name,
  value,
  options = [],
  placeholder = "Select an option...",
  disabled = false,
  error = false,
  required = false,
  onChange,
  onBlur,
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected option
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Filter options based on user text input
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
          setSearchQuery("");
          onBlur?.();
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setSearchQuery("");
        onBlur?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onBlur]);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      setIsOpen(true);
      setSearchQuery("");
    } else {
      setIsOpen(false);
      setSearchQuery("");
      onBlur?.();
    }
  };

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Hidden input for standard form submission if needed */}
      {name && <input type="hidden" name={name} value={value ?? ""} />}

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "w-full h-10 px-3.5 text-left text-xs sm:text-sm font-medium rounded-xl border bg-white flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs cursor-pointer select-none",
          disabled
            ? "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200"
            : "border-slate-200 hover:border-slate-300 text-slate-900",
          error && "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500",
          isOpen && "border-indigo-600 ring-2 ring-indigo-500/20"
        )}
      >
        <span
          className={cn(
            "truncate",
            !selectedOption || selectedOption.value === ""
              ? "text-slate-400 font-normal"
              : "text-slate-900 font-medium"
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180 text-indigo-600"
          )}
        />
      </button>

      {/* Dropdown Menu - GUARANTEED ALWAYS DOWNWARDS (top-full mt-1.5) */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl ring-1 ring-black/5 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 flex flex-col">
          {/* Integrated Search Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to filter..."
                className="w-full pl-8 pr-7 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 p-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 divide-y-0">
            {/* Empty/Placeholder option to clear */}
            {!required && (
              <button
                type="button"
                onClick={() => handleSelect("")}
                className={cn(
                  "w-full text-left px-2.5 py-2 rounded-lg text-xs font-normal text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors flex items-center justify-between cursor-pointer",
                  (!value || value === "") && "bg-slate-50 text-slate-600 font-medium"
                )}
              >
                <span>{placeholder}</span>
                {(!value || value === "") && <Check className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer",
                      isSelected
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-800 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <span className="truncate mr-2">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-slate-500 font-medium">
                No matching options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
