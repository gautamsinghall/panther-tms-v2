"use client";

import React from "react";
import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VehiclePlateProps extends React.HTMLAttributes<HTMLSpanElement> {
  vehicleNumber: string;
  source?: "COMPANY" | "MARKET" | string;
  showIcon?: boolean;
}

/**
 * Standard Indian Transport Vehicle Plate Tag per Design System v2:
 * - Monospace, bold, uppercase registration number
 * - High-contrast #101828 typography
 * - Clean #F8F9FA plate background with 1px #D0D5DD border and subtle shadow
 * - Subtle carrier icon in brand indigo (company fleet) or slate (market fleet)
 */
export function VehiclePlate({
  vehicleNumber,
  source = "COMPANY",
  showIcon = true,
  className,
  ...props
}: VehiclePlateProps) {
  if (!vehicleNumber) return <span className="text-slate-400 text-xs font-mono">—</span>;

  const isCompany = source.toUpperCase() === "COMPANY";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-slate-50/90 border border-slate-300 font-mono text-[11px] font-bold text-slate-900 uppercase tracking-wider shadow-2xs select-none",
        className
      )}
      {...props}
    >
      <span className="text-[8px] font-extrabold tracking-tighter text-blue-700 bg-blue-100/90 px-1 py-0.2 rounded-[2px] leading-tight border border-blue-200/50">
        IND
      </span>
      {showIcon && (
        <Truck
          className={cn(
            "w-3 h-3 shrink-0",
            isCompany ? "text-indigo-600" : "text-slate-500"
          )}
        />
      )}
      <span className="tracking-widest">{vehicleNumber}</span>
    </span>
  );
}
