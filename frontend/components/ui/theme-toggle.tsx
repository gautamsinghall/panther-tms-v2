"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

export interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "pill" | "menu-item";
  showLabel?: boolean;
}

export function ThemeToggle({
  className,
  variant = "icon",
  showLabel = false,
}: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  if (variant === "menu-item") {
    return (
      <button
        type="button"
        onClick={(e) => toggleTheme(e)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer select-none active:scale-[0.98]",
          "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
          "dark:text-[#CACAD0] dark:hover:bg-[#26262D] dark:hover:text-[#F5F5F7]",
          className
        )}
      >
        <div className="flex items-center gap-2">
          {isDark ? (
            <Sun className="w-4 h-4 text-[#F5BB45] shrink-0 transition-transform duration-350 ease-apple rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600 shrink-0 transition-transform duration-350 ease-apple -rotate-12 hover:rotate-0" />
          )}
          <span>{isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
        </div>
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={(e) => toggleTheme(e)}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 select-none cursor-pointer active:scale-95",
          isDark
            ? "bg-[#17171B] hover:bg-[#26262D] border-[#303036] text-[#F5F5F7] shadow-xs"
            : "bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800 shadow-2xs",
          className
        )}
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-[#F5BB45] transition-transform duration-350 ease-apple" />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-indigo-600 transition-transform duration-350 ease-apple" />
            <span>Dark Mode</span>
          </>
        )}
      </button>
    );
  }

  // Default: Icon button for Top Header
  return (
    <button
      type="button"
      onClick={(e) => toggleTheme(e)}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={cn(
        "relative w-9 h-9 flex items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer select-none group focus:outline-none active:scale-95",
        isDark
          ? "bg-[#17171B] hover:bg-[#26262D] border-[#303036] hover:border-[#42424A] text-[#F5BB45]"
          : "bg-slate-50 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-600 hover:text-indigo-600 shadow-2xs",
        className
      )}
    >
      <div className="relative w-4 h-4 flex items-center justify-center overflow-hidden">
        {/* Sun Icon (rotates and scales out when switching to light mode, active in dark) */}
        <Sun
          className={cn(
            "w-4 h-4 transition-all duration-350 ease-apple absolute transform",
            isDark
              ? "rotate-0 scale-100 opacity-100 text-[#F5BB45]"
              : "rotate-45 scale-50 opacity-0 text-slate-400"
          )}
        />

        {/* Moon Icon (rotates and scales in when in light mode, active in light) */}
        <Moon
          className={cn(
            "w-4 h-4 transition-all duration-350 ease-apple absolute transform",
            isDark
              ? "-rotate-45 scale-50 opacity-0 text-slate-400"
              : "rotate-0 scale-100 opacity-100 text-slate-600 group-hover:text-indigo-600"
          )}
        />
      </div>
    </button>
  );
}
