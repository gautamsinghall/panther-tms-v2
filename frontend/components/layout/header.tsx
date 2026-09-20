"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, User, Building, ExternalLink, Bell } from "lucide-react";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/badge";
import { getStoredAuth, clearStoredAuth } from "@/lib/auth";

export function Header() {
  const router = useRouter();
  const [authData, setAuthData] = useState<{
    userName: string;
    userEmail: string;
    role: string;
    subdomain: string;
    companyName: string;
  } | null>(null);

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
        companyName: "Panther Logistics Network",
      });
    }
  }, []);

  const handleLogout = () => {
    clearStoredAuth();
    router.push("/login");
  };

  return (
    <header className="h-16 border-b border-[#E4E7EC] bg-white px-6 flex items-center justify-between z-20 shrink-0">
      {/* Left: Tenant Identity Context per docs/design.md §9 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-[#F7F8FA] border border-[#E4E7EC]">
          <Building className="w-4 h-4 text-[#667085]" />
          <span className="text-xs font-semibold text-[#172033]">
            {authData?.companyName}
          </span>
          <span className="text-[11px] font-mono text-[#98A2B3]">
            ({authData?.subdomain})
          </span>
        </div>

        <StatusBadge status="ACTIVE" variant="active" />
      </div>

      {/* Right: Notifications & User Profile Menu */}
      <div className="flex items-center gap-3">
        <DropdownMenu
          align="right"
          trigger={
            <button
              type="button"
              className="flex items-center gap-2.5 p-1.5 rounded-control hover:bg-[#F2F4F7] transition-colors"
            >
              <div className="w-8 h-8 rounded-control bg-[#172033] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {authData?.userName ? authData.userName[0].toUpperCase() : "A"}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold text-[#172033] leading-tight">
                  {authData?.userName}
                </p>
                <p className="text-[10px] text-[#667085] leading-tight flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3 text-[#16A34A]" />
                  {authData?.role === "COMPANY_ADMIN" ? "Company Admin" : authData?.role}
                </p>
              </div>
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
              icon: <Building className="w-4 h-4" />,
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
    </header>
  );
}
