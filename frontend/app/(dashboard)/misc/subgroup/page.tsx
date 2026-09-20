"use client";

import React, { useState, useEffect } from "react";
import { Plus, GitBranch, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface SubgroupRecord {
  id: number;
  group_id: number;
  group_name?: string;
  name: string;
  code: string;
  description?: string;
}

export default function SubgroupPage() {
  const [data, setData] = useState<SubgroupRecord[]>([]);
  const [groups, setGroups] = useState<{ label: string; value: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<SubgroupRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [subs, grps] = await Promise.all([
        apiClient<SubgroupRecord[]>("/api/v1/misc/subgroups"),
        apiClient<any[]>("/api/v1/misc/groups-in-primary"),
      ]);
      setData(subs);
      setGroups(grps.map((g) => ({ label: `${g.name} (${g.code})`, value: String(g.id) })));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load subgroups.");
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
      await apiClient(`/api/v1/misc/subgroups/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete subgroup");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<SubgroupRecord>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary-light text-primary">
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Subgroup Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-text-primary">
          {row.name}
        </span>
      ),
    },
    {
      key: "group",
      header: "Parent Group",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-medium text-text-secondary">
          {row.group_name || "—"}
        </span>
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

  const actions: RowAction<SubgroupRecord>[] = [
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      title: "Subgroup Details",
      description: "Specific sub-classification nested inside a Group.",
      fields: [
        {
          name: "group_id",
          label: "Parent Group",
          type: "select",
          required: true,
          options: groups,
        },
        {
          name: "name",
          label: "Subgroup Name",
          type: "text",
          required: true,
          placeholder: "e.g. North Zone Debtors, Branch Diesel Expense",
        },
        {
          name: "code",
          label: "Subgroup Code",
          type: "text",
          required: true,
          placeholder: "e.g. SUB_NORTH_DEBT",
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Optional notes on subgroup...",
        },
      ],
    },
  ];

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/misc/subgroups", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          group_id: parseInt(values.group_id, 10),
        }),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save subgroup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subgroups"
        description="Granular account divisions nested under groups in primary for analytical drilldown."
        breadcrumbs={[
          { label: "Masters", href: "/misc/primary-group" },
          { label: "Subgroups" },
        ]}
        actions={
          <Button onClick={() => setIsDrawerOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Subgroup
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
          searchPlaceholder="Search subgroups..."
          searchColumn="name"
        />
      </div>

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="New Subgroup"
        description="Define granular reporting subgroup mapped to parent group"
        size="md"
      >
        <Form
          sections={formSections}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Create Subgroup"
        />
      </EntityDrawer>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete Subgroup "${deleteTarget?.name || ""}"`}
        description="Are you sure you want to delete this subgroup? Ledger accounts assigned to this subgroup will lose their categorization."
        confirmText="Delete Subgroup"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
