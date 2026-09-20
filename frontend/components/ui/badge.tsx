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

  // Semantic styles per docs/design.md §1
  let bgClass = "bg-[#F1F3F6]";
  let textClass = "text-[#344054]";
  let dotClass = "bg-[#667085]";

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
    bgClass = "bg-[#ECFDF3]";
    textClass = "text-[#027A48]";
    dotClass = "bg-[#12B76A]";
  }
  // 2. Warning: Pending, In Transit, Draft, Due Soon, Booked, Loaded, Sent, Dispatched, Arrived, Pod Received, Maintenance
  else if (
    [
      "pending",
      "in_transit",
      "in_progress",
      "booked",
      "loaded",
      "draft",
      "due_soon",
      "sent",
      "dispatched",
      "arrived",
      "pod_received",
      "maintenance",
      "under_review",
      "warning",
    ].includes(normalized)
  ) {
    bgClass = "bg-[#FFFAEB]";
    textClass = "text-[#B54708]";
    dotClass = "bg-[#F79009]";
  }
  // 3. Danger: Overdue, Cancelled, Rejected, Failed, Suspended, Inactive, Void
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
    bgClass = "bg-[#FEF3F2]";
    textClass = "text-[#B42318]";
    dotClass = "bg-[#F04438]";
  }
  // 4. Info: Info, Processing, Scheduled, Generating
  else if (
    ["info", "scheduled", "processing", "generating"].includes(normalized)
  ) {
    bgClass = "bg-[#EFF8FF]";
    textClass = "text-[#175CD3]";
    dotClass = "bg-[#2E90FA]";
  }
  // 5. Primary
  else if (["primary"].includes(normalized)) {
    bgClass = "bg-[#EEF2FF]";
    textClass = "text-[#4338CA]";
    dotClass = "bg-[#4F46E5]";
  }
  // 6. Neutral / Secondary
  else if (["neutral", "secondary"].includes(normalized)) {
    bgClass = "bg-[#F1F3F6]";
    textClass = "text-[#344054]";
    dotClass = "bg-[#667085]";
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
        "inline-flex items-center px-2 py-0.5 rounded-[6px] text-xs font-medium tracking-[0.01em] select-none transition-colors",
        bgClass,
        textClass,
        className
      )}
      {...props}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5 shrink-0", dotClass)} />
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
    primary: "bg-[#EEF2FF] text-[#4338CA]",
    secondary: "bg-[#F1F3F6] text-[#344054]",
    neutral: "bg-[#F1F3F6] text-[#344054]",
    success: "bg-[#ECFDF3] text-[#027A48]",
    danger: "bg-[#FEF3F2] text-[#B42318]",
    warning: "bg-[#FFFAEB] text-[#B54708]",
    info: "bg-[#EFF8FF] text-[#175CD3]",
  };

  const dotStyles = {
    primary: "bg-[#4F46E5]",
    secondary: "bg-[#667085]",
    neutral: "bg-[#667085]",
    success: "bg-[#12B76A]",
    danger: "bg-[#F04438]",
    warning: "bg-[#F79009]",
    info: "bg-[#2E90FA]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-[6px] text-xs font-medium select-none",
        variantStyles[variant] || variantStyles.neutral,
        className
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5 shrink-0", dotStyles[variant] || dotStyles.neutral)} />}
      {children}
    </span>
  );
}
