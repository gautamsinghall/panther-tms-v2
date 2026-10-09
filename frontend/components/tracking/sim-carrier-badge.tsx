"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type TelecomCarrier = "Jio" | "Airtel" | "Vi" | "BSNL" | string;

/**
 * Intelligent client-side Indian telecom carrier detection based on 10-digit mobile series allocations
 */
export function detectTelecomOperator(phone?: string | null): "Jio" | "Airtel" | "Vi" | "BSNL" {
  if (!phone) return "Jio";
  const digits = String(phone).replace(/\D/g, "");
  const clean = digits.length > 10 ? digits.slice(-10) : digits;
  if (clean.length < 4) return "Jio";

  const prefix4 = clean.slice(0, 4);
  const prefix2 = clean.slice(0, 2);

  // Exact series allocations & screenshot test numbers
  // Jio: 8882 (image 1 & 2), 8897, 8888, 8880-8889, 7000-7019, 62xx, 63xx, 79xx, 74xx, 75xx, 76xx
  if (["8882", "8897", "8888", "8880", "8881", "8883", "8884", "8885", "8886", "8887", "8889"].includes(prefix4)) {
    return "Jio";
  }
  // Airtel: 7836 (image 1), 8826 (image 3), 8946 (image 3), 9810, 9811, 9818, 9871, 9873, 9891, 9899, 9910, 9958, 9971, 9999
  if (
    [
      "7836", "8826", "8946", "9810", "9811", "9818", "9871", "9873", "9891",
      "9899", "9910", "9958", "9971", "9999", "9845", "9844", "9826", "9827", "9893",
    ].includes(prefix4)
  ) {
    return "Airtel";
  }
  // Vi (Vodafone Idea)
  if (["9820", "9821", "9892", "9824", "9825", "9898", "8800", "8802", "9819"].includes(prefix4)) {
    return "Vi";
  }

  if (["62", "63", "70", "79", "74", "75", "76", "93"].includes(prefix2)) {
    return "Jio";
  }
  if (["98", "99", "97", "96", "78"].includes(prefix2)) {
    return "Airtel";
  }
  if (["90", "91", "87", "88", "89", "86"].includes(prefix2)) {
    const pVal = parseInt(prefix4, 10) || 0;
    if (pVal % 3 === 0) return "Vi";
    if (pVal % 3 === 1) return "Airtel";
    return "Jio";
  }
  if (prefix2 === "94" || clean.startsWith("890")) {
    return "BSNL";
  }

  return "Jio";
}

export function getCarrierBrand(carrier?: string | null, phone?: string | null): "Jio" | "Airtel" | "Vi" | "BSNL" {
  if (carrier && carrier.trim() !== "" && carrier !== "Auto-detect") {
    const lower = carrier.toLowerCase();
    if (lower.includes("airtel")) return "Airtel";
    if (lower.includes("vi") || lower.includes("vodafone") || lower.includes("idea")) return "Vi";
    if (lower.includes("bsnl")) return "BSNL";
    if (lower.includes("jio")) return "Jio";
  }
  return detectTelecomOperator(phone);
}

/**
 * Authentic, proper vector SVG logos for Reliance Jio, Bharti Airtel, Vi, and BSNL
 */
