"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { FetchButton } from "@/components/ui/fetch-button";
import { apiClient } from "@/lib/api-client";

export interface GSTLookupResult {
  success: boolean;
  message?: string;
  gstin?: string;
  pan?: string;
  legal_name?: string;
  trade_name?: string;
  incorporation_date?: string;
  legal_status?: string;
  address?: string;
  city?: string;
  state?: string;
  state_code?: string;
  pincode?: string;
  country?: string;
  billing_state?: string;
  raw_data?: any;
}

export interface GstinInputProps {
  id?: string;
  name?: string;
  value?: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFetch?: (data: GSTLookupResult) => void;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
}

export function GstinInput({
  id = "gstin-input",
  name = "gstin",
  value = "",
  onChange,
  onBlur,
  onFetch,
  disabled = false,
  error = false,
  required = false,
  placeholder = "e.g. 27AAACT2727Q1ZW",
  className,
  size = "md",
}: GstinInputProps) {
  const [isFetching, setIsFetching] = useState(false);
  const [justFetched, setJustFetched] = useState(false);
  const lastFetchedRef = React.useRef<string>("");

  const stringVal = value !== null && value !== undefined ? String(value) : "";
  const is15Chars = stringVal.trim().length === 15;

  const executeFetch = async (gstinToFetch: string, isManual = false) => {
    const clean = gstinToFetch.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!clean || clean.length !== 15) {
      if (isManual) {
        toast.warning("Please enter a valid 15-character GSTIN (e.g. 27AAACT2727Q1ZW).");
      }
      return;
    }

    if (lastFetchedRef.current === clean && !isManual) {
      return;
    }

    try {
      setIsFetching(true);
      lastFetchedRef.current = clean;

      const res = await apiClient.get<GSTLookupResult>(
        `/api/v1/profile/api-center/gst-lookup?gstin=${encodeURIComponent(clean)}`
      );

      if (res && res.success) {
        setJustFetched(true);
        setTimeout(() => setJustFetched(false), 3000);
        onFetch?.(res);
        toast.success(`GSTIN verified: ${res.legal_name || res.trade_name || clean}`);
      } else {
        toast.error(res?.message || "GSTIN verification failed. Please check the number.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to reach GST verification gateway.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleManualClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    executeFetch(stringVal, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeFetch(stringVal, true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const up = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    onChange(up);
    if (up.length === 15 && up !== lastFetchedRef.current) {
      // Auto-trigger on full 15-digit completion
      executeFetch(up, false);
    }
  };

  const heightClass = size === "sm" ? "h-8 text-xs" : "h-10 text-xs sm:text-sm";

  return (
    <div className="relative flex items-center w-full">
      <input
        id={id}
        name={name}
        type="text"
        value={stringVal}
        maxLength={15}
        disabled={disabled || isFetching}
        required={required}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full px-3.5 pr-20 font-mono tracking-wider font-semibold rounded-xl border bg-white dark:bg-[#12141F] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs uppercase",
          heightClass,
          error
            ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900"
            : "border-slate-200 dark:border-slate-800",
          disabled && "bg-slate-50 dark:bg-slate-900 text-slate-400 cursor-not-allowed",
          className
        )}
      />

      <div className="absolute right-1.5 flex items-center">
        <FetchButton
          onClick={handleManualClick}
          isLoading={isFetching}
          isSuccess={justFetched}
          disabled={disabled || !is15Chars}
          label="Fetch"
          title="Auto-fetch and populate business details from GST Portal"
          size={size === "sm" ? "sm" : "md"}
        />
      </div>
    </div>
  );
}

