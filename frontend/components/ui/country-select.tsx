"use client";

import React from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY } from "@/lib/countries";

export interface CountrySelectProps {
  id?: string;
  name?: string;
  value?: string | null;
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
 * Universal Country Dropdown:
 * - Searchable dropdown containing all countries worldwide
 * - Defaults to India if no value provided
 * - Integrated with standard design system & SearchableSelect
 */
export function CountrySelect({
  id = "country-select",
  name = "country",
  value,
  onChange,
  onBlur,
  disabled = false,
  error = false,
  required = false,
  placeholder = "Select Country",
  className,
  buttonClassName,
  size = "md",
}: CountrySelectProps) {
  // If value is undefined or null or empty string, default to "India"
  const selectedValue = value !== undefined && value !== null && value !== "" ? value : DEFAULT_COUNTRY;

  return (
    <SearchableSelect
      id={id}
      name={name}
      value={selectedValue}
      options={COUNTRY_OPTIONS}
      placeholder={placeholder}
      searchPlaceholder="Search country..."
      disabled={disabled}
      error={error}
      required={required}
      onChange={(val) => onChange(String(val || DEFAULT_COUNTRY))}
      onBlur={onBlur}
      className={className}
      buttonClassName={buttonClassName}
      size={size}
    />
  );
}
