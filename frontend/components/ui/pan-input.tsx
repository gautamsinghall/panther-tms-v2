"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { FetchButton } from "@/components/ui/fetch-button";
import { apiClient } from "@/lib/api-client";
import { GSTLookupResult } from "@/components/ui/gstin-input";

export interface PanInputProps {
  id?: string;
  name?: string;
  value?: string | null;
  stateCode?: string;
  onStateCodeChange?: (stateCd: string) => void;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFetch?: (data: GSTLookupResult) => void;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
  showStateInput?: boolean;
}

export function PanInput({
  id = "pan-input",
  name = "pan",
  value = "",
  stateCode = "07",
  onStateCodeChange,
  onChange,
  onBlur,
  onFetch,
  disabled = false,
  error = false,
  required = false,
  placeholder = "e.g. AAACT2727Q",
  className,
  size = "md",
  showStateInput = true,
}: PanInputProps) {
  const [internalState, setInternalState] = useState(stateCode || "07");
  const [isFetching, setIsFetching] = useState(false);
  const [justFetched, setJustFetched] = useState(false);
  const lastFetchedRef = React.useRef<string>("");

  const effectiveState = onStateCodeChange ? stateCode : internalState;

  const stringVal = value !== null && value !== undefined ? String(value) : "";
  const is10Chars = stringVal.trim().length === 10;

  const handleStateChange = (newSt: string) => {
    const cleanSt = newSt.trim();
    if (onStateCodeChange) {
      onStateCodeChange(cleanSt);
    } else {
      setInternalState(cleanSt);
    }
  };

  const executeFetch = async (panToFetch: string, isManual = false) => {
    const cleanPan = panToFetch.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!cleanPan || cleanPan.length !== 10) {
      if (isManual) {
        toast.warning("Please enter a valid 10-character PAN number (e.g. AAACT2727Q).");
      }
      return;
    }

    const cleanSt = (effectiveState || "07").trim();
    if (!cleanSt && isManual) {
      toast.warning("Please enter a 2-digit State Code (e.g. 07 for Delhi, 27 for Maharashtra).");
      return;
    }

    const key = `${cleanPan}:${cleanSt}`;
    if (lastFetchedRef.current === key && !isManual) {
      return;
    }

    try {
      setIsFetching(true);
      lastFetchedRef.current = key;

      const res = await apiClient.get<GSTLookupResult>(
        `/api/v1/profile/api-center/pan-lookup?pan=${encodeURIComponent(cleanPan)}&state_cd=${encodeURIComponent(cleanSt)}`
      );

      if (res && res.success) {
        setJustFetched(true);
        setTimeout(() => setJustFetched(false), 3000);
        onFetch?.(res);
        toast.success(`PAN verified: ${res.legal_name || res.trade_name || cleanPan}`);
      } else {
        toast.error(res?.message || "PAN lookup failed. Please verify the PAN and State code.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to reach PAN verification gateway.");
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
  };

  const heightClass = size === "sm" ? "h-8 text-xs" : "h-10 text-xs sm:text-sm";

  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="relative flex-1 flex items-center min-w-0">
        <input
          id={id}
          name={name}
          type="text"
          value={stringVal}
          maxLength={10}
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
            disabled={disabled || !is10Chars}
            label="Fetch"
            title="Auto-fetch and populate business details by PAN & State"
            size={size === "sm" ? "sm" : "md"}
          />
        </div>
      </div>

      {showStateInput && (
        <div className="w-14 sm:w-16 shrink-0">
          <input
            type="text"
            maxLength={2}
            value={effectiveState}
            placeholder="St"
            title="2-digit State Code (e.g. 07, 27)"
            onChange={(e) => handleStateChange(e.target.value)}
            disabled={disabled || isFetching}
            className={cn(
              "w-full text-center font-mono font-bold rounded-xl border bg-white dark:bg-[#12141F] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs uppercase",
              heightClass,
              "border-slate-200 dark:border-slate-800"
            )}
          />
        </div>
      )}
    </div>
  );
}

