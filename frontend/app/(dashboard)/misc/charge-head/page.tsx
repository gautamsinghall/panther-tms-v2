"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Receipt, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface ChargeHeadRecord {
  id: number;
  name: string;
  code: string;
  charge_type: string;
  default_rate: number;
  tax_category_id?: number;
  tax_category_name?: string;
  is_active: boolean;
}

export default function ChargeHeadPage() {
  const [data, setData] = useState<ChargeHeadRecord[]>([]);
  const [taxCategories, setTaxCategories] = useState<{ label: string; value: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [charges, taxes] = await Promise.all([
        apiClient<ChargeHeadRecord[]>("/api/v1/misc/charge-heads"),
        apiClient<any[]>("/api/v1/misc/tax-categories"),
      ]);
      setData(charges);
      setTaxCategories([
        { label: "None / Exempt", value: "" },
        ...taxes.map((t) => ({ label: `${t.name} (${t.code})`, value: String(t.id) })),
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load charge heads.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<ChargeHeadRecord>[] = [
    {
      key: "code",
      header: "Charge Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Charge Head Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.name}
        </span>
      ),
    },
    {
      key: "charge_type",
      header: "Type",
      align: "center",
      cell: (row) => (
        <Badge variant={row.charge_type === "ADDITION" ? "success" : "warning"}>
          {row.charge_type}
        </Badge>
      ),
    },
    {
      key: "tax_category",
      header: "Applicable Tax",
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.tax_category_name || "None"}
        </span>
      ),
    },
    {
      key: "default_rate",
      header: "Default Rate (₹)",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
          ₹{Number(row.default_rate).toFixed(2)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (
        <Badge variant={row.is_active ? "success" : "neutral"}>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const actions: RowAction<ChargeHeadRecord>[] = [
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Delete charge head "${row.name}"?`)) return;
        try {
          await apiClient(`/api/v1/misc/charge-heads/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to delete charge head");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      title: "Charge Head Details",
      description: "Define billable line items for freight, handling, and supplementary charges.",
      fields: [
        {
          name: "name",
          label: "Charge Head Name",
          type: "text",
          required: true,
          placeholder: "e.g. Loading Hamali, Detention Charges",
        },
        {
          name: "code",
          label: "Code",
          type: "text",
          required: true,
          placeholder: "e.g. HAMALI",
        },
        {
          name: "charge_type",
          label: "Charge Effect",
          type: "select",
          required: true,
          defaultValue: "ADDITION",
          options: [
            { label: "ADDITION (Increases Invoice Amount)", value: "ADDITION" },
            { label: "DEDUCTION (Discount, Shortage Deduction)", value: "DEDUCTION" },
          ],
        },
        {
          name: "tax_category_id",
          label: "GST Tax Category",
          type: "select",
          options: taxCategories,
        },
        {
          name: "default_rate",
          label: "Default Unit Rate (₹)",
          type: "number",
          placeholder: "0.00",
        },
      ],
    },
  ];

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/misc/charge-heads", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          default_rate: parseFloat(values.default_rate || "0"),
          tax_category_id: values.tax_category_id ? parseInt(values.tax_category_id, 10) : null,
        }),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save charge head.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Charge Heads
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Standard billing charge heads used across transport and general invoices.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Charge Head
        </Button>
      </div>

      {errorMessage && (
        <div className="p-3.5 text-sm bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300 rounded-lg">
          {errorMessage}
        </div>
      )}

      <DataTable
        data={data}
        columns={columns}
        actions={actions}
        isLoading={isLoading}
        searchable
        searchField="name"
        emptyMessage="No charge heads configured yet."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                New Charge Head
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <Form
                sections={formSections}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                submitLabel="Create Charge Head"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
