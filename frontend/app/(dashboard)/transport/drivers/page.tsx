"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Phone } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Form } from "@/components/forms/form";
import { StatusBadge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface DriverRecord {
  id: number;
  name: string;
  phone: string;
  license_number: string;
  license_expiry?: string;
  emergency_contact?: string;
  blood_group?: string;
  is_active: boolean;
}

export default function DriversPage() {
  const [data, setData] = useState<DriverRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation dialog state
  const [deactivatingRecord, setDeactivatingRecord] = useState<DriverRecord | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const res = await apiClient<DriverRecord[]>("/api/v1/transport/drivers");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load drivers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter === "ACTIVE" && !item.is_active) return false;
      if (statusFilter === "INACTIVE" && item.is_active) return false;
      return true;
    });
  }, [data, statusFilter]);

  const columns: ColumnDef<DriverRecord>[] = [
    {
      key: "name",
      header: "Driver Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-[#172033] block">
          {row.name}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Mobile Contact",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs text-[#172033] inline-flex items-center gap-1">
          <Phone className="w-3 h-3 text-[#98A2B3]" />
          {row.phone}
        </span>
      ),
    },
    {
      key: "license_number",
      header: "Commercial License",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono text-xs uppercase bg-[#F2F4F7] text-[#172033] px-2 py-0.5 rounded border border-[#E4E7EC]">
            {row.license_number}
          </span>
          {row.license_expiry && (
            <span className="block text-[11px] text-[#667085] mt-1">
              Exp: {formatDate(row.license_expiry)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "emergency_contact",
      header: "Emergency / Blood Group",
      cell: (row) => (
        <div className="text-xs text-[#667085]">
          <div>Contact: {row.emergency_contact || "N/A"}</div>
          {row.blood_group && (
            <span className="font-mono text-[11px] font-semibold text-[#172033]">
              Blood: {row.blood_group}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (
        <StatusBadge
          status={row.is_active ? "Active" : "Inactive"}
          variant={row.is_active ? "active" : "inactive"}
        />
      ),
    },
  ];

  const actions: RowAction<DriverRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      hidden: (row) => !row.is_active,
      onClick: (row) => {
        setDeactivatingRecord(row);
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "driver_info",
      title: "Driver Identity & License",
      description: "Official transport driver qualifications and contacts",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Full Name",
          placeholder: "e.g. Rajesh Kumar Yadav",
          required: true,
        },
        {
          name: "phone",
          label: "Primary Mobile Number",
          placeholder: "+91 98765 43210",
          required: true,
        },
        {
          name: "license_number",
          label: "Commercial Driving License (DL)",
          placeholder: "e.g. DL-0420110012345",
          required: true,
        },
        {
          name: "license_expiry",
          label: "License Expiry Date",
          type: "date",
        },
        {
          name: "emergency_contact",
          label: "Emergency Phone / Relation",
          placeholder: "e.g. +91 98111 22334 (Brother)",
        },
        {
          name: "blood_group",
          label: "Blood Group",
          type: "select",
          options: [
            { label: "O Positive (O+)", value: "O+" },
            { label: "O Negative (O-)", value: "O-" },
            { label: "A Positive (A+)", value: "A+" },
            { label: "A Negative (A-)", value: "A-" },
            { label: "B Positive (B+)", value: "B+" },
            { label: "B Negative (B-)", value: "B-" },
            { label: "AB Positive (AB+)", value: "AB+" },
            { label: "AB Negative (AB-)", value: "AB-" },
          ],
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/transport/drivers", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create driver record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingRecord) return;
    setIsDeactivating(true);
    try {
      await apiClient(`/api/v1/transport/drivers/${deactivatingRecord.id}`, {
        method: "DELETE",
      });
      setDeactivatingRecord(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to deactivate driver.");
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Drivers"
        description="Manage commercial heavy vehicle drivers, licensing compliance, emergency contacts, and active statuses."
        primaryAction={{
          label: "Add Driver",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search driver name, phone, DL number..."
        filters={[
          {
            id: "status",
            label: "Filter Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Active Only", value: "ACTIVE" },
              { label: "Inactive Only", value: "INACTIVE" },
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
        emptyMessage="No drivers registered"
        emptySubtext="Add professional drivers to assign them to active transport movements."
        emptyAction={{
          label: "+ Add Driver",
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Register Fleet Driver"
        description="Enter driver credentials, mobile number, and commercial license validity."
        width="lg"
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Register Driver"
          isLoading={isSubmitting}
        />
      </EntityDrawer>

      <ConfirmDialog
        isOpen={!!deactivatingRecord}
        onClose={() => setDeactivatingRecord(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Driver"
        entityName={deactivatingRecord?.name}
        consequence="Deactivating this driver will remove them from available dispatch assignments on upcoming trips."
        confirmLabel="Deactivate Driver"
        isLoading={isDeactivating}
      />
    </div>
  );
}
