"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface SegmentTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
  variant?: "pills" | "underlined";
}

/**
 * Linear-style Segment Tabs Component:
 * - High-density, keyboard-friendly navigation
 * - Subtle slate borders and background
 * - Inset pill active indicator with micro-shadow
 */
export function SegmentTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className,
  variant = "pills",
}: SegmentTabsProps<T>) {
  if (variant === "underlined") {
    return (
      <div className={cn("flex items-center gap-6 border-b border-slate-200/80", className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 pb-3 text-xs font-semibold tracking-tight transition-all cursor-pointer select-none",
                isActive
                  ? "text-slate-900 font-bold"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {tab.icon && (
                <span className={cn("w-3.5 h-3.5", isActive ? "text-indigo-600" : "text-slate-400")}>
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-xs font-mono font-semibold",
                    isActive
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600 rounded-t-full shadow-xs" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: Linear Inset Pill Variant
  return (
    <div
      className={cn(
        "inline-flex items-center p-1 rounded-lg bg-slate-100/90 border border-slate-200/80 shadow-2xs gap-1 select-none",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-[13px] font-medium transition-all duration-150 cursor-pointer select-none",
              isActive
                ? "bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/60"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
            )}
          >
            {tab.icon && (
              <span className={cn("w-3.5 h-3.5", isActive ? "text-indigo-600" : "text-slate-400")}>
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs font-mono font-semibold",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                    : "bg-slate-200/60 text-slate-600"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
