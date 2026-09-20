"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Trash2, Truck } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface MarketVehicleRecord {
  id: number;
  vehicle_number: string;
  vehicle_type: string;
  capacity_mt: string | number;
  owner_id?: number;
  owner_name?: string;
  owner_phone?: string;
  fitness_expiry?: string;
  insurance_expiry?: string;
  is_active: boolean;
}

interface OwnerOption {
  id: number;
  name: string;
}

export default function MarketVehiclesPage() {
  const [data, setData] = useState<MarketVehicleRecord[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [vehiclesRes, ownersRes] = await Promise.all([
        apiClient<MarketVehicleRecord[]>("/api/v1/transport/market-vehicles"),
        apiClient<OwnerOption[]>("/api/v1/transport/vehicle-owners"),
      ]);
      setData(vehiclesRes);
      setOwners(ownersRes);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load market vehicles.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<MarketVehicleRecord>[] = [
    {
      key: "vehicle_number",
      header: "Vehicle Number",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 uppercase">
          {row.vehicle_number}
        </span>
      ),
    },
    {
      key: "vehicle_type",
      header: "Body Type",
      sortable: true,
    },
    {
      key: "capacity_mt",
      header: "Capacity (MT)",
      isNumeric: true,
      cell: (row) => `${parseFloat(String(row.capacity_mt)).toFixed(2)} MT`,
    },
    {
      key: "owner_name",
      header: "Owner / Transporter",
      cell: (row) => (
        <div>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {row.owner_name || "Direct / Unassigned"}
          </span>
          {row.owner_phone && (
            <span className="block text-[11px] font-mono text-slate-400">
              {row.owner_phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "fitness_expiry",
      header: "Fitness Expiry",
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.fitness_expiry || "Not recorded"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (row.is_active ? "Active" : "Inactive"),
    },
  ];

  const actions: RowAction<MarketVehicleRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.vehicle_number}?`)) return;
        try {
          await apiClient(`/api/v1/transport/market-vehicles/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate vehicle.");
        }
      },
    },
  ];

  const ownerOptions = [
    { label: "Unassigned / Direct Driver", value: "" },
    ...owners.map((o) => ({ label: o.name, value: String(o.id) })),
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "mv_info",
      title: "Hired Vehicle Details",
      description: "Market vehicle specifications and supplier linkage",
      columns: 2,
      fields: [
        {
          name: "vehicle_number",
          label: "Registration Number",
          placeholder: "e.g. MH14AB1234",
          required: true,
        },
        {
          name: "vehicle_type",
          label: "Vehicle Type",
          placeholder: "e.g. 32ft MXL, 20ft Container, Taurus",
          required: true,
        },
        {
          name: "capacity_mt",
          label: "Payload Capacity (MT)",
          type: "number",
          placeholder: "e.g. 21.5",
          required: true,
        },
        {
          name: "owner_id",
          label: "Vehicle Owner",
          type: "select",
          options: ownerOptions,
        },
        {
          name: "fitness_expiry",
          label: "Fitness Certificate Expiry",
          type: "date",
        },
        {
          name: "insurance_expiry",
          label: "Insurance Expiry Date",
          type: "date",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        owner_id: values.owner_id ? parseInt(values.owner_id, 10) : null,
        capacity_mt: values.capacity_mt ? parseFloat(values.capacity_mt) : 0,
      };
      await apiClient("/api/v1/transport/market-vehicles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to register market vehicle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Market Vehicles
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage hired trucks, market fleet suppliers, and vehicle compliance.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Market Vehicle
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
        searchPlaceholder="Search by vehicle number, type, or owner..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add Market / Hired Vehicle
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
              submitLabel="Register Vehicle"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
