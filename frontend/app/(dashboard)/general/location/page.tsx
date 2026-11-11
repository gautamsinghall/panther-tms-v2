"use client";
import { toast, confirmModal } from "@/lib/toast";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, MapPin, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY } from "@/lib/countries";
import { getStoredAuth } from "@/lib/auth";
import { isAdminRole, canAccessRoute } from "@/lib/permissions";

interface LocationRecord {
  id: number;
  country: string;
  state: string;
  city_name: string;
  location_code?: string;
  is_pickup_point: boolean;
  is_drop_point: boolean;
  pincode?: string;
  is_active: boolean;
  source?: "tenant" | "postal";
}

export default function LocationPage() {
  const [data, setData] = useState<LocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Drawer State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LocationRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async (query = searchTerm) => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams({ page: "1", page_size: "100" });
      if (query.trim().length >= 2) params.set("search", query.trim());
      const postalQuery = query.trim().length >= 2 ? `?q=${encodeURIComponent(query.trim())}` : "";
      const [res, postal] = await Promise.all([
        apiClient<{ items: LocationRecord[] }>(`/api/v1/general/locations?${params}`),
        apiClient<Array<LocationRecord>>(`/api/v1/general/locations/postal-search${postalQuery}`),
      ]);
      const items = [
        ...(res.items || []).map((item) => ({ ...item, source: "tenant" as const })),
        ...postal.map((item) => ({
          ...item,
          id: -Math.abs(item.id),
          source: "postal" as const,
          is_active: true,
          is_pickup_point: true,
          is_drop_point: true,
        })),
      ];
      setData(items);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load locations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleOfficeChange = () => {
      loadData(searchTerm);
    };
    window.addEventListener("panther_office_changed", handleOfficeChange);
    return () => window.removeEventListener("panther_office_changed", handleOfficeChange);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadData(searchTerm), searchTerm.trim() ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const filteredData = useMemo(
    () => data.filter((item) => {
      if (statusFilter === "ACTIVE" && !item.is_active) return false;
      if (statusFilter === "INACTIVE" && item.is_active) return false;
      return true;
    }),
    [data, statusFilter]
  );

  const columns: ColumnDef<LocationRecord>[] = [
    {
      key: "city_name",
      header: "City / Terminal Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          {row.city_name}
        </span>
      ),
    },
    {
      key: "state",
      header: "State / UT",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-slate-700 dark:text-slate-300">
          {row.state || "-"}
        </span>
      ),
    },
    {
      key: "country",
      header: "Country",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.country || "India"}
        </span>
      ),
    },
    {
      key: "pincode",
      header: "Pincode",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
          {row.pincode || "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (
        <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />
      ),
    },
  ];

  // Check if current user has permission to edit / deactivate / activate locations
  const canModify = useMemo(() => {
    if (typeof window === "undefined") return true;
    const auth = getStoredAuth();
    if (!auth?.user) return true;
    if (isAdminRole(auth.user.role)) return true;
    const roleName = (auth.user.role || auth.user.designation || "").toUpperCase();
    if (roleName.includes("VIEW") || roleName.includes("READ")) return false;
    return canAccessRoute("/general/location");
  }, []);

  const actions: RowAction<LocationRecord>[] = [
    {
      label: "Add to Locations",
      icon: <Plus className="w-3.5 h-3.5 text-indigo-600" />,
      hidden: (row) => row.source !== "postal" || !canModify,
      onClick: async (row) => {
        try {
          await apiClient("/api/v1/general/locations", {
            method: "POST",
            body: JSON.stringify({
              country: row.country,
              state: row.state,
              city_name: row.city_name,
              pincode: row.pincode,
              is_pickup_point: true,
              is_drop_point: true,
            }),
          });
          toast.success("Location added successfully.");
          loadData(searchTerm);
        } catch (err: any) {
          toast.error(err.message || "Failed to add location.");
        }
      },
    },
    {
      label: "Edit",
      icon: <Pencil className="w-3.5 h-3.5 text-slate-600" />,
      hidden: (row) => row.source === "postal" || !canModify,
      onClick: (row) => {
        setEditingRecord(row);
        setIsDrawerOpen(true);
      },
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-[#F04438]" />,
      variant: "danger",
      hidden: (row) => row.source === "postal" || !row.is_active || !canModify,
      onClick: async (row) => {
        const ok = await confirmModal({
          title: "Deactivate Record",
          description: "Are you sure you want to deactivate this record?",
          confirmText: "Deactivate",
          variant: "danger",
        });
        if (!ok) return;
        // Immediate status change with NO page refresh
        setData((prev) => prev.map((item) => (String(item.id) === String(row.id) ? { ...item, is_active: false } : item)));
        try {
          const res = await apiClient(`/api/v1/general/locations/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: false }),
          });
          toast.success("Deactivated successfully.");
          if (res && typeof res === "object") {
            setData((prev) => prev.map((item) => (String(item.id) === String(row.id) ? { ...item, ...res, is_active: false } : item)));
          }
        } catch (err: any) {
          // Revert optimistic update
          setData((prev) => prev.map((item) => (String(item.id) === String(row.id) ? { ...item, is_active: true } : item)));
          toast.error(err.message || "Failed to deactivate record.");
        }
      },
    },
    {
      label: "Activate",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      variant: "default",
      hidden: (row) => row.source === "postal" || !!row.is_active || !canModify,
      onClick: async (row) => {
        const ok = await confirmModal({
          title: "Activate Record",
          description: "Are you sure you want to activate this record?",
          confirmText: "Activate",
          variant: "primary",
        });
        if (!ok) return;
        // Immediate status change with NO page refresh
        setData((prev) => prev.map((item) => (String(item.id) === String(row.id) ? { ...item, is_active: true } : item)));
        try {
          const res = await apiClient(`/api/v1/general/locations/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: true }),
          });
          toast.success("Activated successfully.");
          if (res && typeof res === "object") {
            setData((prev) => prev.map((item) => (String(item.id) === String(row.id) ? { ...item, ...res, is_active: true } : item)));
          }
        } catch (err: any) {
          // Revert optimistic update
          setData((prev) => prev.map((item) => (String(item.id) === String(row.id) ? { ...item, is_active: false } : item)));
          toast.error(err.message || "Failed to activate record.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "location_info",
      title: "Location Details",
      description: "Hub and transit point definition",
      columns: 2,
      fields: [
        {
          name: "pincode",
          label: "Pincode",
          type: "text",
          placeholder: "370421",
        },
        {
          name: "city_name",
          label: "City / Terminal Name",
          placeholder: "e.g. Mundra Port",
          required: true,
        },
        {
          name: "state",
          label: "State / UT",
          type: "state",
          placeholder: "Select State / UT",
          required: true,
        },
        {
          name: "country",
          label: "Country",
          type: "country",
          defaultValue: DEFAULT_COUNTRY,
          required: true,
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/locations", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          country: values.country || "India",
          is_pickup_point: true,
          is_drop_point: true,
        }),
      });
      toast.success("Location created successfully.");
      setIsDrawerOpen(false);
      setEditingRecord(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create location.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (values: Record<string, any>) => {
    if (!editingRecord) return;
    setIsSubmitting(true);
    try {
      const updated = await apiClient<any>(`/api/v1/general/locations/${editingRecord.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...values,
          country: values.country || "India",
        }),
      });
      toast.success("Location updated successfully.");
      setData((prev) => prev.map((item) => (item.id === editingRecord.id ? { ...item, ...values, ...updated } : item)));
      setIsDrawerOpen(false);
      setEditingRecord(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update location.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations (Hubs & Terminals)"
        description="Manage origin and destination pickup/drop transit hubs."
        breadcrumbs={[
          { label: "General", href: "/general/location" },
          { label: "Locations" },
        ]}
        primaryAction={{
          label: "Add Location",
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => {
            setEditingRecord(null);
            setIsDrawerOpen(true);
          },
        }}
      />

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by city, state, pincode..."
        filters={[
          {
            id: "status",
            label: "All Statuses",
            value: statusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
            ],
            onChange: setStatusFilter,
          },
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
        }}
        hasActiveFilters={Boolean(searchTerm || statusFilter !== "ALL")}
      />

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={() => loadData(searchTerm)}
        actions={actions}
        emptyMessage="No locations found"
        emptySubtext="Search the postal directory or add a custom hub."
        emptyAction={{
          label: "Add Location",
          onClick: () => {
            setEditingRecord(null);
            setIsDrawerOpen(true);
          },
        }}
        searchable={false}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? "Edit Location" : "Create New Location"}
        description={editingRecord ? "Update hub or terminal transit details." : "Register a new hub or terminal in the master network."}
      >
        <Form
          key={editingRecord ? `edit-${editingRecord.id}` : "new"}
          sections={formSections}
          initialValues={editingRecord || undefined}
          onSubmit={editingRecord ? handleUpdate : handleCreate}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingRecord(null);
          }}
          submitLabel={editingRecord ? "Save Changes" : "Create Location"}
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
