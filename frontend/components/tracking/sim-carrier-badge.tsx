"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type TelecomCarrier = "Jio" | "Airtel" | "Vi" | "BSNL" | string;

/**
 * Get normalised carrier brand name from an operator_name string returned by the backend API.
 * Returns null when the operator is unknown or empty – callers should show a generic icon.
 */
export function getCarrierBrand(carrier?: string | null): "Jio" | "Airtel" | "Vi" | "BSNL" | null {
  if (!carrier || carrier.trim() === "" || carrier === "Auto-detect") return null;
  const lower = carrier.toLowerCase();
  if (lower.includes("jio")) return "Jio";
  if (lower.includes("airtel")) return "Airtel";
  if (lower.includes("vi") || lower.includes("vodafone") || lower.includes("idea")) return "Vi";
  if (lower.includes("bsnl")) return "BSNL";
  return null;
}

/** Real logo URLs for each carrier */
const CARRIER_LOGOS: Record<string, string> = {
  Jio: "https://img.logo.dev/jio.com?token=pk_JbAphEGfSX6XNyNdhYMNcA&size=60&format=png",
  Airtel: "https://img.logo.dev/airtel.in?token=pk_JbAphEGfSX6XNyNdhYMNcA&size=60&format=png",
  Vi: "https://img.logo.dev/myvi.in?token=pk_JbAphEGfSX6XNyNdhYMNcA&size=60&format=png",
  BSNL: "https://img.logo.dev/bsnl.co.in?token=pk_JbAphEGfSX6XNyNdhYMNcA&size=60&format=png",
};

/**
 * Generic SIM-card icon shown when operator is not yet known.
 */
function GenericSimIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full bg-slate-200 text-slate-500",
        className,
      )}
      style={{ aspectRatio: "1 / 1" }}
      title="SIM Operator"
    >
      <svg viewBox="0 0 24 24" className="w-[60%] h-[60%]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M9 6h6v5H9z" />
        <line x1="9" y1="14" x2="15" y2="14" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    </div>
  );
}

/**
 * Renders the real telecom operator logo fetched from the internet.
 * Falls back to a generic SIM icon when the operator is unknown.
 *
 * The `carrier` prop should be the `operator_name` string from the backend API.
 */
export function CarrierLogo({
  carrier,
  className = "w-4 h-4",
}: {
  carrier?: string | null;
  phone?: string | null; // kept for backward compat – not used
  className?: string;
}) {
  const brand = getCarrierBrand(carrier);

  if (!brand || !CARRIER_LOGOS[brand]) {
    return <GenericSimIcon className={className} />;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full shadow-2xs bg-white",
        className,
      )}
      title={brand}
      style={{ aspectRatio: "1 / 1" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CARRIER_LOGOS[brand]}
        alt={brand}
        className="w-full h-full object-contain"
        loading="lazy"
        draggable={false}
      />
    </div>
  );
}

/**
 * Telecom Provider and Driver Phone Inline Component matching global TMS design system.
 * Uses the `operator_name` field from the backend API for logo display.
 */
export function CarrierPhoneBadge({
  carrier,
  phone,
  isClosed = false,
  showCarrierName = false,
  className = "",
}: {
  carrier?: string | null;
  phone: string;
  isClosed?: boolean;
  showCarrierName?: boolean;
  className?: string;
}) {
  const brand = getCarrierBrand(carrier);
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);

  return (
    <div className={cn("inline-flex items-center gap-1.5 min-w-0 select-none", className)}>
      <CarrierLogo carrier={carrier} className="w-4 h-4 shrink-0" />
      <span className="text-xs font-semibold tracking-tight tabular-nums truncate text-slate-800">
        {cleanPhone}
      </span>
      {showCarrierName && brand && (
        <span className="text-xs font-medium text-slate-500 ml-0.5">
          ({brand})
        </span>
      )}
      {isClosed && (
        <span
          className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-rose-600 text-white shrink-0 ml-0.5"
          title="Tracking session closed / carrier consent expired"
        >
          <span className="text-[9px] font-bold leading-none">!</span>
        </span>
      )}
    </div>
  );
}
