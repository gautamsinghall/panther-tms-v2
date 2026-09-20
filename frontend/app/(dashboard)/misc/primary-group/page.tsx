"use client";

import React, { useState, useEffect } from "react";
import { Plus, Layers, Trash2 } from "lucide-react";
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

interface PrimaryGroupRecord {
  id: number;
  name: string;
  code: string;
  nature: string;
  description?: string;
  created_at: string;
}

export default function PrimaryGroupPage() {
  const [data, setData] = useState<PrimaryGroupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<PrimaryGroupRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<PrimaryGroupRecord[]>("/api/v1/misc/primary-groups");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load primary groups.");
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
      await apiClient(`/api/v1/misc/primary-groups/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete primary group");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<PrimaryGroupRecord>[] = [
    {
      key: "code",
      header: "Group Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary-light text-primary">
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Primary Group Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-text-primary">
          {row.name}
        </span>
      ),
    },
    {
      key: "nature",
      header: "Normal Balance",
      cell: (row) => (
        <Badge variant={row.nature === "DEBIT" ? "info" : "success"}>
          {row.nature}
        </Badge>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => (
        <span className="text-xs text-text-secondary">
          {row.description || "—"}
        </span>
      ),
    },
  ];

  const actions: RowAction<PrimaryGroupRecord>[] = [
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      title: "Primary Group Details",
      description: "Define fundamental head of accounts (Asset, Liability, Equity, Revenue, Expense).",
      fields: [
        {
          name: "name",
          label: "Primary Group Name",
          type: "text",
          required: true,
          placeholder: "e.g. Current Assets, Capital",
        },
        {
          name: "code",
          label: "Group Code",
          type: "text",
          required: true,
          placeholder: "e.g. ASSET_CURR",
        },
        {
          name: "nature",
          label: "Normal Balance Nature",
          type: "select",
          required: true,
          defaultValue: "DEBIT",
          options: [
            { label: "DEBIT (Assets, Expenses)", value: "DEBIT" },
            { label: "CREDIT (Liabilities, Equity, Income)", value: "CREDIT" },
          ],
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Optional notes on group categorization...",
        },
      ],
    },
  ];

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/misc/primary-groups", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save primary group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Primary Groups"
        description="Top-level accounting heads governing the balance sheet and P&L hierarchy."
        breadcrumbs={[
          { label: "Masters", href: "/misc/primary-group" },
          { label: "Primary Groups" },
        ]}
        actions={
          <Button onClick={() => setIsDrawerOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Primary Group
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
          searchPlaceholder="Search primary groups..."
          searchColumn="name"
        />
      </div>

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="New Primary Group"
        description="Define top-level balance sheet or P&L classification head"
        size="md"
      >
        <Form
          sections={formSections}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Create Group"
        />
      </EntityDrawer>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete Primary Group "${deleteTarget?.name || ""}"`}
        description="Are you sure you want to delete this primary group? Child ledger accounts associated with this group may be affected."
        confirmText="Delete Group"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
