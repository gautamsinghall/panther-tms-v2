"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, AlertTriangle, RefreshCw, Activity, Zap } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface VehicleHealth {
  id: number;
  vehicle_number: string;
  vehicle_type?: string;
  odometer_km: number;
  engine_health: string;
  battery_status: string;
  last_service_km: number;
  last_service_date?: string;
  next_service_km: number;
  next_service_due_date?: string;
  fitness_expiry?: string;
  insurance_expiry?: string;
  puc_expiry?: string;
  status: string;
  current_status: string;
  current_location?: string;
  last_inspected_at?: string;
  remarks?: string;
}

export default function VehicleHealthPage() {
  const [data, setData] = useState<VehicleHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<VehicleHealth[]>("/api/v1/fleet/vehicle-health");
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Failed to load vehicle health records:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const roadworthyCount = data.filter((d) => d.status === "ROADWORTHY").length;
  const overdueCount = data.filter((d) => d.status === "SERVICE_OVERDUE" || d.odometer_km >= d.next_service_km).length;
  const avgMileage = data.length ? Math.round(data.reduce((sum, d) => sum + d.odometer_km, 0) / data.length) : 0;

  const columns: ColumnDef<VehicleHealth>[] = [
    {
      key: "vehicle_number",
      header: "Vehicle Plate",
      sortable: true,
      cell: (row) => (
        <div>
          <VehiclePlate vehicleNumber={row.vehicle_number} />
          {row.current_location && (
            <div className="text-[11px] text-[#667085] mt-1">{row.current_location}</div>
          )}
        </div>
      ),
    },
    {
      key: "odometer_km",
      header: "Odometer",
      align: "right",
      isNumeric: true,
      sortable: true,
      cell: (row) => <span className="font-mono font-bold text-[#101828]">{row.odometer_km.toLocaleString()} KM</span>,
    },
    {
      key: "engine_health",
      header: "Engine Diagnostics",
      cell: (row) => {
        const isGood = row.engine_health === "GOOD";
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded ${
            isGood ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}>
            {isGood ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
            {row.engine_health}
          </span>
        );
      },
    },
    {
      key: "battery_status",
      header: "Electrical / Battery",
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-mono text-[#344054]">
          <Zap className="w-3 h-3 text-amber-500" />
          {row.battery_status}
        </span>
      ),
    },
    {
      key: "next_service_km",
      header: "Next PM Due",
      cell: (row) => {
        const isDue = row.odometer_km >= row.next_service_km;
        return (
          <div className="text-xs font-mono">
            <span className={isDue ? "text-rose-600 font-bold" : "text-[#101828]"}>
              At {row.next_service_km.toLocaleString()} KM
            </span>
            {row.next_service_due_date && (
              <div className="text-[11px] text-[#667085]">{formatDate(row.next_service_due_date)}</div>
            )}
          </div>
        );
      },
    },
    {
      key: "current_status",
      header: "Operational State",
      cell: (row) => (
        <StatusBadge
          status={row.current_status}
          variant={
            row.current_status === "IN_TRANSIT"
              ? "in_progress"
              : row.current_status === "AVAILABLE"
              ? "completed"
              : "pending"
          }
        />
      ),
    },
    {
      key: "status",
      header: "Roadworthiness",
      cell: (row) => (
        <StatusBadge
          status={row.status}
          variant={row.status === "ROADWORTHY" ? "completed" : "danger"}
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
        secondaryActions={[
          {
            label: "Refresh Telematics",
            icon: <RefreshCw className="w-4 h-4" />,
            variant: "outline",
            onClick: fetchData,
          },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Active Roadworthy Fleet"
          value={`${roadworthyCount} / ${data.length}`}
          subtext="Certified mechanically operational"
        />
        <KpiCard
          title="Service Overdue / Due Soon"
          value={`${overdueCount} Trucks`}
          subtext="Exceeded or near PM threshold"
        />
        <KpiCard
          title="Avg Fleet Odometer"
          value={`${avgMileage.toLocaleString()} KM`}
          subtext="Cumulative mileage indicator"
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
      />
    </div>
  );
}
