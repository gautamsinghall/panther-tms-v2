"use client";

import React, { useState, useEffect } from "react";
import { Plus, Receipt, Trash2 } from "lucide-react";
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<ChargeHeadRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient(`/api/v1/misc/charge-heads/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete charge head");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<ChargeHeadRecord>[] = [
    {
      key: "code",
      header: "Charge Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary-light text-primary">
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Charge Head Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-text-primary">
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
        <span className="text-xs text-text-secondary">
          {row.tax_category_name || "None"}
        </span>
      ),
    },
    {
      key: "default_rate",
      header: "Default Rate (₹)",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-xs tabular-nums text-text-primary">
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
      onClick: (row) => setDeleteTarget(row),
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
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save charge head.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Charge Heads"
        description="Standard billing charge heads used across transport and general invoices."
        breadcrumbs={[
          { label: "Masters", href: "/misc/primary-group" },
          { label: "Charge Heads" },
        ]}
        actions={
          <Button onClick={() => setIsDrawerOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Charge Head
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
          searchPlaceholder="Search charge heads..."
          searchColumn="name"
        />
      </div>

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="New Charge Head"
        description="Define billable line items for freight, handling, and supplementary charges."
        size="md"
      >
        <Form
          sections={formSections}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Create Charge Head"
        />
      </EntityDrawer>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete Charge Head "${deleteTarget?.name || ""}"`}
        description="Are you sure you want to delete this charge head? Any draft or future invoices referencing it will need updating."
        confirmText="Delete Charge Head"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
