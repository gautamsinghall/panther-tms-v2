"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, ArrowRight, Briefcase } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";

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
  status: "OPEN" | "BOOKED" | "DISPATCHED" | "DELIVERED" | "CLOSED" | "CANCELLED";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [jobsRes, consignersRes, consigneesRes, locationsRes] = await Promise.all([
        apiClient<JobRecord[]>("/api/v1/transport/jobs"),
        apiClient<SelectOption[]>("/api/v1/general/consigners"),
        apiClient<SelectOption[]>("/api/v1/general/consignees"),
        apiClient<SelectOption[]>("/api/v1/general/locations"),
      ]);
      setData(jobsRes);
      setConsigners(consignersRes);
      setConsignees(consigneesRes);
      setLocations(locationsRes);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load jobs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="neutral">Open</Badge>;
      case "BOOKED":
        return <Badge variant="primary">Booked</Badge>;
      case "DISPATCHED":
        return <Badge variant="warning">Dispatched</Badge>;
      case "DELIVERED":
        return <Badge variant="secondary">Delivered</Badge>;
      case "CLOSED":
        return <Badge variant="success">Closed</Badge>;
      case "CANCELLED":
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const columns: ColumnDef<JobRecord>[] = [
    {
      key: "job_number",
      header: "Job Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {row.job_number}
          </span>
          <span className="block text-[11px] text-slate-400">
            {row.job_date}
          </span>
        </div>
      ),
    },
    {
      key: "consigner",
      header: "Consigner (Sender)",
      sortable: true,
      cell: (row) => row.consigner_name || "N/A",
    },
    {
      key: "consignee",
      header: "Consignee (Receiver)",
      sortable: true,
      cell: (row) => row.consignee_name || "N/A",
    },
    {
      key: "route",
      header: "Route",
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
          {row.origin_city || "Origin"} <ArrowRight className="w-3 h-3 text-slate-400" /> {row.destination_city || "Dest"}
        </span>
      ),
    },
    {
      key: "cargo",
      header: "Weight / Packages",
      isNumeric: true,
      cell: (row) => `${parseFloat(String(row.estimated_weight_mt)).toFixed(2)} MT (${row.estimated_packages} pkgs)`,
    },
    {
      key: "status",
      header: "Job Status",
      align: "center",
      cell: (row) => getStatusBadge(row.status),
    },
  ];

  const actions: RowAction<JobRecord>[] = [
    {
      label: "Book GR/LR",
      onClick: (row) => {
        router.push(`/transport/lr-booking?job_id=${row.id}`);
      },
    },
  ];

  const consignerOptions = consigners.map((c) => ({ label: c.name || `Consigner ${c.id}`, value: String(c.id) }));
  const consigneeOptions = consignees.map((c) => ({ label: c.name || `Consignee ${c.id}`, value: String(c.id) }));
  const locationOptions = locations.map((l) => ({ label: l.city_name || `Location ${l.id}`, value: String(l.id) }));

  const formSections: FormSectionDef[] = [
    {
      id: "job_core",
      title: "Job Order Information",
      description: "Customer assignment and freight transit details (PRD §7.3)",
      columns: 2,
      fields: [
        {
          name: "consigner_id",
          label: "Consigner (Sender) *",
          type: "select",
          required: true,
          options: consignerOptions,
        },
        {
          name: "consignee_id",
          label: "Consignee (Receiver) *",
          type: "select",
          required: true,
          options: consigneeOptions,
        },
        {
          name: "origin_location_id",
          label: "Origin Location",
          type: "select",
          options: locationOptions,
        },
        {
          name: "destination_location_id",
          label: "Destination Location",
          type: "select",
          options: locationOptions,
        },
        {
          name: "estimated_weight_mt",
          label: "Estimated Cargo Weight (MT)",
          type: "number",
          placeholder: "e.g. 15.5",
        },
        {
          name: "estimated_packages",
          label: "Package Count",
          type: "number",
          placeholder: "e.g. 35",
        },
        {
          name: "cargo_description",
          label: "Cargo Description",
          placeholder: "e.g. Auto Spare Parts / FMCG Pallets",
          colSpan: 2,
        },
        {
          name: "special_instructions",
          label: "Special Dispatch Instructions",
          type: "textarea",
          colSpan: 2,
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
        origin_location_id: values.origin_location_id ? parseInt(values.origin_location_id, 10) : null,
        destination_location_id: values.destination_location_id ? parseInt(values.destination_location_id, 10) : null,
        estimated_weight_mt: values.estimated_weight_mt ? parseFloat(values.estimated_weight_mt) : 0,
        estimated_packages: values.estimated_packages ? parseInt(values.estimated_packages, 10) : 0,
      };
      await apiClient("/api/v1/transport/jobs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Job Creation & Orders
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create transport job orders preceding GR/LR booking with real status lifecycle.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Job
        </Button>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
          {errorMessage}
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        actions={actions}
        searchPlaceholder="Search by job number, consigner, or consignee..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create New Transport Job Order
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Form
              sections={formSections}
              onSubmit={handleCreate}
              onCancel={() => setIsModalOpen(false)}
              submitLabel="Create Job"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
