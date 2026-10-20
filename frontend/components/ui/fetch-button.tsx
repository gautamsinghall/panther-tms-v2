"use client";

import React from "react";
import { Loader2, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FetchButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isLoading?: boolean;
  isSuccess?: boolean;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  label?: string;
  title?: string;
}

/**
 * Standard Global Fetch Button for form inputs (GSTIN, PAN, Pincode, EWB)
 * Matches enterprise design system tokens with subtle indigo accent and micro-animations.
 */
export function FetchButton({
  onClick,
  isLoading = false,
  isSuccess = false,
  disabled = false,
  className,
  size = "sm",
  label = "Fetch",
  title = "Auto-fetch details from registry / portal",
}: FetchButtonProps) {
  const sizeClasses = size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-xs";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      className={cn(
        "inline-flex items-center gap-1 font-semibold rounded-lg transition-all focus:outline-none select-none",
        sizeClasses,
        isSuccess
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : isLoading || disabled
          ? "bg-slate-100 text-slate-400 border border-slate-200/60 cursor-not-allowed opacity-75"
          : "bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200/80 active:scale-95 shadow-2xs cursor-pointer",
        className
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin shrink-0 text-indigo-600" />
          <span>Fetching...</span>
        </>
      ) : isSuccess ? (
        <>
          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Fetched</span>
        </>
      ) : (
        <>
          <Search className="w-3 h-3 shrink-0" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
