"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, User, Building, ExternalLink } from "lucide-react";
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
      // Default to demo tenant context for UI showcase if not authenticated
      setAuthData({
        userName: "Demo Admin",
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
    <header className="h-16 border-b border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 px-6 flex items-center justify-between">
      {/* Left: Tenant Identity Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700">
          <Building className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            {authData?.companyName}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            ({authData?.subdomain}.panthertms.local)
          </span>
        </div>

        <StatusBadge status="ACTIVE" variant="active" />
      </div>

      {/* Right: User Profile Menu & Logout */}
      <div className="flex items-center gap-4">
        <DropdownMenu
          align="right"
          trigger={
            <button className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-semibold text-xs shadow-xs">
                {authData?.userName ? authData.userName[0].toUpperCase() : "A"}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                  {authData?.userName}
                </p>
                <p className="text-[11px] text-slate-400 leading-tight flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
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
