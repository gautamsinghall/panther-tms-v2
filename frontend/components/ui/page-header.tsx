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
  title: React.ReactNode;
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
 * Standardized Enterprise Header Pattern:
 * Breadcrumbs + Page Title + Status Badge + Action CTAs
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
    <div className={cn("space-y-2.5 pb-4 border-b border-slate-200/80", className)}>
      {/* Breadcrumb Row */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-slate-800 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "font-semibold text-slate-700" : ""}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Main Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-xs sm:text-sm leading-relaxed text-slate-600 mt-1 max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {(primaryAction || secondaryActions.length > 0 || actions) && (
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {secondaryActions.map((action, idx) => (
              <Button
                key={idx}
                variant={action.variant || "secondary"}
                size="md"
                disabled={action.disabled}
                onClick={action.onClick}
                className="shadow-2xs text-xs font-semibold h-9 px-3.5 rounded-xl hover:border-slate-300"
              >
                {action.href ? (
                  <Link href={action.href} className="inline-flex items-center gap-2">
                    {renderActionIcon(action.icon)}
                    <span>{action.label}</span>
                  </Link>
                ) : (
                  <>
                    {renderActionIcon(action.icon)}
                    <span>{action.label}</span>
                  </>
                )}
              </Button>
            ))}

            {primaryAction && (
              <Button
                variant={primaryAction.variant || "primary"}
                size="md"
                disabled={primaryAction.disabled}
                onClick={primaryAction.onClick}
                className="shadow-xs text-xs font-semibold h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all flex items-center gap-2 group"
              >
                {primaryAction.href ? (
                  <Link href={primaryAction.href} className="inline-flex items-center gap-2">
                    {renderActionIcon(primaryAction.icon)}
                    <span>{primaryAction.label}</span>
                  </Link>
                ) : (
                  <>
                    {renderActionIcon(primaryAction.icon)}
                    <span>{primaryAction.label}</span>
                  </>
                )}
              </Button>
            )}

            {actions}
          </div>
        )}
      </div>

      {children && <div className="pt-2">{children}</div>}
    </div>
  );
}
