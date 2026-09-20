"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface TripAdvance {
  id: number;
  advance_no: string;
  trip_no: string;
  driver_name: string;
  vehicle_no: string;
  advance_amount: number;
  mode: "BANK_TRANSFER" | "CASH" | "UPI" | "PETROCARD";
  date: string;
  settled_amount: number;
  balance_due: number;
  status: "SETTLED" | "PARTIALLY_SETTLED" | "OPEN";
}

const SAMPLE_ADVANCES: TripAdvance[] = [
  {
    id: 1,
    advance_no: "ADV-2026-0120",
    trip_no: "TRIP-8821",
    driver_name: "Ramesh Pawar",
    vehicle_no: "MH-12-RN-4821",
    advance_amount: 15000,
    mode: "BANK_TRANSFER",
    date: "2026-09-17",
    settled_amount: 14500,
    balance_due: 500,
    status: "PARTIALLY_SETTLED",
  },
  {
    id: 2,
    advance_no: "ADV-2026-0121",
    trip_no: "TRIP-8829",
    driver_name: "Suresh Kumar",
    vehicle_no: "DL-01-AB-1290",
    advance_amount: 12000,
    mode: "UPI",
    date: "2026-09-19",
    settled_amount: 0,
    balance_due: 12000,
    status: "OPEN",
  },
  {
    id: 3,
    advance_no: "ADV-2026-0118",
    trip_no: "TRIP-8815",
    driver_name: "Mohan Lal",
    vehicle_no: "GJ-06-TT-9912",
    advance_amount: 20000,
    mode: "PETROCARD",
    date: "2026-09-14",
    settled_amount: 20000,
    balance_due: 0,
    status: "SETTLED",
  },
];

export default function TripAdvancePage() {
  const [data] = useState<TripAdvance[]>(SAMPLE_ADVANCES);

  const columns: ColumnDef<TripAdvance>[] = [
    {
      key: "advance_no",
      header: "Advance #",
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{row.advance_no}</span>,
    },
    {
      key: "trip_no",
      header: "Trip / Vehicle",
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-semibold text-[#C9A227]">{row.trip_no}</span>
          <div className="font-mono text-xs text-[#172033]">{row.vehicle_no}</div>
        </div>
      ),
    },
    {
      key: "driver_name",
      header: "Driver",
      sortable: true,
      cell: (row) => <span>{row.driver_name}</span>,
    },
    {
      key: "advance_amount",
      header: "Advance (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{formatCurrency(row.advance_amount)}</span>,
    },
    {
      key: "settled_amount",
      header: "Settled (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => <span className="font-mono text-emerald-600 font-medium">{formatCurrency(row.settled_amount)}</span>,
    },
    {
      key: "balance_due",
      header: "Balance Due (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className={`font-mono font-semibold ${row.balance_due > 0 ? "text-amber-600" : "text-[#667085]"}`}>
          {formatCurrency(row.balance_due)}
        </span>
      ),
    },
    {
      key: "mode",
      header: "Disbursement",
      cell: (row) => <span className="text-xs font-mono text-[#667085]">{row.mode}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.status}
          variant={row.status === "SETTLED" ? "completed" : row.status === "OPEN" ? "pending" : "in_progress"}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Driver Trip Advance"
        description="Issue advances to drivers for fuel, en-route meals, and vehicle permits, and reconcile against settled trip bills."
        breadcrumbs={[
          { label: "Fleet", href: "/fleet/trip-expense" },
          { label: "Trip Advance" },
        ]}
        primaryAction={{
          label: "Issue New Advance",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {},
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Total Advances Disbursed" value="₹47,000" subtext="3 trips active" />
        <KpiCard title="Reconciled & Settled" value="₹34,500" subtext="73.4% recovery" />
        <KpiCard title="Outstanding Balances" value="₹12,500" subtext="2 driver balances" />
      </div>

      <DataTable
        columns={columns}
        data={data}
      />
    </div>
  );
}
