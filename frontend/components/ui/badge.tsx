import React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant =
  | "active"
  | "delivered"
  | "paid"
  | "completed"
  | "approved"
  | "pending"
  | "in_transit"
  | "draft"
  | "dispatched"
  | "overdue"
  | "cancelled"
  | "rejected"
  | "failed"
  | "suspended"
  | "info"
  | "default";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  variant?: StatusVariant;
}

export function StatusBadge({ status, variant, className, ...props }: StatusBadgeProps) {
  // Normalize status to determine variant if not explicitly given
  const normalized = (variant || status || "").toLowerCase().replace(/[\s-]/g, "_");

  let colorClasses = "bg-slate-100 text-slate-700 border-slate-200";

  // Semantic mapping per design.md §2 & §3
  if (["active", "delivered", "paid", "completed", "approved"].includes(normalized)) {
    // Success / Emerald
    colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
  } else if (["pending", "in_transit", "draft", "dispatched", "under_review"].includes(normalized)) {
    // Warning / Amber
    colorClasses = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
  } else if (["overdue", "cancelled", "rejected", "failed", "suspended", "inactive"].includes(normalized)) {
    // Danger / Rose
    colorClasses = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
  } else if (["info", "new", "created", "processing", "pro", "business", "enterprise"].includes(normalized)) {
    // Info / Sky Blue
    colorClasses = "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800";
  }

  // Format label to title case with spaces (e.g. IN_TRANSIT -> In Transit)
  const formatLabel = (val: string) => {
    return val
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide transition-colors",
        colorClasses,
        className
      )}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {formatLabel(status)}
    </span>
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "neutral" | "success" | "danger" | "warning" | "info";
  children: React.ReactNode;
}

export function Badge({ variant = "neutral", className, children, ...props }: BadgeProps) {
  const variantStyles = {
    primary: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800",
    secondary: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    neutral: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    danger: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
    warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    info: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

