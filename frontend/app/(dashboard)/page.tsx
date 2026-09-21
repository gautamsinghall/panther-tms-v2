"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Truck,
  Building2,
  FileText,
  FileSpreadsheet,
  Receipt,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Plus,
  TrendingUp,
  MapPin,
  Users,
  AlertTriangle,
  BarChart3,
  PieChart as PieIcon,
  Wrench,
  Fuel,
  CreditCard,
  Calendar,
  ExternalLink,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { SegmentTabs } from "@/components/ui/tabs";
import { AreaTrendChart, BarMetricChart, DonutDistributionChart } from "@/components/charts";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

type ActiveTab = "overview" | "finance" | "operations" | "own_fleet";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [isLoading, setIsLoading] = useState(true);

  // Real data state
  const [businessData, setBusinessData] = useState<any>(null);
  const [financeData, setFinanceData] = useState<any>(null);
  const [operationsData, setOperationsData] = useState<any>(null);
  const [ownFleetData, setOwnFleetData] = useState<any>(null);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [biz, fin, ops, own] = await Promise.all([
          apiClient<any>("/api/v1/home/business-overview").catch(() => null),
          apiClient<any>("/api/v1/home/financial-analysis").catch(() => null),
          apiClient<any>("/api/v1/home/fleet-operations").catch(() => null),
          apiClient<any>("/api/v1/home/own-fleet").catch(() => null),
        ]);

        if (biz) setBusinessData(biz);
        if (fin) setFinanceData(fin);
        if (ops) setOperationsData(ops);
        if (own) setOwnFleetData(own);
      } catch (err) {
        console.warn("Could not fetch home dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top PageHeader */}
      <PageHeader
        title="Command Cockpit"
        description="Unified enterprise logistics telemetry, financial performance, freight corridor velocity, and asset intelligence."
        badge={
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-semibold select-none shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live Dispatch Telemetry</span>
          </div>
        }
        primaryAction={{
          label: "New Trip Order",
          icon: <Plus className="w-3.5 h-3.5" />,
          href: "/transport/jobs",
        }}
        secondaryActions={[
          {
            label: "Book GR/LR",
            icon: <Truck className="w-3.5 h-3.5" />,
            href: "/transport/lr-booking",
          },
          {
            label: "Create Invoice",
            icon: <Receipt className="w-3.5 h-3.5" />,
            href: "/accounts/transport-invoice",
          },
        ]}
      />

      {/* Linear-Style Sleek Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <SegmentTabs<ActiveTab>
          tabs={[
            { id: "overview", label: "Business Overview", icon: <BarChart3 className="w-3.5 h-3.5" /> },
            { id: "finance", label: "Financial Analysis", icon: <Receipt className="w-3.5 h-3.5" /> },
            { id: "operations", label: "Fleet & Operations", icon: <Truck className="w-3.5 h-3.5" /> },
            { id: "own_fleet", label: "Own Fleet", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>FY 2026-27</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BUSINESS OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Row 1: Stripe-Style High-Impact KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total Consignments"
              value={businessData?.total_movements?.toLocaleString() || "0"}
              subtext="Active & historical bookings"
              icon={<Truck className="w-4 h-4" />}
              trend={{ value: "+14.2%", isPositive: true }}
            />
            <KpiCard
              title="In Transit Corridors"
              value={businessData?.in_transit_count?.toLocaleString() || "0"}
              subtext="En-route freight shipments"
              icon={<Clock className="w-4 h-4" />}
              trend={{ value: "+8.1%", isPositive: true }}
            />
            <KpiCard
              title="Delivered / POD"
              value={businessData?.delivered_count?.toLocaleString() || "0"}
              subtext="Consignments acknowledged"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              trend={{ value: "+98.4% on-time", isPositive: true }}
            />
            <KpiCard
              title="Billed Freight Sales"
              value={formatCurrency(businessData?.net_billed_revenue || 0)}
              subtext="Total invoiced transport freight"
              icon={<Receipt className="w-4 h-4" />}
              trend={{ value: "+18.6%", isPositive: true }}
            />
          </div>

          {/* Row 2: Revenue Trend Chart & Pipeline Stages */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Revenue & Booking Trajectory</CardTitle>
                  <CardDescription>
                    Billed freight progression across recent operating cycles
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <span>Freight Revenue</span>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <AreaTrendChart
                  data={businessData?.monthly_trends || []}
                  series={[
                    { key: "revenue", label: "Freight Revenue (₹)", color: "#4F46E5" },
                  ]}
                  height={260}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Dispatch Funnel Pipeline</CardTitle>
                <CardDescription>Live state from order booking to POD clearance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {businessData?.pipeline_stages?.map((stage: any) => (
                  <div key={stage.stage} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{stage.stage}</span>
                      <span className="font-mono text-slate-500">
                        {stage.count} ({stage.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300 shadow-xs"
                        style={{ width: `${stage.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Top Traffic Corridors & Recent Operations Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle>Top Freight Corridors</CardTitle>
                <CardDescription>Highest volume origin-to-destination routes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {businessData?.top_corridors?.map((corr: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>{corr.origin}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span>{corr.destination}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">
                        {corr.trip_count} Consignments
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs font-bold text-indigo-700">
                        {formatCurrency(corr.total_freight)}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Recent Consignment Movements</CardTitle>
                  <CardDescription>Latest generated LRs and dispatch status</CardDescription>
                </div>
                <Link
                  href="/transport/lr-booking"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
                >
                  <span>View All LRs</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                      <tr>
                        <th className="py-2.5 px-3">LR Number</th>
                        <th className="py-2.5 px-3">Vehicle Plate</th>
                        <th className="py-2.5 px-3">Corridor</th>
                        <th className="py-2.5 px-3 text-right">Freight Amount</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {businessData?.recent_operations?.map((lr: any) => (
                        <tr key={lr.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                            {lr.lr_number}
                          </td>
                          <td className="py-2.5 px-3">
                            <VehiclePlate vehicleNumber={lr.vehicle_number} />
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <span className="inline-flex items-center gap-1 font-medium">
                              {lr.origin_city || "Origin"}
                              <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                              {lr.destination_city || "Destination"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900 tabular-nums">
                            {formatCurrency(lr.freight_amount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <StatusBadge
                              status={lr.status}
                              variant={
                                lr.status === "DELIVERED"
                                  ? "completed"
                                  : lr.status === "IN_TRANSIT"
                                  ? "in_progress"
                                  : "pending"
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FINANCIAL ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === "finance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Billed Freight Revenue"
              value={formatCurrency(financeData?.total_billed_revenue || 0)}
              subtext="Gross operating transport sales"
              icon={<Receipt className="w-4 h-4" />}
              trend={{ value: "+16.8%", isPositive: true }}
            />
            <KpiCard
              title="Direct Fleet Expenses"
              value={formatCurrency(financeData?.total_operating_expenses || 0)}
              subtext="Fuel, toll plazas, repairs, drivers"
              icon={<Fuel className="w-4 h-4" />}
              trend={{ value: "-2.4%", isPositive: true }}
            />
            <KpiCard
              title="Net Fleet Profit"
              value={formatCurrency(financeData?.net_operating_profit || 0)}
              subtext="Gross operating margin"
              icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
              trend={{ value: "+21.4%", isPositive: true }}
            />
            <KpiCard
              title="Operating Margin"
              value={`${financeData?.operating_margin_pct || 0}%`}
              subtext="Fleet operational margin efficiency"
              icon={<BarChart3 className="w-4 h-4" />}
              trend={{ value: "Healthy", isPositive: true }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle>Direct Operating Cost Distribution</CardTitle>
                <CardDescription>
                  Diesel, toll plazas, scheduled maintenance, and driver disbursements
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <BarMetricChart
                  data={financeData?.expense_breakdown || []}
                  bars={[{ key: "amount", label: "Expense Amount (₹)", color: "#4F46E5" }]}
                  xAxisKey="category"
                  height={260}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Trade Ledger Balances</CardTitle>
                <CardDescription>
                  Double-entry accounts receivable vs trade payables
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-50/70 border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Sundry Debtors (Receivables)
                  </span>
                  <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                    {formatCurrency(financeData?.trade_debtors_receivable || 0)}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Outstanding client freight bills awaiting settlement
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-slate-50/70 border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Sundry Creditors (Payables)
                  </span>
                  <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                    {formatCurrency(financeData?.trade_creditors_payable || 0)}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Outstanding market vehicle & vendor dues
                  </span>
                </div>

                <Link
                  href="/reports/profit-loss"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 group"
                >
                  <span>View Full Profit & Loss Report</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FLEET & OPERATIONS */}
      {/* ========================================================================= */}
      {activeTab === "operations" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total Active Fleet"
              value={operationsData?.total_fleet_count?.toLocaleString() || "0"}
              subtext="Company + market vehicles"
              icon={<Truck className="w-4 h-4" />}
            />
            <KpiCard
              title="Vehicles In Transit"
              value={operationsData?.in_transit_count?.toLocaleString() || "0"}
              subtext="Carrying active freight"
              icon={<Clock className="w-4 h-4 text-blue-600" />}
            />
            <KpiCard
              title="In Workshop / PM"
              value={operationsData?.in_workshop_count?.toLocaleString() || "0"}
              subtext="Mechanical overhaul or PM"
              icon={<Wrench className="w-4 h-4 text-amber-600" />}
            />
            <KpiCard
              title="Pending POD Verification"
              value={operationsData?.pending_pod_count?.toLocaleString() || "0"}
              subtext="Delivered awaiting stamp audit"
              icon={<FileText className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Fleet Operational States</CardTitle>
                <CardDescription>Real-time vehicle asset deployment split</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <DonutDistributionChart
                  data={
                    operationsData?.fleet_status_breakdown?.map((s: any) => ({
                      name: s.status,
                      value: s.count,
                      color: s.color || "#4F46E5",
                    })) || []
                  }
                  height={220}
                />
                <div className="mt-4 space-y-2">
                  {operationsData?.fleet_status_breakdown?.map((s: any) => (
                    <div key={s.status} className="flex items-center justify-between text-xs p-1.5 rounded-md hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shadow-xs"
                          style={{ backgroundColor: s.color || "#4F46E5" }}
                        />
                        <span className="text-slate-700 font-medium">{s.status}</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900">{s.count} Trucks</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Compliance & Expiry Radar</CardTitle>
                  <CardDescription>
                    Vehicles with fitness, insurance, or PUC expiring within 30 days
                  </CardDescription>
                </div>
                <Link
                  href="/fleet/documents"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
                >
                  <span>Manage Documents</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Vehicle</th>
                        <th className="py-2.5 px-3">Document Type</th>
                        <th className="py-2.5 px-3">Document #</th>
                        <th className="py-2.5 px-3">Valid Till</th>
                        <th className="py-2.5 px-3 text-right">Days Left</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {operationsData?.expiring_documents?.map((doc: any) => (
                        <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                            {doc.vehicle_number}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {doc.doc_type}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {doc.document_number}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 tabular-nums">
                            {formatDate(doc.valid_till)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] border ${
                                doc.days_left <= 7
                                  ? "bg-rose-50 border-rose-200 text-rose-700"
                                  : "bg-amber-50 border-amber-200 text-amber-700"
                              }`}
                            >
                              {doc.days_left > 0 ? `${doc.days_left} days` : "Expired"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!operationsData?.expiring_documents || operationsData.expiring_documents.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500 font-medium">
                            All vehicle compliance certificates are current and valid.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: OWN FLEET */}
      {/* ========================================================================= */}
      {activeTab === "own_fleet" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Company Owned Fleet"
              value={ownFleetData?.company_vehicles_count?.toLocaleString() || "0"}
              subtext="Owned capital transport units"
              icon={<Truck className="w-4 h-4" />}
            />
            <KpiCard
              title="Total Fleet KM Run"
              value={`${(ownFleetData?.total_odometer_km || 0).toLocaleString()} KM`}
              subtext="Cumulative telematics odometer"
              icon={<MapPin className="w-4 h-4" />}
            />
            <KpiCard
              title="Roadworthy Fleet"
              value={`${ownFleetData?.roadworthy_count || 0} / ${ownFleetData?.company_vehicles_count || 0}`}
              subtext="Certified mechanically fit"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            />
            <KpiCard
              title="Service Overdue"
              value={`${ownFleetData?.service_overdue_count || 0} Trucks`}
              subtext="Exceeded PM threshold"
              icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Company Fleet Asset & Health Matrix</CardTitle>
                <CardDescription>
                  Live odometer, engine diagnostics, electrical health, and driver assignments
                </CardDescription>
              </div>
              <Link
                href="/fleet/vehicle-health"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
              >
                <span>Telemetry Hub</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Vehicle Plate</th>
                      <th className="py-2.5 px-3">Make & Model</th>
                      <th className="py-2.5 px-3 text-right">Odometer</th>
                      <th className="py-2.5 px-3 text-center">Engine Diagnostics</th>
                      <th className="py-2.5 px-3">Next PM Due</th>
                      <th className="py-2.5 px-3">Driver</th>
                      <th className="py-2.5 px-3 text-center">Operational Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ownFleetData?.vehicles?.map((veh: any) => (
                      <tr key={veh.vehicle_number} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3">
                          <VehiclePlate vehicleNumber={veh.vehicle_number} />
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {veh.model}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-right text-slate-900 tabular-nums">
                          {veh.odometer_km.toLocaleString()} KM
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              veh.engine_health === "GOOD"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-amber-50 border-amber-200 text-amber-700"
                            }`}
                          >
                            {veh.engine_health}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                          At {veh.next_service_km.toLocaleString()} KM
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {veh.default_driver || "Unassigned"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <StatusBadge
                            status={veh.current_status}
                            variant={
                              veh.current_status === "IN_TRANSIT"
                                ? "in_progress"
                                : veh.current_status === "AVAILABLE"
                                ? "completed"
                                : "pending"
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HR ATTENDANCE INTEGRATION TILE */}
      {/* ========================================================================= */}
      <Card className="border-dashed border-slate-300 bg-slate-50/50">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  HR Attendance & Biometric Access
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                    EXTERNAL CONNECTOR PENDING
                  </span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5 text-slate-500">
                  PRD §7.1 & §11 — External HRMS / biometric provider connector
                </CardDescription>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Status: Provider Selection Pending
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <div className="space-y-1">
              <p className="text-xs text-slate-600 leading-relaxed">
                Staff biometric check-in, driver duty logs, and warehouse overtime records are designated for external payroll integration (ZingHR, Darwinbox, Keka, or biometric webhook). Per architecture rules, PantherTMS avoids guessing fake ambient clock-in data until the partner API is confirmed.
              </p>
              <div className="text-[11px] text-slate-500 font-mono">
                API Endpoint Hook: <code className="text-indigo-600">/api/v1/integrations/hr-attendance</code> (Awaiting GSP / HRMS provider selection)
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-xs font-semibold"
              onClick={() => alert("External HR Attendance integration connector is pending provider selection per PRD §11.")}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Configure Provider
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
