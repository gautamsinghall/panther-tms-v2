"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, ArrowRight, Truck, CheckCircle2, Send, Navigation, FileText, IndianRupee } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { Form } from "@/components/forms/form";
import { StatusBadge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

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

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [lrsRes, consignersRes, consigneesRes, locationsRes, jobsRes] = await Promise.all([
        apiClient<LRRecord[]>("/api/v1/transport/lrs"),
        apiClient<SelectOption[]>("/api/v1/general/consigners"),
        apiClient<SelectOption[]>("/api/v1/general/consignees"),
        apiClient<SelectOption[]>("/api/v1/general/locations"),
        apiClient<SelectOption[]>("/api/v1/transport/jobs"),
      ]);
      setData(Array.isArray(lrsRes) ? lrsRes : []);
      setConsigners(Array.isArray(consignersRes) ? consignersRes : []);
      setConsignees(Array.isArray(consigneesRes) ? consigneesRes : []);
      setLocations(Array.isArray(locationsRes) ? locationsRes : []);
      setJobs(Array.isArray(jobsRes) ? jobsRes : []);
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
          <span className="font-mono font-bold text-[#172033] block">
            {row.lr_number}
          </span>
          <span className="text-[11px] text-[#667085]">
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
          <span className="font-semibold text-[#172033] block text-xs">
            {row.consigner_name || "Direct Client"}
          </span>
          <span className="text-[11px] text-[#667085] flex items-center gap-1">
            <span className="text-[#98A2B3]">To:</span> {row.consignee_name || "Direct Receiver"}
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
          <span className="font-mono font-bold uppercase text-[#172033] block text-xs">
            {row.vehicle_number}
          </span>
          <span className="text-[11px] text-[#667085]">
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
          <span className="font-mono font-semibold text-[#172033] block text-xs">
            {formatCurrency(row.total_freight_amount)}
          </span>
          <span className="text-[11px] font-mono text-[#D97706]">
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

  const consignerOptions = consigners.map((c) => ({ label: c.name || `Customer ${c.id}`, value: String(c.id) }));
  const consigneeOptions = consignees.map((c) => ({ label: c.name || `Consignee ${c.id}`, value: String(c.id) }));
  const locationOptions = locations.map((l) => ({ label: l.city_name || `Location ${l.id}`, value: String(l.id) }));
  const jobOptions = [
    { label: "Direct Booking (No Job)", value: "" },
    ...jobs.map((j) => ({ label: `${j.job_number} (ID: ${j.id})`, value: String(j.id) })),
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "parties_sec",
      title: "Consignment & Linked Trip",
      description: "Originating contracting parties and optional Job linkage",
      columns: 2,
      fields: [
        {
          name: "job_id",
          label: "Linked Trip / Job Order",
          type: "select",
          options: jobOptions,
        },
        {
          name: "lr_date",
          label: "LR Booking Date",
          type: "date",
          required: true,
        },
        {
          name: "consigner_id",
          label: "Consigner (Sender / Customer)",
          type: "select",
          required: true,
          options: consignerOptions,
        },
        {
          name: "consignee_id",
          label: "Consignee (Receiver)",
          type: "select",
          required: true,
          options: consigneeOptions,
        },
        {
          name: "origin_location_id",
          label: "Origin Hub",
          type: "select",
          required: true,
          options: locationOptions,
        },
        {
          name: "destination_location_id",
          label: "Destination Hub",
          type: "select",
          required: true,
          options: locationOptions,
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
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lorry Receipts (GR / LR)"
        description="Official carrier consignment notes: track freight movement, dispatch states, destination arrivals, and POD verification."
        primaryAction={{
          label: "New LR Booking",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setIsDrawerOpen(true),
        }}
      />

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
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Create Lorry Receipt (GR / LR)"
        description="Record commercial consignment, assigned truck, freight charges, and dispatch parties."
        width="xl"
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Create Lorry Receipt"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
