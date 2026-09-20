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
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AreaTrendChart, BarMetricChart, DonutDistributionChart } from "@/components/charts";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth } from "@/lib/auth";
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
        description="Unified enterprise operations, financial health, live telemetry, and fleet asset intelligence."
        primaryAction={{
          label: "New Trip Order",
          icon: <Plus className="w-4 h-4" />,
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

      {/* Dashboard Sub-Module Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E4E7EC] pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-control text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "overview"
              ? "bg-[#4F46E5] text-white shadow-xs"
              : "text-[#667085] hover:text-[#101828] hover:bg-[#F1F3F6]"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Business Overview
        </button>

        <button
          onClick={() => setActiveTab("finance")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-control text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "finance"
              ? "bg-[#4F46E5] text-white shadow-xs"
              : "text-[#667085] hover:text-[#101828] hover:bg-[#F1F3F6]"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Financial Analysis
        </button>

        <button
          onClick={() => setActiveTab("operations")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-control text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "operations"
              ? "bg-[#4F46E5] text-white shadow-xs"
              : "text-[#667085] hover:text-[#101828] hover:bg-[#F1F3F6]"
          }`}
        >
          <Truck className="w-4 h-4" />
          Fleet & Operations
        </button>

        <button
          onClick={() => setActiveTab("own_fleet")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-control text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "own_fleet"
              ? "bg-[#4F46E5] text-white shadow-xs"
              : "text-[#667085] hover:text-[#101828] hover:bg-[#F1F3F6]"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Own Fleet
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BUSINESS OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Row 1: KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total Movements"
              value={businessData?.total_movements?.toLocaleString() || "0"}
              subtext="Active & historical bookings"
              icon={<Truck className="w-4 h-4" />}
            />
            <KpiCard
              title="In Transit"
              value={businessData?.in_transit_count?.toLocaleString() || "0"}
              subtext="En-route highway corridors"
              icon={<Clock className="w-4 h-4" />}
            />
            <KpiCard
              title="Delivered / POD"
              value={businessData?.delivered_count?.toLocaleString() || "0"}
              subtext="Consignments arrived"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <KpiCard
              title="Billed Freight Revenue"
              value={formatCurrency(businessData?.net_billed_revenue || 0)}
              subtext="Total invoiced transport billing"
              icon={<Receipt className="w-4 h-4" />}
            />
          </div>

          {/* Row 2: Revenue Trend Chart & Pipeline Stages */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue & Booking Trajectory</CardTitle>
                <CardDescription>
                  Billed freight progression across recent operating cycles
                </CardDescription>
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
              <CardHeader>
                <CardTitle>Dispatch Lifecycle</CardTitle>
                <CardDescription>Live pipeline from order booking to POD</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {businessData?.pipeline_stages?.map((stage: any) => (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#101828]">{stage.stage}</span>
                      <span className="font-mono text-[#667085]">
                        {stage.count} ({stage.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#F1F3F6] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#4F46E5] h-full rounded-full transition-all duration-300"
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
              <CardHeader>
                <CardTitle>Top Freight Corridors</CardTitle>
                <CardDescription>Highest volume origin-to-destination routes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {businessData?.top_corridors?.map((corr: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-control bg-[#F8F9FB] border border-[#E4E7EC]"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#101828]">
                        {corr.origin} → {corr.destination}
                      </div>
                      <div className="text-[11px] text-[#667085] mt-0.5">
                        {corr.trip_count} Consignments
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs font-bold text-[#4F46E5]">
                        {formatCurrency(corr.total_freight)}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Consignment Movements</CardTitle>
                  <CardDescription>Latest generated LRs and dispatch status</CardDescription>
                </div>
                <Link
                  href="/transport/lr-booking"
                  className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] flex items-center gap-1"
                >
                  View All LRs <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F8F9FB] border-b border-[#E4E7EC] text-[#667085] font-semibold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">LR Number</th>
                        <th className="py-2.5 px-3">Vehicle</th>
                        <th className="py-2.5 px-3">Route</th>
                        <th className="py-2.5 px-3 text-right">Freight</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E7EC]">
                      {businessData?.recent_operations?.map((lr: any) => (
                        <tr key={lr.id} className="hover:bg-[#F8F9FB]">
                          <td className="py-2.5 px-3 font-mono font-semibold text-[#101828]">
                            {lr.lr_number}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#344054]">
                            {lr.vehicle_number}
                          </td>
                          <td className="py-2.5 px-3 text-[#667085]">
                            {lr.origin_city || "Origin"} → {lr.destination_city || "Destination"}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-right text-[#101828]">
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
              subtext="Gross operating sales"
              icon={<Receipt className="w-4 h-4" />}
            />
            <KpiCard
              title="Operating Expenses"
              value={formatCurrency(financeData?.total_operating_expenses || 0)}
              subtext="Fuel, tolls, workshop, drivers"
              icon={<Fuel className="w-4 h-4" />}
            />
            <KpiCard
              title="Net Fleet Profit"
              value={formatCurrency(financeData?.net_operating_profit || 0)}
              subtext="Gross operating margin"
              icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
            />
            <KpiCard
              title="Operating Margin"
              value={`${financeData?.operating_margin_pct || 0}%`}
              subtext="Fleet operational margin"
              icon={<BarChart3 className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
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
              <CardHeader>
                <CardTitle>Trade Ledger Balances</CardTitle>
                <CardDescription>
                  Double-entry accounts receivable vs trade payables
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-control bg-[#F8F9FB] border border-[#E4E7EC]">
                  <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider block">
                    Sundry Debtors (Receivables)
                  </span>
                  <div className="text-2xl font-bold font-mono text-[#101828] mt-1">
                    {formatCurrency(financeData?.trade_debtors_receivable || 0)}
                  </div>
                  <span className="text-[11px] text-[#667085] mt-1 block">
                    Outstanding client freight bills awaiting settlement
                  </span>
                </div>

                <div className="p-4 rounded-control bg-[#F8F9FB] border border-[#E4E7EC]">
                  <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider block">
                    Sundry Creditors (Payables)
                  </span>
                  <div className="text-2xl font-bold font-mono text-[#101828] mt-1">
                    {formatCurrency(financeData?.trade_creditors_payable || 0)}
                  </div>
                  <span className="text-[11px] text-[#667085] mt-1 block">
                    Outstanding market vehicle & vendor dues
                  </span>
                </div>

                <Link
                  href="/reports/profit-loss"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA]"
                >
                  View Full Profit & Loss Report <ArrowRight className="w-3.5 h-3.5" />
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
              <CardHeader>
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
                    <div key={s.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: s.color || "#4F46E5" }}
                        />
                        <span className="text-[#344054] font-medium">{s.status}</span>
                      </div>
                      <span className="font-mono font-semibold text-[#101828]">{s.count} Trucks</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Compliance & Expiry Radar</CardTitle>
                  <CardDescription>
                    Vehicles with fitness, insurance, or PUC expiring within 30 days
                  </CardDescription>
                </div>
                <Link
                  href="/fleet/documents"
                  className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] flex items-center gap-1"
                >
                  Manage Documents <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F8F9FB] border-b border-[#E4E7EC] text-[#667085] font-semibold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Vehicle</th>
                        <th className="py-2.5 px-3">Document Type</th>
                        <th className="py-2.5 px-3">Document #</th>
                        <th className="py-2.5 px-3">Valid Till</th>
                        <th className="py-2.5 px-3 text-right">Days Left</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E7EC]">
                      {operationsData?.expiring_documents?.map((doc: any) => (
                        <tr key={doc.id} className="hover:bg-[#F8F9FB]">
                          <td className="py-2.5 px-3 font-mono font-semibold text-[#101828]">
                            {doc.vehicle_number}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#344054]">
                            {doc.doc_type}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#667085]">
                            {doc.document_number}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#344054]">
                            {formatDate(doc.valid_till)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                                doc.days_left <= 7
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {doc.days_left > 0 ? `${doc.days_left} days` : "Expired"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!operationsData?.expiring_documents || operationsData.expiring_documents.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-[#667085]">
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Company Fleet Asset & Health Matrix</CardTitle>
                <CardDescription>
                  Live odometer, engine diagnostics, electrical health, and driver assignments
                </CardDescription>
              </div>
              <Link
                href="/fleet/vehicle-health"
                className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] flex items-center gap-1"
              >
                Telemetry Hub <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F8F9FB] border-b border-[#E4E7EC] text-[#667085] font-semibold uppercase">
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
                  <tbody className="divide-y divide-[#E4E7EC]">
                    {ownFleetData?.vehicles?.map((veh: any) => (
                      <tr key={veh.vehicle_number} className="hover:bg-[#F8F9FB]">
                        <td className="py-2.5 px-3">
                          <VehiclePlate vehicleNumber={veh.vehicle_number} />
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[#101828]">
                          {veh.model}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-right text-[#101828]">
                          {veh.odometer_km.toLocaleString()} KM
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              veh.engine_health === "GOOD"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {veh.engine_health}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#667085]">
                          At {veh.next_service_km.toLocaleString()} KM
                        </td>
                        <td className="py-2.5 px-3 text-[#344054]">
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
      {/* HR ATTENDANCE INTEGRATION TILE (PRD §7.1, §11) */}
      {/* ========================================================================= */}
      <Card className="border-dashed border-[#D0D5DD] bg-[#FCFCFD]">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-control bg-[#F2F4F7] border border-[#E4E7EC] flex items-center justify-center text-[#667085]">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  HR Attendance & Biometric Access
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                    [EXTERNAL INTEGRATION PENDING CONFIRMATION]
                  </span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  PRD §7.1 & §11 — External HRMS / biometric provider connector
                </CardDescription>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#667085] font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Status: Provider Unconfirmed
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 rounded-control bg-white border border-[#E4E7EC]">
            <div className="space-y-1">
              <p className="text-xs text-[#344054]">
                Staff biometric check-in, driver duty logs, and warehouse overtime records are designated for external payroll integration (ZingHR, Darwinbox, Keka, or biometric webhook). Per architecture rules, PantherTMS avoids guessing fake ambient clock-in data until the partner API is confirmed.
              </p>
              <div className="text-[11px] text-[#667085] font-mono">
                API Endpoint Hook: <code className="text-[#4F46E5]">/api/v1/integrations/hr-attendance</code> (Awaiting GSP / HRMS provider selection)
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
