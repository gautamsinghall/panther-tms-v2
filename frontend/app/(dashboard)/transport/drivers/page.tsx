"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Trash2, User } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface DriverRecord {
  id: number;
  name: string;
  phone: string;
  license_number: string;
  license_expiry?: string;
  emergency_contact?: string;
  blood_group?: string;
  is_active: boolean;
}

export default function DriversPage() {
  const [data, setData] = useState<DriverRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<DriverRecord[]>("/api/v1/transport/drivers");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load drivers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<DriverRecord>[] = [
    {
      key: "name",
      header: "Driver Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.name}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Phone Number",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {row.phone}
        </span>
      ),
    },
    {
      key: "license_number",
      header: "License Number",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
          {row.license_number}
        </span>
      ),
    },
    {
      key: "license_expiry",
      header: "License Expiry",
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.license_expiry || "Not specified"}
        </span>
      ),
    },
    {
      key: "blood_group",
      header: "Blood Group",
      cell: (row) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {row.blood_group || "-"}
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

  const actions: RowAction<DriverRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.name}?`)) return;
        try {
          await apiClient(`/api/v1/transport/drivers/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate driver.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "driver_info",
      title: "Driver Details",
      description: "Identity, commercial driving license, and emergency contact",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Full Name",
          placeholder: "e.g. Surinder Singh",
          required: true,
        },
        {
          name: "phone",
          label: "Phone Number",
          placeholder: "+91 9822233344",
          required: true,
        },
        {
          name: "license_number",
          label: "Commercial Driving License No",
          placeholder: "MH1420180012345",
          required: true,
        },
        {
          name: "license_expiry",
          label: "License Expiry Date",
          type: "date",
        },
        {
          name: "emergency_contact",
          label: "Emergency Contact",
          placeholder: "+91 9998887776",
        },
        {
          name: "blood_group",
          label: "Blood Group",
          placeholder: "e.g. B+",
        },
        {
          name: "current_address",
          label: "Permanent Address",
          type: "textarea",
          colSpan: 2,
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/transport/drivers", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create driver.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Manage Drivers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Commercial drivers directory, license tracking, and contact details.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Driver
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
        searchPlaceholder="Search by driver name, phone, or license..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Register New Driver
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
              submitLabel="Save Driver"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
