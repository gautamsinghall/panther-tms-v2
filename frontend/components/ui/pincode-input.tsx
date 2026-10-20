"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { lookupPincode, PincodeLookupResult } from "@/lib/pincodes";
import { toast } from "@/lib/toast";
import { MapPin, Loader2, Check } from "lucide-react";

export interface PincodeInputProps {
  id?: string;
  name?: string;
  value?: string | number | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFetch?: (data: PincodeLookupResult) => void;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
}

export function PincodeInput({
  id = "pincode-input",
  name = "pincode",
  value = "",
  onChange,
  onBlur,
  onFetch,
  disabled = false,
  error = false,
  required = false,
  placeholder = "e.g. 496001",
  className,
  size = "md",
}: PincodeInputProps) {
  const [isFetching, setIsFetching] = useState(false);
  const [justFetched, setJustFetched] = useState(false);
  const lastFetchedPinRef = React.useRef<string>("");

  const stringVal = value !== null && value !== undefined ? String(value) : "";
  const isSixDigits = stringVal.trim().length === 6 && /^\d{6}$/.test(stringVal.trim());

  const executeFetch = async (pinToFetch: string, isManual = false) => {
    const cleanPin = pinToFetch.trim();
    if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      if (isManual) {
        toast.warning("Please enter a 6-digit PIN code (e.g. 496001).");
      }
      return;
    }

    lastFetchedPinRef.current = cleanPin;
    setIsFetching(true);
    try {
      const result = await lookupPincode(cleanPin);
      if (result) {
        onFetch?.(result);
        setJustFetched(true);
        setTimeout(() => setJustFetched(false), 2500);
        toast.success(`${result.city}, ${result.state}`, {
          title: "Location Auto-Fetched",
        });
      } else {
        toast.error(`PIN code ${cleanPin} not found. Please enter details manually.`);
      }
    } catch {
      toast.error("Failed to fetch PIN code details.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleFetch = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    executeFetch(stringVal, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFetch(e);
    }
  };

  const heightClass = size === "sm" ? "h-9 text-xs" : "h-10 text-xs sm:text-sm";
  const btnHeightClass = size === "sm" ? "h-7 px-2 text-[11px]" : "h-7 sm:h-8 px-2.5 text-xs";

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={stringVal}
        onChange={(e) => {
          // Allow only numeric characters up to 6 digits
          const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6);
          onChange(cleaned);
          if (cleaned.length === 6 && cleaned !== lastFetchedPinRef.current) {
            executeFetch(cleaned, false);
          }
        }}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled || isFetching}
        required={required}
        placeholder={placeholder}
        className={cn(
          "w-full pr-20 font-mono font-medium rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs",
          size === "sm" ? "px-3" : "px-3.5",
          heightClass,
          disabled && "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200",
          !disabled && !error && "border-slate-200 hover:border-slate-300",
          error && "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
        )}
      />

      {/* Fetch Action Button */}
      <div className="absolute right-1.5 flex items-center">
        <button
          type="button"
          onClick={handleFetch}
          disabled={disabled || isFetching || !stringVal.trim()}
          title="Fetch City, State & Country from PIN Code"
          className={cn(
            "inline-flex items-center gap-1 font-semibold rounded-lg transition-all focus:outline-none select-none",
            btnHeightClass,
            justFetched
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : isSixDigits
              ? "bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200/80 active:scale-95 shadow-2xs cursor-pointer"
              : "bg-slate-100 text-slate-400 border border-slate-200/60 cursor-not-allowed opacity-75"
          )}
        >
          {isFetching ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Fetching...</span>
            </>
          ) : justFetched ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Fetched</span>
            </>
          ) : (
            <>
              <MapPin className="w-3 h-3 shrink-0" />
              <span>Fetch</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
