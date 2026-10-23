"use client";
import { toast } from "@/lib/toast";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Plus, ArrowRight, Truck, FileText, CheckCircle2, Clock, Layers, Sparkles, FileSpreadsheet, Pencil, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { Form } from "@/components/forms/form";
import { StatusBadge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  QuickCreateBillingClientModal,
  QuickCreateConsignerModal,
  QuickCreateConsigneeModal,
  QuickCreateLocationModal,
} from "@/components/modals/quick-create-modal";
import { JobExcelImportModal } from "@/components/modals/job-excel-import-modal";
import { JobOrderViewModal } from "@/components/modals/job-order-view-modal";

interface JobRecord {
  id: number;
  job_number: string;
  job_date: string;
  consigner_id: number;
  consignee_id: number;
  origin_location_id?: number;
  destination_location_id?: number;
  billing_client_id?: number;
  billing_party?: string;
  billing_client_name?: string;
  consigner_name?: string;
  consigner_code?: string;
  consignee_name?: string;
  consignee_code?: string;
  origin_city?: string;
  destination_city?: string;
  expected_dispatch_date?: string;
  cargo_description?: string;
  estimated_weight_mt?: string | number;
  estimated_packages?: number;
  status: string;
  special_instructions?: string;
  created_at: string;
}

interface SelectOption {
  id: number;
  name?: string;
  code?: string;
  city_name?: string;
  state?: string;
}

import { getActiveOffice } from "@/lib/auth";

