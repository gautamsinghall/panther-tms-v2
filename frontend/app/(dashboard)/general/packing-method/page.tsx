"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface MethodOfPackingRecord {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
}

export default function PackingMethodPage() {
  const [data, setData] = useState<MethodOfPackingRecord[]>([]);
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
      const res = await apiClient<MethodOfPackingRecord[]>("/api/v1/general/packing-methods");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load packing methods.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<MethodOfPackingRecord>[] = [
    {
      key: "name",
      header: "Packing Method",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-[#101828] flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-[#4F46E5]" />
          {row.name}
        </span>
      ),
    },
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs bg-[#F8F9FB] border border-[#E4E7EC] px-1.5 py-0.5 rounded-[4px] text-[#344054]">
          {row.code || "-"}
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

  const actions: RowAction<MethodOfPackingRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-[#F04438]" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.name}?`)) return;
        try {
          await apiClient(`/api/v1/general/packing-methods/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate packing method.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "packing_info",
      title: "Packing Specification",
      description: "Packaging type definition",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Packing Type",
          placeholder: "e.g. Wooden Pallet / Carton Box",
          required: true,
        },
        {
          name: "code",
          label: "Method Code",
          placeholder: "e.g. PLT / CTN",
        },
        {
          name: "description",
          label: "Description",
          placeholder: "Protection and handling instructions",
          colSpan: 2,
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/packing-methods", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create packing method.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Methods of Packing"
        description="Configure standard consignment packaging types for handling instructions."
        breadcrumbs={[
          { label: "General", href: "/general/packing-method" },
          { label: "Packing Methods" },
        ]}
        primaryAction={{
          label: "Add Packing Method",
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
        searchPlaceholder="Search packing methods..."
        emptyMessage="No packing methods configured"
        emptySubtext="Add packaging standards such as Pallets, Bags, Crates, or Drums."
        emptyAction={{
          label: "Add Packing Method",
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Create Packaging Method"
        description="Add a consignment packaging standard."
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Create Method"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
