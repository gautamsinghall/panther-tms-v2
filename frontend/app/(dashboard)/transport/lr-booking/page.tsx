"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Plus,
  ArrowRight,
  Truck,
  CheckCircle2,
  Send,
  Navigation,
  FileText,
  IndianRupee,
  Clock,
  Printer,
  Edit,
  MapPin,
  Building2,
  Lock,
  Layers,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { Form } from "@/components/forms/form";
import { StatusBadge } from "@/components/ui/badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { KpiCard } from "@/components/ui/kpi-card";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getActiveOffice, OfficeSummary, getStoredAuth } from "@/lib/auth";
import {
  QuickCreateConsignerModal,
  QuickCreateConsigneeModal,
  QuickCreateLocationModal,
} from "@/components/modals/quick-create-modal";
import { LRViewModal, LRViewRecord } from "@/components/modals/lr-view-modal";
import {
  LRInvoiceItemsTable,
  LRInvoiceItem,
  createEmptyInvoiceItem,
} from "@/components/forms/lr-invoice-items-table";
import { LinkedJobSummaryCard, LinkedJobData } from "@/components/cards/linked-job-summary-card";

interface LRRecord {
  id: number;
  lr_number: string;
  lr_date: string;
  issuing_office_id?: number;
  issuing_office_name?: string;
  issuing_office_code?: string;
  job_id?: number;
  job_number?: string;
  booking_status?: string;
  dispatch_date?: string;
  appointment_date?: string;
  billing_customer_id?: number;
  billing_customer_name?: string;
  consigner_id: number;
  consigner_name?: string;
  consigner_address?: string;
  consignee_id: number;
  consignee_name?: string;
  consignee_address?: string;
  origin_location_id?: number;
  origin_city?: string;
  destination_location_id?: number;
  destination_city?: string;
  via?: string;
  vehicle_source: string;
  vehicle_number: string;
  vehicle_type?: string;
  driver_name?: string;
  driver_phone?: string;
  eway_bill_number?: string;
  eway_bill_date?: string;
  eway_bill_expiry?: string;
  invoice_no?: string;
  invoice_date?: string;
  invoice_value?: string | number;
  cha_job_number?: string;
  package_count: number;
  packing_method_id?: number;
  packing_method_name?: string;
  actual_weight_mt: string | number;
  chargeable_weight_mt: string | number;
  bill_of_entry?: string;
  container_no?: string;
  load_type_id?: number;
  load_type?: string;
  load_type_name?: string;
  payment_type?: string;
  eta?: string;
  particulars?: string;
  remarks?: string;
  total_freight_amount: string | number;
  advance_amount: string | number;
  balance_amount: string | number;
  status: string;
  lr_series_id?: number;
  invoice_items?: LRInvoiceItem[];
}

interface SelectOption {
  id: number;
  name?: string;
  title?: string;
  city_name?: string;
  job_number?: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface SeriesRangeItem {
  id: number;
  document_type: string;
  series_name: string;
  prefix: string;
  suffix?: string;
  starting_number: number;
  end_number?: number;
  series_mode: string;
  is_default: boolean;
  total_count: number;
  used_count: number;
  available_count: number;
  display_label: string;
  available_options: { value: string; label: string; number: number }[];
}

const STANDARD_VEHICLE_TYPES = [
  "Tata Prima 4028.S (14 Wheeler)",
  "BharatBenz 3528C (12 Wheeler)",
  "Eicher Pro 6028 (10 Wheeler)",
  "10 Wheeler (21 FT Open Body)",
  "32 FT Multi-Axle (MXL Close Body)",
  "32 FT Single-Axle (SXL Close Body)",
  "24 FT Container Body",
  "20 FT Close Body Container",
  "20 FT Open Body Trailer",
  "14 FT Canter / LCV",
  "Trailer 40 FT High Bed",
  "Trailer 50 FT Low Bed",
  "Tata Ace / Pickup",
];

export default function LRBookingPage() {
  const router = useRouter();
  const [data, setData] = useState<LRRecord[]>([]);
  const [consigners, setConsigners] = useState<SelectOption[]>([]);
  const [consignees, setConsignees] = useState<SelectOption[]>([]);
  const [locations, setLocations] = useState<SelectOption[]>([]);
  const [jobs, setJobs] = useState<LinkedJobData[]>([]);
  const [billingCustomers, setBillingCustomers] = useState<SelectOption[]>([]);
  const [packingMethods, setPackingMethods] = useState<SelectOption[]>([]);
  const [loadTypes, setLoadTypes] = useState<SelectOption[]>([]);
  const [activeOffice, setActiveOfficeState] = useState<OfficeSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLrId, setEditingLrId] = useState<number | null>(null);
  const [editingLrRecord, setEditingLrRecord] = useState<LRRecord | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<Record<string, any>>({});
  const formSetFieldValueRef = useRef<((name: string, value: any) => void) | null>(null);

  // Track dynamic form selections to update dependent fields (LR Series -> LR No., Consignor -> Address, Consignee -> Address)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
  const [selectedConsignerId, setSelectedConsignerId] = useState<string>("");
  const [selectedConsigneeId, setSelectedConsigneeId] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<LinkedJobData | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Helper to open related masters in a new tab while preserving active tenant workspace context
  const openInNewTab = useCallback((path: string) => {
    const auth = getStoredAuth();
    const tId = auth?.tenantId || "";
    const prefix = tId ? `/${tId}` : "";
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const targetUrl = path.startsWith("http") ? path : `${prefix}${cleanPath}`;
    window.open(targetUrl, "_blank");
  }, []);

  // View & Print LR state
  const [selectedLrForView, setSelectedLrForView] = useState<LRRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Quick Create Modals state
  const [quickConsignerOpen, setQuickConsignerOpen] = useState(false);
  const [quickConsigneeOpen, setQuickConsigneeOpen] = useState(false);
  const [quickLocationTarget, setQuickLocationTarget] = useState<"origin" | "destination" | null>(null);

  // Series Master State
  const [seriesInfo, setSeriesInfo] = useState<{
    configured: boolean;
    prefix?: string;
    suffix?: string;
    next_number_formatted?: string;
    series_mode?: string;
  } | null>(null);

