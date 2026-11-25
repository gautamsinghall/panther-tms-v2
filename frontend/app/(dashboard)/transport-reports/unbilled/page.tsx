"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Receipt, RefreshCw, FileText, CheckCircle2, Clock, Plus, ArrowUpRight } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ColumnDef } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import { getActiveOffice } from "@/lib/auth";
import Link from "next/link";

interface UnbilledLRRow {
  id: number;
  lr_number: string;
  lr_date: string;
  consigner_name?: string;
  consignee_name?: string;
  destination_city?: string;
  total_freight_amount: string | number;
  delivery_date?: string;
  pod_verification_status?: string;
  status: string;
}

export default function UnbilledReportsPage() {
  const [data, setData] = useState<UnbilledLRRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lifecycleFilter, setLifecycleFilter] = useState<"ALL" | "DELIVERED_ONLY" | "IN_TRANSIT">("ALL");

  const loadData = async (filter = lifecycleFilter) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const activeOff = getActiveOffice();
      const params = new URLSearchParams();
      if (activeOff && activeOff.id && activeOff.id > 0) {
        params.set("office_id", String(activeOff.id));
      }
      if (filter && filter !== "ALL") {
        params.set("lifecycle_status", filter);
      }
      const qs = params.toString();
      const res = await apiClient<UnbilledLRRow[]>(`/api/v1/transport-reports/unbilled${qs ? `?${qs}` : ""}`);
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load unbilled LRs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(lifecycleFilter);
    const handleOfficeChanged = () => loadData(lifecycleFilter);
    window.addEventListener("panther_office_changed", handleOfficeChanged);
    return () => {
      window.removeEventListener("panther_office_changed", handleOfficeChanged);
    };
  }, [lifecycleFilter]);

  // Derived Metrics
  const metrics = useMemo(() => {
    const totalCount = data.length;
    const totalFreight = data.reduce(
      (sum, r) => sum + (parseFloat(String(r.total_freight_amount)) || 0),
      0
    );
    const deliveredCount = data.filter(
      (r) =>
        r.status === "DELIVERED" ||
        r.status === "POD_VERIFIED" ||
        r.status === "POD_RECEIVED"
    ).length;
    const inTransitCount = data.filter(
      (r) =>
        r.status !== "DELIVERED" &&
        r.status !== "POD_VERIFIED" &&
        r.status !== "POD_RECEIVED"
    ).length;

    return { totalCount, totalFreight, deliveredCount, inTransitCount };
  }, [data]);

  const columns: ColumnDef<UnbilledLRRow>[] = [
    {
      key: "lr_number",
      header: "Consignment LR",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-[#101828] dark:text-white">
            {row.lr_number}
          </span>
          <span className="block text-[11px] text-[#667085] dark:text-slate-400">
            Booked: {row.lr_date}
          </span>
        </div>
      ),
    },
    {
      key: "consigner",
      header: "Billing Party / Consigner",
      cell: (row) => (
        <span className="text-[#344054] dark:text-slate-200 truncate max-w-[160px] inline-block font-medium" title={row.consigner_name || "N/A"}>
          {row.consigner_name || "N/A"}
        </span>
      ),
    },
    {
      key: "consignee",
      header: "Consignee / Destination",
      cell: (row) => (
        <div>
          <div className="font-medium text-[#344054] dark:text-slate-200 truncate max-w-[160px]" title={row.consignee_name || "N/A"}>
            {row.consignee_name || "N/A"}
          </div>
          <div className="text-xs text-[#667085] dark:text-slate-400">
            {row.destination_city || "Destination Hub"}
          </div>
        </div>
      ),
    },
    {
      key: "freight",
      header: "Unbilled Freight Amount",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          ₹{parseFloat(String(row.total_freight_amount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "delivery",
      header: "Delivery Date",
      cell: (row) => {
        const isDelivered = row.status === "DELIVERED" || row.status === "POD_VERIFIED" || row.status === "POD_RECEIVED";
        return (
          <span className="text-xs text-[#667085] dark:text-slate-400">
            {row.delivery_date ? row.delivery_date : isDelivered ? "Delivered" : "Pending Delivery"}
          </span>
        );
      },
    },
    {
      key: "pod_status",
      header: "POD Verification",
      cell: (row) => {
        if (!row.pod_verification_status || row.pod_verification_status === "NOT_RECEIVED") {
          return <Badge variant="neutral">Not Received</Badge>;
        }
        return <StatusBadge status={row.pod_verification_status} />;
      },
    },
    {
      key: "status",
      header: "LR Lifecycle",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      minWidth: "120px",
      cell: (row) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2 font-medium hover:border-[#635BFF] hover:text-[#635BFF] cursor-pointer"
            onClick={() => {
              window.location.href = `/transport/lr-booking?lr=${row.lr_number}`;
            }}
          >
            View LR
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="text-xs h-7 px-2 font-medium bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            onClick={() => {
              window.location.href = `/accounts/transport-invoice?lr_id=${row.id}`;
            }}
          >
            Bill LR
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Transport Reports", href: "/transport-reports" },
          { label: "Unbilled Consignments" },
        ]}
        title="Unbilled Consignments Report"
        description="Active consignment notes (GR/LR) and completed deliveries awaiting customer freight invoicing."
        primaryAction={{
          label: "Refresh Report",
          icon: RefreshCw,
          onClick: () => loadData(lifecycleFilter),
        }}
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#121217] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Unbilled Consignments</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Awaiting customer invoice</p>
        </div>
        <div className="bg-white dark:bg-[#121217] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Unbilled Freight Value</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            ₹{metrics.totalFreight.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Potential billing pipeline</p>
        </div>
        <div className="bg-white dark:bg-[#121217] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ready to Bill (Delivered/POD)</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{metrics.deliveredCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">POD confirmed & cleared</p>
        </div>
        <div className="bg-white dark:bg-[#121217] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">In Transit / Booked</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{metrics.inTransitCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Shipments on the road</p>
        </div>
      </div>

      {/* Lifecycle Status Filter Tabs & Action Links */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#121217] p-2 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setLifecycleFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              lifecycleFilter === "ALL"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            All Unbilled ({metrics.totalCount})
          </button>
          <button
            type="button"
            onClick={() => setLifecycleFilter("DELIVERED_ONLY")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              lifecycleFilter === "DELIVERED_ONLY"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Delivered & POD Verified ({metrics.deliveredCount})
          </button>
          <button
            type="button"
            onClick={() => setLifecycleFilter("IN_TRANSIT")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              lifecycleFilter === "IN_TRANSIT"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Booked / In Transit ({metrics.inTransitCount})
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 px-1">
          <Link
            href="/accounts/transport-invoice"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
          >
            <Receipt className="w-3.5 h-3.5" />
            Go to Transport Invoicing
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs rounded-lg font-medium">
          {errorMessage}
        </div>
      )}

      {/* Helpful Banner when no records exist */}
      {!isLoading && data.length === 0 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-2">
          <FileText className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Unbilled Consignments Found</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Consignment notes (GR/LR) booked in the system that haven't been invoiced will appear here. If you just booked an LR or moved branches, check your active branch filter or book a new LR.
          </p>
          <div className="pt-2">
            <Link
              href="/transport/lr-booking"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Book New Lorry Receipt (LR)
            </Link>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Filter by LR number, client, or destination..."
      />
    </div>
  );
}
