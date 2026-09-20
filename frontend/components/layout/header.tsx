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
    <header className="h-14 border-b border-[#E4E7EC] bg-white px-6 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Left: Company / Branch Switcher per docs/design.md §4 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-control bg-[#F8F9FB] border border-[#E4E7EC]">
          <Building2 className="w-4 h-4 text-[#667085]" />
          <span className="text-xs font-medium text-[#101828]">
            {authData?.companyName}
          </span>
          <span className="text-[11px] font-mono text-[#667085]">
            ({authData?.subdomain})
          </span>
        </div>

        <StatusBadge status="ACTIVE" />
      </div>

      {/* Center / Right: Global Search, Notifications & User Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Interactive Global Search Trigger for Desktop */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-control border border-[#E4E7EC] bg-[#F8F9FB] hover:bg-white hover:border-[#D0D5DD] hover:shadow-xs text-xs text-[#667085] w-64 transition-all text-left cursor-pointer group"
          title="Search records (Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-[#667085] group-hover:text-[#101828] transition-colors" />
          <span className="flex-1 text-xs text-[#667085] group-hover:text-[#344054]">Search records...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-[#D0D5DD] rounded text-[#667085] group-hover:border-[#98A2B3] shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Mobile Search Icon Trigger */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="md:hidden p-2 text-[#667085] hover:text-[#101828] hover:bg-[#F8F9FB] rounded-control transition-colors"
          title="Search records"
          aria-label="Search records"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Interactive Notification Bell Popover */}
        <NotificationsPopover />

        {/* User Profile Menu */}
        <DropdownMenu
          align="right"
          trigger={
            <button
              type="button"
              aria-label={`User account: ${authData?.userName || "User"}, role: ${
                authData?.role === "COMPANY_ADMIN" ? "Company Admin" : authData?.role || "Admin"
              }`}
              className="flex items-center gap-2.5 p-1 rounded-control hover:bg-[#F8F9FB] transition-colors cursor-pointer"
            >
              <div
                aria-hidden="true"
                className="w-7 h-7 rounded-control bg-[#4F46E5] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 select-none"
              >
                {authData?.userName ? authData.userName[0].toUpperCase() : "A"}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold text-[#101828] leading-tight">
                  {authData?.userName}
                </p>
                <p className="text-xs text-[#667085] leading-tight flex items-center gap-1 font-mono mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-[#027A48] shrink-0" aria-hidden="true" />
                  <span>{authData?.role === "COMPANY_ADMIN" ? "Company Admin" : authData?.role}</span>
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#667085] hidden md:block shrink-0" aria-hidden="true" />
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
