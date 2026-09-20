"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Scale } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface UnitRecord {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
}

export default function UnitPage() {
  const [data, setData] = useState<UnitRecord[]>([]);
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
      const res = await apiClient<UnitRecord[]>("/api/v1/general/units");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load units.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<UnitRecord>[] = [
    {
      key: "name",
      header: "Unit Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-[#101828] flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5 text-[#4F46E5]" />
          {row.name}
        </span>
      ),
    },
    {
      key: "code",
      header: "Symbol / Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs bg-[#F8F9FB] border border-[#E4E7EC] px-1.5 py-0.5 rounded-[4px] font-bold text-[#344054]">
          {row.code}
        </span>
      ),
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

  const actions: RowAction<UnitRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-[#F04438]" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.name}?`)) return;
        try {
          await apiClient(`/api/v1/general/units/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate unit.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "unit_info",
      title: "Unit of Measurement",
      description: "Standard weight and package unit",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Unit Name",
          placeholder: "e.g. Metric Ton",
          required: true,
        },
        {
          name: "code",
          label: "Symbol / Short Code",
          placeholder: "e.g. MT",
          required: true,
        },
        {
          name: "description",
          label: "Description",
          placeholder: "e.g. 1000 Kilograms Metric Weight",
          colSpan: 2,
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/units", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create unit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Units of Measurement"
        description="Configure standard weight, volume, and count units for freight rating."
        breadcrumbs={[
          { label: "General", href: "/general/unit" },
          { label: "Units" },
        ]}
        primaryAction={{
          label: "Add Unit",
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
        searchPlaceholder="Search units by name or symbol..."
        emptyMessage="No units defined"
        emptySubtext="Add measurement units like MT, KG, Bags, or Cases for freight billing."
        emptyAction={{
          label: "Add Unit",
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Create Measurement Unit"
        description="Add a cargo measurement unit symbol."
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Create Unit"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
