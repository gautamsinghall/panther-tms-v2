"use client";

import React, { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { KpiCard } from "@/components/ui/kpi-card";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TripDrilldown {
  lr_id: number;
  lr_number: string;
  lr_date: string;
  origin_city?: string;
  destination_city?: string;
  freight_revenue: number;
  diesel_cost: number;
  toll_cost: number;
  driver_cost: number;
  maintenance_cost: number;
  other_cost: number;
  hire_challan_cost: number;
  total_expense: number;
  net_margin: number;
  margin_pct: number;
}

interface TruckPnLVehicle {
  vehicle_number: string;
  vehicle_type: string;
  model: string;
  total_trips: number;
  total_revenue: number;
  fuel_cost: number;
  toll_cost: number;
  maintenance_cost: number;
  driver_cost: number;
  hire_cost: number;
  other_cost: number;
  total_operating_cost: number;
  net_profit: number;
  profit_margin_pct: number;
  trips: TripDrilldown[];
}

interface TruckPnLData {
  summary: {
    total_vehicles: number;
    total_trips: number;
    total_revenue: number;
    total_operating_costs: number;
    total_net_profit: number;
    avg_profit_margin_pct: number;
  };
  vehicles: TruckPnLVehicle[];
}

export default function TruckPnLPage() {
  const [data, setData] = useState<TruckPnLData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<TruckPnLVehicle | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<TruckPnLData>("/api/v1/fleet/truck-pnl");
      if (res && res.vehicles) {
        setData(res);
      }
    } catch (e) {
      console.error("Failed to load truck P&L:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns: ColumnDef<TruckPnLVehicle>[] = [
    {
      key: "vehicle_number",
      header: "Vehicle & Make",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <VehiclePlate vehicleNumber={row.vehicle_number} />
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
              {row.vehicle_type}
            </span>
          </div>
          <div className="text-xs text-[#667085] mt-1">{row.model} ({row.total_trips} trips)</div>
        </div>
      ),
    },
    {
      key: "total_revenue",
      header: "Freight Revenue (₹)",
      align: "right",
      isNumeric: true,
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{formatCurrency(row.total_revenue)}</span>,
    },
    {
      key: "fuel_cost",
      header: "Diesel (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => <span className="font-mono text-xs text-[#667085]">{formatCurrency(row.fuel_cost)}</span>,
    },
    {
      key: "toll_cost",
      header: "Tolls & FASTag (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => <span className="font-mono text-xs text-[#667085]">{formatCurrency(row.toll_cost)}</span>,
    },
    {
      key: "maintenance_cost",
      header: "Workshop PM (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => <span className="font-mono text-xs text-[#667085]">{formatCurrency(row.maintenance_cost)}</span>,
    },
    {
      key: "total_operating_cost",
      header: "Total Expenses (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-[#344054]">
          {formatCurrency(row.total_operating_cost)}
        </span>
      ),
    },
    {
      key: "net_profit",
      header: "Net Margin (₹)",
      align: "right",
      isNumeric: true,
      sortable: true,
      cell: (row) => {
        const isPos = row.net_profit >= 0;
        return (
          <span className={`font-mono font-bold ${isPos ? "text-emerald-600" : "text-rose-600"}`}>
            {formatCurrency(row.net_profit)}
          </span>
        );
      },
    },
    {
      key: "profit_margin_pct",
      header: "Margin %",
      align: "right",
      cell: (row) => {
        const isPos = row.profit_margin_pct >= 0;
        return (
          <span
            className={`inline-flex items-center gap-0.5 font-mono text-xs font-bold px-2 py-0.5 rounded ${
              isPos ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {isPos ? <ArrowUpRight className="w-3 h-3 text-emerald-600" /> : <ArrowDownRight className="w-3 h-3 text-rose-600" />}
            {row.profit_margin_pct}%
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Drilldown",
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 px-2"
          onClick={() => setSelectedVehicle(row)}
        >
          View Trips ({row.trips.length})
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Truck-Wise Profit & Loss"
        description="Derived profitability reporting by individual vehicle unit factoring invoiced freight revenue against diesel, FASTag tolls, driver allowances, and workshop maintenance."
        breadcrumbs={[
          { label: "Fleet", href: "/fleet/trip-expense" },
          { label: "Truck P&L" },
        ]}
        secondaryActions={[
          {
            label: "Refresh Data",
            icon: <RefreshCw className="w-4 h-4" />,
            variant: "outline",
            onClick: fetchData,
          },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Total Fleet Revenue"
          value={formatCurrency(data?.summary.total_revenue || 0)}
          subtext={`${data?.summary.total_trips || 0} completed trips`}
        />
        <KpiCard
          title="Total Operating Costs"
          value={formatCurrency(data?.summary.total_operating_costs || 0)}
          subtext="Diesel, tolls & workshop"
        />
        <KpiCard
          title="Total Net Profit"
          value={formatCurrency(data?.summary.total_net_profit || 0)}
          subtext="Fleet operational earnings"
        />
        <KpiCard
          title="Avg Profit Margin"
          value={`${data?.summary.avg_profit_margin_pct || 0}%`}
          subtext="Weighted revenue return"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.vehicles || []}
        isLoading={isLoading}
      />

      {/* Vehicle Trip Drilldown Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-card border border-[#E4E7EC] w-full max-w-4xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-[#E4E7EC] flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#101828] flex items-center gap-2">
                  Trip P&L Drilldown: <VehiclePlate vehicleNumber={selectedVehicle.vehicle_number} />
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Detailed trip-by-trip freight revenue vs diesel, toll, and maintenance costs
                </p>
              </div>
              <button onClick={() => setSelectedVehicle(null)} className="text-[#667085] hover:text-[#101828]">✕</button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-4 gap-3 text-xs bg-[#F8F9FB] p-3 rounded-control border border-[#E4E7EC]">
                <div>
                  <span className="text-[#667085] block">Vehicle Revenue:</span>
                  <span className="font-mono font-bold text-[#101828]">{formatCurrency(selectedVehicle.total_revenue)}</span>
                </div>
                <div>
                  <span className="text-[#667085] block">Operating Expenses:</span>
                  <span className="font-mono font-bold text-[#101828]">{formatCurrency(selectedVehicle.total_operating_cost)}</span>
                </div>
                <div>
                  <span className="text-[#667085] block">Net Vehicle Profit:</span>
                  <span className="font-mono font-bold text-emerald-600">{formatCurrency(selectedVehicle.net_profit)}</span>
                </div>
                <div>
                  <span className="text-[#667085] block">Operating Margin:</span>
                  <span className="font-mono font-bold text-emerald-600">{selectedVehicle.profit_margin_pct}%</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F8F9FB] border-b border-[#E4E7EC] text-[#667085] font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Trip / LR #</th>
                      <th className="py-2.5 px-3">Route</th>
                      <th className="py-2.5 px-3 text-right">Freight (₹)</th>
                      <th className="py-2.5 px-3 text-right">Fuel (₹)</th>
                      <th className="py-2.5 px-3 text-right">Toll (₹)</th>
                      <th className="py-2.5 px-3 text-right">Maint (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Exp (₹)</th>
                      <th className="py-2.5 px-3 text-right">Net Margin</th>
                      <th className="py-2.5 px-3 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E7EC]">
                    {selectedVehicle.trips.map((trip) => (
                      <tr key={trip.lr_id} className="hover:bg-[#F8F9FB]">
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#101828]">
                          {trip.lr_number}
                          <div className="text-[11px] text-[#667085]">{formatDate(trip.lr_date)}</div>
                        </td>
                        <td className="py-2.5 px-3 text-[#344054]">
                          {trip.origin_city} → {trip.destination_city}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-right text-[#101828]">
                          {formatCurrency(trip.freight_revenue)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right text-[#667085]">
                          {formatCurrency(trip.diesel_cost)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right text-[#667085]">
                          {formatCurrency(trip.toll_cost)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right text-[#667085]">
                          {formatCurrency(trip.maintenance_cost)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-right text-[#344054]">
                          {formatCurrency(trip.total_expense)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-right text-emerald-600">
                          {formatCurrency(trip.net_margin)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                            {trip.margin_pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {selectedVehicle.trips.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-[#667085]">
                          No dedicated trip-linked LRs for this vehicle yet. Operating expenses reflect unlinked depot maintenance and standby fuel.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-[#E4E7EC] flex justify-end">
              <Button onClick={() => setSelectedVehicle(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
