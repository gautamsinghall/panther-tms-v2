"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, MapPin, Trash2, CheckCircle } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface LocationRecord {
  id: number;
  country: string;
  state: string;
  city_name: string;
  location_code?: string;
  is_pickup_point: boolean;
  is_drop_point: boolean;
  address?: string;
  pincode?: string;
  is_active: boolean;
}

export default function LocationPage() {
  const [data, setData] = useState<LocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<LocationRecord[]>("/api/v1/general/locations");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load locations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<LocationRecord>[] = [
    {
      key: "city_name",
      header: "City / Hub",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-500" />
          {row.city_name}
        </span>
      ),
    },
    {
      key: "state",
      header: "State",
      sortable: true,
    },
    {
      key: "country",
      header: "Country",
      sortable: true,
    },
    {
      key: "location_code",
      header: "Hub Code",
      cell: (row) => (
        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
          {row.location_code || "-"}
        </span>
      ),
    },
    {
      key: "pickup_drop",
      header: "Capabilities",
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs">
          {row.is_pickup_point && (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
              Pickup
            </span>
          )}
          {row.is_drop_point && (
            <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
              Drop
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (row.is_active ? "Active" : "Inactive"),
    },
  ];

  const actions: RowAction<LocationRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.city_name}?`)) return;
        try {
          await apiClient(`/api/v1/general/locations/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate location.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "location_info",
      title: "Location Details",
      description: "Hub and terminal definition",
      columns: 2,
      fields: [
        {
          name: "city_name",
          label: "City / Terminal Name",
          placeholder: "e.g. Mundra Port",
          required: true,
        },
        {
          name: "state",
          label: "State",
          placeholder: "e.g. Gujarat",
          required: true,
        },
        {
          name: "country",
          label: "Country",
          placeholder: "India",
          required: true,
        },
        {
          name: "location_code",
          label: "Location Code",
          placeholder: "e.g. MUN-01",
        },
        {
          name: "pincode",
          label: "Pincode",
          placeholder: "370421",
        },
        {
          name: "address",
          label: "Full Address / Landmark",
          type: "textarea",
          colSpan: 2,
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/locations", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          country: values.country || "India",
          is_pickup_point: true,
          is_drop_point: true,
        }),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create location.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Locations (Hubs & Terminals)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage origin and destination pickup/drop transit points.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Location
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
        searchPlaceholder="Search by city, state, or hub code..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create New Location
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
              submitLabel="Create Location"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
