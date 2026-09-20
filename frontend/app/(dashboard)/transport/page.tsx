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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      icon: <FileSpreadsheet className="w-5 h-5 text-blue-600" />,
      badge: "Step 1",
    },
    {
      title: "GR / LR Booking",
      desc: "Official Lorry Receipt consignment note generation with full state machine workflow.",
      href: "/transport/lr-booking",
      icon: <FileCheck2 className="w-5 h-5 text-indigo-600" />,
      badge: "Step 2",
    },
    {
      title: "Hire Challan",
      desc: "Trip contract for hired market trucks with hire rate, advance (ATH), and balance (BTH).",
      href: "/transport/hire-challan",
      icon: <Truck className="w-5 h-5 text-amber-600" />,
      badge: "Step 3",
    },
    {
      title: "Arrival Report",
      desc: "Destination depot vehicle arrival, unloading verification, and shortage/damage inspection.",
      href: "/transport/arrival-reports",
      icon: <Navigation className="w-5 h-5 text-cyan-600" />,
      badge: "Step 4",
    },
    {
      title: "POD Records",
      desc: "Proof of Delivery document upload, physical consignee signature audit, and verification.",
      href: "/transport/pod-records",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      badge: "Step 5",
    },
    {
      title: "Vehicle Owners & Fleet",
      desc: "Vendor vehicle owners, market trucks, company fleet vehicles, and licensed drivers.",
      href: "/transport/vehicle-owners",
      icon: <UserCheck className="w-5 h-5 text-purple-600" />,
      badge: "Fleet Masters",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-[var(--color-primary)]" />
            Transport Operations Command
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            End-to-end transport operational lifecycle: Job $\rightarrow$ LR $\rightarrow$ Hire Challan $\rightarrow$ Arrival $\rightarrow$ POD Verification.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/transport/lr-booking">
            <Button className="gap-2">
              <FileCheck2 className="w-4 h-4" />
              Book New LR
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold">Booked / Pending Dispatches</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-blue-600">
              {booked}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Awaiting loading or vehicle assignment
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold">Active In-Transit Convoys</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-amber-600">
              {inTransit}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            En route to delivery destination
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold">Delivered & Verified PODs</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-600">
              {delivered}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Ready for billing & BTH clearance
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="group p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[var(--color-primary)] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:scale-105 transition-transform">
                  {it.icon}
                </div>
                <Badge variant="neutral" className="text-[10px]">
                  {it.badge}
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[var(--color-primary)] transition-colors">
                {it.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {it.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-[var(--color-primary)]">
              <span>Open Workflow</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
