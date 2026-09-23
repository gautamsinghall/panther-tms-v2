"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, User, Building2, Search, ChevronDown } from "lucide-react";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/badge";
import { CommandPalette } from "@/components/layout/command-palette";
import { NotificationsPopover } from "@/components/layout/notifications-popover";
import { getStoredAuth, clearStoredAuth } from "@/lib/auth";

export function Header() {
  const router = useRouter();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [authData, setAuthData] = useState<{
    userName: string;
    userEmail: string;
    role: string;
    subdomain: string;
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
    if (auth) {
      setAuthData({
        userName: auth.user?.full_name || "Company Admin",
        userEmail: auth.user?.email || "admin@demo.com",
        role: auth.user?.role || "COMPANY_ADMIN",
        subdomain: auth.subdomain || "demo",
        companyName: auth.tenantName || "Demo Logistics Pvt Ltd",
      });
    } else {
      setAuthData({
        userName: "Operations Admin",
        userEmail: "admin@demo.com",
        role: "COMPANY_ADMIN",
        subdomain: "demo",
        companyName: "Demo Logistics Pvt Ltd",
      });
    }
  }, []);

  const handleLogout = () => {
    clearStoredAuth();
    router.push("/login");
  };

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-5 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Left: Organization / Branch Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/60 transition-all duration-150 shadow-2xs cursor-pointer group">
          <Building2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
          <span className="text-xs font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
            {authData?.companyName}
          </span>
          <span className="text-xs font-mono font-medium text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 group-hover:border-slate-300">
            {authData?.subdomain}
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

        <div className="hidden sm:block">
          <StatusBadge status="ACTIVE" />
        </div>
      </div>

      {/* Center / Right: Global Search, Notifications & User Profile Menu */}
      <div className="flex items-center gap-2.5">
        {/* Interactive Global Search Trigger for Desktop */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 hover:bg-white hover:border-indigo-300 hover:shadow-xs text-xs text-slate-400 w-64 transition-all text-left cursor-pointer group select-none ring-0 focus:outline-hidden"
          title="Search records (Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          <span className="flex-1 text-xs text-slate-400 group-hover:text-slate-600 transition-colors">Search commands, LRs...</span>
          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-white border border-slate-200 rounded text-slate-500 group-hover:border-indigo-200 group-hover:text-indigo-600 shadow-2xs transition-colors">
            ⌘K
          </kbd>
        </button>

        {/* Mobile Search Icon Trigger */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Search records"
          aria-label="Search records"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Interactive Notification Bell Popover */}
        <NotificationsPopover />

        <div className="h-4 w-[1px] bg-slate-200" />

        {/* User Profile Menu */}
        <DropdownMenu
          align="right"
          trigger={
            <button
              type="button"
              aria-label={`User account: ${authData?.userName || "User"}, role: ${
                authData?.role === "COMPANY_ADMIN" ? "Company Admin" : authData?.role || "Admin"
              }`}
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer select-none"
            >
              <div
                aria-hidden="true"
                className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 select-none group-hover:bg-indigo-700 transition-colors"
              >
                {authData?.userName ? authData.userName[0].toUpperCase() : "A"}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold text-slate-900 leading-tight">
                  {authData?.userName}
                </p>
                <p className="text-[11px] text-slate-500 leading-tight flex items-center gap-1 font-mono mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>{authData?.role === "COMPANY_ADMIN" ? "Company Admin" : authData?.role}</span>
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
              onClick: () => router.push("/profile/company"),
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
