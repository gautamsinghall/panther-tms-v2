"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Briefcase,
  Layers,
  Package,
  Scale,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export default function GeneralOverviewPage() {
  const masters = [
    {
      title: "Consigner Master",
      desc: "Shippers and client accounts dispatching freight consignments.",
      href: "/general/consigner",
      icon: <Building2 className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Clients",
    },
    {
      title: "Consignee Master",
      desc: "Receiving parties and destination client locations receiving cargo.",
      href: "/general/consignee",
      icon: <Building2 className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Receivers",
    },
    {
      title: "Location Master",
      desc: "Countries, States, Cities, and designated pickup/drop transit points across India.",
      href: "/general/location",
      icon: <MapPin className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Geographic",
    },
    {
      title: "Industry Master",
      desc: "Business sector categorizations (Automotive, Textiles, FMCG, Chemicals, Steel).",
      href: "/general/industry",
      icon: <Briefcase className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Sectors",
    },
    {
      title: "Group Company",
      desc: "Parent conglomerates and corporate holding companies.",
      href: "/general/group-company",
      icon: <Layers className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Corporate",
    },
    {
      title: "Unit of Measurement",
      desc: "Weight and volumetric units (MT, KG, Quintal, Litre, Cubic Meter).",
      href: "/general/unit",
      icon: <Scale className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Units",
    },
    {
      title: "Method of Packing",
      desc: "Cargo packing types: Wooden Crates, Corrugated Boxes, Gunny Bags, Drums, Pallets.",
      href: "/general/packing-method",
      icon: <Package className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Packaging",
    },
    {
      title: "Designation Master",
      desc: "Staff designations: Dispatch Executive, Fleet Manager, Branch Accountant.",
      href: "/general/designation",
      icon: <Briefcase className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Organization",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="General Module Masters"
        description="Core master registry managing clients, geographic locations, packaging, and commercial dimensions."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "General" },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {masters.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group p-5 bg-white rounded-card border border-[#E4E7EC] hover:border-[#4F46E5] hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-control bg-[#F8F9FB] border border-[#E4E7EC]">
                  {m.icon}
                </div>
                <Badge variant="neutral" className="text-[10px]">
                  {m.badge}
                </Badge>
              </div>
              <h3 className="font-semibold text-sm text-[#101828] group-hover:text-[#4F46E5] transition-colors">
                {m.title}
              </h3>
              <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
                {m.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E4E7EC] flex items-center justify-between text-xs font-medium text-[#4F46E5]">
              <span>Open Master</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
