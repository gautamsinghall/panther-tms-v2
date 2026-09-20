"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Truck,
  FileSpreadsheet,
  FileCheck2,
  Navigation,
  UserCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { apiClient } from "@/lib/api-client";

interface LRRecord {
  id: number;
  lr_number: string;
  status: string;
}

export default function TransportOverviewPage() {
  const [lrs, setLrs] = useState<LRRecord[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiClient<LRRecord[]>("/api/v1/transport/lrs");
        setLrs(res);
      } catch (err) {
        console.warn("Could not load LRs:", err);
      }
    }
    loadData();
  }, []);

  const booked = lrs.filter((l) => l.status === "BOOKED" || l.status === "DRAFT").length;
  const inTransit = lrs.filter((l) => l.status === "IN_TRANSIT" || l.status === "LOADED").length;
  const delivered = lrs.filter((l) => l.status === "DELIVERED" || l.status === "POD_VERIFIED").length;

  const items = [
    {
      title: "Job Creation",
      desc: "Client booking orders, origin & destination locations, and cargo consignment profiles.",
      href: "/transport/jobs",
      icon: <FileSpreadsheet className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Step 1",
    },
    {
      title: "GR / LR Booking",
      desc: "Official Lorry Receipt consignment note generation with full state machine workflow.",
      href: "/transport/lr-booking",
      icon: <FileCheck2 className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Step 2",
    },
    {
      title: "Hire Challan",
      desc: "Trip contract for hired market trucks with hire rate, advance (ATH), and balance (BTH).",
      href: "/transport/hire-challan",
      icon: <Truck className="w-5 h-5 text-[#B54708]" />,
      badge: "Step 3",
    },
    {
      title: "Arrival Report",
      desc: "Destination depot vehicle arrival, unloading verification, and shortage/damage inspection.",
      href: "/transport/arrival-reports",
      icon: <Navigation className="w-5 h-5 text-[#175CD3]" />,
      badge: "Step 4",
    },
    {
      title: "POD Records",
      desc: "Proof of Delivery document upload, physical consignee signature audit, and verification.",
      href: "/transport/pod-records",
      icon: <CheckCircle2 className="w-5 h-5 text-[#027A48]" />,
      badge: "Step 5",
    },
    {
      title: "Vehicle Owners & Fleet",
      desc: "Vendor vehicle owners, market trucks, company fleet vehicles, and licensed drivers.",
      href: "/transport/vehicle-owners",
      icon: <UserCheck className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Fleet Masters",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Transport Operations" },
        ]}
        title="Transport Operations Command"
        description="End-to-end transport operational lifecycle: Job → LR Booking → Hire Challan → Arrival → POD Verification."
        primaryAction={{
          label: "Book New LR",
          href: "/transport/lr-booking",
          icon: Plus,
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard
          title="Booked / Pending Dispatches"
          value={booked}
          subtext="Awaiting loading or vehicle assignment"
          icon={<Clock className="w-4 h-4 text-[#175CD3]" />}
        />
        <KpiCard
          title="Active In-Transit Convoys"
          value={inTransit}
          subtext="En route to delivery destination"
          icon={<Truck className="w-4 h-4 text-[#B54708]" />}
        />
        <KpiCard
          title="Delivered & Verified PODs"
          value={delivered}
          subtext="Ready for billing & BTH clearance"
          icon={<CheckCircle2 className="w-4 h-4 text-[#027A48]" />}
        />
      </div>

      {/* Workflow Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="group p-5 bg-white rounded-card border border-[#E4E7EC] shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:border-[#D0D5DD] hover:shadow-[0_4px_6px_-2px_rgba(16,24,40,0.05)] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-control bg-[#F8F9FB] border border-[#E4E7EC] flex items-center justify-center group-hover:bg-[#EEF2FF] group-hover:border-[#C7D2FE] transition-colors">
                  {it.icon}
                </div>
                <Badge variant="neutral" className="text-[11px] font-medium">
                  {it.badge}
                </Badge>
              </div>
              <h3 className="font-semibold text-sm text-[#101828] group-hover:text-[#4F46E5] transition-colors">
                {it.title}
              </h3>
              <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
                {it.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F2F4F7] flex items-center justify-between text-xs font-semibold text-[#4F46E5]">
              <span>Open Workflow</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
