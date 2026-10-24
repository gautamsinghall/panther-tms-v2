"use client";

import React from "react";
import { Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

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
        onClick={toggleTheme}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer select-none",
          "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
          "dark:text-[#CACAD0] dark:hover:bg-[#26262D] dark:hover:text-[#F5F5F7]",
          className
        )}
      >
        <div className="flex items-center gap-2">
          {isDark ? (
            <Sun className="w-4 h-4 text-[#F5BB45] shrink-0 transition-transform duration-300 rotate-0 hover:rotate-90" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600 shrink-0 transition-transform duration-300 -rotate-12 hover:rotate-0" />
          )}
          <span>{isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
        </div>
        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#131317] text-slate-500 dark:text-[#898991] border border-slate-200 dark:border-[#303036]">
          Ctrl+Shift+D
        </kbd>
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 select-none cursor-pointer",
          isDark
            ? "bg-[#17171B] hover:bg-[#26262D] border-[#303036] text-[#F5F5F7] shadow-xs"
            : "bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800 shadow-2xs",
          className
        )}
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-[#F5BB45]" />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Dark Mode</span>
          </>
        )}
      </button>
    );
  }

  // Default: Icon button for Top Header
  return (
    <Tooltip
      content={
        <div className="flex items-center gap-2 text-xs">
          <span>{isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
          <kbd className="text-[10px] font-mono bg-white/20 dark:bg-[#26262D] px-1 py-0.2 rounded text-white/90 dark:text-[#F5F5F7]">
            Ctrl+Shift+D
          </kbd>
        </div>
      }
      side="bottom"
    >
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className={cn(
          "relative p-2 rounded-xl border transition-all duration-200 cursor-pointer select-none group focus:outline-none",
          isDark
            ? "bg-[#17171B] hover:bg-[#26262D] border-[#303036] hover:border-[#42424A] text-[#F5BB45]"
            : "bg-slate-50 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-600 hover:text-indigo-600 shadow-2xs",
          className
        )}
      >
        <div className="relative w-4 h-4 flex items-center justify-center overflow-hidden">
          {/* Sun Icon (shown when dark mode is active to toggle to light) */}
          <Sun
            className={cn(
              "w-4 h-4 transition-all duration-300 absolute transform",
              isDark
                ? "rotate-0 scale-100 opacity-100 text-[#F5BB45]"
                : "rotate-90 scale-0 opacity-0"
            )}
          />

          {/* Moon Icon (shown when light mode is active to toggle to dark) */}
          <Moon
            className={cn(
              "w-4 h-4 transition-all duration-300 absolute transform",
              isDark
                ? "-rotate-90 scale-0 opacity-0"
                : "rotate-0 scale-100 opacity-100 text-slate-600 group-hover:text-indigo-600"
            )}
          />
        </div>
      </button>
    </Tooltip>
  );
}
