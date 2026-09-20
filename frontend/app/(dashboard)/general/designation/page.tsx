"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface DesignationRecord {
  id: number;
  title: string;
  department?: string;
  description?: string;
  is_active: boolean;
}

export default function DesignationPage() {
  const [data, setData] = useState<DesignationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const res = await apiClient<DesignationRecord[]>("/api/v1/general/designations");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load designations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<DesignationRecord>[] = [
    {
      key: "title",
      header: "Designation Title",
      sortable: true,
      cell: (row) => <span className="font-semibold text-[#101828]">{row.title}</span>,
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      cell: (row) => <span className="text-xs text-[#344054]">{row.department || "-"}</span>,
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => <span className="text-xs text-[#667085]">{row.description || "-"}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
  ];

  const actions: RowAction<DesignationRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-[#F04438]" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.title}?`)) return;
        try {
          await apiClient(`/api/v1/general/designations/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate designation.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "designation_info",
      title: "Designation Details",
      description: "Employee role definition",
      columns: 2,
      fields: [
        {
          name: "title",
          label: "Designation Title",
          placeholder: "e.g. Branch Operations Manager",
          required: true,
          colSpan: 2,
        },
        {
          name: "department",
          label: "Department",
          placeholder: "e.g. Operations / Fleet",
        },
        {
          name: "description",
          label: "Role Scope",
          placeholder: "Key operational responsibilities",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/designations", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create designation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Designations"
        description="Manage company job positions and operational roles."
        breadcrumbs={[
          { label: "General", href: "/general/designation" },
          { label: "Designations" },
        ]}
        primaryAction={{
          label: "Add Designation",
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        searchPlaceholder="Search designations by title or department..."
        emptyMessage="No designations configured"
        emptySubtext="Create designation titles to assign to drivers, managers, and staff."
        emptyAction={{
          label: "Add Designation",
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Create New Designation"
        description="Add a staff role in the company hierarchy."
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Create Designation"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
