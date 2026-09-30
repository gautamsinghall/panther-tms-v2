"use client";

import React, { useEffect, useRef } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  INDIAN_STATE_OPTIONS,
  isIndia,
  normalizeIndianState,
} from "@/lib/states";
import { cn } from "@/lib/utils";

export interface StateSelectProps {
  id?: string;
  name?: string;
  /** Current country value (e.g. "India", "United States", etc.) */
  country?: string | null;
  /** Current state value */
  value?: string | null;
  /** Callback fired when state changes */
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  size?: "sm" | "md";
}

/**
 * Universal State / Province Component:
 * - When country is "India" (or defaulted):
 *   Loads a searchable, keyboard-friendly dropdown of all 28 Indian States & 8 Union Territories.
 *   Users can type to filter immediately by name, GST state code (e.g. 27, 07), or abbreviation (MH, DL).
 * - When country is NOT "India":
 *   Automatically clears previously selected Indian state and displays a normal manual text input
 *   so users can type any foreign state/province/region freely.
 * - Changing country resets previously selected state and reloads appropriate input/dropdown.
 */
export function StateSelect({
  id = "state-select",
  name = "state",
  country = "India",
  value,
  onChange,
  onBlur,
  disabled = false,
  error = false,
  required = false,
  placeholder,
  className,
  buttonClassName,
  size = "md",
}: StateSelectProps) {
  const currentIsIndia = isIndia(country);

  // Track previous country to handle automatic clearing & resetting when country changes
  const prevCountryRef = useRef<string | null | undefined>(country);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevCountryRef.current = country;
      return;
    }

    const prevCountry = prevCountryRef.current;
    if (prevCountry !== country) {
      const prevWasIndia = isIndia(prevCountry);
      const nowIsIndia = isIndia(country);

      if (prevWasIndia !== nowIsIndia) {
        // Reset state when toggling between India and foreign country
        onChange("");
      }
      prevCountryRef.current = country;
    }
  }, [country, onChange]);

  // When India is selected:
  if (currentIsIndia) {
    // If value matches an Indian state (e.g. lowercase "maharashtra"), normalize to official name
    const normalizedVal = value ? normalizeIndianState(value) || value : "";

    return (
      <SearchableSelect
        id={id}
        name={name}
        value={normalizedVal}
        options={INDIAN_STATE_OPTIONS}
        placeholder={placeholder || "Select State / UT"}
        searchPlaceholder="Type state or code (e.g. MH, 27)..."
        disabled={disabled}
        error={error}
        required={required}
        onChange={(val) => onChange(String(val || ""))}
        onBlur={onBlur}
        className={className}
        buttonClassName={buttonClassName}
        size={size}
      />
    );
  }

  // When a foreign country is selected: manual text input
  const heightClass = size === "sm" ? "h-9 text-xs" : "h-10 text-xs sm:text-sm";

  return (
    <input
      id={id}
      name={name}
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      required={required}
      placeholder={placeholder || "Enter state / province / region"}
      className={cn(
        "w-full px-3.5 font-medium rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs",
        heightClass,
        disabled && "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200",
        !disabled && !error && "border-slate-200 hover:border-slate-300",
        error && "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500",
        className
      )}
    />
  );
}
