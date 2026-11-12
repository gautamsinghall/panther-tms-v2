"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { FetchButton } from "@/components/ui/fetch-button";
import { apiClient } from "@/lib/api-client";
import { CheckCircle2 } from "lucide-react";

export interface DLLookupResult {
  success: boolean;
  message?: string;
  dlnumber?: string;
  dob?: string;
  name?: string;
  driver_name?: string;
  driver_mobile?: string;
  status?: string;
  dl_status?: string;
  valid_from?: string;
  valid_upto?: string;
  vehicle_classes?: string;
  cov_details?: string;
  blood_group?: string;
  raw_data?: any;
  [key: string]: any;
}

export interface DlInputProps {
  id?: string;
  name?: string;
  value?: string | null;
  dob?: string;
  onDobChange?: (dob: string) => void;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFetch?: (data: DLLookupResult) => void;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
  isVerified?: boolean;
  showDobInput?: boolean;
}

export function DlInput({
  id = "dl-input",
  name = "license_number",
  value = "",
  dob = "",
  onDobChange,
  onChange,
  onBlur,
  onFetch,
  disabled = false,
  error = false,
  required = false,
  placeholder = "e.g. MH12 20180012345",
  className,
  size = "md",
  isVerified = false,
  showDobInput = false,
}: DlInputProps) {
  const [internalDob, setInternalDob] = useState(dob || "");
  const [isFetching, setIsFetching] = useState(false);
  const [justFetched, setJustFetched] = useState(false);
  const lastFetchedRef = React.useRef<string>("");

  const effectiveDob = onDobChange ? dob : internalDob;
  const stringVal = value !== null && value !== undefined ? String(value) : "";

  const executeFetch = async (dlToFetch: string, isManual = false) => {
    const cleanDl = dlToFetch.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanDl || cleanDl.length < 5) {
      if (isManual) {
        toast.warning("Please enter a valid Driving License Number (e.g. MH12 20180012345).");
      }
      return;
    }

    const cleanDob = (effectiveDob || "").trim();
    if (!cleanDob && isManual) {
      toast.warning("Please enter Driver Date of Birth to verify Driving License with Sarathi registry.");
      return;
    }

    const key = `${cleanDl}:${cleanDob}`;
    if (lastFetchedRef.current === key && !isManual) {
      return;
    }

    try {
      setIsFetching(true);
      lastFetchedRef.current = key;

      const res = await apiClient.get<DLLookupResult>(
        `/api/v1/profile/api-center/dl-lookup?dlnumber=${encodeURIComponent(cleanDl)}&dob=${encodeURIComponent(cleanDob)}`
      );

      if (res && res.success) {
        setJustFetched(true);
        setTimeout(() => setJustFetched(false), 3500);
        onFetch?.(res);
        toast.success(`Driver verified: ${res.driver_name || cleanDl}`);
      } else {
        toast.error(res?.message || "Driving License verification failed. Please check DL number and DOB.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not connect to DL verification service.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    onChange(rawVal.toUpperCase());
  };

  const isVerifiedState = isVerified || justFetched;

  return (
    <div className={cn("space-y-2 w-full", className)}>
      <div className="relative flex items-center w-full">
        <div className="relative flex-1">
          <input
            id={id}
            name={name}
            type="text"
            value={stringVal}
            onChange={handleInputChange}
            onBlur={onBlur}
            disabled={disabled || isFetching}
            required={required}
            placeholder={placeholder}
            className={cn(
              "w-full uppercase font-mono font-semibold tracking-wider transition-all placeholder:normal-case placeholder:font-sans placeholder:tracking-normal",
              size === "sm" ? "h-8 text-xs px-2.5 pr-24 rounded-lg" : "h-10 text-xs sm:text-sm px-3.5 pr-28 rounded-xl",
              "border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs",
              error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20" : isVerifiedState ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200",
              disabled && "bg-slate-50 text-slate-500 cursor-not-allowed opacity-75"
            )}
          />
        </div>

        <div className="absolute right-1.5 flex items-center gap-1.5 z-10">
          {isVerifiedState && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200/80">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Verified</span>
            </span>
          )}
          <FetchButton
            onClick={() => executeFetch(stringVal, true)}
            isLoading={isFetching}
            isSuccess={justFetched}
            disabled={disabled || !stringVal || stringVal.trim().length < 5}
            size={size === "sm" ? "sm" : "sm"}
            label="Verify DL"
            title="Verify driving license with Sarathi registry using DL Number and DOB"
          />
        </div>
      </div>

      {showDobInput && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-500 shrink-0">Driver DOB:</span>
          <input
            type="date"
            value={effectiveDob}
            onChange={(e) => {
              if (onDobChange) onDobChange(e.target.value);
              else setInternalDob(e.target.value);
            }}
            className="h-8 px-2.5 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-[10px] text-slate-400">(Required for live Sarathi query)</span>
        </div>
      )}
    </div>
  );
}
