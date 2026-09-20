"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Building2, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface ConsigneeRecord {
  id: number;
  name: string;
  code?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  city?: string;
  state?: string;
  is_active: boolean;
}

export default function ConsigneePage() {
  const [data, setData] = useState<ConsigneeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<ConsigneeRecord[]>("/api/v1/general/consignees");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load consignees.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<ConsigneeRecord>[] = [
    {
      key: "name",
      header: "Consignee Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.name}
        </span>
      ),
    },
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {row.code || "-"}
        </span>
      ),
    },
    {
      key: "contact_person",
      header: "Contact Person",
      sortable: true,
    },
    {
      key: "city",
      header: "City / State",
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.city || "-"}{row.state ? `, ${row.state}` : ""}
        </span>
      ),
    },
    {
      key: "gstin",
      header: "GSTIN",
      cell: (row) => (
        <span className="font-mono text-xs uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
          {row.gstin || "Unregistered"}
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

  const actions: RowAction<ConsigneeRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.name}?`)) return;
        try {
          await apiClient(`/api/v1/general/consignees/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate consignee.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "general_info",
      title: "Consignee Information",
      description: "Primary receiver details",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Consignee Name",
          placeholder: "e.g. Tata Motors Ltd",
          required: true,
        },
        {
          name: "code",
          label: "Consignee Code",
          placeholder: "e.g. TATA-PUN",
        },
        {
          name: "contact_person",
          label: "Contact Person",
          placeholder: "e.g. Ramesh Kumar",
        },
        {
          name: "phone",
          label: "Phone Number",
          placeholder: "+91 9876543210",
        },
        {
          name: "email",
          label: "Email Address",
          type: "email",
          placeholder: "contact@company.com",
        },
        {
          name: "gstin",
          label: "GSTIN",
          placeholder: "27AAACT2727Q1ZW",
        },
        {
          name: "city",
          label: "City",
          placeholder: "e.g. Pune",
        },
        {
          name: "state",
          label: "State",
          placeholder: "e.g. Maharashtra",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/consignees", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create consignee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Consignees
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage delivery receivers and destination delivery parties.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Consignee
        </Button>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        actions={actions}
        searchPlaceholder="Search by name, city, or GSTIN..."
      />

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create New Consignee
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
              submitLabel="Create Consignee"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
