"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Truck,
  FileSpreadsheet,
  FileCheck2,
  Calculator,
  Layers,
  BarChart3,
  Receipt,
  Gauge,
  Settings,
  UserCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface NavSubItem {
  feature?: string;
  title: string;
  href: string;
}

interface NavGroup {
  id: string;
  title: string;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
  items: NavSubItem[];
}

// Module icon map
const MODULE_ICONS: Record<string, React.ReactNode> = {
  home: <LayoutDashboard className="w-4 h-4" />,
  general: <Building2 className="w-4 h-4" />,
  transport: <Truck className="w-4 h-4" />,
  "transport-reports": <FileSpreadsheet className="w-4 h-4" />,
  einvoicing: <FileCheck2 className="w-4 h-4" />,
  accounts: <Calculator className="w-4 h-4" />,
  misc: <Layers className="w-4 h-4" />,
  reports: <BarChart3 className="w-4 h-4" />,
  statements: <Receipt className="w-4 h-4" />,
  fleet: <Gauge className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  profile: <UserCircle className="w-4 h-4" />,
};

export function Sidebar() {
  const pathname = usePathname();
  const [navGroups, setNavGroups] = useState<NavGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    home: true,
    general: true,
    settings: true,
  });
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    async function loadNavigation() {
      try {
        const data = await apiClient<NavGroup[]>("/api/v1/auth/navigation");
        if (Array.isArray(data) && data.length > 0) {
          setNavGroups(data);
          // Auto-expand group containing current pathname
          const expanded: Record<string, boolean> = {
            home: true,
            general: true,
            transport: true,
            accounts: true,
            einvoicing: true,
            "transport-reports": true,
            misc: true,
          };
          data.forEach((g) => {
            if (g.items.some((it) => it.href === pathname || pathname.startsWith(`/${g.id}`))) {
              expanded[g.id] = true;
            }
          });
          setExpandedGroups((prev) => ({ ...prev, ...expanded }));
        }
      } catch (err) {
        console.warn("Could not load dynamic navigation from backend:", err);
      }
    }
    loadNavigation();
  }, [pathname]);

  useEffect(() => {
    if (pathname && navGroups.length > 0) {
      navGroups.forEach((g) => {
        if (g.items.some((it) => it.href === pathname || pathname.startsWith(`/${g.id}`))) {
          setExpandedGroups((prev) => ({ ...prev, [g.id]: true }));
        }
      });
    }
  }, [pathname, navGroups]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 transition-all duration-300 select-none",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-white font-bold tracking-wider shadow-sm">
              P
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Panther<span className="text-[var(--color-primary)]">TMS</span>
              </span>
              <span className="block text-[10px] text-slate-400 -mt-1 font-medium">Enterprise Logistics</span>
            </div>
          </Link>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 mx-auto rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-white font-bold tracking-wider">
            P
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 mx-auto" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Dynamic Navigation Groups (Permission-Driven) */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navGroups.map((group) => {
          const isExpanded = expandedGroups[group.id] ?? false;
          const hasActiveChild = group.items.some((item) => item.href === pathname);
          const icon = MODULE_ICONS[group.id] || <Layers className="w-4 h-4" />;

          return (
            <div key={group.id} className="space-y-0.5">
              {/* Group Header Button */}
              <button
                type="button"
                onClick={() => {
                  if (isCollapsed) setIsCollapsed(false);
                  toggleGroup(group.id);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors",
                  hasActiveChild
                    ? "text-[var(--color-primary)] font-semibold bg-blue-50/50 dark:bg-blue-950/30"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
                )}
                title={isCollapsed ? group.title : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn(hasActiveChild ? "text-[var(--color-primary)]" : "text-slate-500")}>
                    {icon}
                  </span>
                  {!isCollapsed && <span>{group.title}</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-slate-400">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                )}
              </button>

              {/* Sub items */}
              {!isCollapsed && isExpanded && (
                <div className="pl-7 pr-1 space-y-0.5 pt-0.5">
                  {group.items.map((sub) => {
                    const isActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          "block px-2.5 py-1.5 rounded-md text-xs transition-colors",
                          isActive
                            ? "bg-[var(--color-primary)] text-white font-medium shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/40"
                        )}
                      >
                        {sub.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* RBAC Status Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-2.5">
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold text-xs">
              <Shield className="w-3.5 h-3.5" />
              <span>RBAC Filter Active</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 leading-snug">
              Sidebar query-driven via backend permissions.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
