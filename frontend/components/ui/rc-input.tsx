"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { FetchButton } from "@/components/ui/fetch-button";
import { apiClient } from "@/lib/api-client";
import { CheckCircle2 } from "lucide-react";

export interface RCLookupResult {
  success: boolean;
  message?: string;
  vehicle_number?: string;
  owner_name?: string;
  vehicle_description?: string;
  maker_model?: string;
  status?: string;
  vehicle_class?: string;
  engine_number?: string;
  chassis_number?: string;
  rc_status?: string;
  financier?: string;
  gvw_kg?: number;
  unladen_weight_kg?: number;
  color?: string;
  emission_norms?: string;
  cylinders?: number;
  seating_capacity?: number;
  registration_date?: string;
  fitness_expiry?: string;
  insurance_expiry?: string;
  tax_validity?: string;
  puc_expiry?: string;
  permit_validity?: string;
  raw_data?: any;
  [key: string]: any;
}

export interface RcInputProps {
  id?: string;
  name?: string;
  value?: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFetch?: (data: RCLookupResult) => void;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
  isVerified?: boolean;
}

export function RcInput({
  id = "rc-input",
  name = "vehicle_number",
  value = "",
  onChange,
  onBlur,
  onFetch,
  disabled = false,
  error = false,
  required = false,
  placeholder = "e.g. MH-04-AZ-5678",
  className,
  size = "md",
  isVerified = false,
}: RcInputProps) {
  const [isFetching, setIsFetching] = useState(false);
  const [justFetched, setJustFetched] = useState(false);
  const lastFetchedRef = React.useRef<string>("");

  const stringVal = value !== null && value !== undefined ? String(value) : "";

  const executeFetch = async (vehToFetch: string, isManual = false) => {
    const cleanVeh = vehToFetch.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!cleanVeh || cleanVeh.length < 4) {
      if (isManual) {
        toast.warning("Please enter a valid vehicle registration number (e.g. MH04AZ5678).");
      }
      return;
    }

    if (lastFetchedRef.current === cleanVeh && !isManual) {
      return;
    }

    try {
      setIsFetching(true);
      lastFetchedRef.current = cleanVeh;

      const res = await apiClient.get<RCLookupResult>(
        `/api/v1/profile/api-center/rc-lookup?vehicle_number=${encodeURIComponent(cleanVeh)}`
      );

      if (res && res.success) {
        setJustFetched(true);
        setTimeout(() => setJustFetched(false), 3500);
        onFetch?.(res);
        toast.success(`Vehicle verified: ${res.vehicle_description || cleanVeh}`);
      } else {
        toast.error(res?.message || "RC verification failed. Please check the registration number.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not connect to RC verification service.");
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
    <div className={cn("relative flex items-center w-full", className)}>
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
        {isVerifiedState && (
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            {/* optional status icon */}
          </div>
        )}
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
          disabled={disabled || !stringVal || stringVal.trim().length < 4}
          size={size === "sm" ? "sm" : "sm"}
          label="Verify RC"
          title="Verify vehicle registration number with Vahan registry and autofill details"
        />
      </div>
    </div>
  );
}
