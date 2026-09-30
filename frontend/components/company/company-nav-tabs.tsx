"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, GitBranch, KeyRound } from "lucide-react";

export function CompanyNavTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      label: "Company Details & Branding",
      href: "/company/details",
      icon: Building2,
      active: pathname === "/company/details",
    },
    {
      label: "Issuing Offices / Branches",
      href: "/company/branches",
      icon: GitBranch,
      active: pathname === "/company/branches",
    },
    {
      label: "API Center",
      href: "/company/api-center",
      icon: KeyRound,
      active: pathname === "/company/api-center",
    },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
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
