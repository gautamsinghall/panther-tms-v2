"use client";

import React, { useState } from "react";
import { Plus, Fuel, CreditCard, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TripExpense {
  id: number;
  expense_no: string;
  trip_no: string;
  vehicle_no: string;
  driver_name: string;
  category: "DIESEL" | "TOLL" | "MAINTENANCE" | "POLICE/RTO" | "MISC";
  amount: number;
  paid_by: "DRIVER" | "FASTAG" | "PETROCARD" | "COMPANY";
  expense_date: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
}

const SAMPLE_EXPENSES: TripExpense[] = [
  {
    id: 1,
    expense_no: "EXP-2026-0041",
    trip_no: "TRIP-8821",
    vehicle_no: "MH-12-RN-4821",
    driver_name: "Ramesh Pawar",
    category: "DIESEL",
    amount: 14500,
    paid_by: "PETROCARD",
    expense_date: "2026-09-18",
    status: "APPROVED",
  },
  {
    id: 2,
    expense_no: "EXP-2026-0042",
    trip_no: "TRIP-8821",
    vehicle_no: "MH-12-RN-4821",
    driver_name: "Ramesh Pawar",
    category: "TOLL",
    amount: 2850,
    paid_by: "FASTAG",
    expense_date: "2026-09-18",
    status: "APPROVED",
  },
  {
    id: 3,
    expense_no: "EXP-2026-0043",
    trip_no: "TRIP-8829",
    vehicle_no: "DL-01-AB-1290",
    driver_name: "Suresh Kumar",
    category: "MAINTENANCE",
    amount: 3200,
    paid_by: "DRIVER",
    expense_date: "2026-09-19",
    status: "PENDING",
  },
  {
    id: 4,
    expense_no: "EXP-2026-0044",
    trip_no: "TRIP-8833",
    vehicle_no: "KA-04-DE-5567",
    driver_name: "Mahesh Patil",
    category: "DIESEL",
    amount: 18200,
    paid_by: "PETROCARD",
    expense_date: "2026-09-20",
    status: "APPROVED",
  },
];

export default function TripExpensePage() {
  const [data] = useState<TripExpense[]>(SAMPLE_EXPENSES);

  const columns: ColumnDef<TripExpense>[] = [
    {
      key: "expense_no",
      header: "Expense #",
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{row.expense_no}</span>,
    },
    {
      key: "trip_no",
      header: "Trip & Vehicle",
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
      key: "category",
      header: "Expense Category",
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-[#F2F4F7] text-[#172033]">
          {row.category === "DIESEL" && <Fuel className="w-3 h-3 text-amber-600" />}
          {row.category === "TOLL" && <CreditCard className="w-3 h-3 text-blue-600" />}
          {row.category}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount (₹)",
      align: "right",
      isNumeric: true,
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{formatCurrency(row.amount)}</span>,
    },
    {
      key: "paid_by",
      header: "Paid By",
      cell: (row) => <span className="text-xs text-[#667085] font-mono">{row.paid_by}</span>,
    },
    {
      key: "expense_date",
      header: "Date",
      cell: (row) => <span>{formatDate(row.expense_date)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} variant={row.status === "APPROVED" ? "completed" : "pending"} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trip Expense Management"
        description="Record, audit, and reconcile on-road expenses including diesel, tolls, driver allowances, and repair vouchers."
        breadcrumbs={[
          { label: "Fleet", href: "/fleet/trip-expense" },
          { label: "Trip Expense" },
        ]}
        primaryAction={{
          label: "Add Expense Voucher",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {},
        }}
        secondaryActions={[
          {
            label: "Export CSV",
            icon: <FileSpreadsheet className="w-4 h-4" />,
            variant: "outline",
            onClick: () => {},
          },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Month Expenses" value="₹38,750" subtext="₹12.4k diesel" />
        <KpiCard title="Fuel / Diesel Cost" value="₹32,700" subtext="84.3% of total" />
        <KpiCard title="FASTag Tolls" value="₹2,850" subtext="Auto-reconciled" />
        <KpiCard title="Pending Approvals" value="1 Voucher" subtext="₹3,200 awaiting review" />
      </div>

      <DataTable
        columns={columns}
        data={data}
      />
    </div>
  );
}
