import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "gold" | "secondary" | "outline" | "ghost" | "danger";
  disabled?: boolean;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  badge?: React.ReactNode;
  primaryAction?: PageHeaderAction;
  secondaryActions?: PageHeaderAction[];
  children?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader standardized pattern per docs/design.md §6 & §10:
 * 
 * Title
 * One-line context
 * [ Primary Action ]
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  badge,
  primaryAction,
  secondaryActions = [],
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-3 pb-5 border-b border-[#E4E7EC]", className)}>
      {/* Breadcrumb row if present */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-[#667085]">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-[#98A2B3] shrink-0" />}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-[#172033] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "font-medium text-[#172033]" : ""}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Main Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172033]">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-[#667085] mt-1">
              {description}
            </p>
          )}
        </div>

        {/* Action Buttons: Exactly ONE dominant CTA + optional secondary */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {secondaryActions.map((action) => (
            action.href ? (
              <Link key={action.label} href={action.href}>
                <Button
                  variant={action.variant || "outline"}
                  size="sm"
                  disabled={action.disabled}
                >
                  {action.icon}
                  {action.label}
                </Button>
              </Link>
            ) : (
              <Button
                key={action.label}
                variant={action.variant || "outline"}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.icon}
                {action.label}
              </Button>
            )
          ))}

          {primaryAction && (
            primaryAction.href ? (
              <Link href={primaryAction.href}>
                <Button
                  variant={primaryAction.variant || "primary"}
                  size="sm"
                  disabled={primaryAction.disabled}
                >
                  {primaryAction.icon}
                  {primaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button
                variant={primaryAction.variant || "primary"}
                size="sm"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
              >
                {primaryAction.icon}
                {primaryAction.label}
              </Button>
            )
          )}
        </div>
      </div>

      {children && <div className="pt-2">{children}</div>}
    </div>
  );
}
