import React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant =
  | "active"
  | "delivered"
  | "paid"
  | "completed"
  | "approved"
  | "verified"
  | "pending"
  | "in_transit"
  | "in_progress"
  | "draft"
  | "scheduled"
  | "dispatched"
  | "arrived"
  | "overdue"
  | "cancelled"
  | "rejected"
  | "failed"
  | "suspended"
  | "inactive"
  | "maintenance"
  | "void"
  | "info"
  | "default";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  variant?: StatusVariant;
}

/**
 * StatusBadge per docs/design.md §19:
 * Communicates status via both semantic visual dot indicator AND text.
 */
export function StatusBadge({ status, variant, className, ...props }: StatusBadgeProps) {
  const normalized = (variant || status || "").toLowerCase().replace(/[\s-]/g, "_");

  // Default: Scheduled / Draft / Neutral gray
  let colorClasses = "bg-[#F2F4F7] text-[#667085] border-[#E4E7EC]";
  let dotColor = "bg-[#667085]";

  if (["active", "delivered", "paid", "completed", "approved", "verified", "closed", "pod_verified"].includes(normalized)) {
    // Success / Green
    colorClasses = "bg-[#ECFDF3] text-[#16A34A] border-[#A6F4C5]";
    dotColor = "bg-[#16A34A]";
  } else if (["in_transit", "in_progress", "loaded", "booked", "info"].includes(normalized)) {
    // In Transit / Blue / Sky
    colorClasses = "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]";
    dotColor = "bg-[#2563EB]";
  } else if (["pending", "sent", "dispatched", "arrived", "pod_received", "warning", "maintenance", "under_review"].includes(normalized)) {
    // Sent / Warning / Amber
    colorClasses = "bg-[#FFFAEB] text-[#D97706] border-[#FEDF89]";
    dotColor = "bg-[#D97706]";
  } else if (["overdue", "cancelled", "rejected", "failed", "suspended", "inactive", "void", "danger"].includes(normalized)) {
    // Overdue / Danger / Red
    colorClasses = "bg-[#FEF2F2] text-[#DC2626] border-[#FECDCA]";
    dotColor = "bg-[#DC2626]";
  }

  // Format label to clean title case with spaces (e.g. IN_TRANSIT -> In Transit)
  const formatLabel = (val: string) => {
    return val
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide select-none transition-colors",
        colorClasses,
        className
      )}
      {...props}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5 shrink-0", dotColor)} />
      {formatLabel(status)}
    </span>
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "neutral" | "gold" | "success" | "danger" | "warning" | "info";
  children: React.ReactNode;
}

export function Badge({ variant = "neutral", className, children, ...props }: BadgeProps) {
  const variantStyles = {
    primary: "bg-[#172033]/5 text-[#172033] border-[#172033]/15",
    secondary: "bg-[#F2F4F7] text-[#172033] border-[#E4E7EC]",
    neutral: "bg-[#F2F4F7] text-[#667085] border-[#E4E7EC]",
    gold: "bg-[#F8F1D9] text-[#A88416] border-[#C9A227]/30",
    success: "bg-[#ECFDF3] text-[#16A34A] border-[#A6F4C5]",
    danger: "bg-[#FEF2F2] text-[#DC2626] border-[#FECDCA]",
    warning: "bg-[#FFFAEB] text-[#D97706] border-[#FEDF89]",
    info: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border select-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
