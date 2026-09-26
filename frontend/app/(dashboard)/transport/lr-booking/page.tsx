"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, ArrowRight, Truck, CheckCircle2, Send, Navigation, FileText, IndianRupee, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { Form } from "@/components/forms/form";
import { StatusBadge } from "@/components/ui/badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { KpiCard } from "@/components/ui/kpi-card";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  QuickCreateConsignerModal,
  QuickCreateConsigneeModal,
  QuickCreateLocationModal,
} from "@/components/modals/quick-create-modal";

interface LRRecord {
  id: number;
  lr_number: string;
  lr_date: string;
  job_number?: string;
  consigner_name?: string;
  consignee_name?: string;
  origin_city?: string;
  destination_city?: string;
  vehicle_source: string;
  vehicle_number: string;
  driver_name?: string;
  driver_phone?: string;
  package_count: number;
  chargeable_weight_mt: string | number;
  total_freight_amount: string | number;
  advance_amount: string | number;
  balance_amount: string | number;
  status: string;
}

interface SelectOption {
  id: number;
  name?: string;
  city_name?: string;
  job_number?: string;
}

export default function LRBookingPage() {
  const router = useRouter();
  const [data, setData] = useState<LRRecord[]>([]);
  const [consigners, setConsigners] = useState<SelectOption[]>([]);
  const [consignees, setConsignees] = useState<SelectOption[]>([]);
  const [locations, setLocations] = useState<SelectOption[]>([]);
  const [jobs, setJobs] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formInitialValues, setFormInitialValues] = useState<Record<string, any>>({});
  const formSetFieldValueRef = useRef<((name: string, value: any) => void) | null>(null);

  // Quick Create Modals state
  const [quickConsignerOpen, setQuickConsignerOpen] = useState(false);
  const [quickConsigneeOpen, setQuickConsigneeOpen] = useState(false);
  const [quickLocationTarget, setQuickLocationTarget] = useState<"origin" | "destination" | null>(null);

  interface SeriesRangeItem {
    id: number;
    document_type: string;
    series_name: string;
    prefix: string;
    suffix?: string;
    starting_number: number;
    end_number?: number;
    series_mode: string;
    is_default: boolean;
    total_count: number;
    used_count: number;
    available_count: number;
    display_label: string;
    available_options: { value: string; label: string; number: number }[];
  }

  // Series Master State
  const [seriesInfo, setSeriesInfo] = useState<{
    configured: boolean;
    prefix?: string;
    suffix?: string;
    next_number_formatted?: string;
    series_mode?: string;
  } | null>(null);

  const [manualSeriesData, setManualSeriesData] = useState<{
    document_type: string;
    is_mandatory_manual: boolean;
    default_series_id: number | null;
    ranges: SeriesRangeItem[];
  } | null>(null);
  const [selectedRangeId, setSelectedRangeId] = useState<string>("");

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [lrsRes, consignersRes, consigneesRes, locationsRes, jobsRes, seriesRes, manualRangesRes] = await Promise.all([
        apiClient<LRRecord[]>("/api/v1/transport/lrs"),
        apiClient<SelectOption[]>("/api/v1/general/consigners"),
        apiClient<SelectOption[]>("/api/v1/general/consignees"),
        apiClient<SelectOption[]>("/api/v1/general/locations"),
        apiClient<SelectOption[]>("/api/v1/transport/jobs"),
        apiClient<any>("/api/v1/settings/series/check/LR").catch(() => null),
        apiClient<any>("/api/v1/settings/series/manual-ranges/LR").catch(() => null),
      ]);
      setData(Array.isArray(lrsRes) ? lrsRes : []);
      setConsigners(Array.isArray(consignersRes) ? consignersRes : []);
      setConsignees(Array.isArray(consigneesRes) ? consigneesRes : []);
      setLocations(Array.isArray(locationsRes) ? locationsRes : []);
      setJobs(Array.isArray(jobsRes) ? jobsRes : []);
      setSeriesInfo(seriesRes);
      setManualSeriesData(manualRangesRes);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load LRs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = data.length;
    const inTransit = data.filter((d) => d.status === "IN_TRANSIT").length;
    const pendingPOD = data.filter((d) => d.status === "ARRIVED" || d.status === "DELIVERED").length;
    const totalFreight = data.reduce((acc, d) => acc + (parseFloat(String(d.total_freight_amount)) || 0), 0);
    return { total, inTransit, pendingPOD, totalFreight };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      return true;
    });
  }, [data, statusFilter]);

  const columns: ColumnDef<LRRecord>[] = [
    {
      key: "lr_number",
      header: "LR / GR Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">
            {row.lr_number}
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            {formatDate(row.lr_date)} {row.job_number ? `· ${row.job_number}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "parties",
      header: "Consigner → Consignee",
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block text-xs">
            {row.consigner_name || "Direct Client"}
          </span>
          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <span className="text-slate-400">To:</span> {row.consignee_name || "Direct Receiver"}
          </span>
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "Assigned Vehicle",
      sortable: true,
      cell: (row) => (
        <div>
          <VehiclePlate vehicleNumber={row.vehicle_number} source={row.vehicle_source} />
          <span className="text-[11px] text-slate-500 block mt-1 font-medium">
            {row.driver_name ? `${row.driver_name}` : row.vehicle_source}
          </span>
        </div>
      ),
    },
    {
      key: "freight",
      header: "Freight / Balance",
      isNumeric: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block text-xs tabular-nums">
            {formatCurrency(row.total_freight_amount)}
          </span>
          <span className="text-[11px] font-mono text-amber-700 font-medium tabular-nums">
            Bal: {formatCurrency(row.balance_amount)}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Lifecycle Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const actions: RowAction<LRRecord>[] = [
    {
      label: "Dispatch / In Transit",
      disabled: (row) => row.status !== "BOOKED" && row.status !== "LOADED",
      onClick: async (row) => {
        try {
          await apiClient(`/api/v1/transport/lrs/${row.id}/transition`, {
            method: "POST",
            body: JSON.stringify({ target_status: "IN_TRANSIT" }),
          });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to dispatch LR.");
        }
      },
    },
    {
      label: "Record Arrival",
      disabled: (row) => row.status !== "IN_TRANSIT",
      onClick: (row) => {
        router.push(`/transport/arrival-reports?lr_id=${row.id}`);
      },
    },
    {
      label: "Upload / Verify POD",
      disabled: (row) => row.status !== "ARRIVED" && row.status !== "DELIVERED" && row.status !== "POD_RECEIVED",
      onClick: (row) => {
        router.push(`/transport/pod-records?lr_id=${row.id}`);
      },
    },
    {
      label: "Generate Invoice",
      icon: <FileText className="w-3.5 h-3.5" />,
      onClick: (row) => {
        router.push(`/accounts/transport-invoice?lr_id=${row.id}`);
      },
    },
  ];

  const handleConsignerCreated = (newConsigner: { id: number; name: string }) => {
    setConsigners((prev) => [{ id: newConsigner.id, name: newConsigner.name }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, consigner_id: String(newConsigner.id) }));
    formSetFieldValueRef.current?.("consigner_id", String(newConsigner.id));
  };

  const handleConsigneeCreated = (newConsignee: { id: number; name: string }) => {
    setConsignees((prev) => [{ id: newConsignee.id, name: newConsignee.name }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, consignee_id: String(newConsignee.id) }));
    formSetFieldValueRef.current?.("consignee_id", String(newConsignee.id));
  };

  const handleLocationCreated = (newLoc: { id: number; city_name: string }) => {
    setLocations((prev) => [{ id: newLoc.id, city_name: newLoc.city_name }, ...prev]);
    const field = quickLocationTarget === "origin" ? "origin_location_id" : "destination_location_id";
    setFormInitialValues((prev) => ({ ...prev, [field]: String(newLoc.id) }));
    formSetFieldValueRef.current?.(field, String(newLoc.id));
    setQuickLocationTarget(null);
  };

  const consignerOptions = consigners.map((c) => ({ label: c.name || `Customer ${c.id}`, value: String(c.id) }));
  const consigneeOptions = consignees.map((c) => ({ label: c.name || `Consignee ${c.id}`, value: String(c.id) }));
  const locationOptions = locations.map((l) => ({ label: l.city_name || `Location ${l.id}`, value: String(l.id) }));
  const jobOptions = [
    { label: "Direct Booking (No Job)", value: "" },
    ...jobs.map((j) => ({ label: `${j.job_number} (ID: ${j.id})`, value: String(j.id) })),
  ];

  const isManualSeries = Boolean(manualSeriesData && manualSeriesData.ranges && manualSeriesData.ranges.length > 0);

  const activeRange = useMemo(() => {
    if (!manualSeriesData || !manualSeriesData.ranges || manualSeriesData.ranges.length === 0) return null;
    if (selectedRangeId) {
      const match = manualSeriesData.ranges.find((r) => String(r.id) === selectedRangeId);
      if (match) return match;
    }
    const def = manualSeriesData.ranges.find((r) => r.id === manualSeriesData.default_series_id);
    return def || manualSeriesData.ranges[0];
  }, [manualSeriesData, selectedRangeId]);

  const rangeOptions = (manualSeriesData?.ranges || []).map((r) => ({
    value: String(r.id),
    label: `${r.display_label}${r.is_default ? " ★ (Active As Of Now)" : ""}`,
  }));

  const leafOptions = (activeRange?.available_options || []).map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));

  const formSections: FormSectionDef[] = [
    {
      id: "parties_sec",
      title: "Consignment & Linked Trip",
      description: "Originating contracting parties, series booklet, and optional Job linkage",
      columns: 2,
      fields: [
        ...(isManualSeries && activeRange
          ? [
              {
                name: "series_range_id",
                label: "Select Series Batch / Range",
                type: "select" as const,
                required: true,
                options: rangeOptions,
                defaultValue: String(activeRange.id),
                helperText: activeRange.is_default
                  ? "Sticky Active Series: Pre-selected automatically for current billing."
                  : "Select physical booklet / series batch.",
                onChange: (newRangeId: string) => {
                  setSelectedRangeId(newRangeId);
                  const newRange = manualSeriesData?.ranges.find((r) => String(r.id) === newRangeId);
                  const firstOpt = newRange?.available_options?.[0]?.value || "";
                  formSetFieldValueRef.current?.("lr_number", firstOpt);
                },
                onAddNew: () => router.push("/settings/series-master"),
                addNewLabel: "+ Create New Series Range",
                addNewTitle: "Configure new booklet range in Settings > Series Master",
              },
              {
                name: "lr_number",
                label: `Voucher Number (${leafOptions.length} Unused Available)`,
                type: "select" as const,
                required: true,
                options: leafOptions,
                defaultValue: leafOptions[0]?.value || "",
                placeholder: leafOptions.length > 0 ? "Select unused LR leaf/number" : "All vouchers in this range are used!",
                helperText: "Used voucher numbers are automatically hidden. Select any available leaf in the batch.",
              },
            ]
          : [
              {
                name: "lr_number",
                label: "LR / GR Number (Auto Series)",
                type: "text" as const,
                disabled: true,
                disabledReason: "Voucher numbers are auto-assigned by Series Master and cannot be edited",
                placeholder: seriesInfo?.next_number_formatted || "LR-2026-0001",
                defaultValue: seriesInfo?.next_number_formatted || "LR-2026-0001",
              },
            ]),
        {
          name: "lr_date",
          label: "LR Booking Date",
          type: "date" as const,
          required: true,
        },
        {
          name: "job_id",
          label: "Linked Trip / Job Order",
          type: "select" as const,
          options: jobOptions,
          onAddNew: () => router.push("/transport/jobs"),
          addNewLabel: "+ Create New Trip Order",
          addNewTitle: "Go to Trips & Job Orders to create a new trip",
        },
        {
          name: "consigner_id",
          label: "Consigner (Sender / Customer)",
          type: "select",
          required: true,
          options: consignerOptions,
          onAddNew: () => setQuickConsignerOpen(true),
          addNewLabel: "+ Add New Consigner",
          addNewTitle: "Quickly create customer / consigner",
        },
        {
          name: "consignee_id",
          label: "Consignee (Receiver)",
          type: "select",
          required: true,
          options: consigneeOptions,
          onAddNew: () => setQuickConsigneeOpen(true),
          addNewLabel: "+ Add New Consignee",
          addNewTitle: "Quickly create consignee",
        },
        {
          name: "origin_location_id",
          label: "Origin Hub",
          type: "select",
          required: true,
          options: locationOptions,
          onAddNew: () => setQuickLocationTarget("origin"),
          addNewLabel: "+ Add New Origin Hub",
          addNewTitle: "Quickly create origin city / hub",
        },
        {
          name: "destination_location_id",
          label: "Destination Hub",
          type: "select",
          required: true,
          options: locationOptions,
          onAddNew: () => setQuickLocationTarget("destination"),
          addNewLabel: "+ Add New Destination Hub",
          addNewTitle: "Quickly create destination city / hub",
        },
      ],
    },
    {
      id: "fleet_sec",
      title: "Vehicle & Driver Assignment",
      description: "Transport fleet registration and operating driver",
      columns: 2,
      fields: [
        {
          name: "vehicle_source",
          label: "Fleet Source",
          type: "select",
          required: true,
          options: [
            { label: "Company Fleet Vehicle", value: "COMPANY" },
            { label: "Market / Attached Vehicle", value: "MARKET" },
          ],
        },
        {
          name: "vehicle_number",
          label: "Vehicle Registration",
          placeholder: "e.g. RJ-14-GH-1234",
          required: true,
        },
        {
          name: "driver_name",
          label: "Driver Name",
          placeholder: "e.g. Ramesh Singh",
        },
        {
          name: "driver_phone",
          label: "Driver Mobile",
          placeholder: "+91 98765 11223",
        },
      ],
    },
    {
      id: "cargo_freight_sec",
      title: "Cargo & Financial Terms",
      description: "Tonnage, packaging, freight rate, and advances",
      columns: 2,
      fields: [
        {
          name: "package_count",
          label: "Package Count",
          placeholder: "e.g. 50",
          type: "number",
          required: true,
        },
        {
          name: "chargeable_weight_mt",
          label: "Chargeable Weight (MT)",
          placeholder: "e.g. 18.50",
          type: "number",
          required: true,
        },
        {
          name: "total_freight_amount",
          label: "Total Freight Amount (₹)",
          placeholder: "e.g. 45000",
          type: "number",
          required: true,
        },
        {
          name: "advance_amount",
          label: "Advance Cash / Diesel (₹)",
          placeholder: "e.g. 15000",
          type: "number",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    if (seriesInfo && !seriesInfo.configured && (!manualSeriesData || manualSeriesData.ranges.length === 0)) {
      alert("Manual Series for LR is not configured! Please configure it in Series Master before creating an LR.");
      return;
    }
    if (isManualSeries && !values.lr_number) {
      alert("Please select an available voucher number from the selected series range.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        lr_number: values.lr_number ? String(values.lr_number).trim() : (seriesInfo?.next_number_formatted || undefined),
        job_id: values.job_id ? parseInt(values.job_id, 10) : null,
        consigner_id: parseInt(values.consigner_id, 10),
        consignee_id: parseInt(values.consignee_id, 10),
        origin_location_id: parseInt(values.origin_location_id, 10),
        destination_location_id: parseInt(values.destination_location_id, 10),
        package_count: parseInt(values.package_count, 10) || 0,
        chargeable_weight_mt: parseFloat(values.chargeable_weight_mt) || 0,
        total_freight_amount: parseFloat(values.total_freight_amount) || 0,
        advance_amount: parseFloat(values.advance_amount) || 0,
      };

      await apiClient("/api/v1/transport/lrs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to book LR.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateDrawer = () => {
    const rangeToUse = activeRange;
    const initialRangeId = rangeToUse ? String(rangeToUse.id) : "";
    const initialLrNo = rangeToUse?.available_options?.[0]?.value || seriesInfo?.next_number_formatted || "";
    if (initialRangeId) {
      setSelectedRangeId(initialRangeId);
    }
    setFormInitialValues({
      lr_date: new Date().toISOString().split("T")[0],
      series_range_id: initialRangeId,
      lr_number: initialLrNo,
    });
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lorry Receipts (GR / LR)"
        description="Official carrier consignment notes: track freight movement, dispatch states, destination arrivals, and POD verification."
        primaryAction={{
          label: "New LR Booking",
          icon: <Plus className="w-4 h-4" />,
          onClick: openCreateDrawer,
        }}
      />

      {seriesInfo && !seriesInfo.configured && (!manualSeriesData || manualSeriesData.ranges.length === 0) && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ Manual Series Required:</span>
            <span>Manual series must be configured in Series Master before LRs can be booked.</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => router.push("/settings/series-master")}
            className="text-xs bg-white text-amber-800 border-amber-300 hover:bg-amber-100 shrink-0"
          >
            Configure LR Series
          </Button>
        </div>
      )}

      {/* Operational KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Consignments"
          value={stats.total.toLocaleString()}
          subtext="Official GR/LR receipts"
          icon={<FileText className="w-4 h-4" />}
        />
        <KpiCard
          title="In Transit Corridors"
          value={stats.inTransit.toLocaleString()}
          subtext="Active line-haul dispatch"
          icon={<Truck className="w-4 h-4 text-blue-600" />}
        />
        <KpiCard
          title="Awaiting POD Clearance"
          value={stats.pendingPOD.toLocaleString()}
          subtext="Arrived / Delivered consignments"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
        />
        <KpiCard
          title="Total Billed Freight"
          value={formatCurrency(stats.totalFreight)}
          subtext="Cumulative LR booking value"
          icon={<IndianRupee className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search LR number, vehicle, customer..."
        filters={[
          {
            id: "status",
            label: "Filter Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Booked", value: "BOOKED" },
              { label: "In Transit", value: "IN_TRANSIT" },
              { label: "Arrived", value: "ARRIVED" },
              { label: "Delivered", value: "DELIVERED" },
              { label: "POD Verified", value: "POD_VERIFIED" },
              { label: "Cancelled", value: "CANCELLED" },
            ],
          },
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
        }}
      />

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        searchable={false}
        emptyMessage="No Lorry Receipts found"
        emptySubtext="Create an LR booking from a confirmed transport trip or book directly to generate consignment notes."
        emptyAction={{
          label: "+ New LR Booking",
          onClick: openCreateDrawer,
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Create Lorry Receipt (GR / LR)"
        description="Record commercial consignment, assigned truck, freight charges, and dispatch parties."
        width="xl"
      >
        {isManualSeries && activeRange && (
          <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/90 to-purple-50/70 border border-indigo-200/80 text-indigo-950 text-xs shadow-2xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Selected Series:</span>
                <span className="font-bold text-indigo-700 font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">
                  {activeRange.series_name} ({activeRange.prefix})
                </span>
                {activeRange.is_default && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium text-[10px] border border-emerald-300">
                    ★ Active As Of Now
                  </span>
                )}
              </div>
              <div className="font-mono text-slate-600 text-[11px]">
                Batch: <span className="font-bold text-slate-900">{activeRange.starting_number} – {activeRange.end_number || "..."}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-indigo-100 text-slate-600">
              <span>{activeRange.used_count} vouchers already recorded</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {activeRange.available_count} leaves available (used hidden)
              </span>
            </div>
          </div>
        )}
        {!isManualSeries && seriesInfo && !seriesInfo.configured && (
          <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              ⚠️ Mandatory Manual Series Not Configured
            </div>
            <p>
              By TMS operational policy, LR creation requires a configured Manual Series. You cannot book an LR until an active series is set up in Settings &gt; Series Master.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => router.push("/settings/series-master")}
              className="text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100"
            >
              Go to Series Master
            </Button>
          </div>
        )}
        {!isManualSeries && seriesInfo && seriesInfo.configured && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs flex items-center justify-between">
            <div className="font-mono">
              <span className="text-slate-500 font-sans mr-1">Active Series:</span>
              <strong className="text-indigo-700">Prefix [{seriesInfo.prefix}]</strong>
              {seriesInfo.suffix ? <strong className="text-indigo-700"> Postfix [{seriesInfo.suffix}]</strong> : null}
            </div>
            <div className="font-mono text-[11px] text-indigo-700">
              Suggested Next: <span className="font-bold bg-white px-2 py-0.5 rounded border border-indigo-200">{seriesInfo.next_number_formatted}</span>
            </div>
          </div>
        )}
        <Form
          sections={formSections}
          initialValues={formInitialValues}
          setFieldValueRef={formSetFieldValueRef}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel={!isManualSeries && seriesInfo && !seriesInfo.configured ? "Series Configuration Required" : "Create Lorry Receipt"}
          isLoading={isSubmitting}
        />
      </EntityDrawer>

      {/* Quick Creation Modals */}
      <QuickCreateConsignerModal
        isOpen={quickConsignerOpen}
        onClose={() => setQuickConsignerOpen(false)}
        onSuccess={handleConsignerCreated}
      />
      <QuickCreateConsigneeModal
        isOpen={quickConsigneeOpen}
        onClose={() => setQuickConsigneeOpen(false)}
        onSuccess={handleConsigneeCreated}
      />
      <QuickCreateLocationModal
        isOpen={quickLocationTarget !== null}
        onClose={() => setQuickLocationTarget(null)}
        onSuccess={handleLocationCreated}
        defaultTitle={quickLocationTarget === "origin" ? "Quick Add Origin Hub / City" : "Quick Add Destination Hub / City"}
      />
    </div>
  );
}
