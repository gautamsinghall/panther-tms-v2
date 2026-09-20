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
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "destructive";
  disabled?: boolean;
}

function renderActionIcon(icon?: React.ReactNode | React.ComponentType<{ className?: string }>) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === "function" || typeof icon === "object") {
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className="w-4 h-4" />;
  }
  return null;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  badge?: React.ReactNode;
  primaryAction?: PageHeaderAction;
  secondaryActions?: PageHeaderAction[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standardized Header Pattern per docs/design.md §4:
 * Breadcrumb + Page Title + Primary Action
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  badge,
  primaryAction,
  secondaryActions = [],
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2 pb-4 border-b border-[#E4E7EC]", className)}>
      {/* Breadcrumb Row */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-[#667085]">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#667085] shrink-0" />}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-[#101828] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "font-medium text-[#101828]" : ""}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Main Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] leading-[28px] font-semibold tracking-tight text-[#101828]">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-[13px] leading-[18px] text-[#667085] mt-0.5">
              {description}
            </p>
          )}
        </div>

        {/* Action Buttons: Exactly ONE primary CTA per docs/design.md §5 */}
        <div className="flex items-center gap-2 flex-wrap">
          {actions}
          {secondaryActions.map((action) =>
            action.href ? (
              <Link key={action.label} href={action.href}>
                <Button
                  variant={action.variant || "secondary"}
                  size="sm"
                  disabled={action.disabled}
                >
                  {renderActionIcon(action.icon)}
                  {action.label}
                </Button>
              </Link>
            ) : (
              <Button
                key={action.label}
                variant={action.variant || "secondary"}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {renderActionIcon(action.icon)}
                {action.label}
              </Button>
            )
          )}

          {primaryAction &&
            (primaryAction.href ? (
              <Link href={primaryAction.href}>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={primaryAction.disabled}
                >
                  {renderActionIcon(primaryAction.icon)}
                  {primaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
              >
                {renderActionIcon(primaryAction.icon)}
                {primaryAction.label}
              </Button>
            ))}
        </div>
      </div>

      {children && <div className="pt-2">{children}</div>}
    </div>
  );
}
