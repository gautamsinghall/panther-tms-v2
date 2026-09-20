"use client";

import React, { useState, useEffect } from "react";
import { Plus, Percent, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface TaxCategoryRecord {
  id: number;
  name: string;
  code: string;
  igst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  is_rcm: boolean;
  is_active: boolean;
}

export default function TaxCategoryPage() {
  const [data, setData] = useState<TaxCategoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<TaxCategoryRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<TaxCategoryRecord[]>("/api/v1/misc/tax-categories");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load tax categories.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient(`/api/v1/misc/tax-categories/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete tax category");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<TaxCategoryRecord>[] = [
    {
      key: "code",
      header: "Tax Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary-light text-primary">
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Category Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-text-primary">
          {row.name}
        </span>
      ),
    },
    {
      key: "rates",
      header: "Rates (IGST / CGST / SGST)",
      cell: (row) => (
        <span className="font-mono text-xs tabular-nums text-text-primary">
          {Number(row.igst_rate).toFixed(1)}% (CGST: {Number(row.cgst_rate).toFixed(1)}%, SGST: {Number(row.sgst_rate).toFixed(1)}%)
        </span>
      ),
    },
    {
      key: "is_rcm",
      header: "Reverse Charge (RCM)",
      align: "center",
      cell: (row) => (
        <Badge variant={row.is_rcm ? "warning" : "neutral"}>
          {row.is_rcm ? "RCM Yes (GTA)" : "Normal"}
        </Badge>
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

  const actions: RowAction<TaxCategoryRecord>[] = [
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      title: "Tax Rate Configuration",
      description: "Define Goods and Services Tax (GST) slabs and Reverse Charge Mechanism flags.",
      fields: [
        {
          name: "name",
          label: "Category Name",
          type: "text",
          required: true,
          placeholder: "e.g. GST 12%, GST 5% GTA RCM",
        },
        {
          name: "code",
          label: "Code",
          type: "text",
          required: true,
          placeholder: "e.g. GST_12",
        },
        {
          name: "igst_rate",
          label: "IGST Rate (%)",
          type: "number",
          required: true,
          placeholder: "12.00",
        },
        {
          name: "cgst_rate",
          label: "CGST Rate (%)",
          type: "number",
          required: true,
          placeholder: "6.00",
        },
        {
          name: "sgst_rate",
          label: "SGST Rate (%)",
          type: "number",
          required: true,
          placeholder: "6.00",
        },
        {
          name: "is_rcm",
          label: "Reverse Charge Mechanism (GTA RCM)?",
          type: "checkbox",
        },
      ],
    },
  ];

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/misc/tax-categories", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          igst_rate: parseFloat(values.igst_rate || "0"),
          cgst_rate: parseFloat(values.cgst_rate || "0"),
          sgst_rate: parseFloat(values.sgst_rate || "0"),
          is_rcm: Boolean(values.is_rcm),
        }),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save tax category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Categories"
        description="Indian GST tax categories and RCM rules applied across invoices and purchases."
        breadcrumbs={[
          { label: "Masters", href: "/misc/primary-group" },
          { label: "Tax Categories" },
        ]}
        actions={
          <Button onClick={() => setIsDrawerOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Tax Category
          </Button>
        }
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-danger hover:opacity-80">×</button>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border shadow-xs p-4">
        <DataTable
          data={data}
          columns={columns}
          actions={actions}
          isLoading={isLoading}
          searchPlaceholder="Search tax categories..."
          searchColumn="name"
        />
      </div>

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="New Tax Category"
        description="Define Goods and Services Tax (GST) slabs and Reverse Charge Mechanism flags."
        size="md"
      >
        <Form
          sections={formSections}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Create Category"
        />
      </EntityDrawer>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete Tax Category "${deleteTarget?.name || ""}"`}
        description="Are you sure you want to delete this tax category? Invoices and purchases linked to it may be affected."
        confirmText="Delete Category"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
