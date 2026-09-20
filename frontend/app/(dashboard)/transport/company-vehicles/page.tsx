"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Trash2, Truck } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface CompanyVehicleRecord {
  id: number;
  vehicle_number: string;
  vehicle_type: string;
  capacity_mt: string | number;
  chassis_number?: string;
  engine_number?: string;
  current_odometer_km: number;
  default_driver_id?: number;
  insurance_expiry?: string;
  national_permit_expiry?: string;
  is_active: boolean;
}

interface DriverOption {
  id: number;
  name: string;
}

export default function CompanyVehiclesPage() {
  const [data, setData] = useState<CompanyVehicleRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [vehiclesRes, driversRes] = await Promise.all([
        apiClient<CompanyVehicleRecord[]>("/api/v1/transport/company-vehicles"),
        apiClient<DriverOption[]>("/api/v1/transport/drivers"),
      ]);
      setData(vehiclesRes);
      setDrivers(driversRes);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load company vehicles.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<CompanyVehicleRecord>[] = [
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
      header: "Body / Spec",
      sortable: true,
    },
    {
      key: "capacity_mt",
      header: "Capacity (MT)",
      isNumeric: true,
      cell: (row) => `${parseFloat(String(row.capacity_mt)).toFixed(2)} MT`,
    },
    {
      key: "chassis_engine",
      header: "Chassis / Engine",
      cell: (row) => (
        <span className="font-mono text-xs text-slate-500">
          {row.chassis_number || "-"} / {row.engine_number || "-"}
        </span>
      ),
    },
    {
      key: "current_odometer_km",
      header: "Odometer",
      isNumeric: true,
      cell: (row) => `${row.current_odometer_km.toLocaleString()} km`,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (row.is_active ? "Active" : "Inactive"),
    },
  ];

  const actions: RowAction<CompanyVehicleRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.vehicle_number}?`)) return;
        try {
          await apiClient(`/api/v1/transport/company-vehicles/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate vehicle.");
        }
      },
    },
  ];

  const driverOptions = [
    { label: "Unassigned", value: "" },
    ...drivers.map((d) => ({ label: d.name, value: String(d.id) })),
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "cv_info",
      title: "Company Fleet Specifications",
      description: "Company-owned asset specifications and driver allocation",
      columns: 2,
      fields: [
        {
          name: "vehicle_number",
          label: "Registration Number",
          placeholder: "e.g. MH12CD5678",
          required: true,
        },
        {
          name: "vehicle_type",
          label: "Vehicle Model / Type",
          placeholder: "e.g. BharatBenz 2823R, 20ft Container",
          required: true,
        },
        {
          name: "capacity_mt",
          label: "Capacity (MT)",
          type: "number",
          placeholder: "e.g. 18.5",
          required: true,
        },
        {
          name: "default_driver_id",
          label: "Primary Assigned Driver",
          type: "select",
          options: driverOptions,
        },
        {
          name: "chassis_number",
          label: "Chassis Number",
          placeholder: "e.g. MB1CD2EF3GH45678",
        },
        {
          name: "engine_number",
          label: "Engine Number",
          placeholder: "e.g. 4D34I123456",
        },
        {
          name: "current_odometer_km",
          label: "Current Odometer (km)",
          type: "number",
          placeholder: "0",
        },
        {
          name: "national_permit_expiry",
          label: "National Permit Expiry",
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
        default_driver_id: values.default_driver_id ? parseInt(values.default_driver_id, 10) : null,
        capacity_mt: values.capacity_mt ? parseFloat(values.capacity_mt) : 0,
        current_odometer_km: values.current_odometer_km ? parseInt(values.current_odometer_km, 10) : 0,
      };
      await apiClient("/api/v1/transport/company-vehicles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to register company vehicle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Company Vehicles
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage company-owned fleet assets, maintenance metrics, and driver assignments.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Company Vehicle
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
        searchPlaceholder="Search by vehicle number, model, or chassis..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add Company Asset Vehicle
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
              submitLabel="Save Vehicle"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