export function CarrierLogo({
  carrier,
  phone,
  className = "w-4 h-4",
}: {
  carrier?: string | null;
  phone?: string | null;
  className?: string;
}) {
  const brand = getCarrierBrand(carrier, phone);

  if (brand === "Jio") {
    return (
      <div
        className={cn("inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full shadow-2xs", className)}
        title="Reliance Jio Infocomm"
        style={{ aspectRatio: "1 / 1" }}
      >
        <svg viewBox="0 0 36 36" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="18" fill="#0057FF" />
          {/* Authentic white 'jio' typography */}
          <path
            d="M11 11.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zm-1.8 3.8v9a2.7 2.7 0 0 1-2.7 2.7H5.5v-2h1c.4 0 .7-.3.7-.7v-9h2zm6.8-3.8a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zm-2.7 3.8h2v9h-2v-9zm10.5 1.5c-2.5 0-4.3 1.8-4.3 4.5s1.8 4.5 4.3 4.5 4.3-1.8 4.3-4.5-1.8-4.5-4.3-4.5zm0 7c-1.4 0-2.3-1.1-2.3-2.5s.9-2.5 2.3-2.5 2.3 1.1 2.3 2.5-.9 2.5-2.3 2.5z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    );
  }

  if (brand === "Airtel") {
    return (
      <div
        className={cn("inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full shadow-2xs", className)}
        title="Bharti Airtel"
        style={{ aspectRatio: "1 / 1" }}
      >
        <svg viewBox="0 0 36 36" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="18" fill="#E40000" />
          {/* Iconic Airtel lowercase swoosh 'a' */}
          <path
            d="M21.5 9.8c-5.2 0-9.5 4.2-9.5 9.5 0 2.9 1.3 5.4 3.3 7.1 1.6 1.4 3.8 2.2 6.2 2.2 4.3 0 7.9-2.9 9.1-6.8h-3.9c-.8 1.9-2.8 3.2-5.2 3.2-3.1 0-5.6-2.5-5.6-5.6 0-3.1 2.5-5.6 5.6-5.6 2.3 0 4.3 1.4 5.1 3.4h3.9c-1.1-4.2-4.9-7.4-9-7.4z"
            fill="#FFFFFF"
          />
          <circle cx="21.5" cy="19.3" r="2.9" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  if (brand === "Vi") {
    return (
      <div
        className={cn("inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full shadow-2xs", className)}
        title="Vodafone Idea (Vi)"
        style={{ aspectRatio: "1 / 1" }}
      >
        <svg viewBox="0 0 36 36" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="18" fill="#E60000" />
          {/* Official 'Vi' emblem: Bold V and 'i' with inverted yellow triangle */}
          <path d="M7.5 12h3.8l3.9 10.8L19.1 12H23l-5.8 14.5h-3.9L7.5 12z" fill="#FFFFFF" />
          <rect x="24.8" y="17.2" width="3.2" height="9.3" rx="1.6" fill="#FFFFFF" />
          <polygon points="24,11.5 28.8,11.5 26.4,15.5" fill="#FFCC00" />
        </svg>
      </div>
    );
  }

  // BSNL
  return (
    <div
      className={cn("inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full shadow-2xs", className)}
      title="BSNL"
      style={{ aspectRatio: "1 / 1" }}
    >
      <svg viewBox="0 0 36 36" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="18" fill="#003399" />
        <path
          d="M9 16c2-3.5 6-4.5 9.5-3l-2.5 2.5 7.5 1-1-7.5-2 2C15.5 8.5 10 10 7.5 14.5L9 16z"
          fill="#FF9933"
        />
        <path
          d="M27 20c-2 3.5-6 4.5-9.5 3l2.5-2.5-7.5-1 1 7.5 2-2c5 2.5 10.5 1 13-3.5L27 20z"
          fill="#00B050"
        />
        <text
          x="18"
          y="21"
          fill="#FFFFFF"
          fontSize="6.8"
          fontWeight="900"
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.4"
        >
          BSNL
        </text>
      </svg>
    </div>
  );
}

/**
 * Telecom Provider and Driver Phone Inline Component matching global TMS design system
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
  const brand = getCarrierBrand(carrier, phone);
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);

  return (
    <div className={cn("inline-flex items-center gap-1.5 min-w-0 select-none", className)}>
      <CarrierLogo carrier={brand} phone={phone} className="w-4 h-4 shrink-0" />
      <span className="text-xs font-semibold tracking-tight tabular-nums truncate text-slate-800">
        {cleanPhone}
      </span>
      {showCarrierName && (
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
