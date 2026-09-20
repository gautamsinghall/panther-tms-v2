"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { StatusBadge } from "@/components/ui/badge";

interface TyreItem {
  id: number;
  serial_no: string;
  brand: string;
  size: string;
  vehicle_no: string;
  position: string;
  current_tread_depth_mm: number;
  installed_date: string;
  total_km_run: number;
  status: "GOOD" | "RETREAD_DUE" | "SCRAPPED";
}

const SAMPLE_TYRES: TyreItem[] = [
  {
    id: 1,
    serial_no: "MRF-99210-A",
    brand: "MRF Steel Muscle",
    size: "295/90 R20",
    vehicle_no: "MH-12-RN-4821",
    position: "Front Right (FR)",
    current_tread_depth_mm: 11.2,
    installed_date: "2025-11-10",
    total_km_run: 42000,
    status: "GOOD",
  },
  {
    id: 2,
    serial_no: "APL-44211-B",
    brand: "Apollo EnduRace",
    size: "295/90 R20",
    vehicle_no: "MH-12-RN-4821",
    position: "Front Left (FL)",
    current_tread_depth_mm: 10.8,
    installed_date: "2025-11-10",
    total_km_run: 42000,
    status: "GOOD",
  },
  {
    id: 3,
    serial_no: "JKT-11829-C",
    brand: "JK Tyre JetSteel",
    size: "10.00 R20",
    vehicle_no: "DL-01-AB-1290",
    position: "Rear Axle 1 Outer (R1O)",
    current_tread_depth_mm: 3.4,
    installed_date: "2025-02-14",
    total_km_run: 78000,
    status: "RETREAD_DUE",
  },
];

export default function TyreManagementPage() {
  const [data] = useState<TyreItem[]>(SAMPLE_TYRES);

  const columns: ColumnDef<TyreItem>[] = [
    {
      key: "serial_no",
      header: "Tyre Serial #",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-[#172033]">{row.serial_no}</span>
          <div className="text-xs text-[#667085]">{row.brand} ({row.size})</div>
        </div>
      ),
    },
    {
      key: "vehicle_no",
      header: "Mounted Vehicle & Axle",
      cell: (row) => (
        <div>
          <span className="font-mono font-medium text-[#172033]">{row.vehicle_no}</span>
          <div className="text-xs text-[#667085]">{row.position}</div>
        </div>
      ),
    },
    {
      key: "current_tread_depth_mm",
      header: "Tread Depth",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className={`font-mono font-bold ${row.current_tread_depth_mm <= 4 ? "text-rose-600" : "text-emerald-600"}`}>
          {row.current_tread_depth_mm} mm
        </span>
      ),
    },
    {
      key: "total_km_run",
      header: "Total KM Run",
      align: "right",
      isNumeric: true,
      cell: (row) => <span className="font-mono text-[#172033]">{row.total_km_run.toLocaleString("en-IN")} KM</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.status.replace("_", " ")}
          variant={row.status === "GOOD" ? "active" : "pending"}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tyre Inventory & Lifecycle Management"
        description="Monitor axle fitments, tread depth wear inspection, retreading schedules, and scrap disposal."
        breadcrumbs={[
          { label: "Fleet", href: "/fleet/trip-expense" },
          { label: "Tyre Management" },
        ]}
        primaryAction={{
          label: "Add New Tyre",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {},
        }}
      />

      <DataTable
        columns={columns}
        data={data}
      />
    </div>
  );
}
