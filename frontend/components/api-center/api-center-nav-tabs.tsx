"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSpreadsheet, Navigation, Radio } from "lucide-react";
import { getStoredAuth } from "@/lib/auth";

export function ApiCenterNavTabs() {
  const pathname = usePathname();
  const [tenantPrefix, setTenantPrefix] = useState("");

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.tenantId) {
      setTenantPrefix(`/${auth.tenantId}`);
    } else if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      if (parts.length > 0 && (/^[a-z0-9]{10}$/.test(parts[0]) || parts[0] === "demo123456" || parts[0] === "demo")) {
        setTenantPrefix(`/${parts[0]}`);
      }
    }
  }, []);

  const tabs = [
    {
      label: "E-Way Bill API",
      href: "/api-center/eway-bill",
      icon: FileSpreadsheet,
      active: pathname?.includes("/api-center/eway-bill"),
    },
    {
      label: "FASTag Tracking API",
      href: "/api-center/fastag",
      icon: Navigation,
      active: pathname?.includes("/api-center/fastag"),
    },
    {
      label: "SIM Based Tracking API",
      href: "/api-center/sim",
      icon: Radio,
      active: pathname?.includes("/api-center/sim"),
    },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={`${tenantPrefix}${tab.href}`}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              tab.active
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Icon className={`w-4 h-4 ${tab.active ? "text-indigo-600" : "text-slate-400"}`} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
