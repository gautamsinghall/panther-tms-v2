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
  ShieldCheck,
  Plus,
  TrendingUp,
  MapPin,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CurrentUserContext {
  id: number;
  email: string;
  full_name: string;
  role: string;
  tenant: {
    subdomain: string;
    company_name: string;
    status: string;
  };
}

interface RecentLR {
  id: number;
  lr_number: string;
  lr_date: string;
  consigner_name?: string;
  consignee_name?: string;
  origin_city?: string;
  destination_city?: string;
  vehicle_number: string;
  total_freight_amount: number | string;
  status: string;
}

export default function DashboardOverviewPage() {
  const [userContext, setUserContext] = useState<CurrentUserContext | null>(null);
  const [recentLRs, setRecentLRs] = useState<RecentLR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTrips: 0,
    inTransit: 0,
    delivered: 0,
    netBilled: 0,
    totalVehicles: 0,
    totalInvoices: 0,
  });

  useEffect(() => {
    async function initDashboard() {
      setIsLoading(true);
      try {
        const data = await apiClient<CurrentUserContext>("/api/v1/auth/me").catch(() => null);
        if (data) {
          setUserContext(data);
        } else {
          const local = getStoredAuth();
          if (local && local.user) {
            setUserContext({
              id: local.user.id,
              email: local.user.email,
              full_name: local.user.full_name,
              role: local.user.role,
              tenant: {
                subdomain: local.subdomain,
                company_name: local.tenantName,
                status: "ACTIVE",
              },
            });
          }
        }
      } catch {
        // fallback
      }

      // Fetch live counts and recent records
      try {
        const [vouchers, lrs, vehicles] = await Promise.all([
          apiClient<any[]>("/api/v1/accounts/vouchers").catch(() => []),
          apiClient<RecentLR[]>("/api/v1/transport/lrs").catch(() => []),
          apiClient<any[]>("/api/v1/transport/company-vehicles").catch(() => []),
        ]);

        const validVouchers = Array.isArray(vouchers) ? vouchers : [];
        const validLrs = Array.isArray(lrs) ? lrs : [];
        const validVehicles = Array.isArray(vehicles) ? vehicles : [];

        const billed = validVouchers
          .filter((v) => !v.is_void && (v.voucher_type === "TRANSPORT_INVOICE" || v.voucher_type === "GENERAL_INVOICE"))
          .reduce((sum, v) => sum + Number(v.net_amount || 0), 0);

        const inTransitCount = validLrs.filter(
          (l) => l.status === "IN_TRANSIT" || l.status === "BOOKED" || l.status === "LOADED"
        ).length;

        const deliveredCount = validLrs.filter(
          (l) => l.status === "DELIVERED" || l.status === "POD_RECEIVED" || l.status === "POD_VERIFIED"
        ).length;

        setStats({
          totalTrips: validLrs.length,
          inTransit: inTransitCount,
          delivered: deliveredCount,
          netBilled: billed,
          totalVehicles: validVehicles.length,
          totalInvoices: validVouchers.length,
        });

        setRecentLRs(validLrs.slice(0, 6));
      } catch (e) {
        console.warn("Could not fetch operational stats:", e);
      } finally {
        setIsLoading(false);
      }
    }

    initDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top PageHeader */}
      <PageHeader
        title="Operational Cockpit"
        description={`Active transport operations, fleet movements, and billing ledger for ${
          userContext?.tenant.company_name || "PantherTMS Enterprise"
        }.`}
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

      {/* Row 1 — KPI Summary per docs/design.md §11 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Movements"
          value={stats.totalTrips.toLocaleString()}
          subtext="Active & historical bookings"
          icon={<Truck className="w-4 h-4 text-[#172033]" />}
        />
        <KpiCard
          title="In Transit"
          value={stats.inTransit.toLocaleString()}
          subtext="En route to destination"
          icon={<Clock className="w-4 h-4 text-[#2563EB]" />}
        />
        <KpiCard
          title="Delivered / POD"
          value={stats.delivered.toLocaleString()}
          subtext="Arrived & POD collected"
          icon={<CheckCircle2 className="w-4 h-4 text-[#16A34A]" />}
        />
        <KpiCard
          title="Billed Revenue"
          value={formatCurrency(stats.netBilled)}
          subtext="Invoiced freight net total"
          icon={<Receipt className="w-4 h-4 text-[#C9A227]" />}
        />
      </div>

      {/* Row 2 — Operational Focus & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operational Overview (2 columns) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Operational Lifecycle Workflow</CardTitle>
              <CardDescription>
                Live transition pipeline: Customers → Trips → LRs → Invoices
              </CardDescription>
            </div>
            <Link href="/transport/jobs">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View Trips <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-card bg-[#F7F8FA] border border-[#E4E7EC]">
                <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">
                  1. Contracting
                </span>
                <span className="text-lg font-bold text-[#172033] block mt-1">
                  Customer Master
                </span>
                <span className="text-xs text-[#667085] mt-0.5 block">
                  GSTIN & Rate Contracts
                </span>
                <Link
                  href="/general/consigner"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#172033] mt-2.5 hover:underline"
                >
                  Manage Clients →
                </Link>
              </div>

              <div className="p-3.5 rounded-card bg-[#F7F8FA] border border-[#E4E7EC]">
                <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">
                  2. Dispatch
                </span>
                <span className="text-lg font-bold text-[#172033] block mt-1">
                  Trip Orders
                </span>
                <span className="text-xs text-[#667085] mt-0.5 block">
                  Route Corridor & Specs
                </span>
                <Link
                  href="/transport/jobs"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#172033] mt-2.5 hover:underline"
                >
                  Schedule Trips →
                </Link>
              </div>

              <div className="p-3.5 rounded-card bg-[#F7F8FA] border border-[#E4E7EC]">
                <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">
                  3. Consignment
                </span>
                <span className="text-lg font-bold text-[#172033] block mt-1">
                  GR / LR Notes
                </span>
                <span className="text-xs text-[#667085] mt-0.5 block">
                  Vehicle & Driver Assign
                </span>
                <Link
                  href="/transport/lr-booking"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#172033] mt-2.5 hover:underline"
                >
                  Track LRs →
                </Link>
              </div>

              <div className="p-3.5 rounded-card bg-[#F7F8FA] border border-[#E4E7EC]">
                <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">
                  4. Settlement
                </span>
                <span className="text-lg font-bold text-[#172033] block mt-1">
                  Invoices & IRN
                </span>
                <span className="text-xs text-[#667085] mt-0.5 block">
                  Ledger Postings & E-Way
                </span>
                <Link
                  href="/accounts/transport-invoice"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#172033] mt-2.5 hover:underline"
                >
                  Review Invoices →
                </Link>
              </div>
            </div>

            <div className="p-3 rounded-card bg-[#F8F1D9]/40 border border-[#C9A227]/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#C9A227]" />
                <span className="text-xs font-semibold text-[#172033]">
                  Double-Entry Ledger Integrity Active
                </span>
              </div>
              <span className="text-[11px] text-[#667085]">
                {stats.totalInvoices} financial vouchers reconciled
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions (1 column) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Quick Dispatch Actions</CardTitle>
            <CardDescription>
              Accelerate common operational movements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/transport/jobs"
              className="flex items-center justify-between p-2.5 rounded-control border border-[#E4E7EC] hover:bg-[#F7F8FA] hover:border-[#D0D5DD] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-[#F2F4F7] text-[#172033]">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#172033] block">
                    Create Trip / Job Order
                  </span>
                  <span className="text-[10px] text-[#667085]">
                    Initiate new cargo dispatch
                  </span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#98A2B3]" />
            </Link>

            <Link
              href="/transport/lr-booking"
              className="flex items-center justify-between p-2.5 rounded-control border border-[#E4E7EC] hover:bg-[#F7F8FA] hover:border-[#D0D5DD] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-[#F2F4F7] text-[#172033]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#172033] block">
                    Book Lorry Receipt (LR)
                  </span>
                  <span className="text-[10px] text-[#667085]">
                    Generate carrier consignment note
                  </span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#98A2B3]" />
            </Link>

            <Link
              href="/accounts/transport-invoice"
              className="flex items-center justify-between p-2.5 rounded-control border border-[#E4E7EC] hover:bg-[#F7F8FA] hover:border-[#D0D5DD] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-[#F2F4F7] text-[#172033]">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#172033] block">
                    Generate Freight Invoice
                  </span>
                  <span className="text-[10px] text-[#667085]">
                    Post invoice from delivered LR
                  </span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#98A2B3]" />
            </Link>

            <Link
              href="/general/consigner"
              className="flex items-center justify-between p-2.5 rounded-control border border-[#E4E7EC] hover:bg-[#F7F8FA] hover:border-[#D0D5DD] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-[#F2F4F7] text-[#172033]">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#172033] block">
                    Register Customer / Consigner
                  </span>
                  <span className="text-[10px] text-[#667085]">
                    Add commercial client account
                  </span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#98A2B3]" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Recent Operational Data per docs/design.md §11 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Recent Consignment Movements</CardTitle>
            <CardDescription>
              Latest Lorry Receipts and dispatch status updates
            </CardDescription>
          </div>
          <Link href="/transport/lr-booking">
            <Button variant="outline" size="sm" className="text-xs gap-1">
              View All LRs <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F7F8FA] border-b border-[#E4E7EC] text-[11px] font-semibold uppercase text-[#667085]">
                <tr>
                  <th className="py-3 px-4">LR Number</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Route Movement</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4 text-right">Freight (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E7EC] text-[#172033]">
                {recentLRs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#667085]">
                      No recent movements logged. Initiate your first dispatch trip order.
                    </td>
                  </tr>
                ) : (
                  recentLRs.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F7F8FA] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold">
                        <Link href="/transport/lr-booking" className="hover:underline">
                          {row.lr_number}
                        </Link>
                        <span className="block text-[10px] font-normal text-[#667085]">
                          {formatDate(row.lr_date)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {row.consigner_name || "Commercial Shipper"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-[#667085]">
                          <span>{row.origin_city || "Origin"}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-[#98A2B3]" />
                          <span>{row.destination_city || "Destination"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono uppercase font-semibold">
                        {row.vehicle_number}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium tabular-nums">
                        {formatCurrency(row.total_freight_amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
