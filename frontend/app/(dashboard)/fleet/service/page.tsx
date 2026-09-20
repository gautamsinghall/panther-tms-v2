"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ServiceRecord {
  id: number;
  job_card_no: string;
  vehicle_no: string;
  service_type: "SCHEDULED_PM" | "BREAKDOWN_REPAIR" | "OIL_CHANGE" | "BRAKE_OVERHAUL";
  workshop_name: string;
  service_date: string;
  odometer_km: number;
  total_cost: number;
  status: "COMPLETED" | "IN_PROGRESS" | "SCHEDULED";
}

const SAMPLE_SERVICES: ServiceRecord[] = [
  {
    id: 1,
    job_card_no: "JC-2026-081",
    vehicle_no: "MH-12-RN-4821",
    service_type: "OIL_CHANGE",
    workshop_name: "Tata Authorized Service Hub, Vashi",
    service_date: "2026-08-20",
    odometer_km: 115000,
    total_cost: 14200,
    status: "COMPLETED",
  },
  {
    id: 2,
    job_card_no: "JC-2026-094",
    vehicle_no: "DL-01-AB-1290",
    service_type: "BRAKE_OVERHAUL",
    workshop_name: "Delhi Commercial Truck Care",
    service_date: "2026-09-18",
    odometer_km: 89400,
    total_cost: 18500,
    status: "IN_PROGRESS",
  },
  {
    id: 3,
    job_card_no: "JC-2026-099",
    vehicle_no: "KA-04-DE-5567",
    service_type: "SCHEDULED_PM",
    workshop_name: "Eicher Motors Workshop, Electronic City",
    service_date: "2026-09-25",
    odometer_km: 50000,
    total_cost: 11000,
    status: "SCHEDULED",
  },
];

export default function RepairServicePage() {
  const [data] = useState<ServiceRecord[]>(SAMPLE_SERVICES);

  const columns: ColumnDef<ServiceRecord>[] = [
    {
      key: "job_card_no",
      header: "Job Card #",
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{row.job_card_no}</span>,
    },
    {
      key: "vehicle_no",
      header: "Vehicle & Odometer",
      cell: (row) => (
        <div>
          <span className="font-mono font-medium text-[#172033]">{row.vehicle_no}</span>
          <div className="text-xs text-[#667085]">{row.odometer_km.toLocaleString("en-IN")} KM</div>
        </div>
      ),
    },
    {
      key: "service_type",
      header: "Service Classification",
      cell: (row) => (
        <div>
          <div className="font-medium text-xs text-[#172033]">{row.service_type.replace("_", " ")}</div>
          <div className="text-[11px] text-[#667085]">{row.workshop_name}</div>
        </div>
      ),
    },
    {
      key: "service_date",
      header: "Service Date",
      cell: (row) => <span>{formatDate(row.service_date)}</span>,
    },
    {
      key: "total_cost",
      header: "Total Cost (₹)",
      align: "right",
      isNumeric: true,
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{formatCurrency(row.total_cost)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.status.replace("_", " ")}
          variant={row.status === "COMPLETED" ? "completed" : row.status === "IN_PROGRESS" ? "in_progress" : "pending"}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repair & Maintenance Workshop"
        description="Schedule preventative maintenance, track breakdown job cards, and manage workshop service invoices."
        breadcrumbs={[
          { label: "Fleet", href: "/fleet/trip-expense" },
          { label: "Repair & Service" },
        ]}
        primaryAction={{
          label: "Open Job Card",
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
