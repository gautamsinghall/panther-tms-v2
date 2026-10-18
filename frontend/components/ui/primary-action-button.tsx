"use client";

import React from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PrimaryActionButtonProps {
  /** Button label */
  children: React.ReactNode;
  /** Optional Lucide icon component. Pass null to suppress the icon entirely. Defaults to Plus. */
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode | null;
  /** When provided, renders a Next.js <Link> instead of a <button> for client-side navigation */
  href?: string;
  /** Click handler — only applies when rendered as a <button> */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Size variant */
  size?: "default" | "sm" | "icon";
  /** Disabled state */
  disabled?: boolean;
  /** Loading state — shows spinner and disables interaction */
  isLoading?: boolean;
  /** Additional class overrides */
  className?: string;
  /** Button type — defaults to "button" to prevent accidental form submissions */
  type?: "button" | "submit" | "reset";
  /** data-testid passthrough */
  "data-testid"?: string;
  /** aria-label passthrough */
  "aria-label"?: string;
  /** title attribute */
  title?: string;
}

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const BASE =
  "inline-flex items-center justify-center gap-2 font-semibold select-none " +
  "transition-all duration-200 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 " +
  "disabled:opacity-50 disabled:pointer-events-none " +
  "bg-gradient-to-b from-indigo-500 to-indigo-600 " +
  "border border-indigo-700/40 " +
  "text-white " +
  "shadow-[0_1px_2px_rgba(79,70,229,0.22),0_0_0_1px_rgba(79,70,229,0.10)] " +
  "hover:from-indigo-400 hover:to-indigo-500 " +
  "hover:shadow-[0_2px_8px_rgba(79,70,229,0.28),0_0_0_1px_rgba(79,70,229,0.14)] " +
  "hover:-translate-y-px " +
  "active:from-indigo-600 active:to-indigo-700 " +
  "active:translate-y-0 active:shadow-[0_1px_2px_rgba(79,70,229,0.18)]";

const SIZE_STYLES: Record<string, string> = {
  default: "h-9 px-4 py-2 text-xs sm:text-sm rounded-xl",
  sm: "h-8 px-3 py-1.5 text-xs rounded-lg",
  icon: "h-9 w-9 rounded-xl p-0",
};

const ICON_STYLES: Record<string, string> = {
  default: "w-4 h-4 shrink-0",
  sm: "w-3.5 h-3.5 shrink-0",
  icon: "w-4 h-4 shrink-0",
};

// ---------------------------------------------------------------------------
// Helper — resolve icon node
// ---------------------------------------------------------------------------

function resolveIcon(
  icon: PrimaryActionButtonProps["icon"],
  size: string,
  isLoading: boolean
): React.ReactNode {
  if (isLoading) {
    return <Loader2 className={cn(ICON_STYLES[size], "animate-spin")} />;
  }
  if (icon === null) return null;
  if (icon === undefined) {
    return <Plus className={ICON_STYLES[size]} />;
  }
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === "function") {
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className={ICON_STYLES[size]} />;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PrimaryActionButton
 *
 * Enterprise-grade primary CTA for all "Add", "Create", "+" triggers across
 * PantherTMS. Renders a semantically-correct <button> by default, or a
 * Next.js <Link> when `href` is supplied — no invalid <button> inside <a>.
 *
 * @example
 *   <PrimaryActionButton onClick={openDrawer}>Add Employee</PrimaryActionButton>
 *   <PrimaryActionButton href="/transport/lr-booking/new" icon={FileText}>New LR</PrimaryActionButton>
 *   <PrimaryActionButton icon={null} isLoading>Saving…</PrimaryActionButton>
 */
export const PrimaryActionButton = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  PrimaryActionButtonProps
>(function PrimaryActionButton(
  {
    children,
    icon,
    href,
    onClick,
    size = "default",
    disabled = false,
    isLoading = false,
    className,
    type = "button",
    "data-testid": dataTestId,
    "aria-label": ariaLabel,
    title,
  },
  ref
) {
  const resolvedIcon = resolveIcon(icon, size, isLoading);
  const combinedClass = cn(BASE, SIZE_STYLES[size], className);
  const isDisabled = disabled || isLoading;

  // Link variant — renders a Next.js Link for client-side navigation
  if (href && !isDisabled) {
    return (
      <Link
        href={href}
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={combinedClass}
        data-testid={dataTestId}
        aria-label={ariaLabel}
        title={title}
      >
        {resolvedIcon}
        {size !== "icon" && <span>{children}</span>}
      </Link>
    );
  }

  // Button variant — default rendering
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={combinedClass}
      data-testid={dataTestId}
      aria-label={ariaLabel}
      title={title}
    >
      {resolvedIcon}
      {size !== "icon" && <span>{children}</span>}
    </button>
  );
});

PrimaryActionButton.displayName = "PrimaryActionButton";
