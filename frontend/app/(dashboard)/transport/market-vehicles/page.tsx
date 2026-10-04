"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Truck,
  Eye,
  Pencil,
  FileText,
  Check,
  X,
  Upload,
  Calendar,
  AlertCircle,
  Wrench,
  ShieldCheck,
  UserPlus,
  ExternalLink,
  Download,
  CheckCircle2,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import { formatDate, cn } from "@/lib/utils";
import { QuickCreateVehicleOwnerModal } from "@/components/modals/quick-create-modal";

export interface MarketVehicleRecord {
  id: number;
  vehicle_number: string;
  vehicle_type: string;
  capacity_mt: string | number;
  owner_id?: number;
  owner_name?: string;
  owner_phone?: string;
  fitness_expiry?: string;
  insurance_expiry?: string;
  is_active: boolean;

  // Step 1: Vehicle and Owner Details
  ownership_type?: string;

  // Step 2: Vehicle Specifications and Registration Details
  vehicle_description?: string;
  registration_date?: string;
  vehicle_class?: string;
  engine_number?: string;
  chassis_number?: string;
  financier?: string;
  gvw_kg?: number | string;
  unladen_weight_kg?: number | string;
  emission_norms?: string;
  color?: string;
  cylinders?: number | string;
  seating_capacity?: number | string;
  rc_status?: string;

  // Step 3: Validity Details
  tax_validity?: string;
  puc_expiry?: string;
  permit_validity?: string;

  // STEP 4: Equipment & Maintenance
  has_jack?: boolean;
  has_raad?: boolean;
  has_pana?: boolean;
  has_stepney?: boolean;
  has_tarpaulin_rassi?: boolean;

  last_service_km?: number | string;
  last_service_done_at?: string;
  last_service_status?: string;
  driver_at_last_service?: string;
  driver_phone_at_last_service?: string;
  tyre_numbers?: string;

  rc_original_status?: string;
  rc_copy_doc?: string;
  last_repair_bill_doc?: string;

  created_at?: string;
  updated_at?: string;
}

interface OwnerOption {
  id: number;
  name: string;
  phone?: string;
}

const VEHICLE_TYPE_OPTIONS = [
  { label: "32 Ft Multi-Axle Container", value: "32 FT MX CONTAINER" },
  { label: "32 Ft Single-Axle Container", value: "32 FT SXL CONTAINER" },
  { label: "20 Ft Open Body Truck", value: "20 FT OPEN" },
  { label: "24 Ft Open Body Truck", value: "24 FT OPEN" },
  { label: "19 Ft Taurus 16 Wheeler", value: "TAURUS 16W" },
  { label: "Trailer 40 Ft Flatbed", value: "40 FT FLATBED TRAILER" },
  { label: "Pickup / LCV 14 Ft", value: "14 FT LCV" },
  { label: "Open Body Heavy Truck", value: "OPEN BODY TRUCK" },
];

const VEHICLE_CLASS_OPTIONS = [
  { label: "HGMV - Heavy Goods Motor Vehicle", value: "HGMV" },
  { label: "MGV - Medium Goods Vehicle", value: "MGV" },
  { label: "LGV - Light Goods Vehicle", value: "LGV" },
  { label: "Trailer (Commercial Flatbed/Semi-Trailer)", value: "TRAILER" },
  { label: "Articulated Commercial Vehicle", value: "ARTICULATED" },
  { label: "Special Purpose Cargo Vehicle", value: "SPECIAL_PURPOSE" },
];

const EMISSION_OPTIONS = [
  { label: "Bharat Stage VI (BS-VI)", value: "BS-VI" },
  { label: "Bharat Stage IV (BS-IV)", value: "BS-IV" },
  { label: "Bharat Stage III (BS-III)", value: "BS-III" },
  { label: "Euro 6", value: "Euro 6" },
  { label: "EV / Electric Commercial", value: "EV" },
];

const RC_STATUS_OPTIONS = [
  { label: "UNVERIFIED - Verification Pending", value: "UNVERIFIED" },
  { label: "ACTIVE - Valid Registration", value: "ACTIVE" },
  { label: "SUSPENDED - Temporarily Suspended", value: "SUSPENDED" },
  { label: "CANCELLED - Cancelled / Scrap", value: "CANCELLED" },
  { label: "EXPIRED - Renewal Due", value: "EXPIRED" },
  { label: "PENDING_RENEWAL - Renewal In-Process", value: "PENDING_RENEWAL" },
];

const SERVICE_STATUS_OPTIONS = [
  { label: "Not Inspected / Verification Pending", value: "Pending" },
  { label: "Completed - Roadworthy", value: "Completed" },
  { label: "Scheduled Maintenance Due", value: "Scheduled" },
  { label: "Overdue Service", value: "Due" },
  { label: "Major Overhaul Completed", value: "Major Overhaul" },
  { label: "Satisfactory / Inspection OK", value: "Satisfactory" },
];

const RC_ORIGINAL_OPTIONS = [
  { label: "Not Confirmed / Pending Verification", value: "Pending" },
  { label: "With Active Driver in Cabin", value: "With Driver" },
  { label: "At Head Office Central Vault", value: "Head Office Vault" },
  { label: "At Regional Branch Office", value: "Regional Branch" },
  { label: "Under RTO Transfer / Endorsement", value: "Under RTO Transfer" },
  { label: "With Vehicle Financier", value: "With Financier" },
];

