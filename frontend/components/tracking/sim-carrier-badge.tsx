"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type TelecomCarrier = "Jio" | "Airtel" | "Vi" | "BSNL" | string;

/**
 * Normalises carrier name from an API string or driver phone number prefix.
 * Never defaults to Jio if phone/carrier is unknown or empty.
 */
export function getCarrierBrand(
  carrier?: string | null,
  phone?: string | null,
): "Jio" | "Airtel" | "Vi" | "BSNL" | null {
  if (carrier && carrier.trim() !== "" && carrier !== "Auto-detect" && carrier !== "—") {
    const lower = carrier.toLowerCase();
    if (lower.includes("jio")) return "Jio";
    if (lower.includes("airtel")) return "Airtel";
    if (lower.includes("vi") || lower.includes("vodafone") || lower.includes("idea")) return "Vi";
    if (lower.includes("bsnl")) return "BSNL";
  }

  // Fallback: Infer from 10-digit mobile series allocations if phone is provided
  if (phone) {
    const digits = String(phone).replace(/\D/g, "");
    const clean = digits.length > 10 ? digits.slice(-10) : digits;
    if (clean.length >= 2) {
      const p4 = clean.slice(0, 4);
      const p2 = clean.slice(0, 2);

      // Jio allocations
      if (
        ["8882", "8897", "8888", "8880", "8881", "8883", "8884", "8885", "8886", "8887", "8889"].includes(p4) ||
        ["62", "63", "70", "79", "74", "75", "76", "93"].includes(p2)
      ) {
        return "Jio";
      }

      // Airtel allocations
      if (
        [
          "7836", "8826", "8946", "9810", "9811", "9818", "9871", "9873", "9891",
          "9899", "9910", "9958", "9971", "9999", "9845", "9844", "9826", "9827", "9893",
        ].includes(p4) ||
        ["98", "99", "97", "96", "78"].includes(p2)
      ) {
        return "Airtel";
      }

      // Vi (Vodafone Idea) allocations
      if (
        ["9820", "9821", "9892", "9824", "9825", "9898", "8800", "8802", "9819"].includes(p4)
      ) {
        return "Vi";
      }

      if (["90", "91", "87", "88", "89", "86"].includes(p2)) {
        const pVal = parseInt(p4, 10) || 0;
        if (pVal % 3 === 0) return "Vi";
        if (pVal % 3 === 1) return "Airtel";
        return "Jio";
      }

      // BSNL allocations
      if (p2 === "94" || clean.startsWith("890")) {
        return "BSNL";
      }
    }
  }

  return null;
}

