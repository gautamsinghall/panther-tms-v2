"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Building2, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface VehicleOwnerRecord {
  id: number;
  name: string;
  phone: string;
  email?: string;
  pan?: string;
  city?: string;
  state?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  is_active: boolean;
}

export default function VehicleOwnersPage() {
  const [data, setData] = useState<VehicleOwnerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<VehicleOwnerRecord[]>("/api/v1/transport/vehicle-owners");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load vehicle owners.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<VehicleOwnerRecord>[] = [
    {
      key: "name",
      header: "Owner / Transporter Name",
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
      key: "pan",
      header: "PAN",
      cell: (row) => (
        <span className="font-mono text-xs uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
          {row.pan || "-"}
        </span>
      ),
    },
    {
      key: "bank",
      header: "Bank Account / IFSC",
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.bank_name ? `${row.bank_name} (${row.bank_ifsc || ""})` : "Not provided"}
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

  const actions: RowAction<VehicleOwnerRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.name}?`)) return;
        try {
          await apiClient(`/api/v1/transport/vehicle-owners/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate owner.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "owner_info",
      title: "Vehicle Owner Information",
      description: "Identity and contact details for market vehicle supplier",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Owner / Transporter Name",
          placeholder: "e.g. Royal Logistics & Fleet",
          required: true,
        },
        {
          name: "phone",
          label: "Phone Number",
          placeholder: "+91 9811122233",
          required: true,
        },
        {
          name: "email",
          label: "Email Address",
          type: "email",
          placeholder: "owner@transporter.com",
        },
        {
          name: "pan",
          label: "PAN Number",
          placeholder: "ABCDE1234F",
        },
        {
          name: "city",
          label: "City",
          placeholder: "e.g. Nagpur",
        },
        {
          name: "state",
          label: "State",
          placeholder: "e.g. Maharashtra",
        },
        {
          name: "bank_name",
          label: "Bank Name",
          placeholder: "e.g. State Bank of India",
        },
        {
          name: "bank_account_no",
          label: "Account Number",
          placeholder: "12345678901",
        },
        {
          name: "bank_ifsc",
          label: "Bank IFSC",
          placeholder: "SBIN0001234",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/transport/vehicle-owners", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create vehicle owner.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Vehicle Owners
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage commercial truck owners and market fleet contractors.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Vehicle Owner
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
        searchPlaceholder="Search by owner name, phone, or PAN..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Register New Vehicle Owner
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
              submitLabel="Save Owner"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