export default function JobsPage() {
  const router = useRouter();
  const [data, setData] = useState<JobRecord[]>([]);
  const [billingClients, setBillingClients] = useState<SelectOption[]>([]);
  const [consigners, setConsigners] = useState<SelectOption[]>([]);
  const [consignees, setConsignees] = useState<SelectOption[]>([]);
  const [locations, setLocations] = useState<SelectOption[]>([]);
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
  const [seriesInfo, setSeriesInfo] = useState<any>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
  const formSetFieldValueRef = useRef<((name: string, value: any) => void) | null>(null);

  // Quick Create Modals state
  const [quickBillingClientOpen, setQuickBillingClientOpen] = useState(false);
  const [quickConsignerOpen, setQuickConsignerOpen] = useState(false);
  const [quickConsigneeOpen, setQuickConsigneeOpen] = useState(false);
  const [quickLocationTarget, setQuickLocationTarget] = useState<"origin" | "destination" | null>(null);

  // Excel Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // View & Edit Modal states
  const [viewingJob, setViewingJob] = useState<JobRecord | null>(null);
  const [editingJob, setEditingJob] = useState<JobRecord | null>(null);
  const [activeOffice, setActiveOfficeState] = useState<any>(() => getActiveOffice());
  const editingJobRef = useRef<JobRecord | null>(null);
  editingJobRef.current = editingJob;

  const loadData = useCallback(async (targetOffice?: any) => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const office = targetOffice !== undefined ? targetOffice : getActiveOffice();
      setActiveOfficeState(office);
      const officeParam = office?.id ? `?office_id=${office.id}` : "";
      const [jobsRes, billingClientsRes, consignersRes, consigneesRes, locationsRes, seriesRes] = await Promise.all([
        apiClient<JobRecord[]>(`/api/v1/transport/jobs${officeParam}`),
        apiClient<SelectOption[]>("/api/v1/general/billing-clients").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/consigners"),
        apiClient<SelectOption[]>("/api/v1/general/consignees"),
        apiClient<SelectOption[]>("/api/v1/general/locations"),
        apiClient<any>(`/api/v1/settings/series/check/JOB${officeParam}`).catch(() => null),
      ]);
      setData(Array.isArray(jobsRes) ? jobsRes : []);
      setBillingClients(Array.isArray(billingClientsRes) ? billingClientsRes : []);
      setConsigners(Array.isArray(consignersRes) ? consignersRes : []);
      setConsignees(Array.isArray(consigneesRes) ? consigneesRes : []);
      setLocations(Array.isArray(locationsRes) ? locationsRes : []);
      setSeriesInfo(seriesRes);

      // If create drawer is open, auto-refresh form with new office's series and next number
      const initialSeries = seriesRes?.series_options?.[0];
      const initialSeriesId = initialSeries ? String(initialSeries.id) : "default";
      setSelectedSeriesId(initialSeriesId);
      const initialJobNo = initialSeries?.next_number_formatted || seriesRes?.next_number_formatted || "";

      if (!editingJobRef.current) {
        setFormInitialValues((prev) => ({
          ...prev,
          job_series_id: initialSeriesId,
          job_number: initialJobNo,
          issuing_office_id: office?.id,
        }));
        if (formSetFieldValueRef.current) {
          formSetFieldValueRef.current("job_series_id", initialSeriesId);
          formSetFieldValueRef.current("job_number", initialJobNo);
        }
      }
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load jobs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleOfficeChange = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const newOffice = customEvent.detail || getActiveOffice();
      loadData(newOffice);
    };
    window.addEventListener("panther_office_changed", handleOfficeChange);
    return () => window.removeEventListener("panther_office_changed", handleOfficeChange);
  }, [loadData]);

  const stats = useMemo(() => {
    const total = data.length;
    const open = data.filter((d) => d.status === "OPEN").length;
    const dispatched = data.filter((d) => d.status === "BOOKED" || d.status === "DISPATCHED").length;
    const delivered = data.filter((d) => d.status === "DELIVERED" || d.status === "CLOSED").length;
    return { total, open, dispatched, delivered };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          item.job_number?.toLowerCase().includes(term) ||
          item.billing_party?.toLowerCase().includes(term) ||
          item.billing_client_name?.toLowerCase().includes(term) ||
          item.consigner_name?.toLowerCase().includes(term) ||
          item.consignee_name?.toLowerCase().includes(term) ||
          item.origin_city?.toLowerCase().includes(term) ||
          item.destination_city?.toLowerCase().includes(term) ||
          item.cargo_description?.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [data, statusFilter, searchTerm]);

  const columns: ColumnDef<JobRecord>[] = [
    {
      key: "job_number",
      header: "Job Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">
            {row.job_number}
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            {formatDate(row.job_date)}
          </span>
        </div>
      ),
    },
    {
      key: "billing_party",
      header: "Billing Client",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block text-xs">
            {row.billing_client_name || row.billing_party || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "parties",
      header: "Consignor → Consignee",
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block text-xs">
            {row.consigner_name || `Consignor #${row.consigner_id}`}
          </span>
          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <span className="text-slate-400">To:</span> {row.consignee_name || `Consignee #${row.consignee_id}`}
          </span>
        </div>
      ),
    },
    {
      key: "route",
      header: "Origin → Destination",
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
          <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-800 border border-slate-200/80 shadow-2xs">
            {row.origin_city || "Origin"}
          </span>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-800 border border-slate-200/80 shadow-2xs">
            {row.destination_city || "Destination"}
          </span>
        </div>
      ),
    },
    {
      key: "cargo",
      header: "Estimated Weight / Packages",
      isNumeric: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block text-xs tabular-nums">
            {row.estimated_weight_mt ? `${parseFloat(String(row.estimated_weight_mt)).toFixed(2)} MT` : "-"}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {row.estimated_packages ? `${row.estimated_packages} pkgs` : "-"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Trip Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const actions: RowAction<JobRecord>[] = [
    {
      label: "Print Preview",
      icon: <Printer className="w-4 h-4 text-slate-600" />,
      onClick: (row) => {
        setViewingJob(row);
      },
    },
    {
      label: "Edit",
      icon: <Pencil className="w-4 h-4 text-blue-600" />,
      onClick: (row) => {
        openEditJobDrawer(row);
      },
      disabled: (row) => row.status === "CLOSED" || row.status === "CANCELLED",
    },
    {
      label: "Book GR/LR",
      icon: <Truck className="w-4 h-4 text-emerald-600" />,
      onClick: (row) => {
        router.push(`/transport/lr-booking?job_id=${row.id}`);
      },
    },
  ];

  const handleBillingClientCreated = (newClient: { id: number; name: string }) => {
    setBillingClients((prev) => [{ id: newClient.id, name: newClient.name }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, billing_client_id: String(newClient.id) }));
    formSetFieldValueRef.current?.("billing_client_id", String(newClient.id));
  };

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

  const billingClientOptions = billingClients.map((b) => ({
    label: b.name ? `${b.name}${b.code ? ` (${b.code})` : ""}` : `Billing Client #${b.id}`,
    value: String(b.id),
  }));

  const consignerOptions = consigners.map((c) => ({
    label: c.name || `Consignor #${c.id}`,
    value: String(c.id),
  }));

  const consigneeOptions = consignees.map((c) => ({
    label: c.name || `Consignee #${c.id}`,
    value: String(c.id),
  }));

  const locationOptions = locations.map((l) => ({
    label: l.city_name ? `${l.city_name}${l.state ? `, ${l.state}` : ""}` : `Location #${l.id}`,
    value: String(l.id),
  }));

  const seriesOptions = useMemo(() => {
    if (seriesInfo?.series_options && seriesInfo.series_options.length > 0) {
      return seriesInfo.series_options.map((s: any) => ({
        value: String(s.id),
        label: s.display_label || `${s.series_name} (${s.next_number_formatted})`,
      }));
    }
    if (seriesInfo?.configured) {
      return [{
        value: "default",
        label: `Default Series (${seriesInfo.next_number_formatted})`,
      }];
    }
    return [{ value: "default", label: "Default Job Sequence" }];
  }, [seriesInfo]);

  const activeSeries = useMemo(() => {
    if (seriesInfo?.series_options && seriesInfo.series_options.length > 0) {
      if (selectedSeriesId && selectedSeriesId !== "default") {
        const found = seriesInfo.series_options.find((s: any) => String(s.id) === String(selectedSeriesId));
        if (found) return found;
      }
      return seriesInfo.series_options[0];
    }
    return seriesInfo;
  }, [seriesInfo, selectedSeriesId]);

  const activeNextNumber = editingJob?.job_number || activeSeries?.next_number_formatted || seriesInfo?.next_number_formatted || "";

  const formSections: FormSectionDef[] = [
    {
      id: "job_order_specification",
      title: "Job Order Specification",
      description: "Auto-allocated Job Number, billing party, scheduled dates, and cargo details",
      columns: 2,
      fields: [
        {
          name: "job_series_id",
          label: "Select Series",
          type: "select",
          options: seriesOptions,
          disabled: Boolean(editingJob) || seriesOptions.length <= 1,
          disabledReason: editingJob
            ? "Cannot modify series of an existing job"
            : seriesOptions.length <= 1
            ? "Only one series configured for this branch"
            : undefined,
          defaultValue: selectedSeriesId || (seriesOptions[0]?.value ?? "default"),
          onChange: (newVal: string) => {
            setSelectedSeriesId(newVal);
            const matched = seriesInfo?.series_options?.find((s: any) => String(s.id) === String(newVal));
            const nextNum = matched?.next_number_formatted || seriesInfo?.next_number_formatted || "";
            if (formSetFieldValueRef.current) {
              formSetFieldValueRef.current("job_number", nextNum);
            }
          },
          colSpan: 1,
        },
        {
          name: "job_number",
          label: "Job Number (Locked)",
          type: "text",
          disabled: true,
          disabledReason: "Sequence number is allocated automatically from the selected series.",
          placeholder: activeNextNumber || "Auto-allocated",
          helperText: `Allocated Sequence: ${activeNextNumber || "Auto-allocated upon creation"}`,
          colSpan: 1,
        },
        {
          name: "billing_client_id",
          label: "Billing Client",
          type: "select",
          required: true,
          options: billingClientOptions,
          placeholder: "Select Billing Client",
          onAddNew: () => setQuickBillingClientOpen(true),
          addNewLabel: "+ Add New Billing Client",
          addNewTitle: "Quickly register new corporate billing client",
          colSpan: 1,
        },
        {
          name: "origin_location_id",
          label: "Origin Location",
          type: "select",
          required: true,
          options: locationOptions,
          placeholder: "Select Origin Location",
          onAddNew: () => setQuickLocationTarget("origin"),
          addNewLabel: "+ Add New Origin Location",
          addNewTitle: "Quickly create origin city / hub",
        },
        {
          name: "destination_location_id",
          label: "Destination Location",
          type: "select",
          required: true,
          options: locationOptions,
          placeholder: "Select Destination Location",
          onAddNew: () => setQuickLocationTarget("destination"),
          addNewLabel: "+ Add New Destination Location",
          addNewTitle: "Quickly create destination city / hub",
        },
        {
          name: "job_date",
          label: "Date of Job Creation",
          type: "date",
          required: true,
          defaultValue: new Date().toISOString().split("T")[0],
        },
        {
          name: "expected_dispatch_date",
          label: "Scheduled Dispatch Date",
          type: "date",
          required: false,
          defaultValue: new Date().toISOString().split("T")[0],
        },
        {
          name: "consigner_id",
          label: "Consignor",
          type: "select",
          required: true,
          options: consignerOptions,
          placeholder: "Select Consignor",
          onAddNew: () => setQuickConsignerOpen(true),
          addNewLabel: "+ Add New Consignor",
          addNewTitle: "Quickly create and register consignor",
        },
        {
          name: "consignee_id",
          label: "Consignee",
          type: "select",
          required: true,
          options: consigneeOptions,
          placeholder: "Select Consignee",
          onAddNew: () => setQuickConsigneeOpen(true),
          addNewLabel: "+ Add New Consignee",
          addNewTitle: "Quickly create and register consignee",
        },
        {
          name: "cargo_description",
          label: "Cargo Description",
          placeholder: "e.g. Industrial Steel Coils, FMCG, Commercial Cargo",
          colSpan: 2,
        },
        {
          name: "estimated_weight_mt",
          label: "Estimated Weight",
          placeholder: "e.g. 24.50 MT (Optional)",
          type: "number",
          required: false,
        },
        {
          name: "estimated_packages",
          label: "Total Packages",
          placeholder: "e.g. 150 pkgs (Optional)",
          type: "number",
          required: false,
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const rawSeriesId = values.job_series_id || selectedSeriesId;
      const parsedSeriesId = rawSeriesId && rawSeriesId !== "default" ? parseInt(rawSeriesId, 10) : undefined;
      const selectedBc = billingClients.find((b) => String(b.id) === String(values.billing_client_id));
      const payload = {
        job_series_id: parsedSeriesId,
        job_number: editingJob ? values.job_number : undefined,
        job_date: values.job_date || new Date().toISOString().split("T")[0],
        expected_dispatch_date: values.expected_dispatch_date || undefined,
        billing_client_id: values.billing_client_id ? parseInt(values.billing_client_id, 10) : undefined,
        billing_party: selectedBc?.name || undefined,
        consigner_id: parseInt(values.consigner_id, 10),
        consignee_id: parseInt(values.consignee_id, 10),
        origin_location_id: values.origin_location_id ? parseInt(values.origin_location_id, 10) : undefined,
        destination_location_id: values.destination_location_id ? parseInt(values.destination_location_id, 10) : undefined,
        cargo_description: values.cargo_description || undefined,
        estimated_weight_mt: values.estimated_weight_mt !== undefined && values.estimated_weight_mt !== "" ? parseFloat(values.estimated_weight_mt) : 0,
        estimated_packages: values.estimated_packages !== undefined && values.estimated_packages !== "" ? parseInt(values.estimated_packages, 10) : 0,
      };

      if (editingJob) {
        await apiClient(`/api/v1/transport/jobs/${editingJob.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient("/api/v1/transport/jobs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setIsDrawerOpen(false);
      setEditingJob(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save trip / job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateJobDrawer = useCallback(() => {
    setEditingJob(null);
    const currentOffice = getActiveOffice();
    setActiveOfficeState(currentOffice);
    const initialSeries = seriesInfo?.series_options?.[0];
    const initialSeriesId = initialSeries ? String(initialSeries.id) : "default";
    setSelectedSeriesId(initialSeriesId);
    const initialJobNo = initialSeries?.next_number_formatted || seriesInfo?.next_number_formatted || "";
    setFormInitialValues({
      issuing_office_id: currentOffice?.id,
      job_series_id: initialSeriesId,
      job_number: initialJobNo,
      job_date: new Date().toISOString().split("T")[0],
      expected_dispatch_date: new Date().toISOString().split("T")[0],
    });
    setIsDrawerOpen(true);
  }, [seriesInfo]);

  // Auto-open create drawer if URL contains ?add=true
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("add") === "true") {
        openCreateJobDrawer();
      }
    }
  }, [openCreateJobDrawer]);

  const openEditJobDrawer = (row: JobRecord) => {
    setEditingJob(row);
    setFormInitialValues({
      job_series_id: "default",
      job_number: row.job_number,
      billing_client_id: row.billing_client_id ? String(row.billing_client_id) : "",
      origin_location_id: row.origin_location_id ? String(row.origin_location_id) : "",
      destination_location_id: row.destination_location_id ? String(row.destination_location_id) : "",
      job_date: row.job_date,
      expected_dispatch_date: row.expected_dispatch_date || "",
      consigner_id: String(row.consigner_id),
      consignee_id: String(row.consignee_id),
      cargo_description: row.cargo_description || "",
      estimated_weight_mt: row.estimated_weight_mt !== undefined && row.estimated_weight_mt !== null ? String(row.estimated_weight_mt) : "",
      estimated_packages: row.estimated_packages !== undefined && row.estimated_packages !== null ? String(row.estimated_packages) : "",
    });
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trips & Job Orders"
        description="Create freight dispatch bookings, monitor corridor routes, and transition to LRs."
        primaryAction={{
          label: "Create Trip Order",
          icon: <Plus className="w-4 h-4" />,
          onClick: openCreateJobDrawer,
        }}
        secondaryActions={[
          {
            label: "Import from Excel",
            icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />,
            onClick: () => setIsImportModalOpen(true),
            variant: "outline",
          },
        ]}
      />

      {/* Operational KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Trips Created"
          value={stats.total.toLocaleString()}
          subtext="Active transport bookings"
          icon={<Truck className="w-4 h-4" />}
        />
        <KpiCard
          title="Open Dispatch"
          value={stats.open.toLocaleString()}
          subtext="Awaiting carrier assignment"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
        />
        <KpiCard
          title="Booked / In Transit"
          value={stats.dispatched.toLocaleString()}
          subtext="LR booked & vehicles en route"
          icon={<Layers className="w-4 h-4 text-blue-600" />}
        />
        <KpiCard
          title="Delivered / Closed"
          value={stats.delivered.toLocaleString()}
          subtext="Completed trip consignments"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search job number, billing client, consignor, consignee, route..."
        filters={[
          {
            id: "status",
            label: "Filter Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Open", value: "OPEN" },
              { label: "Booked", value: "BOOKED" },
              { label: "Dispatched", value: "DISPATCHED" },
              { label: "Delivered", value: "DELIVERED" },
              { label: "Closed", value: "CLOSED" },
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
        actionLayout="inline"
        searchable={false}
        emptyMessage="No jobs found"
        emptySubtext="Create a new transport job order to initiate dispatch and vehicle scheduling."
        emptyAction={{
          label: "Create Trip Order",
          onClick: openCreateJobDrawer,
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingJob(null);
        }}
        title={
          editingJob
            ? `Edit Trip Order: ${editingJob.job_number}`
            : `Create Trip / Job Order${activeOffice?.name ? ` • ${activeOffice.name}` : ""}`
        }
        description={
          editingJob
            ? "Update cargo specifications, contracting parties, or scheduled dispatch timing."
            : "Specify contracting billing client, dispatch route corridor, and cargo requirements."
        }
      >
        <Form
          key={editingJob ? `edit-${editingJob.id}` : `create-${activeOffice?.id ?? "all"}`}
          sections={formSections}
          initialValues={formInitialValues}
          setFieldValueRef={formSetFieldValueRef}
          onSubmit={handleCreate}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingJob(null);
          }}
          submitLabel={editingJob ? "Save Changes" : "Create Trip Order"}
          isLoading={isSubmitting}
        />
      </EntityDrawer>

      {/* Quick Creation Modals */}
      <QuickCreateBillingClientModal
        isOpen={quickBillingClientOpen}
        onClose={() => setQuickBillingClientOpen(false)}
        onSuccess={handleBillingClientCreated}
      />
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

      {/* Mass Excel Import Modal */}
      <JobExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* View Trip Order Voucher Modal with Print/Download */}
      <JobOrderViewModal
        isOpen={viewingJob !== null}
        job={viewingJob}
        onClose={() => setViewingJob(null)}
        onEdit={(job) => {
          openEditJobDrawer(job);
        }}
        onBookLR={(jobId) => {
          router.push(`/transport/lr-booking?job_id=${jobId}`);
        }}
      />
    </div>
  );
}
