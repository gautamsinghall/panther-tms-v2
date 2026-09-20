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

interface IndustryRecord {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
}

export default function IndustryPage() {
  const [data, setData] = useState<IndustryRecord[]>([]);
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
      const res = await apiClient<IndustryRecord[]>("/api/v1/general/industries");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load industries.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<IndustryRecord>[] = [
    {
      key: "name",
      header: "Industry Name",
      sortable: true,
      cell: (row) => <span className="font-semibold text-[#101828]">{row.name}</span>,
    },
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (row) => <span className="font-mono text-xs text-[#667085]">{row.code || "-"}</span>,
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

  const actions: RowAction<IndustryRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-[#F04438]" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.name}?`)) return;
        try {
          await apiClient(`/api/v1/general/industries/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate industry.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "industry_info",
      title: "Industry Classification",
      description: "Business domain and market vertical",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Industry Name",
          placeholder: "e.g. Automotive & Components",
          required: true,
          colSpan: 2,
        },
        {
          name: "code",
          label: "Industry Code",
          placeholder: "e.g. AUTO",
        },
        {
          name: "description",
          label: "Description",
          placeholder: "Freight segment description",
          colSpan: 2,
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/industries", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create industry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Industries"
        description="Categorize transport shippers and receivers by business sector."
        breadcrumbs={[
          { label: "General", href: "/general/industry" },
          { label: "Industries" },
        ]}
        primaryAction={{
          label: "Add Industry",
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
        searchPlaceholder="Search industries by name or code..."
        emptyMessage="No industries registered"
        emptySubtext="Add industry vertical classifications for billing and reporting."
        emptyAction={{
          label: "Add Industry",
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Create New Industry"
        description="Define a new client business vertical."
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Create Industry"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
