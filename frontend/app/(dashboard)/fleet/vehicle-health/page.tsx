"use client";

import React, { useState } from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/badge";

interface VehicleHealth {
  id: number;
  vehicle_no: string;
  model: string;
  odometer_km: number;
  engine_health: "GOOD" | "ATTENTION_NEEDED" | "CRITICAL";
  battery_status: "HEALTHY" | "CHECK_VOLTAGE";
  last_service_km: number;
  next_service_km: number;
  fitness_expiry: string;
  status: "ROADWORTHY" | "IN_WORKSHOP" | "SERVICE_OVERDUE";
}

const SAMPLE_HEALTH: VehicleHealth[] = [
  {
    id: 1,
    vehicle_no: "MH-12-RN-4821",
    model: "Tata Prima 4028.S (14 Wheeler)",
    odometer_km: 124500,
    engine_health: "GOOD",
    battery_status: "HEALTHY",
    last_service_km: 115000,
    next_service_km: 130000,
    fitness_expiry: "2027-04-15",
    status: "ROADWORTHY",
  },
  {
    id: 2,
    vehicle_no: "DL-01-AB-1290",
    model: "BharatBenz 3528C (12 Wheeler)",
    odometer_km: 89400,
    engine_health: "ATTENTION_NEEDED",
    battery_status: "CHECK_VOLTAGE",
    last_service_km: 70000,
    next_service_km: 85000,
    fitness_expiry: "2026-11-20",
    status: "SERVICE_OVERDUE",
  },
  {
    id: 3,
    vehicle_no: "KA-04-DE-5567",
    model: "Eicher Pro 6028 (10 Wheeler)",
    odometer_km: 45200,
    engine_health: "GOOD",
    battery_status: "HEALTHY",
    last_service_km: 35000,
    next_service_km: 50000,
    fitness_expiry: "2027-08-10",
    status: "ROADWORTHY",
  },
];

export default function VehicleHealthPage() {
  const [data] = useState<VehicleHealth[]>(SAMPLE_HEALTH);

  const columns: ColumnDef<VehicleHealth>[] = [
    {
      key: "vehicle_no",
      header: "Vehicle & Model",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-[#172033]">{row.vehicle_no}</span>
          <div className="text-xs text-[#667085]">{row.model}</div>
        </div>
      ),
    },
    {
      key: "odometer_km",
      header: "Odometer",
      align: "right",
      isNumeric: true,
      cell: (row) => <span className="font-mono font-medium text-[#172033]">{row.odometer_km.toLocaleString("en-IN")} KM</span>,
    },
    {
      key: "engine_health",
      header: "Engine Diagnostics",
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          {row.engine_health === "GOOD" ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span className={row.engine_health === "GOOD" ? "text-emerald-700" : "text-amber-700"}>
            {row.engine_health.replace("_", " ")}
          </span>
        </span>
      ),
    },
    {
      key: "battery_status",
      header: "Battery / Electrical",
      cell: (row) => <span className="text-xs font-mono text-[#667085]">{row.battery_status}</span>,
    },
    {
      key: "next_service_km",
      header: "Next PM Service",
      cell: (row) => (
        <div className="text-xs font-mono">
          <span className={row.odometer_km >= row.next_service_km ? "text-rose-600 font-bold" : "text-[#172033]"}>
            Due at {row.next_service_km.toLocaleString("en-IN")} KM
          </span>
        </div>
      ),
    },
    {
      key: "fitness_expiry",
      header: "Fitness Validity",
      cell: (row) => <span className="text-xs text-[#667085] font-mono">{row.fitness_expiry}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.status}
          variant={row.status === "ROADWORTHY" ? "active" : "pending"}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Health & Telematics"
        description="Monitor fleet diagnostic codes, preventative maintenance schedules, and mechanical roadworthiness."
        breadcrumbs={[
          { label: "Fleet", href: "/fleet/trip-expense" },
          { label: "Vehicle Health" },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Active Roadworthy Fleet" value="2 / 3" subtext="66.7% operational" />
        <KpiCard title="Service Overdue" value="1 Truck" subtext="DL-01-AB-1290" />
        <KpiCard title="Avg Fleet Age / Mileage" value="86,366 KM" subtext="Optimal maintenance" />
      </div>

      <DataTable
        columns={columns}
        data={data}
      />
    </div>
  );
}