  const [manualSeriesData, setManualSeriesData] = useState<{
    document_type: string;
    is_mandatory_manual: boolean;
    default_series_id: number | null;
    ranges: SeriesRangeItem[];
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const office = getActiveOffice();
      setActiveOfficeState(office);

      const [
        lrsRes,
        consignersRes,
        consigneesRes,
        locationsRes,
        jobsRes,
        billingCustRes,
        packingMethRes,
        loadTypesRes,
        seriesRes,
        manualRangesRes,
      ] = await Promise.all([
        apiClient<LRRecord[]>("/api/v1/transport/lrs").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/consigners").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/consignees").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/locations").catch(() => []),
        apiClient<LinkedJobData[]>("/api/v1/transport/jobs").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/billing-clients").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/packing-methods").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/load-types").catch(() => []),
        apiClient<any>(`/api/v1/settings/series/check/LR${office?.id ? `?office_id=${office.id}` : ""}`).catch(() => null),
        apiClient<any>(`/api/v1/settings/series/manual-ranges/LR${office?.id ? `?office_id=${office.id}` : ""}`).catch(() => null),
      ]);

      setData(Array.isArray(lrsRes) ? lrsRes : []);
      setConsigners(Array.isArray(consignersRes) ? consignersRes : []);
      setConsignees(Array.isArray(consigneesRes) ? consigneesRes : []);
      setLocations(Array.isArray(locationsRes) ? locationsRes : []);
      setJobs(Array.isArray(jobsRes) ? jobsRes : []);
      setBillingCustomers(Array.isArray(billingCustRes) ? billingCustRes : []);
      setPackingMethods(Array.isArray(packingMethRes) ? packingMethRes : []);
      setLoadTypes(Array.isArray(loadTypesRes) ? loadTypesRes : []);
      setSeriesInfo(seriesRes);
      setManualSeriesData(manualRangesRes);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load LRs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Silent refresh when user returns from creating party in a new tab
  const refreshDropdownsSilently = useCallback(async () => {
    try {
      const [consignersRes, consigneesRes, billingCustRes, loadTypesRes] = await Promise.all([
        apiClient<SelectOption[]>("/api/v1/general/consigners").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/consignees").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/billing-clients").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/load-types").catch(() => []),
      ]);

      if (Array.isArray(consignersRes)) setConsigners(consignersRes);
      if (Array.isArray(consigneesRes)) setConsignees(consigneesRes);
      if (Array.isArray(billingCustRes)) setBillingCustomers(billingCustRes);
      if (Array.isArray(loadTypesRes)) setLoadTypes(loadTypesRes);

      // Auto-select party created in another tab if present
      if (typeof window !== "undefined") {
        const lastCreatedRaw = localStorage.getItem("panther_party_created");
        if (lastCreatedRaw) {
          try {
            const parsed = JSON.parse(lastCreatedRaw);
            if (parsed.type === "billing_client" && formSetFieldValueRef.current) {
              formSetFieldValueRef.current("billing_customer_id", String(parsed.id));
            } else if (parsed.type === "consigner" && formSetFieldValueRef.current) {
              formSetFieldValueRef.current("consigner_id", String(parsed.id));
              setSelectedConsignerId(String(parsed.id));
            } else if (parsed.type === "consignee" && formSetFieldValueRef.current) {
              formSetFieldValueRef.current("consignee_id", String(parsed.id));
              setSelectedConsigneeId(String(parsed.id));
            } else if (parsed.type === "load_type" && formSetFieldValueRef.current) {
              formSetFieldValueRef.current("load_type_id", String(parsed.id));
            }
            localStorage.removeItem("panther_party_created");
          } catch {}
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadData();

    const handleOfficeChange = () => {
      loadData();
    };

    const handleFocus = () => {
      refreshDropdownsSilently();
    };

    window.addEventListener("panther_office_changed", handleOfficeChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("panther_consigner_created", refreshDropdownsSilently);
    window.addEventListener("panther_consignee_created", refreshDropdownsSilently);
    window.addEventListener("panther_billing_client_created", refreshDropdownsSilently);
    window.addEventListener("panther_load_types_changed", refreshDropdownsSilently);

    return () => {
      window.removeEventListener("panther_office_changed", handleOfficeChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("panther_consigner_created", refreshDropdownsSilently);
      window.removeEventListener("panther_consignee_created", refreshDropdownsSilently);
      window.removeEventListener("panther_billing_client_created", refreshDropdownsSilently);
      window.removeEventListener("panther_load_types_changed", refreshDropdownsSilently);
    };
  }, [loadData, refreshDropdownsSilently]);

  const stats = useMemo(() => {
    const total = data.length;
    const inTransit = data.filter((d) => d.status === "IN_TRANSIT").length;
    const pendingPOD = data.filter((d) => d.status === "ARRIVED" || d.status === "DELIVERED").length;
    const totalFreight = data.reduce((acc, d) => acc + (parseFloat(String(d.total_freight_amount)) || 0), 0);
    return { total, inTransit, pendingPOD, totalFreight };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesNo = item.lr_number.toLowerCase().includes(term);
        const matchesTruck = (item.vehicle_number || "").toLowerCase().includes(term);
        const matchesConsigner = (item.consigner_name || "").toLowerCase().includes(term);
        const matchesConsignee = (item.consignee_name || "").toLowerCase().includes(term);
        const matchesJob = (item.job_number || "").toLowerCase().includes(term);
        if (!matchesNo && !matchesTruck && !matchesConsigner && !matchesConsignee && !matchesJob) {
          return false;
        }
      }
      return true;
    });
  }, [data, statusFilter, searchTerm]);

  // Derived options for dropdowns
  const jobOptions = useMemo(() => [
    { label: "Direct Booking (No Job)", value: "" },
    ...jobs.map((j: any) => {
      const routeText = [j.origin_city, j.destination_city].filter(Boolean).join(" → ");
      const displayLabel = routeText
        ? `${j.job_number} · ${routeText} (ID: ${j.id})`
        : `${j.job_number} (ID: ${j.id})`;
      return {
        label: displayLabel,
        value: String(j.id),
      };
    }),
  ], [jobs]);

  const bookingStatusOptions = [
    { label: "Booked", value: "Booked" },
    { label: "Canceled", value: "Canceled" },
    { label: "Reserved", value: "Reserved" },
  ];

  const paymentTypeOptions = [
    { label: "To Be Billed", value: "To Be Billed" },
    { label: "To Pay", value: "To Pay" },
    { label: "Paid", value: "Paid" },
    { label: "FOC", value: "FOC" },
  ];

  const seriesRangeOptions = useMemo(() => {
    if (!manualSeriesData || !manualSeriesData.ranges || manualSeriesData.ranges.length === 0) {
      return [{
        label: seriesInfo?.configured
          ? `Automatic Series (${seriesInfo.next_number_formatted})`
          : "Default LR Sequence",
        value: "default",
      }];
    }
    return manualSeriesData.ranges.map((r) => ({
      value: String(r.id),
      label: `${r.series_name || "LR Series"} · ${r.prefix || ""}${r.starting_number} to ${r.prefix || ""}${r.end_number || "..."}${r.suffix || ""} (${r.available_count} available)`,
    }));
  }, [manualSeriesData, seriesInfo]);

  // Selected series object
  const activeSeriesObj = useMemo(() => {
    if (!manualSeriesData || !manualSeriesData.ranges || manualSeriesData.ranges.length === 0) {
      return null;
    }
    if (selectedSeriesId) {
      const match = manualSeriesData.ranges.find((r) => String(r.id) === selectedSeriesId);
      if (match) return match;
    }
    const def = manualSeriesData.ranges.find((r) => r.id === manualSeriesData.default_series_id);
    return def || manualSeriesData.ranges[0];
  }, [manualSeriesData, selectedSeriesId]);

  // Dynamic LR numbers belonging to selected series (e.g. LR-001, LR-002 ... LR-100)
  const lrNumberOptions = useMemo(() => {
    if (!activeSeriesObj) {
      const fallback = editingLrRecord?.lr_number || (seriesInfo?.configured ? seriesInfo?.next_number_formatted : "") || "";
      return [{ label: fallback || "No Active Series", value: fallback }];
    }

    const start = activeSeriesObj.starting_number || 1;
    const end = activeSeriesObj.end_number || start + 99;
    const prefix = activeSeriesObj.prefix || "";
    const suffix = activeSeriesObj.suffix || "";
    const padLength = Math.max(3, String(end).length);

    const generated: { label: string; value: string }[] = [];
    const limit = Math.min(end, start + 300); // safety cap up to 300 leaf options in select

    for (let num = start; num <= limit; num++) {
      const val = `${prefix}${String(num).padStart(padLength, "0")}${suffix}`;
      generated.push({ label: val, value: val });
    }

    // Ensure the current LR number is present when editing
    if (editingLrRecord?.lr_number) {
      if (!generated.some((g) => g.value === editingLrRecord.lr_number)) {
        generated.unshift({
          label: `${editingLrRecord.lr_number} (Current)`,
          value: editingLrRecord.lr_number,
        });
      }
    }

    return generated;
  }, [activeSeriesObj, editingLrRecord, seriesInfo]);

  const billingCustomerOptions = useMemo(() => [
    { label: "Select Billing Customer...", value: "" },
    ...billingCustomers.map((c) => ({
      label: c.name || `Client #${c.id}`,
      value: String(c.id),
      subLabel: c.city ? `City: ${c.city}` : undefined,
    })),
  ], [billingCustomers]);

  const locationOptions = useMemo(() => [
    { label: "Select Location Hub...", value: "" },
    ...locations.map((l) => ({
      label: l.city_name || `Location #${l.id}`,
      value: String(l.id),
    })),
  ], [locations]);

  const consignerOptions = useMemo(() => [
    { label: "Select Consignor (Sender)...", value: "" },
    ...consigners.map((c) => ({
      label: c.name || `Consignor #${c.id}`,
      value: String(c.id),
      subLabel: [c.city, c.state].filter(Boolean).join(", "),
    })),
  ], [consigners]);

  const consigneeOptions = useMemo(() => [
    { label: "Select Consignee (Receiver)...", value: "" },
    ...consignees.map((c) => ({
      label: c.name || `Consignee #${c.id}`,
      value: String(c.id),
      subLabel: [c.city, c.state].filter(Boolean).join(", "),
    })),
  ], [consignees]);

  const packingMethodOptions = useMemo(() => [
    { label: "Select Packing Method...", value: "" },
    ...packingMethods.map((p) => ({
      label: p.name || `Method #${p.id}`,
      value: String(p.id),
    })),
  ], [packingMethods]);

  const loadTypeOptions = useMemo(() => [
    { label: "Select Load Type...", value: "" },
    ...loadTypes.map((lt) => ({
      label: lt.name || `Load Type #${lt.id}`,
      value: String(lt.id),
    })),
  ], [loadTypes]);

  const vehicleTypeOptions = useMemo(() => [
    { label: "Select Vehicle Type...", value: "" },
    ...STANDARD_VEHICLE_TYPES.map((vt) => ({ label: vt, value: vt })),
  ], []);

  // Selected addresses for Consignor & Consignee preview
  const selectedConsignerAddress = useMemo(() => {
    if (!selectedConsignerId) return "";
    const party = consigners.find((c) => String(c.id) === String(selectedConsignerId));
    if (!party) return "";
    return [party.address, party.city, party.state, party.pincode].filter(Boolean).join(", ");
  }, [selectedConsignerId, consigners]);

  const selectedConsigneeAddress = useMemo(() => {
    if (!selectedConsigneeId) return "";
    const party = consignees.find((c) => String(c.id) === String(selectedConsigneeId));
    if (!party) return "";
    return [party.address, party.city, party.state, party.pincode].filter(Boolean).join(", ");
  }, [selectedConsigneeId, consignees]);

  // Office display string
  const activeOfficeDisplay = useMemo(() => {
    if (editingLrRecord?.issuing_office_name) {
      return `${editingLrRecord.issuing_office_name} (${editingLrRecord.issuing_office_code || "OFFICE"})`;
    }
    if (activeOffice) {
      return `${activeOffice.name} (${activeOffice.code || "HO"})`;
    }
    return "Head Office (HO)";
  }, [editingLrRecord, activeOffice]);

  // Open edit drawer and populate all 36 fields
  const openEditDrawer = async (row: LRRecord) => {
    setDrawerError(null);
    setIsSubmitting(false);
    setEditingLrId(row.id);
    setEditingLrRecord(row);

    // Try fetching fresh full detail from API
    let freshData = row;
    try {
      const fullRes = await apiClient<LRRecord>(`/api/v1/transport/lrs/${row.id}`);
      if (fullRes && fullRes.id) {
        freshData = fullRes;
        setEditingLrRecord(fullRes);
      }
    } catch {}

    const matchedJob = freshData.job_id ? jobs.find((j: any) => String(j.id) === String(freshData.job_id)) : null;
    setSelectedJob(matchedJob || null);

    const seriesId = freshData.lr_series_id ? String(freshData.lr_series_id) : "default";
    setSelectedSeriesId(seriesId);
    setSelectedConsignerId(String(freshData.consigner_id || ""));
    setSelectedConsigneeId(String(freshData.consignee_id || ""));

    const initialItems: LRInvoiceItem[] =
      freshData.invoice_items && freshData.invoice_items.length > 0
        ? freshData.invoice_items
        : [
            {
              id: `init-${freshData.id || Date.now()}`,
              invoice_no: freshData.invoice_no || "",
              invoice_date: freshData.invoice_date || freshData.lr_date || new Date().toISOString().split("T")[0],
              invoice_value: freshData.invoice_value ? String(freshData.invoice_value) : "",
              eway_bill_number: freshData.eway_bill_number || "",
              eway_bill_date: freshData.eway_bill_date || freshData.lr_date || new Date().toISOString().split("T")[0],
              eway_bill_expiry: freshData.eway_bill_expiry || "",
              cha_job_number: freshData.cha_job_number || "",
              particulars: freshData.particulars || "",
              remarks: "",
            },
          ];

    setFormInitialValues({
      job_id: freshData.job_id ? String(freshData.job_id) : "",
      booking_status: freshData.booking_status || "Booked",
      issuing_office_display: freshData.issuing_office_name
        ? `${freshData.issuing_office_name} (${freshData.issuing_office_code || "OFFICE"})`
        : activeOfficeDisplay,
      issuing_office_id: freshData.issuing_office_id || activeOffice?.id,
      lr_series_id: seriesId,
      lr_number: freshData.lr_number || "",
      dispatch_date: freshData.dispatch_date || freshData.lr_date || new Date().toISOString().split("T")[0],
      appointment_date: freshData.appointment_date || "",
      billing_customer_id: freshData.billing_customer_id ? String(freshData.billing_customer_id) : "",
      origin_location_id: freshData.origin_location_id ? String(freshData.origin_location_id) : "",
      destination_location_id: freshData.destination_location_id ? String(freshData.destination_location_id) : "",
      via: freshData.via || "",
      consigner_id: String(freshData.consigner_id || ""),
      consignee_id: String(freshData.consignee_id || ""),
      vehicle_number: freshData.vehicle_number || "",
      vehicle_type: freshData.vehicle_type || "",
      package_count: freshData.package_count || 0,
      packing_method_id: freshData.packing_method_id ? String(freshData.packing_method_id) : "",
      actual_weight_mt: freshData.actual_weight_mt ? String(freshData.actual_weight_mt) : "0.000",
      chargeable_weight_mt: freshData.chargeable_weight_mt ? String(freshData.chargeable_weight_mt) : "0.000",
      bill_of_entry: freshData.bill_of_entry || "",
      container_no: freshData.container_no || "",
      load_type_id: freshData.load_type_id ? String(freshData.load_type_id) : "",
      payment_type: freshData.payment_type || "To Be Billed",
      eta: freshData.eta || "",
      driver_name: freshData.driver_name || "",
      driver_phone: freshData.driver_phone || "",
      invoice_items: initialItems,
      particulars: freshData.particulars || "",
      remarks: freshData.remarks || "",
    });

    setIsDrawerOpen(true);
  };

  const openCreateDrawer = useCallback((initialJobId?: string | number) => {
    setDrawerError(null);
    setEditingLrId(null);
    setEditingLrRecord(null);

    const defaultSeries = manualSeriesData?.ranges?.find((r) => r.is_default) || manualSeriesData?.ranges?.[0];
    const initialSeriesId = defaultSeries ? String(defaultSeries.id) : "default";
    setSelectedSeriesId(initialSeriesId);

    const matchedJob = initialJobId ? jobs.find((j: any) => String(j.id) === String(initialJobId)) : null;
    setSelectedJob(matchedJob || null);

    const initialConsignerId = matchedJob?.consigner_id ? String(matchedJob.consigner_id) : "";
    const initialConsigneeId = matchedJob?.consignee_id ? String(matchedJob.consignee_id) : "";
    setSelectedConsignerId(initialConsignerId);
    setSelectedConsigneeId(initialConsigneeId);

    const initialLrNo = (seriesInfo?.configured ? seriesInfo?.next_number_formatted : "") || (defaultSeries?.available_options?.[0]?.value || "");

    const initialInvoiceItem = createEmptyInvoiceItem();
    if (matchedJob?.cargo_description) {
      initialInvoiceItem.particulars = matchedJob.cargo_description;
    }

    setFormInitialValues({
      job_id: matchedJob ? String(matchedJob.id) : "",
      booking_status: "Booked",
      issuing_office_display: activeOfficeDisplay,
      issuing_office_id: activeOffice?.id,
      lr_series_id: initialSeriesId,
      lr_number: initialLrNo,
      dispatch_date: matchedJob?.expected_dispatch_date || new Date().toISOString().split("T")[0],
      appointment_date: "",
      billing_customer_id: matchedJob?.billing_client_id ? String(matchedJob.billing_client_id) : "",
      origin_location_id: matchedJob?.origin_location_id ? String(matchedJob.origin_location_id) : "",
      destination_location_id: matchedJob?.destination_location_id ? String(matchedJob.destination_location_id) : "",
      via: "",
      consigner_id: initialConsignerId,
      consignee_id: initialConsigneeId,
      vehicle_number: "", // Intentionally blank: Jobs do not specify a vehicle
      vehicle_type: "",
      eway_bill_number: "",
      eway_bill_date: "",
      eway_bill_expiry: "",
      invoice_no: "",
      invoice_date: "",
      invoice_value: "",
      cha_job_number: "",
      package_count: matchedJob?.estimated_packages ?? 0,
      packing_method_id: "",
      actual_weight_mt: matchedJob?.estimated_weight_mt ? String(matchedJob.estimated_weight_mt) : "0.000",
      chargeable_weight_mt: matchedJob?.estimated_weight_mt ? String(matchedJob.estimated_weight_mt) : "0.000",
      bill_of_entry: "",
      container_no: "",
      load_type_id: "",
      payment_type: "To Be Billed",
      eta: "",
      driver_name: "",
      driver_phone: "",
      invoice_items: [initialInvoiceItem],
      particulars: matchedJob?.cargo_description || "",
      remarks: matchedJob?.special_instructions || "",
    });

    setIsDrawerOpen(true);
  }, [manualSeriesData, seriesInfo, jobs, activeOfficeDisplay, activeOffice]);

  // Auto-open create drawer if URL contains ?job_id=...
  useEffect(() => {
    if (typeof window !== "undefined" && jobs.length > 0 && !isDrawerOpen && !editingLrId) {
      const sp = new URLSearchParams(window.location.search);
      const qJobId = sp.get("job_id");
      if (qJobId) {
        openCreateDrawer(qJobId);
      }
    }
  }, [jobs, isDrawerOpen, editingLrId, openCreateDrawer]);

  const handleSubmit = async (values: Record<string, any>) => {
    if (!editingLrId && !seriesInfo?.configured && (!manualSeriesData || manualSeriesData.ranges.length === 0)) {
      setDrawerError("No active LR series configured for this issuing office. Please setup or import the default series template in Settings > Series Master before creating an LR.");
      return;
    }
    setIsSubmitting(true);
    setDrawerError(null);
    try {
      const selectedLoadType = loadTypes.find((lt) => String(lt.id) === String(values.load_type_id));

      const rawItems: LRInvoiceItem[] = values.invoice_items || [];
      const validItems = rawItems.filter(
        (it) =>
          (it.invoice_no && String(it.invoice_no).trim().length > 0) ||
          (it.eway_bill_number && String(it.eway_bill_number).trim().length > 0) ||
          (it.invoice_value && parseFloat(String(it.invoice_value)) > 0) ||
          (it.particulars && String(it.particulars).trim().length > 0) ||
          (it.cha_job_number && String(it.cha_job_number).trim().length > 0)
      );
      const itemsToSave = validItems; // Discard blank unused rows

      const invNos = itemsToSave.map((i) => String(i.invoice_no || "").trim()).filter(Boolean);
      const ewbNos = itemsToSave.map((i) => String(i.eway_bill_number || "").trim()).filter(Boolean);
      const firstItem = itemsToSave[0] || {};
      const totalInvVal = itemsToSave.reduce((sum, i) => sum + (parseFloat(String(i.invoice_value || 0)) || 0), 0);
      const combinedParts = itemsToSave.map((i) => String(i.particulars || "").trim()).filter(Boolean).join("; ");

      const payload = {
        ...values,
        lr_number: values.lr_number ? String(values.lr_number).trim() : undefined,
        job_id: values.job_id ? parseInt(values.job_id, 10) : null,
        booking_status: values.booking_status || "Booked",
        issuing_office_id: activeOffice?.id || (editingLrRecord ? editingLrRecord.issuing_office_id : undefined),
        lr_series_id: values.lr_series_id && values.lr_series_id !== "default" ? parseInt(values.lr_series_id, 10) : null,
        dispatch_date: values.dispatch_date || new Date().toISOString().split("T")[0],
        appointment_date: values.appointment_date || null,
        billing_customer_id: values.billing_customer_id ? parseInt(values.billing_customer_id, 10) : null,
        origin_location_id: values.origin_location_id ? parseInt(values.origin_location_id, 10) : null,
        destination_location_id: values.destination_location_id ? parseInt(values.destination_location_id, 10) : null,
        via: values.via ? String(values.via).trim() : null,
        consigner_id: parseInt(values.consigner_id, 10),
        consignee_id: parseInt(values.consignee_id, 10),
        vehicle_source: editingLrRecord?.vehicle_source || "MARKET",
        vehicle_number: String(values.vehicle_number).trim().toUpperCase(),
        vehicle_type: values.vehicle_type ? String(values.vehicle_type).trim() : null,
        driver_name: values.driver_name ? String(values.driver_name).trim() : null,
        driver_phone: values.driver_phone ? String(values.driver_phone).trim() : null,
        invoice_items: itemsToSave,
        eway_bill_number: ewbNos.length > 0 ? ewbNos.join(", ") : (values.eway_bill_number ? String(values.eway_bill_number).trim() : null),
        eway_bill_date: firstItem.eway_bill_date || values.eway_bill_date || null,
        eway_bill_expiry: firstItem.eway_bill_expiry || values.eway_bill_expiry || null,
        invoice_no: invNos.length > 0 ? invNos.join(", ") : (values.invoice_no ? String(values.invoice_no).trim() : null),
        invoice_date: firstItem.invoice_date || values.invoice_date || null,
        invoice_value: totalInvVal > 0 ? totalInvVal : (parseFloat(values.invoice_value) || 0),
        cha_job_number: firstItem.cha_job_number || (values.cha_job_number ? String(values.cha_job_number).trim() : null),
        package_count: parseInt(values.package_count, 10) || 0,
        packing_method_id: values.packing_method_id ? parseInt(values.packing_method_id, 10) : null,
        actual_weight_mt: parseFloat(values.actual_weight_mt) || 0,
        chargeable_weight_mt: parseFloat(values.chargeable_weight_mt) || 0,
        bill_of_entry: values.bill_of_entry ? String(values.bill_of_entry).trim() : null,
        container_no: values.container_no ? String(values.container_no).trim() : null,
        load_type_id: values.load_type_id ? parseInt(values.load_type_id, 10) : null,
        load_type: selectedLoadType?.name || null,
        payment_type: values.payment_type || "To Be Billed",
        eta: values.eta || null,
        particulars: combinedParts || (values.particulars ? String(values.particulars).trim() : null),
        remarks: values.remarks ? String(values.remarks).trim() : null,
      };

      if (editingLrId) {
        // Edit existing LR record (PUT) - does NOT create duplicate records
        await apiClient(`/api/v1/transport/lrs/${editingLrId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        // Create new LR record (POST)
        await apiClient("/api/v1/transport/lrs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIsDrawerOpen(false);
      setEditingLrId(null);
      setEditingLrRecord(null);
      loadData();
    } catch (err: any) {
      setDrawerError(err.message || "Failed to save Lorry Receipt. Please review the form and correct the required fields.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 36-field structured form sections matching exact user request
  const formSections: FormSectionDef[] = useMemo(() => [
    {
      id: "sec_booking_header",
      title: "Booking & Voucher Authorization",
      description: "Job order linkage, booking status, issuing branch context, and series voucher number",
      columns: 2,
      customContent: selectedJob ? (
        <LinkedJobSummaryCard
          job={selectedJob}
          onUnlink={() => {
            setSelectedJob(null);
            formSetFieldValueRef.current?.("job_id", "");
          }}
        />
      ) : null,
      fields: [
        {
          name: "job_id",
          label: "Select Job No.",
          type: "select",
          options: jobOptions,
          placeholder: "Choose linked job or Direct Booking",
          onAddNew: () => openInNewTab("/transport/jobs?add=true"),
          addNewLabel: "+ Create New Job",
          addNewTitle: "Opens Trip Order creation in a new tab without losing current LR form progress",
          onChange: (newJobId) => {
            if (newJobId) {
              const matchedJob = jobs.find((j: any) => String(j.id) === String(newJobId)) as any;
              if (matchedJob) {
                setSelectedJob(matchedJob);
                if (matchedJob.consigner_id) {
                  formSetFieldValueRef.current?.("consigner_id", String(matchedJob.consigner_id));
                  setSelectedConsignerId(String(matchedJob.consigner_id));
                }
                if (matchedJob.consignee_id) {
                  formSetFieldValueRef.current?.("consignee_id", String(matchedJob.consignee_id));
                  setSelectedConsigneeId(String(matchedJob.consignee_id));
                }
                if (matchedJob.origin_location_id) {
                  formSetFieldValueRef.current?.("origin_location_id", String(matchedJob.origin_location_id));
                }
                if (matchedJob.destination_location_id) {
                  formSetFieldValueRef.current?.("destination_location_id", String(matchedJob.destination_location_id));
                }
                if (matchedJob.billing_client_id) {
                  formSetFieldValueRef.current?.("billing_customer_id", String(matchedJob.billing_client_id));
                }
                if (matchedJob.estimated_packages !== undefined && matchedJob.estimated_packages !== null) {
                  formSetFieldValueRef.current?.("package_count", matchedJob.estimated_packages);
                }
                if (matchedJob.estimated_weight_mt !== undefined && matchedJob.estimated_weight_mt !== null) {
                  const wt = String(matchedJob.estimated_weight_mt);
                  formSetFieldValueRef.current?.("actual_weight_mt", wt);
                  formSetFieldValueRef.current?.("chargeable_weight_mt", wt);
                }
                if (matchedJob.expected_dispatch_date) {
                  formSetFieldValueRef.current?.("dispatch_date", matchedJob.expected_dispatch_date);
                }
                if (matchedJob.cargo_description) {
                  formSetFieldValueRef.current?.("particulars", matchedJob.cargo_description);
                }
                if (matchedJob.special_instructions) {
                  formSetFieldValueRef.current?.("remarks", matchedJob.special_instructions);
                }
              }
            } else {
              setSelectedJob(null);
            }
          },
        },
        {
          name: "booking_status",
          label: "Booking Status",
          type: "select",
          required: true,
          options: bookingStatusOptions,
          defaultValue: "Booked",
        },
        {
          name: "issuing_office_display",
          label: "Issuing Office",
          type: "text",
          disabled: true,
          disabledReason: "Autofetched from current active issuing office and fixed / read-only.",
          helperText: "🔒 Locked to current authorized operational branch context.",
        },
        {
          name: "lr_series_id",
          label: "LR Series",
          type: "select",
          required: Boolean(manualSeriesData?.ranges && manualSeriesData.ranges.length > 0),
          disabled: !manualSeriesData?.ranges || manualSeriesData.ranges.length === 0,
          disabledReason: "Using active automatic series from Series Master.",
          defaultValue: "default",
          options: seriesRangeOptions,
          onChange: (newSeriesId) => {
            setSelectedSeriesId(newSeriesId);
            const matched = manualSeriesData?.ranges?.find((r) => String(r.id) === String(newSeriesId));
            if (matched && matched.available_options?.[0]) {
              formSetFieldValueRef.current?.("lr_number", matched.available_options[0].value);
            }
          },
          onAddNew: () => openInNewTab("/settings/series-master"),
          addNewLabel: "+ Manage LR Series",
          addNewTitle: "Configure Series Batches in Settings",
        },
        {
          name: "lr_number",
          label: "LR No.",
          type: "text",
          disabled: true,
          disabledReason: "Locked — automatically allocated from Series Master for this issuing office.",
          required: false,
          placeholder: (seriesInfo?.configured ? seriesInfo?.next_number_formatted : "") || "",
          helperText: seriesInfo?.configured
            ? `🔒 Auto-allocated from Series Master (${seriesInfo.next_number_formatted}). Non-editable.`
            : "⚠️ No series configured for this office. Please setup the series in Settings > Series Master.",
        },
        {
          name: "dispatch_date",
          label: "Dispatch Date",
          type: "date",
          required: true,
          defaultValue: new Date().toISOString().split("T")[0],
          helperText: "Defaults to current or scheduled dispatch date.",
        },
        {
          name: "appointment_date",
          label: "Appointment Date",
          type: "date",
          placeholder: "Appointment date for scheduling",
        },
        {
          name: "payment_type",
          label: "Payment Type",
          type: "select",
          required: true,
          options: paymentTypeOptions,
          defaultValue: "To Be Billed",
        },
      ],
    },
    {
      id: "sec_parties_route",
      title: "Commercial Parties & Transit Route",
      description: "Billing customer, origin/destination hubs, transit corridors, and party address validation",
      columns: 2,
      fields: [
        {
          name: "billing_customer_id",
          label: "Billing Customer",
          type: "select",
          options: billingCustomerOptions,
          onAddNew: () => openInNewTab("/general/billing-client?add=true"),
          addNewLabel: "+ New Customer",
          addNewTitle: "Opens Billing Customer creation in a new tab without losing current LR form progress",
          helperText: "Click '+' to create customer in a new tab; automatically available upon return.",
        },
        {
          name: "origin_location_id",
          label: "Origin Hub",
          type: "select",
          required: true,
          options: locationOptions,
          placeholder: "Select origin city / dispatch hub",
        },
        {
          name: "destination_location_id",
          label: "Destination Hub",
          type: "select",
          required: true,
          options: locationOptions,
          placeholder: "Select delivery city / destination hub",
        },
        {
          name: "via",
          label: "Via",
          type: "text",
          placeholder: "e.g. Jaipur - Delhi Bypass / Ahmedabad",
          helperText: "Route transit information.",
        },
        {
          name: "consigner_id",
          label: "Consignor",
          type: "select",
          required: true,
          options: consignerOptions,
          onChange: (val) => setSelectedConsignerId(String(val)),
          onAddNew: () => openInNewTab("/general/consigner?add=true"),
          addNewLabel: "+ New Consignor",
          addNewTitle: "Opens Consignor creation in a new tab without losing current LR form progress",
          helperText: selectedConsignerAddress
            ? `📍 Address: ${selectedConsignerAddress}`
            : "Select Consignor to view registered address below.",
        },
        {
          name: "consignee_id",
          label: "Consignee",
          type: "select",
          required: true,
          options: consigneeOptions,
          onChange: (val) => setSelectedConsigneeId(String(val)),
          onAddNew: () => openInNewTab("/general/consignee?add=true"),
          addNewLabel: "+ New Consignee",
          addNewTitle: "Opens Consignee creation in a new tab without losing current LR form progress",
          helperText: selectedConsigneeAddress
            ? `📍 Address: ${selectedConsigneeAddress}`
            : "Select Consignee to view registered address below.",
        },
      ],
    },
    {
      id: "sec_vehicle_driver",
      title: "Vehicle Fleet & Driver Assignment",
      description: "Truck registration, vehicle configuration, operating driver credentials, and ETA",
      columns: 2,
      fields: [
        {
          name: "vehicle_number",
          label: "Truck No.",
          type: "text",
          required: true,
          placeholder: "e.g. RJ-14-GH-1234",
          helperText: selectedJob
            ? "⚠️ Truck assignment required — Job order indents do not specify a vehicle registration."
            : "Enter registration number of assigned vehicle.",
        },
        {
          name: "vehicle_type",
          label: "Vehicle Type",
          type: "select",
          options: vehicleTypeOptions,
          placeholder: "Select vehicle chassis / body type",
        },
        {
          name: "driver_name",
          label: "Driver Name",
          type: "text",
          placeholder: "e.g. Ramesh Singh",
        },
        {
          name: "driver_phone",
          label: "Driver Mobile No.",
          type: "text",
          placeholder: "e.g. 9876543210",
          helperText: "Valid 10-digit mobile number.",
        },
        {
          name: "eta",
          label: "ETA (Estimated Time of Arrival)",
          type: "date",
          placeholder: "Estimated delivery date",
        },
      ],
    },
    {
      id: "sec_cargo_pack",
      title: "Cargo Packaging & Weight Specifications",
      description: "Load category, package count, packing method, container notes, and scale weights",
      columns: 2,
      fields: [
        {
          name: "load_type_id",
          label: "Load Type",
          type: "select",
          options: loadTypeOptions,
          onAddNew: () => openInNewTab("/general/load-type?add=true"),
          addNewLabel: "+ Manage Load Types",
          addNewTitle: "Opens Load Type master in General menu where you can manage carriage categories",
          helperText: "Managed under General > Load Type master; automatically populates here.",
        },
        {
          name: "package_count",
          label: "No. of Packages",
          type: "number",
          placeholder: "e.g. 50",
          required: true,
        },
        {
          name: "packing_method_id",
          label: "Method of Packing",
          type: "select",
          options: packingMethodOptions,
          placeholder: "e.g. Wooden Pallet, Gunny Bag, Corrugated Box",
        },
        {
          name: "actual_weight_mt",
          label: "Actual Weight (MT)",
          type: "number",
          placeholder: "e.g. 15.500",
          helperText: "Actual weighbridge weight in Metric Tonnes.",
        },
        {
          name: "chargeable_weight_mt",
          label: "Charged Weight (MT)",
          type: "number",
          placeholder: "e.g. 16.000",
          helperText: "Billed / chargeable weight in Metric Tonnes.",
        },
        {
          name: "bill_of_entry",
          label: "Bill of Entry",
          type: "text",
          placeholder: "Import/Export Bill of Entry reference",
        },
        {
          name: "container_no",
          label: "Container No.",
          type: "text",
          placeholder: "e.g. MSKU-123456-7",
        },
      ],
    },
    {
      id: "sec_compliance_invoicing_table",
      title: "Invoicing, E-Way Bills & Consignment Particulars",
      description: "Record multiple commercial invoices, E-Way bill compliance lifecycles, and cargo descriptions under this single Lorry Receipt.",
      columns: 1,
      fields: [
        {
          name: "invoice_items",
          label: "",
          hideLabel: true,
          type: "custom",
          colSpan: 4,
          defaultValue: [createEmptyInvoiceItem()],
          customRender: ({ value, onChange, values, setFieldValue }) => (
            <LRInvoiceItemsTable
              items={value || []}
              onChange={onChange}
              onEwbFetched={(ewbData) => {
                if (ewbData?.vehicle_number && (!values?.vehicle_number || String(values.vehicle_number).trim() === "")) {
                  setFieldValue("vehicle_number", ewbData.vehicle_number);
                }
                if (ewbData?.remarks && (!values?.remarks || String(values.remarks).trim() === "")) {
                  setFieldValue("remarks", ewbData.remarks);
                }
              }}
            />
          ),
        },
        {
          name: "remarks",
          label: "Overall Consignment Remarks / Instructions",
          type: "textarea",
          placeholder: "General delivery instructions, unloading requirements, transit notes for driver & consignee...",
          colSpan: 4,
        },
      ],
    },
  ], [
    jobOptions,
    bookingStatusOptions,
    activeOfficeDisplay,
    seriesRangeOptions,
    lrNumberOptions,
    paymentTypeOptions,
    billingCustomerOptions,
    locationOptions,
    consignerOptions,
    consigneeOptions,
    selectedConsignerAddress,
    selectedConsigneeAddress,
    vehicleTypeOptions,
    loadTypeOptions,
    packingMethodOptions,
    jobs,
    manualSeriesData,
    selectedJob,
    openInNewTab,
  ]);

  const columns: ColumnDef<LRRecord>[] = [
    {
      key: "lr_number",
      header: "LR / GR Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block text-xs hover:text-primary transition-colors cursor-pointer">
            {row.lr_number}
          </span>
          <span className="text-[11px] text-slate-500 block">
            {formatDate(row.dispatch_date || row.lr_date)}
          </span>
          {row.issuing_office_name && (
            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
              {row.issuing_office_name}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "parties",
      header: "Consignor & Consignee",
      cell: (row) => (
        <div className="space-y-0.5 text-xs max-w-[220px]">
          <div className="font-semibold text-slate-900 truncate" title={row.consigner_name}>
            <span className="text-[10px] text-slate-400 font-normal mr-1">FROM:</span>
            {row.consigner_name || "—"}
          </div>
          <div className="text-slate-600 truncate" title={row.consignee_name}>
            <span className="text-[10px] text-slate-400 font-normal mr-1">TO:</span>
            {row.consignee_name || "—"}
          </div>
          {row.billing_customer_name && (
            <div className="text-[10px] text-indigo-600 font-medium truncate" title={row.billing_customer_name}>
              Bill: {row.billing_customer_name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "corridor",
      header: "Route / Corridor",
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <span className="font-medium text-slate-900">{row.origin_city || "Origin"}</span>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-900">{row.destination_city || "Dest"}</span>
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle & Driver",
      cell: (row) => (
        <div className="space-y-1">
          <VehiclePlate vehicleNumber={row.vehicle_number} source={row.vehicle_source as any} />
          {row.driver_name && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>{row.driver_name}</span>
              {row.driver_phone && <span className="text-slate-400">({row.driver_phone})</span>}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "cargo",
      header: "Cargo & Load Type",
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <span className="font-semibold text-slate-900 block">
            {row.chargeable_weight_mt ? `${parseFloat(String(row.chargeable_weight_mt))} MT` : "0 MT"}
            {row.package_count ? ` · ${row.package_count} Pkgs` : ""}
          </span>
          {(row.load_type_name || row.load_type) && (
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
              {row.load_type_name || row.load_type}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "booking_status",
      header: "Booking Status",
      align: "center",
      cell: (row) => {
        const bStatus = row.booking_status || (row.status === "CANCELLED" ? "Canceled" : "Booked");
        const badgeColor =
          bStatus === "Canceled"
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : bStatus === "Reserved"
            ? "bg-purple-50 text-purple-700 border-purple-200"
            : "bg-emerald-50 text-emerald-700 border-emerald-200";
        return (
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeColor}`}>
            {bStatus}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Lifecycle Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const actions: RowAction<LRRecord>[] = [
    {
      label: "View & Print LR",
      icon: <Printer className="w-3.5 h-3.5" />,
      onClick: (row) => {
        setSelectedLrForView(row);
        setIsViewModalOpen(true);
      },
    },
    {
      label: "Edit LR",
      icon: <Edit className="w-3.5 h-3.5 text-primary" />,
      onClick: (row) => {
        openEditDrawer(row);
      },
    },
    {
      label: "Dispatch / In Transit",
      disabled: (row) => row.status !== "BOOKED" && row.status !== "LOADED",
      onClick: async (row) => {
        try {
          await apiClient(`/api/v1/transport/lrs/${row.id}/transition`, {
            method: "POST",
            body: JSON.stringify({ target_status: "IN_TRANSIT" }),
          });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to dispatch LR.");
        }
      },
    },
    {
      label: "Record Arrival",
      disabled: (row) => row.status !== "IN_TRANSIT",
      onClick: (row) => {
        router.push(`/transport/arrival-reports?lr_id=${row.id}`);
      },
    },
    {
      label: "Upload / Verify POD",
      disabled: (row) => row.status !== "ARRIVED" && row.status !== "DELIVERED" && row.status !== "POD_RECEIVED",
      onClick: (row) => {
        router.push(`/transport/pod-records?lr_id=${row.id}`);
      },
    },
    {
      label: "Generate Invoice",
      icon: <FileText className="w-3.5 h-3.5" />,
      onClick: (row) => {
        router.push(`/accounts/transport-invoice?lr_id=${row.id}`);
      },
    },
  ];

  const handleConsignerCreated = (newConsigner: { id: number; name: string }) => {
    setConsigners((prev) => [{ id: newConsigner.id, name: newConsigner.name }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, consigner_id: String(newConsigner.id) }));
    formSetFieldValueRef.current?.("consigner_id", String(newConsigner.id));
    setSelectedConsignerId(String(newConsigner.id));
  };

  const handleConsigneeCreated = (newConsignee: { id: number; name: string }) => {
    setConsignees((prev) => [{ id: newConsignee.id, name: newConsignee.name }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, consignee_id: String(newConsignee.id) }));
    formSetFieldValueRef.current?.("consignee_id", String(newConsignee.id));
    setSelectedConsigneeId(String(newConsignee.id));
  };

  const handleLocationCreated = (newLoc: { id: number; city_name: string }) => {
    setLocations((prev) => [{ id: newLoc.id, city_name: newLoc.city_name }, ...prev]);
    const field = quickLocationTarget === "origin" ? "origin_location_id" : "destination_location_id";
    setFormInitialValues((prev) => ({ ...prev, [field]: String(newLoc.id) }));
    formSetFieldValueRef.current?.(field, String(newLoc.id));
    setQuickLocationTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lorry Receipts (GR / LR)"
        description="Official carrier consignment notes: track freight movement, dispatch states, destination arrivals, and POD verification."
        primaryAction={{
          label: "New LR Booking",
          icon: <Plus className="w-4 h-4" />,
          onClick: openCreateDrawer,
        }}
      />

      {seriesInfo && !seriesInfo.configured && (!manualSeriesData || manualSeriesData.ranges.length === 0) && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ Manual Series Required:</span>
            <span>Manual series must be configured in Series Master before LRs can be booked.</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => router.push("/settings/series-master")}
            className="text-xs bg-white text-amber-800 border-amber-300 hover:bg-amber-100 shrink-0"
          >
            Configure LR Series
          </Button>
        </div>
      )}

      {/* Operational KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Consignments"
          value={stats.total.toLocaleString()}
          subtext="Official GR/LR receipts"
          icon={<FileText className="w-4 h-4" />}
        />
        <KpiCard
          title="In Transit Corridors"
          value={stats.inTransit.toLocaleString()}
          subtext="Active line-haul dispatch"
          icon={<Truck className="w-4 h-4 text-blue-600" />}
        />
        <KpiCard
          title="Awaiting POD Clearance"
          value={stats.pendingPOD.toLocaleString()}
          subtext="Arrived / Delivered consignments"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
        />
        <KpiCard
          title="Total Billed Freight"
          value={formatCurrency(stats.totalFreight)}
          subtext="Cumulative LR booking value"
          icon={<IndianRupee className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search LR number, vehicle, customer..."
        filters={[
          {
            id: "status",
            label: "Filter Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Booked", value: "BOOKED" },
              { label: "In Transit", value: "IN_TRANSIT" },
              { label: "Arrived", value: "ARRIVED" },
              { label: "Delivered", value: "DELIVERED" },
              { label: "POD Verified", value: "POD_VERIFIED" },
              { label: "Cancelled", value: "CANCELLED" },
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
        emptyMessage="No Lorry Receipts found"
        emptySubtext="Create an LR booking from a confirmed transport trip or book directly to generate consignment notes."
        emptyAction={{
          label: "+ New LR Booking",
          onClick: openCreateDrawer,
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingLrId(null);
          setEditingLrRecord(null);
        }}
        title={editingLrRecord ? `Edit Lorry Receipt: ${editingLrRecord.lr_number}` : "Create Lorry Receipt (GR / LR)"}
        description={
          editingLrRecord
            ? "Update commercial consignment fields, transit routes, and compliance data without creating duplicate records."
            : "Record commercial consignment, assigned truck, freight terms, and dispatch parties according to 36-field standard."
        }
        width="full"
      >
        {/* Office & Series Context Banner */}
        <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/90 to-purple-50/70 border border-indigo-200/80 text-indigo-950 text-xs shadow-2xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" />
                Issuing Office:
              </span>
              <span className="font-bold text-indigo-800 bg-white px-2 py-0.5 rounded border border-indigo-200">
                {activeOfficeDisplay}
              </span>
            </div>
            {activeSeriesObj ? (
              <div className="font-mono text-slate-600 text-[11px]">
                Series Batch: <span className="font-bold text-slate-900">{activeSeriesObj.starting_number} – {activeSeriesObj.end_number || "..."}</span>
              </div>
            ) : seriesInfo?.configured ? (
              <div className="font-mono text-slate-600 text-[11px] flex items-center gap-1.5">
                Next LR No: <span className="font-bold text-indigo-900 bg-white px-2 py-0.5 rounded border border-indigo-200">{seriesInfo.next_number_formatted}</span>
              </div>
            ) : null}
          </div>
          {activeSeriesObj && (
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-indigo-100 text-slate-600">
              <span>{activeSeriesObj.used_count} vouchers recorded</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {activeSeriesObj.available_count} leaves available
              </span>
            </div>
          )}
        </div>

        {/* Unconfigured Series Warning Alert */}
        {!editingLrRecord && !seriesInfo?.configured && (!manualSeriesData || manualSeriesData.ranges.length === 0) && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-950">LR Series Not Configured</h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  No active series configured for Lorry Receipt in this issuing office ({activeOfficeDisplay}). LR numbers cannot be generated and this entry cannot be saved until you setup or import the default series template.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => openInNewTab("/settings/series-master")}
              className="bg-white text-rose-700 border-rose-300 hover:bg-rose-50 text-xs shrink-0 font-semibold"
            >
              Setup Series in Settings
            </Button>
          </div>
        )}

        {/* In-drawer Error Alert */}
        {drawerError && (
          <div
            role="alert"
            className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start justify-between gap-3 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-950">Unable to Save Lorry Receipt</h4>
                <p className="text-xs text-rose-800 mt-0.5">{drawerError}</p>
                <p className="text-[11px] text-rose-600 mt-1">
                  All entered details have been preserved. Please resolve the highlighted issue and submit again.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDrawerError(null)}
              className="text-rose-500 hover:text-rose-800 text-xs font-semibold px-2 py-1 rounded cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <Form
          className="max-w-full"
          sections={formSections}
          initialValues={formInitialValues}
          setFieldValueRef={formSetFieldValueRef}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingLrId(null);
            setEditingLrRecord(null);
          }}
          submitLabel={editingLrRecord ? "Save Changes" : "Create Lorry Receipt"}
          isLoading={isSubmitting}
          submitDisabled={!editingLrRecord && !seriesInfo?.configured && (!manualSeriesData || manualSeriesData.ranges.length === 0)}
        />
      </EntityDrawer>

      {/* Quick Creation Modals */}
      <QuickCreateConsignerModal
        isOpen={quickConsignerOpen}
        onClose={() => setQuickConsignerOpen(false)}
        onSuccess={handleConsignerCreated}
      />
      <QuickCreateConsigneeModal
        isOpen={quickConsigneeOpen}
        onClose={() => setQuickConsigneeOpen(false)}
        onSuccess={handleConsigneeCreated}
      />
      <QuickCreateLocationModal
        isOpen={quickLocationTarget !== null}
        onClose={() => setQuickLocationTarget(null)}
        onSuccess={handleLocationCreated}
        defaultTitle={quickLocationTarget === "origin" ? "Quick Add Origin Hub / City" : "Quick Add Destination Hub / City"}
      />

      {/* LR View & Print Modal */}
      <LRViewModal
        isOpen={isViewModalOpen}
        lr={selectedLrForView as any}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedLrForView(null);
        }}
      />
    </div>
  );
}