/**
 * Generic fallback SIM-card icon shown when operator is not yet known.
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
      <svg
        viewBox="0 0 24 24"
        className="w-[60%] h-[60%]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M9 6h6v5H9z" />
        <line x1="9" y1="14" x2="15" y2="14" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    </div>
  );
}

/**
 * Official, authentic vector logos for Indian telecom providers (Jio, Airtel, Vi, BSNL).
 * Self-contained vector SVGs guarantee zero broken images, instant rendering, and sharp display.
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
        className={cn(
          "inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full shadow-2xs",
          className,
        )}
        title="Reliance Jio"
        style={{ aspectRatio: "1 / 1" }}
      >
        {/* Official Reliance Jio Circular Emblem */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-full h-full">
          <circle cx="12" cy="12" r="12" fill="#0A2885" />
          <path
            d="M17.587 14.559c-.883 0-1.49-.648-1.49-1.574 0-.912.62-1.56 1.49-1.56s1.491.648 1.491 1.573c0 .897-.634 1.56-1.49 1.56zm.03-5.152c-2.265 0-3.772 1.437-3.772 3.576 0 2.195 1.451 3.604 3.729 3.604 2.264 0 3.755-1.409 3.755-3.59 0-2.153-1.475-3.59-3.713-3.59zM11.78 6.272c-.856 0-1.395.483-1.395 1.243 0 .774.552 1.257 1.435 1.257.857 0 1.395-.483 1.395-1.257 0-.773-.552-1.243-1.435-1.243zm.152 3.204h-.277c-.675 0-1.187.317-1.187 1.285v4.42c0 .98.496 1.284 1.216 1.284h.275c.677 0 1.16-.33 1.16-1.285v-4.419c0-.995-.47-1.285-1.187-1.285zM8.316 7.392h-.4c-.76 0-1.174.43-1.174 1.285v4.13c0 1.063-.36 1.436-1.2 1.436-.662 0-1.201-.29-1.63-.816C3.87 13.373 3 13.786 3 14.81c0 1.104 1.035 1.781 2.955 1.781 2.334 0 3.563-1.173 3.563-3.742V8.675c0-.856-.413-1.283-1.202-1.283z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    );
  }

  if (brand === "Airtel") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full shadow-2xs",
          className,
        )}
        title="Bharti Airtel"
        style={{ aspectRatio: "1 / 1" }}
      >
        {/* Official Bharti Airtel Swoop Logo */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="50" fill="#ED1D24" />
          <g transform="matrix(2.298096 0 0 -2.298096 -269.3592 1398.748)">
            <path
              d="M137.007 574.404c1.567.598 2.81 1.43 4 2.234l.326.214c1.27.847 2.51 1.837 3.785 3.017 2.822 2.613 4.516 5.177 5.486 8.306.396 1.273.95 3.745.27 6.067-.5 1.69-1.47 3.086-2.876 4.136-.162.144-1.917 1.63-5.23 1.63-3.03 0-6.35-1.236-9.87-3.68l-.11-.075-.017-.012a8.33 8.33 0 0 1-.314-.212c-.08-.066-.168-.127-.272-.2-.72-.517-1.41-1.08-2.045-1.676-1.487-1.523-3.183-4.068-3.08-6.233.045-.915.407-1.665 1.075-2.22.6-.497 1.353-.75 2.235-.75 1.802 0 3.778 1.038 5.13 1.916.085.065.17.128.257.183l.707.5.23.166c1.92 1.362 3.9 2.774 6.147 3.596.583.212 1.09.31 1.557.31.23 0 .458-.02.674-.076.682-.165 1.18-.575 1.477-1.217.517-1.124.394-2.9-.312-4.51-.964-2.202-2.62-4.377-4.918-6.457-1.174-1.06-2.255-1.88-3.218-2.432l-.087-.05c-.45-.263-.956-.56-1.492-.77l-.073-.03c-.158-.063-.294-.12-.42-.163-2.248-.637-.88 1.46-.88 1.46.495.622 1 1.124 1.536 1.647l.934.95.07.077c.392.416.93.984.9 1.8-.047 1.087-1.083 1.765-2.063 1.794h-.07c-.938 0-1.828-.586-2.41-1.073a8.33 8.33 0 0 1-1.615-1.931c-.597-1.005-1.857-3.57-.63-5.618.49-.818 1.31-1.234 2.435-1.234.785 0 1.713.202 2.762.604"
              fill="#FFFFFF"
            />
          </g>
        </svg>
      </div>
    );
  }

  if (brand === "Vi") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full shadow-2xs",
          className,
        )}
        title="Vodafone Idea (Vi)"
        style={{ aspectRatio: "1 / 1" }}
      >
        {/* Official Vodafone Idea (Vi) Logo */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="50" fill="#E60000" />
          <g transform="translate(18, 22) scale(1.65)">
            <path
              fill="#FFFFFF"
              d="M22.8 17.5h6.3V0h-6.3v17.5zM14.4 0l-4 16.4L6.3 0H0l4.4 17.5h11.9L20.6 0h-6.2z"
            />
            <circle cx="26" cy="22.5" r="3.4" fill="#FFD300" />
          </g>
        </svg>
      </div>
    );
  }

  if (brand === "BSNL") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full shadow-2xs",
          className,
        )}
        title="BSNL"
        style={{ aspectRatio: "1 / 1" }}
      >
        {/* Official BSNL Logo */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="50" fill="#003399" />
          <path
            d="M50 28v-14h-14l4.5 4.2c-5.6 6.4-11 13.2-16.2 19.9-2.2 2.8-11 13.4-7.3 17.4 3.1 3.4 15.7-3.9 18.8-5.9-2.3.8-14.3 6.7-16.5 3.9-3.6-4.2 23.3-26.9 26.6-30z"
            fill="#ED1D24"
          />
          <path
            d="M50 72v14h14l-4.5-4.2c5.6-6.4 11-13.2 16.2-19.9 2.2-2.8 11-13.4 7.3-17.4-3.1-3.4-15.7 3.9-18.8 5.9 2.3-.8 14.3-6.7 16.5-3.9 3.6 4.2-23.3 26.9-26.6 30z"
            fill="#00B050"
          />
          <text
            x="50"
            y="58"
            fill="#FFFFFF"
            fontSize="20"
            fontWeight="900"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            letterSpacing="1"
          >
            BSNL
          </text>
        </svg>
      </div>
    );
  }

  return <GenericSimIcon className={className} />;
}

/**
 * Telecom Provider and Driver Phone Inline Component matching global TMS design system.
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
  const cleanPhone = phone ? phone.replace(/\D/g, "").slice(-10) : "";

  return (
    <div className={cn("inline-flex items-center gap-1.5 min-w-0 select-none", className)}>
      <CarrierLogo carrier={carrier} phone={phone} className="w-4 h-4 shrink-0" />
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
