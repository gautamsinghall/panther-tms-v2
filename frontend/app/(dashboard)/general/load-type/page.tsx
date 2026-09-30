"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Edit3, Layers, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface LoadTypeRecord {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function LoadTypePage() {
  const [data, setData] = useState<LoadTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LoadTypeRecord | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const res = await apiClient<LoadTypeRecord[]>("/api/v1/general/load-types");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load load types.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = data.length;
    const active = data.filter((d) => d.is_active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter === "ACTIVE" && !item.is_active) return false;
      if (statusFilter === "INACTIVE" && item.is_active) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(term);
        const matchesCode = (item.code || "").toLowerCase().includes(term);
        const matchesDesc = (item.description || "").toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesDesc) return false;
      }
      return true;
    });
  }, [data, searchTerm, statusFilter]);

  const columns: ColumnDef<LoadTypeRecord>[] = [
    {
      key: "name",
      header: "Load Type",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary shrink-0" />
          {row.name}
        </span>
      ),
    },
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-semibold">
          {row.code || "—"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => <span className="text-xs text-slate-500">{row.description || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
  ];

  const actions: RowAction<LoadTypeRecord>[] = [
    {
      label: "Edit Load Type",
      icon: <Edit3 className="w-3.5 h-3.5 text-slate-600" />,
      onClick: (row) => {
        setEditingRecord(row);
        setIsDrawerOpen(true);
      },
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
      variant: "danger",
      disabled: (row) => !row.is_active,
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate "${row.name}"?`)) return;
        try {
          await apiClient(`/api/v1/general/load-types/${row.id}`, { method: "DELETE" });
          loadData();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("panther_load_types_changed"));
          }
        } catch (err: any) {
          alert(err.message || "Failed to deactivate load type.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "load_type_info",
      title: "Load Type Specification",
      description: "Define consignment carriage capacity and transport category",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Load Type Name",
          placeholder: "e.g. Full Truck Load (FTL) / Part Load / Container",
          required: true,
          defaultValue: editingRecord?.name || "",
        },
        {
          name: "code",
          label: "Identifier Code",
          placeholder: "e.g. FTL / PTL / CONTAINER",
          defaultValue: editingRecord?.code || "",
        },
        {
          name: "description",
          label: "Description / Notes",
          placeholder: "Operational notes, capacity guidelines, or handling requirements",
          type: "textarea",
          colSpan: 2,
          defaultValue: editingRecord?.description || "",
        },
      ],
    },
  ];

  const handleSubmit = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      if (editingRecord) {
        await apiClient(`/api/v1/general/load-types/${editingRecord.id}`, {
          method: "PUT",
          body: JSON.stringify(values),
        });
      } else {
        await apiClient("/api/v1/general/load-types", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      setIsDrawerOpen(false);
      setEditingRecord(null);
      loadData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("panther_load_types_changed"));
        localStorage.setItem("panther_load_types_updated", Date.now().toString());
      }
    } catch (err: any) {
      alert(err.message || "Failed to save load type.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateDrawer = () => {
    setEditingRecord(null);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Load Types Master"
        description="Configure standard carriage load types (FTL, PTL, Container, ODC, Bulk) automatically available in LR bookings and transport contracts."
        primaryAction={{
          label: "New Load Type",
          icon: <Plus className="w-4 h-4" />,
          onClick: openCreateDrawer,
        }}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "General", href: "/general/billing-client" },
          { label: "Load Types" },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total Load Types"
          value={stats.total.toLocaleString()}
          subtext="Configured cargo carriage categories"
          icon={<Layers className="w-4 h-4 text-primary" />}
        />
        <KpiCard
          title="Active Categories"
          value={stats.active.toLocaleString()}
          subtext="Available in LR booking dropdown"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
        <KpiCard
          title="Inactive Categories"
          value={stats.inactive.toLocaleString()}
          subtext="Archived / deprecated types"
          icon={<AlertCircle className="w-4 h-4 text-slate-400" />}
        />
      </div>

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search load type name, code, description..."
        filters={[
          {
            id: "status",
            label: "Filter Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
            ],
          },
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
        }}
      />

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        searchable={false}
        emptyMessage="No Load Types found"
        emptySubtext="Add your first load type category (e.g. FTL, Part Load, Containerized) to populate LR booking options."
        emptyAction={{
          label: "+ New Load Type",
          onClick: openCreateDrawer,
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? `Edit Load Type: ${editingRecord.name}` : "Create New Load Type"}
        description="Configure cargo carriage category. Once created, it will automatically appear in the LR Load Type dropdown."
        width="md"
      >
        <Form
          sections={formSections}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingRecord(null);
          }}
          submitLabel={editingRecord ? "Save Changes" : "Create Load Type"}
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
