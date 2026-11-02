"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  ShieldCheck,
  User,
  Building2,
  Search,
  ChevronDown,
  Sun,
  Moon,
  Sparkles,
  Menu,
} from "lucide-react";
import { usePantherAI } from "@/components/ai";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/badge";
import { CommandPalette } from "@/components/layout/command-palette";
import { NotificationsPopover } from "@/components/layout/notifications-popover";
import { OfficeSwitcher } from "@/components/layout/office-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/lib/theme-context";
import { getStoredAuth, clearStoredAuth } from "@/lib/auth";
import { useWorkspaceTabs } from "@/lib/workspace-tabs-context";

export function Header() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const { toggleAI } = usePantherAI();
  const { toggleMobileNav } = useWorkspaceTabs();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [authData, setAuthData] = useState<{
    userName: string;
    userEmail: string;
    role: string;
    tenantId: string;
    companyCode: string;
    companyName: string;
  } | null>(null);

  // Global Ctrl+K / Cmd+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth && auth.user) {
      setAuthData({
        userName: auth.user.full_name || "Workspace User",
        userEmail: auth.user.email || "",
        role: auth.user.role || "COMPANY_ADMIN",
        tenantId: auth.tenantId || "",
        companyCode: auth.companyCode || "",
        companyName: auth.tenantName || auth.companyCode || "Workspace",
      });
    } else {
      setAuthData(null);
    }
  }, []);

  const handleLogout = () => {
    clearStoredAuth();
    router.push("/login");
  };

  return (
    <header className="h-16 border-b border-slate-200/80 dark:border-[#22232E] bg-white/95 dark:bg-[#101013]/95 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Left: Mobile Menu Trigger + Organization / Branch Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        {/* Mobile Sidebar Hamburger Trigger (Hidden on Desktop >= 1024px) */}
        <button
          type="button"
          onClick={toggleMobileNav}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {authData && (
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#17171B] border border-slate-200/80 dark:border-[#303036] hover:border-slate-300 hover:bg-slate-100/60 transition-all duration-150 shadow-2xs cursor-pointer group shrink-0">
            <Building2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-600 transition-colors shrink-0" />
            <span className="text-xs font-semibold text-slate-800 dark:text-[#F5F5F7] group-hover:text-slate-900 transition-colors truncate max-w-[90px] sm:max-w-[160px] md:max-w-none">
              {authData.companyName}
            </span>
            {authData.companyCode && (
              <span className="text-[10px] sm:text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200/70 dark:border-indigo-800/60 group-hover:border-indigo-300 uppercase tracking-wider shrink-0">
                {authData.companyCode}
              </span>
            )}
          </div>
        )}

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block shrink-0" />

        <div className="min-w-0 shrink-0">
          <OfficeSwitcher />
        </div>

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 hidden lg:block shrink-0" />

        <div className="hidden lg:block shrink-0">
          <StatusBadge status="ACTIVE" />
        </div>
      </div>

      {/* Center / Right: Global Search, Notifications & User Profile Menu */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Interactive Global Search Trigger for Desktop */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden md:flex items-center gap-2.5 px-3 h-9 rounded-xl border border-slate-200/90 dark:border-[#303036] bg-slate-50/70 dark:bg-[#17171B] hover:bg-white dark:hover:bg-[#1E1E24] hover:border-slate-300 hover:shadow-xs text-xs text-slate-400 w-56 lg:w-[420px] transition-all text-left cursor-pointer group select-none ring-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none"
          style={{ outline: "none" }}
          title="Search records (Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
          <span className="flex-1 text-xs text-slate-400 group-hover:text-slate-600 transition-colors truncate">
            Search commands, LRs, invoices...
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-[#101013] border border-slate-200/90 dark:border-[#303036] rounded text-slate-400 group-hover:text-slate-600 shadow-2xs transition-colors shrink-0">
            Ctrl K
          </kbd>
        </button>

        {/* Mobile Search Icon Trigger */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="md:hidden w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          title="Search records"
          aria-label="Search records"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Action Controls: Notifications, Theme Switch & Panther AI */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={toggleAI}
            aria-label="Open Panther AI (Ctrl+/)"
            title="Open Panther AI Copilot (Ctrl+/)"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 transition-colors cursor-pointer select-none"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span className="hidden sm:inline">Panther AI</span>
          </button>
          <NotificationsPopover />
          <ThemeToggle />
        </div>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block shrink-0" />

        {/* User Profile Menu */}
        <DropdownMenu
          align="right"
          trigger={
            <button
              type="button"
              aria-label={`User account: ${authData?.userName || "User"}, role: ${
                authData?.role === "COMPANY_ADMIN" ? "Company Admin" : authData?.role || "Admin"
              }`}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer select-none"
            >
              <div
                aria-hidden="true"
                className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 select-none group-hover:bg-indigo-700 transition-colors"
              >
                {authData?.userName ? authData.userName[0].toUpperCase() : "U"}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold text-slate-900 dark:text-[#F5F5F7] leading-tight">
                  {authData?.userName || "User"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight flex items-center gap-1 font-mono mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>{authData?.role === "COMPANY_ADMIN" ? "Company Admin" : authData?.role || "User"}</span>
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block shrink-0" aria-hidden="true" />
            </button>
          }
          items={[
            {
              label: "User Profile",
              icon: <User className="w-4 h-4" />,
              onClick: () => router.push("/profile/account"),
            },
            {
              label: "Company Settings",
              icon: <Building2 className="w-4 h-4" />,
              onClick: () => router.push("/company/details"),
            },
            {
              label: isDark ? "Switch to Light Mode" : "Switch to Dark Mode",
              icon: isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />,
              onClick: toggleTheme,
            },
            {
              label: "Sign Out",
              icon: <LogOut className="w-4 h-4" />,
              onClick: handleLogout,
              variant: "danger",
            },
          ]}
        />
      </div>

      {/* Global Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </header>
  );
}
