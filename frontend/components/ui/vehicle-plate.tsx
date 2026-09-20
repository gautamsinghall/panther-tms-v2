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
  if (!vehicleNumber) return <span className="text-[#98A2B3] text-xs font-mono">—</span>;

  const isCompany = source.toUpperCase() === "COMPANY";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[#F8F9FA] border border-[#D0D5DD] font-mono text-[11px] font-bold text-[#101828] uppercase tracking-wider shadow-xs select-none",
        className
      )}
      {...props}
    >
      {showIcon && (
        <Truck
          className={cn(
            "w-3 h-3 shrink-0",
            isCompany ? "text-[#4F46E5]" : "text-[#667085]"
          )}
        />
      )}
      <span>{vehicleNumber}</span>
    </span>
  );
}
