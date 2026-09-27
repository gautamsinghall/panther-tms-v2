"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Phone, Pencil, FileText, CheckCircle2 } from "lucide-react";
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
  dl_status?: string;
  vehicle_classes?: string;
  valid_from?: string;
  valid_upto?: string;
  aadhar_no?: string;
  pan_no?: string;
  license_doc?: string;
  aadhar_doc?: string;
  pan_doc?: string;
  license_number?: string;
  license_expiry?: string;
  emergency_contact?: string;
  blood_group?: string;
  is_active: boolean;
  created_at?: string;
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
  const [editingRecord, setEditingRecord] = useState<DriverRecord | null>(null);
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
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = item.name?.toLowerCase().includes(query);
        const matchesPhone = item.phone?.toLowerCase().includes(query);
        const matchesClasses = item.vehicle_classes?.toLowerCase().includes(query);
        const matchesStatus = item.dl_status?.toLowerCase().includes(query);
        const matchesAadhar = item.aadhar_no?.toLowerCase().includes(query);
        const matchesPan = item.pan_no?.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesClasses && !matchesStatus && !matchesAadhar && !matchesPan) {
          return false;
        }
      }
      return true;
    });
  }, [data, statusFilter, searchTerm]);

  const columns: ColumnDef<DriverRecord>[] = [
    {
      key: "name",
      header: "Driver Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 block">
          {row.name}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Driver Mobile",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs text-slate-700 inline-flex items-center gap-1.5">
          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
          {row.phone}
        </span>
      ),
    },
    {
      key: "dl_status",
      header: "DL Status & Coverage",
      cell: (row) => (
        <div>
          <span className="font-mono text-xs bg-slate-50 text-slate-800 px-2 py-0.5 rounded border border-slate-200 shadow-2xs inline-block">
            {row.dl_status || "Standard"}
          </span>
          {row.vehicle_classes && (
            <span className="block text-[11px] text-slate-500 mt-1 font-medium truncate max-w-[200px]" title={row.vehicle_classes}>
              {row.vehicle_classes}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "validity",
      header: "Validity",
      cell: (row) => {
        const upto = row.valid_upto || row.license_expiry;
        return (
          <div className="text-xs text-slate-600 space-y-0.5">
            {row.valid_from && (
              <div>
                <span className="text-slate-400">From:</span> {formatDate(row.valid_from)}
              </div>
            )}
            {upto && (
              <div className="font-semibold text-slate-800">
                <span className="text-slate-400 font-normal">Upto:</span> {formatDate(upto)}
              </div>
            )}
            {!row.valid_from && !upto && <span className="text-slate-400">—</span>}
          </div>
        );
      },
    },
    {
      key: "kyc",
      header: "Documents & KYC",
      cell: (row) => {
        const hasAadhar = Boolean(row.aadhar_no || row.aadhar_doc);
        const hasPan = Boolean(row.pan_no || row.pan_doc);
        const hasLicenseDoc = Boolean(row.license_doc);

        return (
          <div className="text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {row.aadhar_no && (
                <span className="font-mono text-[11px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                  UID: {row.aadhar_no}
                </span>
              )}
              {row.pan_no && (
                <span className="font-mono text-[11px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 uppercase">
                  PAN: {row.pan_no}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              {hasLicenseDoc && (
                <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> DL Doc
                </span>
              )}
              {hasAadhar && row.aadhar_doc && (
                <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aadhar Doc
                </span>
              )}
              {hasPan && row.pan_doc && (
                <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PAN Doc
                </span>
              )}
              {!hasAadhar && !hasPan && !hasLicenseDoc && (
                <span className="text-slate-400 text-xs">No KYC uploaded</span>
              )}
            </div>
          </div>
        );
      },
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
      label: "Edit",
      icon: <Pencil className="w-3.5 h-3.5" />,
      onClick: (row) => {
        setEditingRecord(row);
        setIsDrawerOpen(true);
      },
    },
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

  // Modified Form Sections per final field structure
  const formSections: FormSectionDef[] = [
    {
      id: "driver_details",
      title: "Driver Details",
      description: "Fleet driver identity, mobile contact, and licensing validity",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Driver Name",
          placeholder: "e.g. Rajesh Kumar Yadav",
          required: true,
        },
        {
          name: "phone",
          label: "Driver Mobile",
          placeholder: "+91 98765 43210",
          required: true,
        },
        {
          name: "dl_status",
          label: "DL Status",
          placeholder: "e.g. Active / Valid",
        },
        {
          name: "vehicle_classes",
          label: "Vehicle Classes (Coverage)",
          placeholder: "e.g. LMV, HMV, TRANS",
        },
        {
          name: "valid_from",
          label: "Valid From",
          type: "date",
        },
        {
          name: "valid_upto",
          label: "Valid Upto",
          type: "date",
        },
      ],
    },
    {
      id: "documents_kyc",
      title: "Documents & KYC",
      description: "Official identity verification numbers and document uploads",
      columns: 2,
      fields: [
        {
          name: "aadhar_no",
          label: "Aadhar No.",
          placeholder: "e.g. 1234 5678 9012",
        },
        {
          name: "pan_no",
          label: "PAN No.",
          placeholder: "e.g. ABCDE1234F",
        },
        {
          name: "license_doc",
          label: "Upload License",
          type: "file",
          accept: ".pdf,.jpg,.jpeg,.png",
          placeholder: "Select license copy...",
        },
        {
          name: "aadhar_doc",
          label: "Upload AADHAR",
          type: "file",
          accept: ".pdf,.jpg,.jpeg,.png",
          placeholder: "Select Aadhar copy...",
        },
        {
          name: "pan_doc",
          label: "Upload PAN",
          type: "file",
          accept: ".pdf,.jpg,.jpeg,.png",
          placeholder: "Select PAN card copy...",
          colSpan: 2,
        },
      ],
    },
  ];

  const initialFormValues = useMemo(() => {
    if (!editingRecord) {
      return {
        name: "",
        phone: "",
        dl_status: "",
        vehicle_classes: "",
        valid_from: "",
        valid_upto: "",
        aadhar_no: "",
        pan_no: "",
        license_doc: "",
        aadhar_doc: "",
        pan_doc: "",
      };
    }
    return {
      name: editingRecord.name || "",
      phone: editingRecord.phone || "",
      dl_status: editingRecord.dl_status || "",
      vehicle_classes: editingRecord.vehicle_classes || "",
      valid_from: editingRecord.valid_from ? editingRecord.valid_from.split("T")[0] : "",
      valid_upto: (editingRecord.valid_upto || editingRecord.license_expiry)
        ? (editingRecord.valid_upto || editingRecord.license_expiry)!.split("T")[0]
        : "",
      aadhar_no: editingRecord.aadhar_no || "",
      pan_no: editingRecord.pan_no || "",
      license_doc: editingRecord.license_doc || "",
      aadhar_doc: editingRecord.aadhar_doc || "",
      pan_doc: editingRecord.pan_doc || "",
    };
  }, [editingRecord]);

  const handleSave = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      if (editingRecord) {
        await apiClient(`/api/v1/transport/drivers/${editingRecord.id}`, {
          method: "PUT",
          body: JSON.stringify(values),
        });
      } else {
        await apiClient("/api/v1/transport/drivers", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      setIsDrawerOpen(false);
      setEditingRecord(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save driver record.");
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
          onClick: () => {
            setEditingRecord(null);
            setIsDrawerOpen(true);
          },
        }}
      />

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search driver name, phone, DL status, coverage..."
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
          onClick: () => {
            setEditingRecord(null);
            setIsDrawerOpen(true);
          },
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? `Edit Fleet Driver: ${editingRecord.name}` : "Register Fleet Driver"}
        description={
          editingRecord
            ? "Update driver information, mobile contact, licensing coverage, and KYC documents."
            : "Enter driver credentials, mobile number, and commercial license validity."
        }
        width="lg"
      >
        <Form
          key={editingRecord ? `edit-${editingRecord.id}` : "create"}
          sections={formSections}
          initialValues={initialFormValues}
          onSubmit={handleSave}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingRecord(null);
          }}
          submitLabel={editingRecord ? "Save Driver Changes" : "Register Driver"}
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
