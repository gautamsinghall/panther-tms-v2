"use client";

import React from "react";
import Link from "next/link";
import {
  Layers,
  FolderTree,
  Users,
  Percent,
  Tag,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MiscOverviewPage() {
  const masters = [
    {
      title: "Primary Group",
      desc: "Top-level accounting roots: Assets, Liabilities, Equity, Income, and Expenses.",
      href: "/misc/primary-group",
      icon: <Layers className="w-5 h-5 text-blue-600" />,
      badge: "Root Groups",
    },
    {
      title: "Group in Primary",
      desc: "Second tier: Current Assets, Sundry Debtors, Direct Freight Expenses, Operating Revenue.",
      href: "/misc/group-in-primary",
      icon: <FolderTree className="w-5 h-5 text-indigo-600" />,
      badge: "Classification",
    },
    {
      title: "Subgroup in Group",
      desc: "Granular classification: North Region Clients, Fleet Diesel Accounts, Spare Parts Vendors.",
      href: "/misc/subgroup",
      icon: <FolderTree className="w-5 h-5 text-cyan-600" />,
      badge: "Sub-hierarchy",
    },
    {
      title: "Employee Master",
      desc: "Internal staff, operations managers, and drivers with department, PAN, and salary accounts.",
      href: "/misc/employee-master",
      icon: <Users className="w-5 h-5 text-emerald-600" />,
      badge: "Personnel",
    },
    {
      title: "Charge Head",
      desc: "Billable freight additions and deductions: Basic Freight, Hamali, Demurrage, Tolls.",
      href: "/misc/charge-head",
      icon: <Tag className="w-5 h-5 text-amber-600" />,
      badge: "Line Items",
    },
    {
      title: "Tax Category",
      desc: "Indian GST tax rates (0%, 5%, 12%, 18%) with CGST, SGST, IGST, and HSN/SAC codes.",
      href: "/misc/tax-category",
      icon: <Percent className="w-5 h-5 text-purple-600" />,
      badge: "GST Slabs",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <Layers className="w-6 h-6 text-[var(--color-primary)]" />
          Accounting Masters & Hierarchy
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure the Chart of Accounts hierarchy, tax categories, employee directory, and billable charge heads.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {masters.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[var(--color-primary)] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:scale-105 transition-transform">
                  {m.icon}
                </div>
                <Badge variant="neutral" className="text-[10px]">
                  {m.badge}
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[var(--color-primary)] transition-colors">
                {m.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {m.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-[var(--color-primary)]">
              <span>Open Master</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