export default function MarketVehiclesPage() {
  const router = useRouter();
  const [data, setData] = useState<MarketVehicleRecord[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add / Edit Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MarketVehicleRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Details View Drawer State
  const [detailsRecord, setDetailsRecord] = useState<MarketVehicleRecord | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Quick Create Modal State
  const [quickOwnerOpen, setQuickOwnerOpen] = useState(false);

  // Form State
  const [formValues, setFormValues] = useState<Record<string, any>>({
    ownership_type: "Market Vehicle",
    vehicle_number: "",
    owner_id: "",
    vehicle_description: "",
    registration_date: "",
    vehicle_class: "HGMV",
    vehicle_type: "32 FT MX CONTAINER",
    engine_number: "",
    chassis_number: "",
    financier: "",
    gvw_kg: "",
    unladen_weight_kg: "",
    capacity_mt: "",
    emission_norms: "BS-VI",
    color: "",
    cylinders: "",
    seating_capacity: "2",
    rc_status: "ACTIVE",
    fitness_expiry: "",
    insurance_expiry: "",
    tax_validity: "",
    puc_expiry: "",
    permit_validity: "",
    has_jack: false,
    has_raad: false,
    has_pana: false,
    has_stepney: false,
    has_tarpaulin_rassi: false,
    last_service_km: "",
    last_service_done_at: "",
    last_service_status: "Completed",
    driver_at_last_service: "",
    driver_phone_at_last_service: "",
    tyre_numbers: "",
    rc_original_status: "With Driver",
    rc_copy_doc: "",
    last_repair_bill_doc: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [vehiclesRes, ownersRes] = await Promise.all([
        apiClient<MarketVehicleRecord[]>("/api/v1/transport/market-vehicles"),
        apiClient<OwnerOption[]>("/api/v1/transport/vehicle-owners"),
      ]);
      setData(Array.isArray(vehiclesRes) ? vehiclesRes : []);
      setOwners(Array.isArray(ownersRes) ? ownersRes : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load market vehicles.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Determine if currently selected vehicle type represents an Open Body
  const isOpenBody = useMemo(() => {
    const vType = String(formValues.vehicle_type || "").toUpperCase();
    const vClass = String(formValues.vehicle_class || "").toUpperCase();
    return (
      vType.includes("OPEN") ||
      vType.includes("FLATBED") ||
      vType.includes("TAURUS") ||
      vClass.includes("OPEN") ||
      vClass.includes("FLATBED")
    );
  }, [formValues.vehicle_type, formValues.vehicle_class]);

  // Handle owner created from QuickCreate modal
  const handleOwnerCreated = (newOwner: { id: number; name: string }) => {
    setOwners((prev) => [{ id: newOwner.id, name: newOwner.name }, ...prev]);
    setFormValues((prev) => ({ ...prev, owner_id: String(newOwner.id) }));
  };

  const ownerOptions = [
    { label: "None / Direct Driver", value: "" },
    ...owners.map((o) => ({
      label: o.phone ? `${o.name} (${o.phone})` : o.name,
      value: String(o.id),
    })),
  ];

  // Auto-calculate Payload Capacity (MT) if GVW and Unladen are populated
  const handleWeightChange = (field: "gvw_kg" | "unladen_weight_kg", val: string) => {
    setFormValues((prev) => {
      const updated = { ...prev, [field]: val };
      const gvw = parseFloat(String(field === "gvw_kg" ? val : prev.gvw_kg));
      const unladen = parseFloat(String(field === "unladen_weight_kg" ? val : prev.unladen_weight_kg));
      if (!isNaN(gvw) && !isNaN(unladen) && gvw > unladen) {
        const payloadMt = ((gvw - unladen) / 1000).toFixed(2);
        updated.capacity_mt = payloadMt;
      }
      return updated;
    });
  };

  // Handle file uploads with size and type restrictions
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "rc_copy_doc" | "last_repair_bill_doc"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10 MB maximum upload limit
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert("File size exceeds 10 MB limit. Please select a smaller document.");
      e.target.value = "";
      return;
    }

    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
    ];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp)$/i)) {
      alert("Only PDF and Image files (JPG, PNG, WEBP) are supported.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormValues((prev) => ({ ...prev, [field]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Open existing attached document in new window
  const openAttachedDocument = (dataUrl?: string, title?: string) => {
    if (!dataUrl) return;
    const win = window.open();
    if (win) {
      win.document.write(
        `<html><head><title>${title || "Attached Document"}</title></head><body style="margin:0; background:#0f172a; display:flex; align-items:center; justify-content:center; height:100vh;">
          ${dataUrl.startsWith("data:application/pdf")
          ? `<iframe src="${dataUrl}" frameborder="0" style="border:0; width:100%; height:100vh;" allowfullscreen></iframe>`
          : `<img src="${dataUrl}" style="max-width:90%; max-height:90vh; border-radius:8px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);" />`
        }
        </body></html>`
      );
    }
  };

  // Open Add Vehicle Drawer
  const handleOpenAddDrawer = () => {
    setEditingRecord(null);
    setFormErrors({});
    setFormValues({
      ownership_type: "Market Vehicle",
      vehicle_number: "",
      owner_id: "",
      vehicle_description: "",
      registration_date: "",
      vehicle_class: "HGMV",
      vehicle_type: "32 FT MX CONTAINER",
      engine_number: "",
      chassis_number: "",
      financier: "",
      gvw_kg: "",
      unladen_weight_kg: "",
      capacity_mt: "",
      emission_norms: "BS-VI",
      color: "",
      cylinders: "",
      seating_capacity: "2",
      rc_status: "UNVERIFIED",
      fitness_expiry: "",
      insurance_expiry: "",
      tax_validity: "",
      puc_expiry: "",
      permit_validity: "",
      has_jack: false,
      has_raad: false,
      has_pana: false,
      has_stepney: false,
      has_tarpaulin_rassi: false,
      last_service_km: "",
      last_service_done_at: "",
      last_service_status: "Pending",
      driver_at_last_service: "",
      driver_phone_at_last_service: "",
      tyre_numbers: "",
      rc_original_status: "Pending",
      rc_copy_doc: "",
      last_repair_bill_doc: "",
    });
    setIsDrawerOpen(true);
  };

  // Open Edit Vehicle Drawer
  const handleOpenEditDrawer = (record: MarketVehicleRecord) => {
    setEditingRecord(record);
    setFormErrors({});
    setFormValues({
      ownership_type: record.ownership_type || "Market Vehicle",
      vehicle_number: record.vehicle_number || "",
      owner_id: record.owner_id ? String(record.owner_id) : "",
      vehicle_description: record.vehicle_description || "",
      registration_date: record.registration_date ? record.registration_date.slice(0, 10) : "",
      vehicle_class: record.vehicle_class || "HGMV",
      vehicle_type: record.vehicle_type || "32 FT MX CONTAINER",
      engine_number: record.engine_number || "",
      chassis_number: record.chassis_number || "",
      financier: record.financier || "",
      gvw_kg: record.gvw_kg ? String(record.gvw_kg) : "",
      unladen_weight_kg: record.unladen_weight_kg ? String(record.unladen_weight_kg) : "",
      capacity_mt: record.capacity_mt ? String(record.capacity_mt) : "",
      emission_norms: record.emission_norms || "BS-VI",
      color: record.color || "",
      cylinders: record.cylinders ? String(record.cylinders) : "",
      seating_capacity: record.seating_capacity ? String(record.seating_capacity) : "2",
      rc_status: record.rc_status || "ACTIVE",
      fitness_expiry: record.fitness_expiry ? record.fitness_expiry.slice(0, 10) : "",
      insurance_expiry: record.insurance_expiry ? record.insurance_expiry.slice(0, 10) : "",
      tax_validity: record.tax_validity ? record.tax_validity.slice(0, 10) : "",
      puc_expiry: record.puc_expiry ? record.puc_expiry.slice(0, 10) : "",
      permit_validity: record.permit_validity ? record.permit_validity.slice(0, 10) : "",
      has_jack: Boolean(record.has_jack),
      has_raad: Boolean(record.has_raad),
      has_pana: Boolean(record.has_pana),
      has_stepney: Boolean(record.has_stepney),
      has_tarpaulin_rassi: Boolean(record.has_tarpaulin_rassi),
      last_service_km: record.last_service_km ? String(record.last_service_km) : "",
      last_service_done_at: record.last_service_done_at || "",
      last_service_status: record.last_service_status || "Completed",
      driver_at_last_service: record.driver_at_last_service || "",
      driver_phone_at_last_service: record.driver_phone_at_last_service || "",
      tyre_numbers: record.tyre_numbers || "",
      rc_original_status: record.rc_original_status || "With Driver",
      rc_copy_doc: record.rc_copy_doc || "",
      last_repair_bill_doc: record.last_repair_bill_doc || "",
    });
    setIsDrawerOpen(true);
  };

  // Form Validation Logic
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formValues.vehicle_number || formValues.vehicle_number.trim().length < 4) {
      errors.vehicle_number = "Vehicle registration number is required (min 4 characters).";
    }

    if (!formValues.vehicle_type) {
      errors.vehicle_type = "Vehicle / Body specification is required.";
    }
    if (!formValues.capacity_mt || parseFloat(String(formValues.capacity_mt)) <= 0) {
      errors.capacity_mt = "Valid payload capacity (MT) is required (> 0).";
    }
    if (formValues.gvw_kg && formValues.unladen_weight_kg) {
      const gvw = parseFloat(String(formValues.gvw_kg));
      const unladen = parseFloat(String(formValues.unladen_weight_kg));
      if (gvw < unladen) {
        errors.gvw_kg = "GVW must be greater than or equal to unladen weight.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler for Add / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      alert("Please complete required vehicle fields (Registration Number, Body Spec, and Capacity).");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        vehicle_number: String(formValues.vehicle_number).trim().toUpperCase(),
        vehicle_type: formValues.vehicle_type,
        capacity_mt: parseFloat(String(formValues.capacity_mt)) || 0,
        owner_id: formValues.owner_id ? parseInt(String(formValues.owner_id), 10) : null,
        ownership_type: formValues.ownership_type || "Market Vehicle",
        vehicle_description: formValues.vehicle_description || null,
        registration_date: formValues.registration_date || null,
        vehicle_class: formValues.vehicle_class || null,
        engine_number: formValues.engine_number || null,
        chassis_number: formValues.chassis_number || null,
        financier: formValues.financier || null,
        gvw_kg: formValues.gvw_kg ? parseFloat(String(formValues.gvw_kg)) : null,
        unladen_weight_kg: formValues.unladen_weight_kg ? parseFloat(String(formValues.unladen_weight_kg)) : null,
        emission_norms: formValues.emission_norms || null,
        color: formValues.color || null,
        cylinders: formValues.cylinders ? parseInt(String(formValues.cylinders), 10) : null,
        seating_capacity: formValues.seating_capacity ? parseInt(String(formValues.seating_capacity), 10) : null,
        rc_status: formValues.rc_status || "ACTIVE",
        fitness_expiry: formValues.fitness_expiry || null,
        insurance_expiry: formValues.insurance_expiry || null,
        tax_validity: formValues.tax_validity || null,
        puc_expiry: formValues.puc_expiry || null,
        permit_validity: formValues.permit_validity || null,
        has_jack: Boolean(formValues.has_jack),
        has_raad: Boolean(formValues.has_raad),
        has_pana: Boolean(formValues.has_pana),
        has_stepney: Boolean(formValues.has_stepney),
        has_tarpaulin_rassi: isOpenBody ? Boolean(formValues.has_tarpaulin_rassi) : false,
        last_service_km: formValues.last_service_km ? parseInt(String(formValues.last_service_km), 10) : null,
        last_service_done_at: formValues.last_service_done_at || null,
        last_service_status: formValues.last_service_status || null,
        driver_at_last_service: formValues.driver_at_last_service || null,
        driver_phone_at_last_service: formValues.driver_phone_at_last_service || null,
        tyre_numbers: formValues.tyre_numbers || null,
        rc_original_status: formValues.rc_original_status || null,
        rc_copy_doc: formValues.rc_copy_doc || null,
        last_repair_bill_doc: formValues.last_repair_bill_doc || null,
      };

      if (editingRecord) {
        await apiClient(`/api/v1/transport/market-vehicles/${editingRecord.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient("/api/v1/transport/market-vehicles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save market vehicle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Table Columns
  const columns: ColumnDef<MarketVehicleRecord>[] = [
    {
      key: "vehicle_number",
      header: "Vehicle Number",
      sortable: true,
      cell: (row) => (
        <div className="space-y-1">
          <VehiclePlate
            vehicleNumber={row.vehicle_number}
            source={row.ownership_type === "Company Vehicle" ? "COMPANY" : "MARKET"}
          />
          <div className="flex items-center gap-1.5 text-[11px] text-[#667085]">
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                row.ownership_type === "Company Vehicle"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-purple-50 text-purple-700 border border-purple-200"
              )}
            >
              {row.ownership_type || "Market Vehicle"}
            </span>
            {row.rc_status && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium",
                  row.rc_status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                )}
              >
                RC: {row.rc_status}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "vehicle_type",
      header: "Type & Capacity",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="text-xs text-[#101828] font-semibold block">
            {row.vehicle_type}
          </span>
          <div className="text-[11px] text-[#667085] flex items-center gap-1 mt-0.5">
            <span className="font-semibold text-slate-900">
              {parseFloat(String(row.capacity_mt || 0)).toFixed(2)} MT Payload
            </span>
            {row.vehicle_class && (
              <span>• {row.vehicle_class}</span>
            )}
          </div>
          {row.vehicle_description && (
            <span className="text-[10px] text-slate-500 block truncate max-w-[200px]">
              {row.vehicle_description}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner / Supplier",
      cell: (row) => (
        <div>
          <span className="text-xs text-[#101828] font-semibold block">
            {row.owner_name || "Direct Driver / Market"}
          </span>
          {row.owner_phone ? (
            <span className="text-[11px] text-[#667085] font-mono">
              {row.owner_phone}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 italic">No contact phone</span>
          )}
        </div>
      ),
    },
    {
      key: "documents",
      header: "Document Validity",
      cell: (row) => (
        <div className="text-[11px] text-[#667085] space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 w-16">Fitness:</span>
            <span className={cn(row.fitness_expiry ? "font-medium text-slate-800" : "text-slate-400")}>
              {formatDate(row.fitness_expiry)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 w-16">Insurance:</span>
            <span className={cn(row.insurance_expiry ? "font-medium text-slate-800" : "text-slate-400")}>
              {formatDate(row.insurance_expiry)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 w-16">PUCC / Tax:</span>
            <span className="font-medium text-slate-800">
              {formatDate(row.puc_expiry)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "equipment",
      header: "Equip & Service",
      cell: (row) => {
        const equippedCount = [
          row.has_jack,
          row.has_raad,
          row.has_pana,
          row.has_stepney,
        ].filter(Boolean).length;

        return (
          <div className="text-[11px] space-y-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
                equippedCount >= 4
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              )}
            >
              <Wrench className="w-2.5 h-2.5" />
              {equippedCount}/4 Tools Ready
            </span>
            {row.last_service_km ? (
              <span className="block text-slate-500 text-[10.5px]">
                Last Svc: <strong className="text-slate-700">{row.last_service_km} km</strong>
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
  ];

  // Table Row Actions
  const actions: RowAction<MarketVehicleRecord>[] = [
    {
      label: "View Details",
      icon: <Eye className="w-3.5 h-3.5 text-indigo-600" />,
      onClick: (row) => {
        setDetailsRecord(row);
        setIsDetailsOpen(true);
      },
    },
    {
      label: "Edit Vehicle",
      icon: <Pencil className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (row) => {
        handleOpenEditDrawer(row);
      },
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-[#F04438]" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.vehicle_number}?`)) return;
        try {
          await apiClient(`/api/v1/transport/market-vehicles/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate vehicle.");
        }
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Vehicles"
        description="Comprehensive registry of hired market trucks, technical specifications, compliance validity, and maintenance equipment."
        breadcrumbs={[
          { label: "Transport", href: "/transport/jobs" },
          { label: "Market Vehicles" },
        ]}
        primaryAction={{
          label: "Add Vehicle",
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: handleOpenAddDrawer,
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
        searchPlaceholder="Search by registration plate, type, maker, or owner..."
        emptyMessage="No market vehicles registered"
        emptySubtext="Add vendor/market vehicles available for trip placement, hire challans, and fleet dispatch."
        emptyAction={{
          label: "Add Vehicle",
          onClick: handleOpenAddDrawer,
        }}
      />

      {/* ========================================================================= */}
      {/* UNIFIED ADD / EDIT VEHICLE DRAWER                                         */}
      {/* ========================================================================= */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingRecord ? `Edit Vehicle: ${editingRecord.vehicle_number}` : "Add Vehicle"}
        description="Register technical specs, ownership, regulatory validities, and maintenance equipment."
        size="xl"
      >
        <form onSubmit={handleSubmit} className="w-full max-w-5xl space-y-6 mx-auto pb-12">
          {/* ===================================================================== */}
          {/* 1. VEHICLE AND OWNER DETAILS                                          */}
          {/* ===================================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-2xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                1. Vehicle and Owner Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Classify fleet ownership, vehicle plate number, and assign registered vehicle owner/supplier.
              </p>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Company / Market Vehicle Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Company / Market Vehicle <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formValues.ownership_type}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, ownership_type: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs cursor-pointer"
                  >
                    <option value="Market Vehicle">Market Vehicle (External Vendor / Hired)</option>
                    <option value="Company Vehicle">Company Vehicle (Owned Asset)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Identifies whether vehicle is third-party market hired or internal company asset.
                  </p>
                </div>

                {/* Vehicle Registration Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Vehicle Registration Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formValues.vehicle_number}
                    placeholder="e.g. MH-04-AZ-5678"
                    onChange={(e) => {
                      setFormValues((prev) => ({
                        ...prev,
                        vehicle_number: e.target.value.toUpperCase(),
                      }));
                      if (formErrors.vehicle_number) {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.vehicle_number;
                          return n;
                        });
                      }
                    }}
                    className={cn(
                      "w-full h-10 px-3.5 text-xs sm:text-sm font-mono font-semibold rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 uppercase tracking-widest shadow-2xs",
                      formErrors.vehicle_number ? "border-rose-400" : "border-slate-200"
                    )}
                  />
                  {formErrors.vehicle_number && (
                    <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {formErrors.vehicle_number}
                    </p>
                  )}
                </div>

                {/* Owner Name Searchable Dropdown with "Add Owner" Button beside it */}
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Owner Name / Supplier
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Searchable dropdown linked to registered Vehicle Owners
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <SearchableSelect
                        id="form-owner-id"
                        name="owner_id"
                        value={formValues.owner_id}
                        options={ownerOptions}
                        placeholder="Select or search owner / supplier..."
                        onChange={(val) =>
                          setFormValues((prev) => ({ ...prev, owner_id: val }))
                        }
                      />
                    </div>

                    {/* "+ Quick Add Owner" Popup Trigger Beside Dropdown */}
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={() => setQuickOwnerOpen(true)}
                      className="h-10 px-3.5 rounded-xl border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs shrink-0 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      title="Quick register new vehicle owner in popup dialog without leaving this form"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                      <span>+ Quick Add Owner</span>
                    </Button>
                  </div>

                  {formValues.owner_id && (
                    <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-1 px-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>
                        Linked Owner:{" "}
                        <strong>
                          {owners.find((o) => String(o.id) === String(formValues.owner_id))?.name || "Selected"}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          {/* ===================================================================== */}
          {/* 2. VEHICLE SPECIFICATIONS AND REGISTRATION DETAILS                    */}
          {/* ===================================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-2xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                2. Vehicle Specifications and Registration Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Technical chassis specifications, body type, certified weights, and RTO registration parameters.
              </p>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Vehicle Description / Maker */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Vehicle Description / Maker
                  </label>
                  <input
                    type="text"
                    value={formValues.vehicle_description}
                    placeholder="e.g. Tata Signa 4825.TK / BharatBenz 2823R"
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, vehicle_description: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                </div>

                {/* Registration Date */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Registration Date
                  </label>
                  <input
                    type="date"
                    value={formValues.registration_date}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, registration_date: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                </div>

                {/* Vehicle Class (Type) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Vehicle Class (Type)
                  </label>
                  <select
                    value={formValues.vehicle_class}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, vehicle_class: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs cursor-pointer"
                  >
                    {VEHICLE_CLASS_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Body Specification / Vehicle Type */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Body Specification <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formValues.vehicle_type}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, vehicle_type: e.target.value }))
                    }
                    className={cn(
                      "w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs cursor-pointer",
                      formErrors.vehicle_type ? "border-rose-400" : "border-slate-200"
                    )}
                  >
                    {VEHICLE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {isOpenBody && (
                    <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                      <Info className="w-3 h-3" />
                      Open Body configuration detected (Tarpaulin/Rassi required below under Equipment)
                    </span>
                  )}
                </div>

                {/* Engine No. */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Engine No.
                  </label>
                  <input
                    type="text"
                    value={formValues.engine_number}
                    placeholder="e.g. ENG98765432"
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, engine_number: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-mono rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                </div>

                {/* Chassis No. */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Chassis No.
                  </label>
                  <input
                    type="text"
                    value={formValues.chassis_number}
                    placeholder="e.g. MAT4825ENG123456"
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, chassis_number: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-mono rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                </div>

                {/* Financier */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Financier
                  </label>
                  <input
                    type="text"
                    value={formValues.financier}
                    placeholder="e.g. HDFC Bank Ltd / Cholamandalam"
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, financier: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                </div>

                {/* Gross Vehicle Weight (GVW) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    GVW (Gross Vehicle Weight)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={formValues.gvw_kg}
                      placeholder="e.g. 28000"
                      onChange={(e) => handleWeightChange("gvw_kg", e.target.value)}
                      className={cn(
                        "w-full h-10 pl-3.5 pr-12 text-xs sm:text-sm font-medium rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs",
                        formErrors.gvw_kg ? "border-rose-400" : "border-slate-200"
                      )}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                      kg
                    </span>
                  </div>
                  {formErrors.gvw_kg && (
                    <p className="text-xs text-rose-600 font-medium">{formErrors.gvw_kg}</p>
                  )}
                </div>

                {/* Unladen Weight */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Unladen Weight (Tare)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={formValues.unladen_weight_kg}
                      placeholder="e.g. 11500"
                      onChange={(e) => handleWeightChange("unladen_weight_kg", e.target.value)}
                      className="w-full h-10 pl-3.5 pr-12 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                      kg
                    </span>
                  </div>
                </div>

                {/* Payload Capacity (MT) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Payload Capacity (MT) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={formValues.capacity_mt}
                      placeholder="e.g. 16.5"
                      onChange={(e) => {
                        setFormValues((prev) => ({ ...prev, capacity_mt: e.target.value }));
                        if (formErrors.capacity_mt) {
                          setFormErrors((prev) => {
                            const n = { ...prev };
                            delete n.capacity_mt;
                            return n;
                          });
                        }
                      }}
                      className={cn(
                        "w-full h-10 pl-3.5 pr-12 text-xs sm:text-sm font-semibold rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs",
                        formErrors.capacity_mt ? "border-rose-400" : "border-slate-200"
                      )}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-indigo-600 pointer-events-none">
                      MT
                    </span>
                  </div>
                  {formErrors.capacity_mt && (
                    <p className="text-xs text-rose-600 font-medium">{formErrors.capacity_mt}</p>
                  )}
                </div>

                {/* Emission Norms */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Emission Norms
                  </label>
                  <select
                    value={formValues.emission_norms}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, emission_norms: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs cursor-pointer"
                  >
                    {EMISSION_OPTIONS.map((e) => (
                      <option key={e.value} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Color
                  </label>
                  <input
                    type="text"
                    value={formValues.color}
                    placeholder="e.g. Signal White / Royal Blue"
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                </div>

                {/* Cylinders */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Cylinders
                  </label>
                  <input
                    type="number"
                    value={formValues.cylinders}
                    placeholder="e.g. 6"
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, cylinders: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                </div>

                {/* Seating Capacity */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    value={formValues.seating_capacity}
                    placeholder="e.g. 2"
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, seating_capacity: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                </div>

                {/* RC Status */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    RC Status
                  </label>
                  <select
                    value={formValues.rc_status}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, rc_status: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs cursor-pointer"
                  >
                    {RC_STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

          {/* ===================================================================== */}
          {/* 3. VALIDITY DETAILS                                                   */}
          {/* ===================================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-2xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                3. Validity Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Regulatory compliance and certification expiry dates for operations and road transit.
              </p>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Fitness Valid Till */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Fitness Valid Till
                  </label>
                  <input
                    type="date"
                    value={formValues.fitness_expiry}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, fitness_expiry: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-400">RTO vehicle fitness certificate renewal date</p>
                </div>

                {/* Insurance Valid Till */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Insurance Valid Till
                  </label>
                  <input
                    type="date"
                    value={formValues.insurance_expiry}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, insurance_expiry: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-400">Comprehensive or third-party policy term</p>
                </div>

                {/* Tax Validity */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Tax Validity
                  </label>
                  <input
                    type="date"
                    value={formValues.tax_validity}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, tax_validity: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-400">Motor vehicle commercial road tax validity</p>
                </div>

                {/* PUCC (Pollution) Validity */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    PUCC (Pollution) Validity
                  </label>
                  <input
                    type="date"
                    value={formValues.puc_expiry}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, puc_expiry: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-400">Pollution Under Control Certificate expiry</p>
                </div>

                {/* Permit Validity */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Permit Validity
                  </label>
                  <input
                    type="date"
                    value={formValues.permit_validity}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, permit_validity: e.target.value }))
                    }
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-400">National / State goods carrier permit expiry</p>
                </div>
              </div>
            </div>

          {/* ===================================================================== */}
          {/* 4. EQUIPMENT & MAINTENANCE                                            */}
          {/* ===================================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-2xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-indigo-600" />
                4. Equipment & Maintenance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Driver cabin toolkit checklist, service odometer benchmarks, and compliance document copies.
              </p>
            </div>

            {/* Equipment Availability (Yes / No Controls) */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2.5">
                <h4 className="text-sm font-bold text-slate-900">Equipment Availability</h4>
                <p className="text-xs text-slate-500">
                  Verify availability of standard onboard safety tools and transit securement equipment.
                </p>
              </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Jack */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Jack</span>
                      <span className="text-[10.5px] text-slate-500">Hydraulic lifter</span>
                    </div>
                    <div className="inline-flex rounded-lg p-0.5 bg-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setFormValues((p) => ({ ...p, has_jack: true }))}
                        className={cn(
                          "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                          formValues.has_jack
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {formValues.has_jack && <Check className="w-3 h-3" />}
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormValues((p) => ({ ...p, has_jack: false }))}
                        className={cn(
                          "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                          !formValues.has_jack
                            ? "bg-slate-700 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {!formValues.has_jack && <X className="w-3 h-3" />}
                        No
                      </button>
                    </div>
                  </div>

                  {/* Raad */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Raad</span>
                      <span className="text-[10.5px] text-slate-500">Leverage bar</span>
                    </div>
                    <div className="inline-flex rounded-lg p-0.5 bg-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setFormValues((p) => ({ ...p, has_raad: true }))}
                        className={cn(
                          "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                          formValues.has_raad
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {formValues.has_raad && <Check className="w-3 h-3" />}
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormValues((p) => ({ ...p, has_raad: false }))}
                        className={cn(
                          "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                          !formValues.has_raad
                            ? "bg-slate-700 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {!formValues.has_raad && <X className="w-3 h-3" />}
                        No
                      </button>
                    </div>
                  </div>

                  {/* Pana */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Pana</span>
                      <span className="text-[10.5px] text-slate-500">Wheel wrench</span>
                    </div>
                    <div className="inline-flex rounded-lg p-0.5 bg-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setFormValues((p) => ({ ...p, has_pana: true }))}
                        className={cn(
                          "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                          formValues.has_pana
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {formValues.has_pana && <Check className="w-3 h-3" />}
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormValues((p) => ({ ...p, has_pana: false }))}
                        className={cn(
                          "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                          !formValues.has_pana
                            ? "bg-slate-700 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {!formValues.has_pana && <X className="w-3 h-3" />}
                        No
                      </button>
                    </div>
                  </div>

                  {/* Stepney */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Stepney</span>
                      <span className="text-[10.5px] text-slate-500">Spare wheel</span>
                    </div>
                    <div className="inline-flex rounded-lg p-0.5 bg-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setFormValues((p) => ({ ...p, has_stepney: true }))}
                        className={cn(
                          "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                          formValues.has_stepney
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {formValues.has_stepney && <Check className="w-3 h-3" />}
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormValues((p) => ({ ...p, has_stepney: false }))}
                        className={cn(
                          "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                          !formValues.has_stepney
                            ? "bg-slate-700 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {!formValues.has_stepney && <X className="w-3 h-3" />}
                        No
                      </button>
                    </div>
                  </div>

                  {/* Tarpaulin / Rassi — Display ONLY when Open Body */}
                  {isOpenBody && (
                    <div className="flex items-center justify-between p-3.5 rounded-xl border-2 border-amber-300 bg-amber-50/60 sm:col-span-2 lg:col-span-4 animate-in fade-in">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">Tarpaulin / Rassi</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                            Required for Open Body
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-600 block mt-0.5">
                          Waterproof canvas tarp covering and heavy securement tie-down ropes.
                        </span>
                      </div>
                      <div className="inline-flex rounded-lg p-0.5 bg-slate-200/80 shrink-0">
                        <button
                          type="button"
                          onClick={() => setFormValues((p) => ({ ...p, has_tarpaulin_rassi: true }))}
                          className={cn(
                            "px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                            formValues.has_tarpaulin_rassi
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          {formValues.has_tarpaulin_rassi && <Check className="w-3 h-3" />}
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormValues((p) => ({ ...p, has_tarpaulin_rassi: false }))}
                          className={cn(
                            "px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                            !formValues.has_tarpaulin_rassi
                              ? "bg-slate-700 text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          {!formValues.has_tarpaulin_rassi && <X className="w-3 h-3" />}
                          No
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Service and Maintenance Details */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h4 className="text-sm font-bold text-slate-900">Service and Maintenance Details</h4>
                  <p className="text-xs text-slate-500">
                    Odometer reading at recent service, authorized garage location, and driver at service.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Last Service KM */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Last Service KM
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formValues.last_service_km}
                        placeholder="e.g. 84500"
                        onChange={(e) =>
                          setFormValues((prev) => ({ ...prev, last_service_km: e.target.value }))
                        }
                        className="w-full h-10 pl-3.5 pr-12 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                        km
                      </span>
                    </div>
                  </div>

                  {/* Last Service Done At */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Last Service Done At
                    </label>
                    <input
                      type="text"
                      value={formValues.last_service_done_at}
                      placeholder="e.g. Tata Authorized Workshop, Vashi"
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, last_service_done_at: e.target.value }))
                      }
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                    />
                  </div>

                  {/* Last Service Status */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Last Service Status
                    </label>
                    <select
                      value={formValues.last_service_status}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, last_service_status: e.target.value }))
                      }
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs cursor-pointer"
                    >
                      {SERVICE_STATUS_OPTIONS.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Driver at Last Service */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Driver at Last Service
                    </label>
                    <input
                      type="text"
                      value={formValues.driver_at_last_service}
                      placeholder="e.g. Ramesh Kumar"
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, driver_at_last_service: e.target.value }))
                      }
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                    />
                  </div>

                  {/* Driver No. */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Driver No.
                    </label>
                    <input
                      type="text"
                      value={formValues.driver_phone_at_last_service}
                      placeholder="e.g. 9876543210"
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, driver_phone_at_last_service: e.target.value }))
                      }
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                    />
                  </div>

                  {/* Tyre No. */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tyre No.
                    </label>
                    <input
                      type="text"
                      value={formValues.tyre_numbers}
                      placeholder="e.g. 10 Tyres - Apollo Radial 10.00R20"
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, tyre_numbers: e.target.value }))
                      }
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="pt-4 border-t border-slate-100 space-y-5">
                <div className="border-b border-slate-100 pb-2.5">
                  <h4 className="text-sm font-bold text-slate-900">Documents</h4>
                  <p className="text-xs text-slate-500">
                    Physical location of original RC book and scan uploads of RC & repair bills (PDF, JPG, PNG up to 10MB).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* RC Original - Status / Location */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      RC Original — Status / Location
                    </label>
                    <select
                      value={formValues.rc_original_status}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, rc_original_status: e.target.value }))
                      }
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs cursor-pointer"
                    >
                      {RC_ORIGINAL_OPTIONS.map((rc) => (
                        <option key={rc.value} value={rc.value}>
                          {rc.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400">Current custody of physical original RC</p>
                  </div>

                  {/* Attach RC Copy */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Attach RC Copy
                    </label>
                    <div className="relative">
                      <input
                        id="rc_copy_file_input"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => handleFileUpload(e, "rc_copy_doc")}
                        className="sr-only peer"
                      />
                      <label
                        htmlFor="rc_copy_file_input"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            document.getElementById("rc_copy_file_input")?.click();
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between w-full h-10 px-3.5 text-xs font-medium rounded-xl border bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/20 peer-focus-visible:border-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-600 transition-all cursor-pointer shadow-2xs group",
                          formValues.rc_copy_doc ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200"
                        )}
                      >
                        <span className="truncate max-w-[160px] text-slate-600">
                          {formValues.rc_copy_doc ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              RC Copy Attached
                            </span>
                          ) : (
                            "Select RC copy..."
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 group-hover:bg-slate-200 text-slate-700 text-xs font-semibold shrink-0">
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>Browse</span>
                        </span>
                      </label>
                    </div>

                    {formValues.rc_copy_doc && (
                      <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                        <button
                          type="button"
                          onClick={() => openAttachedDocument(formValues.rc_copy_doc, "RC Copy")}
                          className="text-indigo-600 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Preview Document
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormValues((prev) => ({ ...prev, rc_copy_doc: "" }))}
                          className="text-rose-500 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Attach Last Repairing Bill */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Attach Last Repairing Bill
                    </label>
                    <div className="relative">
                      <input
                        id="repair_bill_file_input"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => handleFileUpload(e, "last_repair_bill_doc")}
                        className="sr-only peer"
                      />
                      <label
                        htmlFor="repair_bill_file_input"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            document.getElementById("repair_bill_file_input")?.click();
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between w-full h-10 px-3.5 text-xs font-medium rounded-xl border bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/20 peer-focus-visible:border-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-600 transition-all cursor-pointer shadow-2xs group",
                          formValues.last_repair_bill_doc ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200"
                        )}
                      >
                        <span className="truncate max-w-[160px] text-slate-600">
                          {formValues.last_repair_bill_doc ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              Repair Bill Attached
                            </span>
                          ) : (
                            "Select repair bill..."
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 group-hover:bg-slate-200 text-slate-700 text-xs font-semibold shrink-0">
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>Browse</span>
                        </span>
                      </label>
                    </div>

                    {formValues.last_repair_bill_doc && (
                      <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                        <button
                          type="button"
                          onClick={() => openAttachedDocument(formValues.last_repair_bill_doc, "Repairing Bill")}
                          className="text-indigo-600 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Preview Document
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormValues((prev) => ({ ...prev, last_repair_bill_doc: "" }))}
                          className="text-rose-500 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
            </div>
          </div>

          {/* Form Footer Action Bar - Positioned cleanly at the end of the form */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs mt-8">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">{editingRecord ? "Editing Market Vehicle" : "Active Market Vehicle Draft"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsDrawerOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl h-10 px-5 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="rounded-xl h-10 px-6 text-xs font-semibold shadow-xs cursor-pointer"
              >
                {editingRecord ? "Save Vehicle Changes" : "Register Market Vehicle"}
              </Button>
            </div>
          </div>
        </form>
      </EntityDrawer>

      {/* ========================================================================= */}
      {/* VEHICLE DETAILS DRAWER                                                    */}
      {/* ========================================================================= */}
      <EntityDrawer
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={detailsRecord ? `Vehicle Details: ${detailsRecord.vehicle_number}` : "Vehicle Details"}
        description="Comprehensive specifications, owner info, validity compliance, and maintenance equipment status."
        size="lg"
      >
        {detailsRecord && (
          <div className="w-full max-w-4xl space-y-6 mx-auto pb-12">
            {/* Header Plate & Badge Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
              <div className="space-y-1.5">
                <VehiclePlate
                  vehicleNumber={detailsRecord.vehicle_number}
                  source={detailsRecord.ownership_type === "Company Vehicle" ? "COMPANY" : "MARKET"}
                />
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-semibold text-slate-800">
                    {detailsRecord.vehicle_description || detailsRecord.vehicle_type}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500">
                    {detailsRecord.ownership_type || "Market Vehicle"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={detailsRecord.is_active ? "ACTIVE" : "INACTIVE"} />
                {detailsRecord.rc_status && (
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-bold",
                      detailsRecord.rc_status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    )}
                  >
                    RC: {detailsRecord.rc_status}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsDetailsOpen(false);
                    handleOpenEditDrawer(detailsRecord);
                  }}
                  className="rounded-xl h-8 px-3 text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50 flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Button>
              </div>
            </div>

            {/* Step 1 & 2: Overview & Technical Specs Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Specifications & Registration
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Owner / Supplier:</span>
                  <strong className="text-slate-900 block truncate">
                    {detailsRecord.owner_name || "Direct Driver"}
                  </strong>
                  {detailsRecord.owner_phone && (
                    <span className="text-slate-500 text-[11px] font-mono">{detailsRecord.owner_phone}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Vehicle Class:</span>
                  <strong className="text-slate-900">{detailsRecord.vehicle_class || "HGMV"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Body Type:</span>
                  <strong className="text-slate-900">{detailsRecord.vehicle_type}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Payload Capacity:</span>
                  <strong className="text-indigo-600 font-bold">
                    {parseFloat(String(detailsRecord.capacity_mt || 0)).toFixed(2)} MT
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Gross Weight (GVW):</span>
                  <strong className="text-slate-900">
                    {detailsRecord.gvw_kg ? `${detailsRecord.gvw_kg} kg` : "-"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Unladen Weight:</span>
                  <strong className="text-slate-900">
                    {detailsRecord.unladen_weight_kg ? `${detailsRecord.unladen_weight_kg} kg` : "-"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Engine Number:</span>
                  <span className="font-mono text-slate-800 font-medium">{detailsRecord.engine_number || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Chassis Number:</span>
                  <span className="font-mono text-slate-800 font-medium">{detailsRecord.chassis_number || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Financier:</span>
                  <span className="text-slate-800">{detailsRecord.financier || "None"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Emission Norms:</span>
                  <span className="text-slate-800">{detailsRecord.emission_norms || "BS-VI"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Color:</span>
                  <span className="text-slate-800">{detailsRecord.color || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Cylinders / Seats:</span>
                  <span className="text-slate-800">
                    {detailsRecord.cylinders || "-"} cyl / {detailsRecord.seating_capacity || "2"} seats
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3: Validity Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Regulatory Compliance & Expiry Dates
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Fitness Expiry</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">
                    {formatDate(detailsRecord.fitness_expiry)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Insurance Expiry</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">
                    {formatDate(detailsRecord.insurance_expiry)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Tax Validity</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">
                    {formatDate(detailsRecord.tax_validity)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">PUCC Expiry</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">
                    {formatDate(detailsRecord.puc_expiry)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Permit Validity</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">
                    {formatDate(detailsRecord.permit_validity)}
                  </span>
                </div>
              </div>
            </div>

            {/* STEP 4: Equipment & Maintenance */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  STEP 4: Equipment & Maintenance Checklist
                </h4>
                <span className="text-[11px] text-slate-400">Toolkit verification & maintenance logs</span>
              </div>

              {/* Tools Badges */}
              <div className="flex flex-wrap gap-2.5">
                {[
                  { name: "Jack", val: detailsRecord.has_jack },
                  { name: "Raad", val: detailsRecord.has_raad },
                  { name: "Pana", val: detailsRecord.has_pana },
                  { name: "Stepney", val: detailsRecord.has_stepney },
                  ...(detailsRecord.has_tarpaulin_rassi !== undefined
                    ? [{ name: "Tarpaulin / Rassi", val: detailsRecord.has_tarpaulin_rassi }]
                    : []),
                ].map((eq) => (
                  <span
                    key={eq.name}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border shadow-2xs",
                      eq.val
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-slate-100 text-slate-400 border-slate-200 line-through"
                    )}
                  >
                    {eq.val ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    {eq.name}
                  </span>
                ))}
              </div>

              {/* Service & Garage Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-2">
                <div>
                  <span className="text-slate-400 block text-[11px]">Last Service KM:</span>
                  <strong className="text-slate-900">
                    {detailsRecord.last_service_km ? `${detailsRecord.last_service_km} km` : "-"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Last Service Done At:</span>
                  <strong className="text-slate-900">{detailsRecord.last_service_done_at || "-"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Service Status:</span>
                  <strong className="text-slate-900">{detailsRecord.last_service_status || "-"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Driver at Service:</span>
                  <span className="text-slate-800">{detailsRecord.driver_at_last_service || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Driver Phone:</span>
                  <span className="text-slate-800 font-mono">
                    {detailsRecord.driver_phone_at_last_service || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Tyre Configuration:</span>
                  <span className="text-slate-800">{detailsRecord.tyre_numbers || "-"}</span>
                </div>
              </div>

              {/* Document Attachments */}
              <div className="border-t border-slate-100 pt-4">
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Compliance Documents & Storage:
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <span className="text-slate-400 block text-[10px]">RC Original Custody:</span>
                    <strong className="text-slate-800">{detailsRecord.rc_original_status || "With Driver"}</strong>
                  </div>

                  {detailsRecord.rc_copy_doc ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAttachedDocument(detailsRecord.rc_copy_doc, "RC Copy")}
                      className="rounded-xl h-10 px-3.5 text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View RC Copy</span>
                      <ExternalLink className="w-3 h-3 text-indigo-400" />
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No RC Copy Attached</span>
                  )}

                  {detailsRecord.last_repair_bill_doc ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openAttachedDocument(detailsRecord.last_repair_bill_doc, "Repairing Bill")
                      }
                      className="rounded-xl h-10 px-3.5 text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Last Repair Bill</span>
                      <ExternalLink className="w-3 h-3 text-emerald-400" />
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No Repair Bill Attached</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </EntityDrawer>

      {/* Quick Creation Modal for Vehicle Owner */}
      <QuickCreateVehicleOwnerModal
        isOpen={quickOwnerOpen}
        onClose={() => setQuickOwnerOpen(false)}
        onSuccess={handleOwnerCreated}
      />
    </div>
  );
}
