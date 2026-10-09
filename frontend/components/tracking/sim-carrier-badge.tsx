"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TelecomCarrier = "Jio" | "Airtel" | "Vi" | "BSNL" | string;

export function getCarrierBrand(carrier?: string | null): "Jio" | "Airtel" | "Vi" | "BSNL" {
  if (!carrier) return "Jio";
  const lower = carrier.toLowerCase();
  if (lower.includes("airtel")) return "Airtel";
  if (lower.includes("vi") || lower.includes("vodafone") || lower.includes("idea")) return "Vi";
  if (lower.includes("bsnl")) return "BSNL";
  return "Jio";
}

/**
 * High-fidelity Telecom Operator Logos conforming to Indian Cellular Carriers (Jio, Airtel, Vi, BSNL)
 */
export function CarrierLogo({ carrier, className = "w-4 h-4" }: { carrier?: string | null; className?: string }) {
  const brand = getCarrierBrand(carrier);

  if (brand === "Jio") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-[#0b4ea2] text-white font-bold select-none shrink-0 shadow-2xs",
          className
        )}
        title="Reliance Jio Infocomm"
        style={{ aspectRatio: "1 / 1" }}
      >
        <span className="text-[9px] font-black tracking-tight leading-none lowercase" style={{ fontFamily: "sans-serif" }}>
          jio
        </span>
      </div>
    );
  }

  if (brand === "Airtel") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-[#e40000] text-white select-none shrink-0 shadow-2xs",
          className
        )}
        title="Bharti Airtel"
        style={{ aspectRatio: "1 / 1" }}
      >
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c-2.48 0-4.5-2.02-4.5-4.5S10.52 7.5 13 7.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5zm-1-7c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z" />
        </svg>
      </div>
    );
  }

  if (brand === "Vi") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-[#e60000] text-white font-black select-none shrink-0 shadow-2xs",
          className
        )}
        title="Vodafone Idea (Vi)"
        style={{ aspectRatio: "1 / 1" }}
      >
        <span className="text-[8px] font-black tracking-tighter text-[#ffcc00] leading-none">
          Vi
        </span>
      </div>
    );
  }

  // BSNL
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[#003399] text-white font-bold select-none shrink-0 shadow-2xs",
        className
      )}
      title="BSNL"
      style={{ aspectRatio: "1 / 1" }}
    >
      <span className="text-[7px] font-bold text-white tracking-tighter leading-none">
        BSNL
      </span>
    </div>
  );
}

/**
 * Telecom Provider and Driver Phone Inline Component matching screenshot specifications
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

  const phoneColor =
    brand === "Jio"
      ? "text-[#0b4ea2] hover:text-[#083b7a]"
      : brand === "Airtel"
      ? "text-[#e40000] hover:text-[#b80000]"
      : brand === "Vi"
      ? "text-[#c20000] hover:text-[#9e0000]"
      : "text-[#003399] hover:text-[#002266]";

  const cleanPhone = phone.replace(/\D/g, "").slice(-10);

  return (
    <div className={cn("inline-flex items-center gap-1.5 min-w-0", className)}>
      <CarrierLogo carrier={brand} className="w-4 h-4" />
      <span className={cn("text-xs font-semibold tracking-tight tabular-nums truncate", phoneColor)}>
        {cleanPhone}
      </span>
      {showCarrierName && (
        <span className="text-xs font-medium text-slate-700 ml-0.5">
          {brand}
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
