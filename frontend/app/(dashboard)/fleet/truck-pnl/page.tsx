"use client";

import React, { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatCurrency } from "@/lib/utils";

interface TruckPnL {
  id: number;
  vehicle_no: string;
  model: string;
  total_trips: number;
  total_revenue: number;
  fuel_cost: number;
  toll_cost: number;
  maintenance_cost: number;
  driver_cost: number;
  net_profit: number;
  profit_margin_pct: number;
}

const SAMPLE_PNL: TruckPnL[] = [
  {
    id: 1,
    vehicle_no: "MH-12-RN-4821",
    model: "Tata Prima 4028.S",
    total_trips: 6,
    total_revenue: 285000,
    fuel_cost: 114000,
    toll_cost: 14200,
    maintenance_cost: 12500,
    driver_cost: 24000,
    net_profit: 120300,
    profit_margin_pct: 42.2,
  },
  {
    id: 2,
    vehicle_no: "DL-01-AB-1290",
    model: "BharatBenz 3528C",
    total_trips: 4,
    total_revenue: 198000,
    fuel_cost: 82000,
    toll_cost: 9800,
    maintenance_cost: 28000,
    driver_cost: 16000,
    net_profit: 62200,
    profit_margin_pct: 31.4,
  },
  {
    id: 3,
    vehicle_no: "KA-04-DE-5567",
    model: "Eicher Pro 6028",
    total_trips: 5,
    total_revenue: 225000,
    fuel_cost: 88000,
    toll_cost: 11500,
    maintenance_cost: 6500,
    driver_cost: 20000,
    net_profit: 99000,
    profit_margin_pct: 44.0,
  },
];

export default function TruckPnLPage() {
  const [data] = useState<TruckPnL[]>(SAMPLE_PNL);

  const columns: ColumnDef<TruckPnL>[] = [
    {
      key: "vehicle_no",
      header: "Truck / Model",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-[#172033]">{row.vehicle_no}</span>
          <div className="text-xs text-[#667085]">{row.model} ({row.total_trips} trips)</div>
        </div>
      ),
    },
    {
      key: "total_revenue",
      header: "Revenue (₹)",
      align: "right",
      isNumeric: true,
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{formatCurrency(row.total_revenue)}</span>,
    },
    {
      key: "fuel_cost",
      header: "Fuel (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => <span className="font-mono text-xs text-[#667085]">{formatCurrency(row.fuel_cost)}</span>,
    },
    {
      key: "maintenance_cost",
      header: "Repairs & Maint (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => <span className="font-mono text-xs text-[#667085]">{formatCurrency(row.maintenance_cost)}</span>,
    },
    {
      key: "net_profit",
      header: "Net Profit (₹)",
      align: "right",
      isNumeric: true,
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-emerald-600">
          {formatCurrency(row.net_profit)}
        </span>
      ),
    },
    {
      key: "profit_margin_pct",
      header: "Margin",
      align: "right",
      cell: (row) => (
        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
          <ArrowUpRight className="w-3 h-3 text-emerald-600" />
          {row.profit_margin_pct}%
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Truck-Wise Profit & Loss"
        description="Comprehensive profitability analysis by individual vehicle unit factoring freight revenue against fuel, tolls, and maintenance."
        breadcrumbs={[
          { label: "Fleet", href: "/fleet/trip-expense" },
          { label: "Truck P&L" },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Fleet Revenue" value="₹7,08,000" subtext="15 completed trips" />
        <KpiCard title="Total Operating Costs" value="₹4,26,500" subtext="Fuel & repairs" />
        <KpiCard title="Total Net Profit" value="₹2,81,500" subtext="Overall earnings" />
        <KpiCard title="Avg Profit Margin" value="39.8%" subtext="+3.2% vs last month" />
      </div>

      <DataTable
        columns={columns}
        data={data}
      />
    </div>
  );
}
