"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Briefcase,
  Layers,
  Package,
  Ruler,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function GeneralOverviewPage() {
  const masters = [
    {
      title: "Consigner Master",
      desc: "Shippers and client accounts dispatching freight consignments.",
      href: "/general/consigner",
      icon: <Building2 className="w-5 h-5 text-blue-600" />,
      badge: "Clients",
    },
    {
      title: "Consignee Master",
      desc: "Receiving parties and destination client locations receiving cargo.",
      href: "/general/consignee",
      icon: <Building2 className="w-5 h-5 text-indigo-600" />,
      badge: "Receivers",
    },
    {
      title: "Location Master",
      desc: "Countries, States, Cities, and designated pickup/drop locations across India.",
      href: "/general/location",
      icon: <MapPin className="w-5 h-5 text-emerald-600" />,
      badge: "Geographic",
    },
    {
      title: "Industry Master",
      desc: "Business sector categorizations (Automotive, Textiles, FMCG, Chemicals, Steel).",
      href: "/general/industry",
      icon: <Briefcase className="w-5 h-5 text-purple-600" />,
      badge: "Sectors",
    },
    {
      title: "Group Company",
      desc: "Parent conglomerates and corporate holding companies.",
      href: "/general/group-company",
      icon: <Layers className="w-5 h-5 text-cyan-600" />,
      badge: "Corporate",
    },
    {
      title: "Unit of Measurement",
      desc: "Weight and volumetric units (MT, KG, Quintal, Litre, Cubic Meter).",
      href: "/general/unit",
      icon: <Ruler className="w-5 h-5 text-amber-600" />,
      badge: "Units",
    },
    {
      title: "Method of Packing",
      desc: "Cargo packing types: Wooden Crates, Corrugated Boxes, Gunny Bags, Drums, Pallets.",
      href: "/general/packing-method",
      icon: <Package className="w-5 h-5 text-rose-600" />,
      badge: "Packaging",
    },
    {
      title: "Designation Master",
      desc: "Staff designations: Dispatch Executive, Fleet Manager, Branch Accountant.",
      href: "/general/designation",
      icon: <Briefcase className="w-5 h-5 text-slate-600" />,
      badge: "Organization",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <Building2 className="w-6 h-6 text-[var(--color-primary)]" />
          General Module Masters
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Core master registry managing clients, geographic locations, packaging, and commercial enterprise dimensions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
