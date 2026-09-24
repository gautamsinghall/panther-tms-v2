"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, ArrowRight, Truck, FileText, CheckCircle2, Clock, Layers, Sparkles } from "lucide-react";
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
  QuickCreateConsignerModal,
  QuickCreateConsigneeModal,
  QuickCreateLocationModal,
} from "@/components/modals/quick-create-modal";

interface JobRecord {
  id: number;
  job_number: string;
  job_date: string;
  consigner_id: number;
  consignee_id: number;
  consigner_name?: string;
  consignee_name?: string;
  origin_city?: string;
  destination_city?: string;
  cargo_description?: string;
  estimated_weight_mt: string | number;
  estimated_packages: number;
  status: string;
  created_at: string;
}

interface SelectOption {
  id: number;
  name?: string;
  city_name?: string;
}

export default function JobsPage() {
  const router = useRouter();
  const [data, setData] = useState<JobRecord[]>([]);
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
  const formSetFieldValueRef = useRef<((name: string, value: any) => void) | null>(null);

  // Quick Create Modals state
  const [quickConsignerOpen, setQuickConsignerOpen] = useState(false);
  const [quickConsigneeOpen, setQuickConsigneeOpen] = useState(false);
  const [quickLocationTarget, setQuickLocationTarget] = useState<"origin" | "destination" | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [jobsRes, consignersRes, consigneesRes, locationsRes] = await Promise.all([
        apiClient<JobRecord[]>("/api/v1/transport/jobs"),
        apiClient<SelectOption[]>("/api/v1/general/consigners"),
        apiClient<SelectOption[]>("/api/v1/general/consignees"),
        apiClient<SelectOption[]>("/api/v1/general/locations"),
      ]);
      setData(Array.isArray(jobsRes) ? jobsRes : []);
      setConsigners(Array.isArray(consignersRes) ? consignersRes : []);
      setConsignees(Array.isArray(consigneesRes) ? consigneesRes : []);
      setLocations(Array.isArray(locationsRes) ? locationsRes : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load jobs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      return true;
    });
  }, [data, statusFilter]);

  const columns: ColumnDef<JobRecord>[] = [
    {
      key: "job_number",
      header: "Trip / Job No",
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
      key: "parties",
      header: "Customer → Receiver",
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block text-xs">
            {row.consigner_name || `Customer #${row.consigner_id}`}
          </span>
          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <span className="text-slate-400">To:</span> {row.consignee_name || `Receiver #${row.consignee_id}`}
          </span>
        </div>
      ),
    },
    {
      key: "route",
      header: "Route Movement",
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
      header: "Weight / Packages",
      isNumeric: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block text-xs tabular-nums">
            {parseFloat(String(row.estimated_weight_mt || 0)).toFixed(2)} MT
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {row.estimated_packages || 0} pkgs
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
      label: "Book GR/LR",
      icon: <Truck className="w-3.5 h-3.5" />,
      onClick: (row) => {
        router.push(`/transport/lr-booking?job_id=${row.id}`);
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

  const consignerOptions = consigners.map((c) => ({
    label: c.name || `Customer ${c.id}`,
    value: String(c.id),
  }));

  const consigneeOptions = consignees.map((c) => ({
    label: c.name || `Receiver ${c.id}`,
    value: String(c.id),
  }));

  const locationOptions = locations.map((l) => ({
    label: l.city_name || `Location ${l.id}`,
    value: String(l.id),
  }));

  const formSections: FormSectionDef[] = [
    {
      id: "commercial_parties",
      title: "Commercial Contracting Parties",
      description: "Select originating customer and destination consignee",
      columns: 2,
      fields: [
        {
          name: "consigner_id",
          label: "Customer / Consigner",
          type: "select",
          required: true,
          options: consignerOptions,
          onAddNew: () => setQuickConsignerOpen(true),
          addNewLabel: "+ Add New Customer / Consigner",
          addNewTitle: "Quickly create and register customer / consigner",
        },
        {
          name: "consignee_id",
          label: "Receiving Consignee",
          type: "select",
          required: true,
          options: consigneeOptions,
          onAddNew: () => setQuickConsigneeOpen(true),
          addNewLabel: "+ Add New Consignee / Receiver",
          addNewTitle: "Quickly create and register consignee / receiver",
        },
      ],
    },
    {
      id: "trip_schedule",
      title: "Route & Schedule",
      description: "Origin, destination, and dispatch date",
      columns: 2,
      fields: [
        {
          name: "origin_location_id",
          label: "Origin Location / City",
          type: "select",
          required: true,
          options: locationOptions,
          onAddNew: () => setQuickLocationTarget("origin"),
          addNewLabel: "+ Add New Origin Location",
          addNewTitle: "Quickly create origin city / hub",
        },
        {
          name: "destination_location_id",
          label: "Destination Location / City",
          type: "select",
          required: true,
          options: locationOptions,
          onAddNew: () => setQuickLocationTarget("destination"),
          addNewLabel: "+ Add New Destination Location",
          addNewTitle: "Quickly create destination city / hub",
        },
        {
          name: "job_date",
          label: "Scheduled Dispatch Date",
          type: "date",
          required: true,
        },
      ],
    },
    {
      id: "cargo_specs",
      title: "Cargo & Load Details",
      description: "Weight, package count, and consignment commodity",
      columns: 2,
      fields: [
        {
          name: "cargo_description",
          label: "Cargo Description",
          placeholder: "e.g. Industrial Steel Coils",
          colSpan: 2,
        },
        {
          name: "estimated_weight_mt",
          label: "Estimated Weight (MT)",
          placeholder: "e.g. 24.50",
          type: "number",
          required: true,
        },
        {
          name: "estimated_packages",
          label: "Total Packages",
          placeholder: "e.g. 150",
          type: "number",
          required: true,
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        consigner_id: parseInt(values.consigner_id, 10),
        consignee_id: parseInt(values.consignee_id, 10),
        origin_location_id: parseInt(values.origin_location_id, 10),
        destination_location_id: parseInt(values.destination_location_id, 10),
        estimated_weight_mt: parseFloat(values.estimated_weight_mt) || 0,
        estimated_packages: parseInt(values.estimated_packages, 10) || 0,
      };

      await apiClient("/api/v1/transport/jobs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create trip / job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trips & Job Orders"
        description="Operational dispatch movements: create freight bookings, monitor corridor routes, and transition into LR bookings."
        primaryAction={{
          label: "Create Trip Order",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {
            setFormInitialValues({ job_date: new Date().toISOString().split("T")[0] });
            setIsDrawerOpen(true);
          },
        }}
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
        searchPlaceholder="Search trip no, customer, route city..."
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
        searchable={false}
        emptyMessage="No trips found"
        emptySubtext="Create a new trip or transport job order to initiate dispatch and vehicle scheduling."
        emptyAction={{
          label: "+ Create Trip Order",
          onClick: () => {
            setFormInitialValues({ job_date: new Date().toISOString().split("T")[0] });
            setIsDrawerOpen(true);
          },
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Create Trip / Job Order"
        description="Specify contracting customer, dispatch route corridor, and cargo requirements."
        width="xl"
      >
        <Form
          sections={formSections}
          initialValues={formInitialValues}
          setFieldValueRef={formSetFieldValueRef}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Create Trip Order"
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
