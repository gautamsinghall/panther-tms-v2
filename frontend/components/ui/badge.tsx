import React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant =
  | "active"
  | "delivered"
  | "paid"
  | "completed"
  | "approved"
  | "verified"
  | "reconciled"
  | "closed"
  | "pod_verified"
  | "pending"
  | "in_transit"
  | "in_progress"
  | "booked"
  | "loaded"
  | "draft"
  | "scheduled"
  | "sent"
  | "dispatched"
  | "arrived"
  | "due_soon"
  | "pod_received"
  | "maintenance"
  | "under_review"
  | "overdue"
  | "cancelled"
  | "rejected"
  | "failed"
  | "suspended"
  | "inactive"
  | "danger"
  | "success"
  | "warning"
  | "neutral"
  | "primary"
  | "secondary"
  | "void"
  | "info"
  | "processing"
  | "generating"
  | "default";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  variant?: StatusVariant;
}

/**
 * Status Badge component per docs/design.md §1 & §5:
 * - Rounded 6px (less toy-like than full 999px pill)
 * - bg + text semantic pair
 * - Small colored dot (6px) + label text
 * - 12px Label-weight type (text-xs font-medium)
 * - Never color-only
 */
export function StatusBadge({ status, variant, className, ...props }: StatusBadgeProps) {
  const normalized = (variant || status || "").toLowerCase().replace(/[\s-]/g, "_");

  // Semantic styles - Linear & Stripe Enterprise
  let bgClass = "bg-slate-100/90 border-slate-200/80";
  let textClass = "text-slate-700";
  let dotClass = "bg-slate-400";
  let isLive = false;

  // 1. Success: Delivered, Paid, Active, Reconciled, Completed, Approved, Verified, Closed, Pod Verified
  if (
    [
      "active",
      "delivered",
      "paid",
      "completed",
      "approved",
      "verified",
      "reconciled",
      "closed",
      "pod_verified",
      "success",
    ].includes(normalized)
  ) {
    bgClass = "bg-emerald-50 border-emerald-200/70";
    textClass = "text-emerald-800";
    dotClass = "bg-emerald-500";
  }
  // 2. Live Active Transit: In Transit, In Progress, Dispatched, Moving, En Route
  else if (
    [
      "in_transit",
      "in_progress",
      "dispatched",
      "en_route",
      "moving",
      "tracking",
    ].includes(normalized)
  ) {
    bgClass = "bg-blue-50 border-blue-200/80";
    textClass = "text-blue-800";
    dotClass = "bg-blue-500";
    isLive = true;
  }
  // 3. Warning / Operational Hold: Pending, Booked, Loaded, Draft, Due Soon, Sent, Arrived, Pod Received, Maintenance
  else if (
    [
      "pending",
      "booked",
      "loaded",
      "draft",
      "due_soon",
      "sent",
      "arrived",
      "pod_received",
      "maintenance",
      "under_review",
      "warning",
    ].includes(normalized)
  ) {
    bgClass = "bg-amber-50 border-amber-200/70";
    textClass = "text-amber-800";
    dotClass = "bg-amber-500";
  }
  // 4. Danger: Overdue, Cancelled, Rejected, Failed, Suspended, Inactive, Void
  else if (
    [
      "overdue",
      "cancelled",
      "rejected",
      "failed",
      "suspended",
      "inactive",
      "void",
      "danger",
    ].includes(normalized)
  ) {
    bgClass = "bg-rose-50 border-rose-200/70";
    textClass = "text-rose-800";
    dotClass = "bg-rose-500";
  }
  // 5. Info / System
  else if (
    ["info", "scheduled", "processing", "generating"].includes(normalized)
  ) {
    bgClass = "bg-indigo-50 border-indigo-200/70";
    textClass = "text-indigo-800";
    dotClass = "bg-indigo-500";
    isLive = normalized === "processing" || normalized === "generating";
  }
  // 6. Primary
  else if (["primary"].includes(normalized)) {
    bgClass = "bg-indigo-50 border-indigo-200/70";
    textClass = "text-indigo-700";
    dotClass = "bg-indigo-600";
  }

  // Format label to clean Title Case with spaces
  const formatLabel = (val: string) => {
    return val
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-xs font-medium tracking-[0.01em] border select-none transition-all shadow-xs",
        bgClass,
        textClass,
        className
      )}
      {...props}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center">
        {isLive && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              dotClass
            )}
          />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dotClass)} />
      </span>
      {formatLabel(status)}
    </span>
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "neutral" | "success" | "danger" | "warning" | "info";
  dot?: boolean;
  children: React.ReactNode;
}

export function Badge({ variant = "neutral", dot = false, className, children, ...props }: BadgeProps) {
  const variantStyles = {
    primary: "bg-indigo-50 border-indigo-200/70 text-indigo-700",
    secondary: "bg-slate-100 border-slate-200/80 text-slate-700",
    neutral: "bg-slate-100 border-slate-200/80 text-slate-700",
    success: "bg-emerald-50 border-emerald-200/70 text-emerald-800",
    danger: "bg-rose-50 border-rose-200/70 text-rose-800",
    warning: "bg-amber-50 border-amber-200/70 text-amber-800",
    info: "bg-blue-50 border-blue-200/70 text-blue-800",
  };

  const dotStyles = {
    primary: "bg-indigo-600",
    secondary: "bg-slate-400",
    neutral: "bg-slate-400",
    success: "bg-emerald-500",
    danger: "bg-rose-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-xs font-medium border select-none shadow-xs",
        variantStyles[variant] || variantStyles.neutral,
        className
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotStyles[variant] || dotStyles.neutral)} />}
      {children}
    </span>
  );
}
