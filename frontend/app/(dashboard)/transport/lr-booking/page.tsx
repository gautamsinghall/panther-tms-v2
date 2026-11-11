"use client";
import { toast } from "@/lib/toast";

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
  Smartphone,
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
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getActiveOffice, OfficeSummary, getStoredAuth, getStoredNavigation } from "@/lib/auth";
import { canAccessRoute } from "@/lib/permissions";
import { useWorkspaceTabs } from "@/lib/workspace-tabs-context";
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
  seal_no?: string;
  load_type_id?: number;
  load_type?: string;
  load_type_name?: string;
  payment_type?: string;
  eta?: string;
  particulars?: string;
  remarks?: string;
  freight_rate?: string | number;
  freight_amount?: string | number;
  loading_charges?: string | number;
  unloading_charges?: string | number;
  other_charges?: string | number;
  payment_terms?: string;
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
  const searchParams = useSearchParams();
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

  useEffect(() => {
    const requestedRecord = searchParams.get("search");
    if (requestedRecord) setSearchTerm(requestedRecord);
  }, [searchParams]);
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLrId, setEditingLrId] = useState<number | null>(null);
  const [editingLrRecord, setEditingLrRecord] = useState<LRRecord | null>(null);
  const editingLrIdRef = useRef<number | null>(null);
  editingLrIdRef.current = editingLrId;
  const [formInitialValues, setFormInitialValues] = useState<Record<string, any>>({});
  const formSetFieldValueRef = useRef<((name: string, value: any) => void) | null>(null);

  // Track dynamic form selections to update dependent fields (LR Series -> LR No., Consignor -> Address, Consignee -> Address)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
  const [selectedConsignerId, setSelectedConsignerId] = useState<string>("");
  const [selectedConsigneeId, setSelectedConsigneeId] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<LinkedJobData | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const { openMasterTab } = useWorkspaceTabs();

  // View & Print LR state
  const [selectedLrForView, setSelectedLrForView] = useState<LRRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Series Master State
  const [isSeriesLoading, setIsSeriesLoading] = useState(true);
  const [seriesInfo, setSeriesInfo] = useState<any>(null);

  const [manualSeriesData, setManualSeriesData] = useState<{
    document_type: string;
    is_mandatory_manual: boolean;
    default_series_id: number | null;
    ranges: SeriesRangeItem[];
  } | null>(null);

  const isPermitted = useMemo(() => {
    if (typeof window === "undefined") return true;
    const auth = getStoredAuth();
    if (!auth || !auth.user) return true;
    const role = (auth.user.role || "").toUpperCase();
    if (["COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER"].includes(role)) return true;
    const nav = getStoredNavigation();
    if (!nav || !Array.isArray(nav)) return false;
    return nav.some((g: any) =>
      g.items?.some((it: any) => it.href === "/transport/lr-booking" || (g.id === "transport" && it.feature === "lr_booking"))
    );
  }, []);

  const loadData = useCallback(async (targetOffice?: OfficeSummary | null) => {
    if (!isPermitted) {
      setIsLoading(false);
      setIsSeriesLoading(false);
      return;
    }
    setIsLoading(true);
    setIsSeriesLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const office = targetOffice !== undefined ? targetOffice : getActiveOffice();
      setActiveOfficeState(office);
      const officeParam = office?.id ? `?office_id=${office.id}` : "";

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
        apiClient<LRRecord[]>(`/api/v1/transport/lrs${officeParam}`).catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/consigners").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/consignees").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/locations").catch(() => []),
        apiClient<LinkedJobData[]>(`/api/v1/transport/jobs${officeParam}`).catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/billing-clients").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/packing-methods").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/load-types").catch(() => []),
        apiClient<any>(`/api/v1/settings/series/check/LR${officeParam}`).catch(() => null),
        apiClient<any>(`/api/v1/settings/series/manual-ranges/LR${officeParam}`).catch(() => null),
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

      // Auto-sync open create drawer with the new office's series, number and display name
      if (!editingLrIdRef.current) {
        const autoSeries = seriesRes?.series_options?.[0];
        const defaultSeries = manualRangesRes?.ranges?.find((r: any) => r.is_default) || manualRangesRes?.ranges?.[0];
        const newSeriesId = autoSeries ? String(autoSeries.id) : (defaultSeries ? String(defaultSeries.id) : "default");
        const newLrNo = autoSeries?.next_number_formatted || (seriesRes?.configured ? seriesRes?.next_number_formatted : "") || (defaultSeries?.available_options?.[0]?.value || "");
        const officeNameStr = office ? `${office.name} (${office.code || "HO"})` : "Head Office (HO)";

        setSelectedSeriesId(newSeriesId);
        setFormInitialValues((prev) => ({
          ...prev,
          issuing_office_display: officeNameStr,
          issuing_office_id: office?.id,
          lr_series_id: newSeriesId,
          lr_number: newLrNo,
        }));

        if (formSetFieldValueRef.current) {
          formSetFieldValueRef.current("issuing_office_display", officeNameStr);
          formSetFieldValueRef.current("issuing_office_id", office?.id);
          formSetFieldValueRef.current("lr_series_id", newSeriesId);
          formSetFieldValueRef.current("lr_number", newLrNo);
        }
      }
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load LRs.");
    } finally {
      setIsLoading(false);
      setIsSeriesLoading(false);
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

    const handleOfficeChange = (e: Event) => {
      const customEvent = e as CustomEvent<OfficeSummary>;
      const newOffice = customEvent.detail || getActiveOffice();
      loadData(newOffice);
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
    if (seriesInfo?.series_options && seriesInfo.series_options.length > 0) {
      return seriesInfo.series_options.map((s: any) => ({
        value: String(s.id),
        label: s.display_label || `${s.series_name} (${s.next_number_formatted})`,
      }));
    }
    if (manualSeriesData?.ranges && manualSeriesData.ranges.length > 0) {
      return manualSeriesData.ranges.map((r) => ({
        value: String(r.id),
        label: `${r.series_name || "LR Series"} · ${r.prefix || ""}${r.starting_number} to ${r.prefix || ""}${r.end_number || "..."}${r.suffix || ""} (${r.available_count} available)`,
      }));
    }
    return [{
      label: isSeriesLoading
        ? "Checking LR series..."
        : seriesInfo?.configured
        ? `Automatic Series (${seriesInfo.next_number_formatted})`
        : "Default LR Sequence",
      value: "default",
    }];
  }, [seriesInfo, manualSeriesData, isSeriesLoading]);

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
      const fallback = editingLrRecord?.lr_number || (isSeriesLoading ? "Loading..." : seriesInfo?.configured ? seriesInfo?.next_number_formatted : "") || "";
      return [{ label: fallback || (isSeriesLoading ? "Checking series..." : "No Active Series"), value: fallback }];
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
    ...billingCustomers
      .filter((c: any) => c.is_active !== false || String(c.id) === String(editingLrRecord?.billing_customer_id))
      .map((c: any) => ({
        label: c.name || `Client #${c.id}`,
        value: String(c.id),
        subLabel: c.city ? `City: ${c.city}` : undefined,
      })),
  ], [billingCustomers, editingLrRecord]);

  const locationOptions = useMemo(() => [
    { label: "Select Location Hub...", value: "" },
    ...locations
      .filter((l: any) => l.is_active !== false || String(l.id) === String(editingLrRecord?.origin_location_id) || String(l.id) === String(editingLrRecord?.destination_location_id))
      .map((l: any) => ({
        label: l.city_name || `Location #${l.id}`,
        value: String(l.id),
      })),
  ], [locations, editingLrRecord]);

  const consignerOptions = useMemo(() => [
    { label: "Select Consignor (Sender)...", value: "" },
    ...consigners
      .filter((c: any) => c.is_active !== false || String(c.id) === String(editingLrRecord?.consigner_id))
      .map((c: any) => ({
        label: c.name || `Consignor #${c.id}`,
        value: String(c.id),
        subLabel: [c.city, c.state].filter(Boolean).join(", "),
      })),
  ], [consigners, editingLrRecord]);

  const consigneeOptions = useMemo(() => [
    { label: "Select Consignee (Receiver)...", value: "" },
    ...consignees
      .filter((c: any) => c.is_active !== false || String(c.id) === String(editingLrRecord?.consignee_id))
      .map((c: any) => ({
        label: c.name || `Consignee #${c.id}`,
        value: String(c.id),
        subLabel: [c.city, c.state].filter(Boolean).join(", "),
      })),
  ], [consignees, editingLrRecord]);

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
      freight_amount: freshData.freight_amount ? String(freshData.freight_amount) : "",
      advance_amount: freshData.advance_amount ? String(freshData.advance_amount) : "",
      loading_charges: freshData.loading_charges ? String(freshData.loading_charges) : "",
      unloading_charges: freshData.unloading_charges ? String(freshData.unloading_charges) : "",
      other_charges: freshData.other_charges ? String(freshData.other_charges) : "",
      payment_terms: freshData.payment_terms || "TO_PAY",
      vehicle_number: freshData.vehicle_number || "",
      vehicle_type: freshData.vehicle_type || "",
      package_count: freshData.package_count || 0,
      packing_method_id: freshData.packing_method_id ? String(freshData.packing_method_id) : "",
      actual_weight_mt: freshData.actual_weight_mt ? String(freshData.actual_weight_mt) : "0.000",
      chargeable_weight_mt: freshData.chargeable_weight_mt ? String(freshData.chargeable_weight_mt) : "0.000",
      bill_of_entry: freshData.bill_of_entry || "",
      container_no: freshData.container_no || "",
      seal_no: freshData.seal_no || "",
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

    const autoSeries = seriesInfo?.series_options?.[0];
    const defaultSeries = manualSeriesData?.ranges?.find((r) => r.is_default) || manualSeriesData?.ranges?.[0];
    const initialSeriesId = autoSeries ? String(autoSeries.id) : (defaultSeries ? String(defaultSeries.id) : "default");
    setSelectedSeriesId(initialSeriesId);

    const matchedJob = initialJobId ? jobs.find((j: any) => String(j.id) === String(initialJobId)) : null;
    setSelectedJob(matchedJob || null);

    const initialConsignerId = matchedJob?.consigner_id ? String(matchedJob.consigner_id) : "";
    const initialConsigneeId = matchedJob?.consignee_id ? String(matchedJob.consignee_id) : "";
    setSelectedConsignerId(initialConsignerId);
    setSelectedConsigneeId(initialConsigneeId);

    const initialLrNo = autoSeries?.next_number_formatted || (seriesInfo?.configured ? seriesInfo?.next_number_formatted : "") || (defaultSeries?.available_options?.[0]?.value || "");

    const initialInvoiceItem = createEmptyInvoiceItem();
    if (matchedJob?.cargo_description) {
      initialInvoiceItem.particulars = matchedJob.cargo_description;
    }

    const currentOffice = getActiveOffice();
    if (currentOffice) setActiveOfficeState(currentOffice);
    const officeNameStr = currentOffice ? `${currentOffice.name} (${currentOffice.code || "HO"})` : activeOfficeDisplay;

    setFormInitialValues({
      job_id: matchedJob ? String(matchedJob.id) : "",
      booking_status: "Booked",
      issuing_office_display: officeNameStr,
      issuing_office_id: currentOffice?.id,
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
      freight_amount: "",
      advance_amount: "",
      loading_charges: "",
      unloading_charges: "",
      other_charges: "",
      payment_terms: "TO_PAY",
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
      seal_no: "",
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

  const handledJobIdsRef = useRef<Set<string>>(new Set());
  const handledEditIdsRef = useRef<Set<string>>(new Set());

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setEditingLrId(null);
    setEditingLrRecord(null);
    setDrawerError(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("job_id") || url.searchParams.has("id") || url.searchParams.has("edit")) {
        url.searchParams.delete("job_id");
        url.searchParams.delete("id");
        url.searchParams.delete("edit");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }
  }, []);

  // Auto-open create drawer if URL contains ?job_id=...
  useEffect(() => {
    if (typeof window !== "undefined" && jobs.length > 0 && !isDrawerOpen && !editingLrId) {
      const sp = new URLSearchParams(window.location.search);
      const qJobId = sp.get("job_id");
      if (qJobId && !handledJobIdsRef.current.has(qJobId)) {
        handledJobIdsRef.current.add(qJobId);
        openCreateDrawer(qJobId);
      }
    }
  }, [jobs, isDrawerOpen, editingLrId, openCreateDrawer]);

  // Auto-open edit drawer if URL contains ?id=... or ?edit=...
  useEffect(() => {
    if (typeof window !== "undefined" && !isDrawerOpen && !editingLrId) {
      const sp = new URLSearchParams(window.location.search);
      const qEditId = sp.get("id") || sp.get("edit");
      if (qEditId && !handledEditIdsRef.current.has(qEditId)) {
        handledEditIdsRef.current.add(qEditId);
        apiClient<LRRecord>(`/api/v1/transport/lrs/${qEditId}`)
          .then((record) => {
            if (record && record.id) {
              openEditDrawer(record);
            }
          })
          .catch(() => {});
      }
    }
  }, [isDrawerOpen, editingLrId, openEditDrawer]);

  const handleSubmit = async (values: Record<string, any>) => {
    if (isSubmitting) return;
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
      const itemsToSave = validItems.map((it) => ({
        id: it.id || undefined,
        invoice_no: it.invoice_no && String(it.invoice_no).trim() ? String(it.invoice_no).trim() : null,
        invoice_date: it.invoice_date && String(it.invoice_date).trim() ? String(it.invoice_date).trim() : null,
        invoice_value: it.invoice_value && !isNaN(parseFloat(String(it.invoice_value))) ? parseFloat(String(it.invoice_value)) : 0,
        eway_bill_number: it.eway_bill_number && String(it.eway_bill_number).trim() ? String(it.eway_bill_number).trim() : null,
        eway_bill_date: it.eway_bill_date && String(it.eway_bill_date).trim() ? String(it.eway_bill_date).trim() : null,
        eway_bill_expiry: it.eway_bill_expiry && String(it.eway_bill_expiry).trim() ? String(it.eway_bill_expiry).trim() : null,
        cha_job_number: it.cha_job_number && String(it.cha_job_number).trim() ? String(it.cha_job_number).trim() : null,
        particulars: it.particulars && String(it.particulars).trim() ? String(it.particulars).trim() : null,
        remarks: it.remarks && String(it.remarks).trim() ? String(it.remarks).trim() : null,
      }));

      const invNos = itemsToSave.map((i) => String(i.invoice_no || "").trim()).filter(Boolean);
      const ewbNos = itemsToSave.map((i) => String(i.eway_bill_number || "").trim()).filter(Boolean);
      const firstItem = itemsToSave[0] || {};
      const totalInvVal = itemsToSave.reduce((sum, i) => sum + (parseFloat(String(i.invoice_value || 0)) || 0), 0);
      const combinedParts = itemsToSave.map((i) => String(i.particulars || "").trim()).filter(Boolean).join("; ");

      const freightAmt = parseFloat(values.freight_amount) || 0;
      const advAmt = parseFloat(values.advance_amount) || 0;
      const loadAmt = parseFloat(values.loading_charges) || 0;
      const unloadAmt = parseFloat(values.unloading_charges) || 0;
      const otherAmt = parseFloat(values.other_charges) || 0;
      const totFreight = freightAmt + loadAmt + unloadAmt + otherAmt;
      const balAmt = totFreight - advAmt;

      const payload = {
        ...values,
        freight_rate: freightAmt,
        freight_amount: freightAmt,
        advance_amount: advAmt,
        loading_charges: loadAmt,
        unloading_charges: unloadAmt,
        other_charges: otherAmt,
        total_freight_amount: totFreight,
        balance_amount: balAmt,
        payment_terms: values.payment_terms || "TO_PAY",
        lr_number: values.lr_number ? String(values.lr_number).trim() : undefined,
        job_id: values.job_id ? parseInt(values.job_id, 10) : null,
        booking_status: values.booking_status || "Booked",
        issuing_office_id: activeOffice?.id || (editingLrRecord ? editingLrRecord.issuing_office_id : undefined),
        lr_series_id: values.lr_series_id && values.lr_series_id !== "default" ? parseInt(values.lr_series_id, 10) : null,
        dispatch_date: values.dispatch_date || new Date().toISOString().split("T")[0],
        appointment_date: values.appointment_date && String(values.appointment_date).trim() ? String(values.appointment_date).trim() : null,
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
        eway_bill_number: ewbNos.length > 0 ? ewbNos.join(", ") : (values.eway_bill_number && String(values.eway_bill_number).trim() ? String(values.eway_bill_number).trim() : null),
        eway_bill_date: firstItem.eway_bill_date || (values.eway_bill_date && String(values.eway_bill_date).trim() ? String(values.eway_bill_date).trim() : null),
        eway_bill_expiry: firstItem.eway_bill_expiry || (values.eway_bill_expiry && String(values.eway_bill_expiry).trim() ? String(values.eway_bill_expiry).trim() : null),
        invoice_no: invNos.length > 0 ? invNos.join(", ") : (values.invoice_no && String(values.invoice_no).trim() ? String(values.invoice_no).trim() : null),
        invoice_date: firstItem.invoice_date || (values.invoice_date && String(values.invoice_date).trim() ? String(values.invoice_date).trim() : null),
        invoice_value: totalInvVal > 0 ? totalInvVal : (parseFloat(values.invoice_value) || 0),
        cha_job_number: firstItem.cha_job_number || (values.cha_job_number && String(values.cha_job_number).trim() ? String(values.cha_job_number).trim() : null),
        package_count: parseInt(values.package_count, 10) || 0,
        packing_method_id: values.packing_method_id ? parseInt(values.packing_method_id, 10) : null,
        actual_weight_mt: parseFloat(values.actual_weight_mt) || 0,
        chargeable_weight_mt: parseFloat(values.chargeable_weight_mt) || 0,
        bill_of_entry: values.bill_of_entry ? String(values.bill_of_entry).trim() : null,
        container_no: values.container_no ? String(values.container_no).trim() : null,
        seal_no: values.seal_no ? String(values.seal_no).trim() : null,
        load_type_id: values.load_type_id ? parseInt(values.load_type_id, 10) : null,
        load_type: selectedLoadType?.name || null,
        payment_type: values.payment_type || "To Be Billed",
        eta: values.eta || null,
        particulars: combinedParts || (values.particulars ? String(values.particulars).trim() : null),
        remarks: values.remarks ? String(values.remarks).trim() : null,
      };

      const wasEditing = Boolean(editingLrId);
      let savedRecord: LRRecord;
      if (wasEditing) {
        // Edit existing LR record (PUT) - does NOT create duplicate records
        savedRecord = await apiClient<LRRecord>(`/api/v1/transport/lrs/${editingLrId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        // Create new LR record (POST)
        savedRecord = await apiClient<LRRecord>("/api/v1/transport/lrs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      // Clear URL query parameter to avoid auto-reopening or duplicate submissions
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("job_id") || url.searchParams.has("id") || url.searchParams.has("edit")) {
          url.searchParams.delete("job_id");
        url.searchParams.delete("id");
        url.searchParams.delete("edit");
          window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
        }
      }

      setIsDrawerOpen(false);
      setEditingLrId(null);
      setEditingLrRecord(null);
      setDrawerError(null);
      await loadData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("panther_jobs_updated"));
      }

      toast.success(wasEditing ? "Lorry Receipt updated successfully. Opening print preview." : "Lorry Receipt created successfully.");
      if (savedRecord) {
        setSelectedLrForView(savedRecord);
        setIsViewModalOpen(true);
      }
    } catch (err: any) {
      const message = err.message || "Failed to save Lorry Receipt. Please review the form and correct the required fields.";
      setDrawerError(message);
      toast.error(message);
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
          onAddNew: () => router.push("/transport/jobs"),
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
          label: "Select Series",
          type: "select",
          disabled: Boolean(editingLrId) || seriesRangeOptions.length <= 1,
          disabledReason: editingLrId
            ? "Cannot modify series of an existing LR"
            : seriesRangeOptions.length <= 1
            ? "Only one series configured for this branch"
            : undefined,
          defaultValue: selectedSeriesId || (seriesRangeOptions[0]?.value ?? "default"),
          options: seriesRangeOptions,
          onChange: (newSeriesId) => {
            setSelectedSeriesId(newSeriesId);
            const matchedOption = seriesInfo?.series_options?.find((s: any) => String(s.id) === String(newSeriesId));
            const matchedManual = manualSeriesData?.ranges?.find((r) => String(r.id) === String(newSeriesId));
            const nextVal = matchedOption?.next_number_formatted || matchedManual?.available_options?.[0]?.value || seriesInfo?.next_number_formatted || "";
            if (nextVal) {
              formSetFieldValueRef.current?.("lr_number", nextVal);
            }
          },
          onAddNew: canAccessRoute("/settings/series-master") ? () => router.push("/settings/series-master") : undefined,
          addNewLabel: canAccessRoute("/settings/series-master") ? "+ Manage LR Series" : undefined,
          addNewTitle: canAccessRoute("/settings/series-master") ? "Configure Series Batches in Settings" : undefined,
        },
        {
          name: "lr_number",
          label: "LR Number (Locked)",
          type: "text",
          disabled: true,
          disabledReason: "Automatically assigned from the selected Series upon saving.",
          required: false,
          placeholder: isSeriesLoading
            ? "Checking series..."
            : (seriesInfo?.configured ? seriesInfo?.next_number_formatted : "") || "Auto-allocated",
          helperText: isSeriesLoading
            ? "Checking active series configuration..."
            : seriesInfo?.configured
            ? `Preview: ${seriesInfo.next_number_formatted}. Unique sequence number is generated automatically from the active series.`
            : "No active series configured for this branch. Configure in Settings → Series Master.",
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
          onAddNew: () => openMasterTab({ type: "billing_client", title: "Add Billing Client", onSuccess: handleBillingClientCreated }),
          addNewLabel: "+ New Customer",
          addNewTitle: "Opens Billing Customer creation in a new TMS tab without losing form progress",
          helperText: "Click '+' to create customer in a new tab; automatically selected upon return.",
        },
        {
          name: "origin_location_id",
          label: "Origin Hub",
          type: "select",
          required: true,
          options: locationOptions,
          placeholder: "Select origin city / dispatch hub",
          onAddNew: () => openMasterTab({ type: "location", title: "Add Location", onSuccess: (rec) => handleLocationCreated(rec, "origin_location_id") }),
          addNewLabel: "+ New Location",
          addNewTitle: "Opens Location creation in a new TMS tab without losing form progress",
        },
        {
          name: "destination_location_id",
          label: "Destination Hub",
          type: "select",
          required: true,
          options: locationOptions,
          placeholder: "Select delivery city / destination hub",
          onAddNew: () => openMasterTab({ type: "location", title: "Add Location", onSuccess: (rec) => handleLocationCreated(rec, "destination_location_id") }),
          addNewLabel: "+ New Location",
          addNewTitle: "Opens Location creation in a new TMS tab without losing form progress",
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
          onAddNew: () => openMasterTab({ type: "consigner", title: "Add Consignor", onSuccess: handleConsignerCreated }),
          addNewLabel: "+ New Consignor",
          addNewTitle: "Opens Consignor creation in a new TMS tab without losing form progress",
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
          onAddNew: () => openMasterTab({ type: "consignee", title: "Add Consignee", onSuccess: handleConsigneeCreated }),
          addNewLabel: "+ New Consignee",
          addNewTitle: "Opens Consignee creation in a new TMS tab without losing form progress",
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
          onAddNew: () => openMasterTab({ type: "load_type", title: "Add Load Type", onSuccess: handleLoadTypeCreated }),
          addNewLabel: "+ New Load Type",
          addNewTitle: "Opens Load Type creation in a new TMS tab without losing form progress",
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
          onAddNew: () => openMasterTab({ type: "packing_method", title: "Add Packing Method", onSuccess: handlePackingMethodCreated }),
          addNewLabel: "+ New Packing Method",
          addNewTitle: "Opens Packing Method creation in a new TMS tab without losing form progress",
          helperText: "Managed under General > Packing Method; automatically selected here.",
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
        {
          name: "seal_no",
          label: "Seal No.",
          type: "text",
          placeholder: "Enter seal number",
        },
      ],
    },
    {
      id: "sec_commercial_freight",
      title: "Commercial Freight & Billing Terms",
      description: "Basic freight charges, handling add-ons, driver/transporter advances, and payment terms",
      columns: 2,
      fields: [
        {
          name: "freight_amount",
          label: "Basic Freight Amount (₹)",
          type: "number",
          placeholder: "e.g. 15000.00",
          helperText: "Agreed base freight charges for the consignment.",
        },
        {
          name: "advance_amount",
          label: "Advance Amount (₹)",
          type: "number",
          placeholder: "e.g. 5000.00",
          helperText: "Advance paid at booking.",
        },
        {
          name: "loading_charges",
          label: "Loading / Handling Charges (₹)",
          type: "number",
          placeholder: "0.00",
        },
        {
          name: "unloading_charges",
          label: "Unloading Charges (₹)",
          type: "number",
          placeholder: "0.00",
        },
        {
          name: "other_charges",
          label: "Other / Statistical Charges (₹)",
          type: "number",
          placeholder: "0.00",
        },
        {
          name: "payment_terms",
          label: "Payment Terms",
          type: "select",
          options: [
            { label: "To Pay (Consignee)", value: "TO_PAY" },
            { label: "Paid (Consignor)", value: "PAID" },
            { label: "To Be Billed (TBB)", value: "TBB" },
          ],
          defaultValue: "TO_PAY",
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
  ]);

  const columns: ColumnDef<LRRecord>[] = [
    {
      key: "lr_number",
      header: "LR / GR Number",
      sortable: true,
      minWidth: "140px",
      defaultVisible: true,
      cell: (row) => (
        <button
          type="button"
          onClick={() => {
            setSelectedLrForView(row);
            setIsViewModalOpen(true);
          }}
          className="font-mono font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition-colors text-xs text-left cursor-pointer"
          title="Click to view and print Lorry Receipt"
        >
          {row.lr_number}
        </button>
      ),
    },
    {
      key: "lr_date",
      header: "Booking Date",
      sortable: true,
      minWidth: "115px",
      defaultVisible: true,
      cell: (row) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
          {formatDate(row.dispatch_date || row.lr_date)}
        </span>
      ),
    },
    {
      key: "booking_status",
      header: "Booking Status",
      align: "center",
      minWidth: "120px",
      defaultVisible: true,
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
      minWidth: "130px",
      defaultVisible: true,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "fastag_tracking",
      header: "FASTag Tracking",
      align: "center",
      minWidth: "140px",
      defaultVisible: true,
      cell: (row) => {
        if (!row.vehicle_number) {
          return <span className="text-xs text-slate-400 italic">No vehicle</span>;
        }
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/tracking/fastag?vehicle=${encodeURIComponent(row.vehicle_number)}`);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors shadow-2xs group cursor-pointer whitespace-nowrap"
            title={`Track FASTag toll movements for ${row.vehicle_number}`}
          >
            <Navigation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Track FASTag</span>
          </button>
        );
      },
    },
    {
      key: "consigner_name",
      header: "Consignor (From)",
      sortable: true,
      minWidth: "180px",
      defaultVisible: true,
      cell: (row) => (
        <div className="text-xs max-w-[200px]">
          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block" title={row.consigner_name}>
            {row.consigner_name || "—"}
          </span>
          {row.consigner_address && (
            <span className="text-[11px] text-slate-400 truncate block" title={row.consigner_address}>
              {row.consigner_address}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "consignee_name",
      header: "Consignee (To)",
      sortable: true,
      minWidth: "180px",
      defaultVisible: true,
      cell: (row) => (
        <div className="text-xs max-w-[200px]">
          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block" title={row.consignee_name}>
            {row.consignee_name || "—"}
          </span>
          {row.consignee_address && (
            <span className="text-[11px] text-slate-400 truncate block" title={row.consignee_address}>
              {row.consignee_address}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "billing_customer_name",
      header: "Billing Customer",
      sortable: true,
      minWidth: "170px",
      defaultVisible: true,
      cell: (row) => (
        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate block max-w-[190px]" title={row.billing_customer_name}>
          {row.billing_customer_name || "—"}
        </span>
      ),
    },
    {
      key: "origin_city",
      header: "Origin",
      sortable: true,
      minWidth: "130px",
      defaultVisible: true,
      cell: (row) => (
        <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
          {row.origin_city || "—"}
        </span>
      ),
    },
    {
      key: "destination_city",
      header: "Destination",
      sortable: true,
      minWidth: "130px",
      defaultVisible: true,
      cell: (row) => (
        <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
          {row.destination_city || "—"}
        </span>
      ),
    },
    {
      key: "vehicle_number",
      header: "Vehicle Number",
      sortable: true,
      minWidth: "130px",
      defaultVisible: true,
      cell: (row) => (
        <VehiclePlate vehicleNumber={row.vehicle_number} source={row.vehicle_source as any} />
      ),
    },
    {
      key: "vehicle_source",
      header: "Vehicle Source",
      minWidth: "115px",
      defaultVisible: false,
      cell: (row) => (
        <span className={cn(
          "px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border",
          row.vehicle_source === "MARKET"
            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
        )}>
          {row.vehicle_source || "FLEET"}
        </span>
      ),
    },
    {
      key: "driver_name",
      header: "Driver Name",
      minWidth: "130px",
      defaultVisible: true,
      cell: (row) => (
        <span className="text-xs text-slate-800 dark:text-slate-200">
          {row.driver_name || "—"}
        </span>
      ),
    },
    {
      key: "driver_phone",
      header: "Driver Phone",
      minWidth: "120px",
      defaultVisible: false,
      cell: (row) => (
        <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
          {row.driver_phone || "—"}
        </span>
      ),
    },
    {
      key: "issuing_office_name",
      header: "Issuing Office",
      sortable: true,
      minWidth: "120px",
      defaultVisible: false,
      cell: (row) => (
        <span className="text-xs text-slate-700 dark:text-slate-300">
          {row.issuing_office_name || "—"}
        </span>
      ),
    },
    {
      key: "chargeable_weight_mt",
      header: "Weight (MT)",
      sortable: true,
      isNumeric: true,
      align: "right",
      minWidth: "115px",
      defaultVisible: true,
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono">
          {row.chargeable_weight_mt ? `${parseFloat(String(row.chargeable_weight_mt))} MT` : "0 MT"}
        </span>
      ),
    },
    {
      key: "actual_weight_mt",
      header: "Actual Wt (MT)",
      sortable: true,
      isNumeric: true,
      align: "right",
      minWidth: "115px",
      defaultVisible: false,
      cell: (row) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
          {row.actual_weight_mt ? `${parseFloat(String(row.actual_weight_mt))} MT` : "—"}
        </span>
      ),
    },
    {
      key: "package_count",
      header: "Packages",
      sortable: true,
      isNumeric: true,
      align: "right",
      minWidth: "95px",
      defaultVisible: true,
      cell: (row) => (
        <span className="text-xs text-slate-800 dark:text-slate-200 font-mono">
          {row.package_count || 0}
        </span>
      ),
    },
    {
      key: "load_type",
      header: "Load Type",
      minWidth: "105px",
      defaultVisible: false,
      cell: (row) => (
        row.load_type_name || row.load_type ? (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
            {row.load_type_name || row.load_type}
          </span>
        ) : "—"
      ),
    },
    {
      key: "particulars",
      header: "Cargo / Goods",
      minWidth: "140px",
      defaultVisible: false,
      cell: (row) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 truncate block max-w-[150px]" title={row.particulars}>
          {row.particulars || "—"}
        </span>
      ),
    },
    {
      key: "total_freight_amount",
      header: "Freight Amount",
      sortable: true,
      isNumeric: true,
      align: "right",
      minWidth: "125px",
      defaultVisible: false,
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono">
          {formatCurrency(row.total_freight_amount)}
        </span>
      ),
    },
    {
      key: "advance_amount",
      header: "Advance",
      sortable: true,
      isNumeric: true,
      align: "right",
      minWidth: "110px",
      defaultVisible: false,
      cell: (row) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
          {formatCurrency(row.advance_amount)}
        </span>
      ),
    },
    {
      key: "balance_amount",
      header: "Balance",
      sortable: true,
      isNumeric: true,
      align: "right",
      minWidth: "115px",
      defaultVisible: true,
      cell: (row) => (
        <span className={cn(
          "font-mono font-bold text-xs",
          parseFloat(String(row.balance_amount)) > 0
            ? "text-rose-600 dark:text-rose-400"
            : "text-emerald-600 dark:text-emerald-400"
        )}>
          {formatCurrency(row.balance_amount)}
        </span>
      ),
    },
    {
      key: "eway_bill_number",
      header: "E-Way Bill No.",
      minWidth: "130px",
      defaultVisible: false,
      cell: (row) => (
        <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
          {row.eway_bill_number || "—"}
        </span>
      ),
    },
    {
      key: "job_number",
      header: "Job Number",
      minWidth: "120px",
      defaultVisible: false,
      cell: (row) => (
        <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
          {row.job_number || "—"}
        </span>
      ),
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
          toast.error(err.message || "Failed to dispatch LR.");
        }
      },
    },
    {
      label: "Start SIM Tracking",
      icon: <Smartphone className="w-3.5 h-3.5 text-indigo-600" />,
      onClick: async (row) => {
        if (!row.vehicle_number || !row.driver_phone) {
          toast.info(`LR #${row.lr_number} requires vehicle number and driver mobile phone to start SIM tracking.`);
          return;
        }
        try {
          await apiClient("/api/v1/transport/tracking/sim/start", {
            method: "POST",
            body: JSON.stringify({
              lr_id: row.id,
              lr_number: row.lr_number,
              vehicle_number: row.vehicle_number,
              driver_phone: row.driver_phone,
              driver_name: row.driver_name,
            }),
          });
          router.push("/tracking/sim");
        } catch (err: any) {
          toast.error(err.message || "Failed to start SIM tracking.");
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

  const handleBillingClientCreated = (newClient: { id: number | string; label?: string; name?: string }) => {
    setBillingCustomers((prev) => [{ id: Number(newClient.id), name: newClient.name || newClient.label }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, billing_customer_id: String(newClient.id) }));
    formSetFieldValueRef.current?.("billing_customer_id", String(newClient.id));
  };

  const handleConsignerCreated = (newConsigner: { id: number | string; name?: string; label?: string }) => {
    setConsigners((prev) => [{ id: Number(newConsigner.id), name: newConsigner.name || newConsigner.label }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, consigner_id: String(newConsigner.id) }));
    formSetFieldValueRef.current?.("consigner_id", String(newConsigner.id));
    setSelectedConsignerId(String(newConsigner.id));
  };

  const handleConsigneeCreated = (newConsignee: { id: number | string; name?: string; label?: string }) => {
    setConsignees((prev) => [{ id: Number(newConsignee.id), name: newConsignee.name || newConsignee.label }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, consignee_id: String(newConsignee.id) }));
    formSetFieldValueRef.current?.("consignee_id", String(newConsignee.id));
    setSelectedConsigneeId(String(newConsignee.id));
  };

  const handleLocationCreated = (newLoc: { id: number | string; city_name?: string; label?: string }, field: "origin_location_id" | "destination_location_id") => {
    setLocations((prev) => [{ id: Number(newLoc.id), city_name: newLoc.city_name || newLoc.label }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, [field]: String(newLoc.id) }));
    formSetFieldValueRef.current?.(field, String(newLoc.id));
  };

  const handleLoadTypeCreated = (newLt: { id: number | string; name?: string; label?: string }) => {
    const val = newLt.name || newLt.label || String(newLt.id);
    setLoadTypes((prev) => [{ id: Number(newLt.id), name: val }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, load_type: val }));
    formSetFieldValueRef.current?.("load_type", val);
  };

  const handlePackingMethodCreated = (newMethod: { id: number | string; name?: string; label?: string }) => {
    const val = newMethod.name || newMethod.label || String(newMethod.id);
    setPackingMethods((prev) => [{ id: Number(newMethod.id), name: val }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, packing_method_id: String(newMethod.id) }));
    formSetFieldValueRef.current?.("packing_method_id", String(newMethod.id));
  };

  if (!isPermitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center mb-4 text-rose-600 dark:text-rose-400">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
          You don&apos;t have access to LR Booking. Please contact your Company Admin if you need access.
        </p>
        <Button onClick={() => router.push("/")} variant="outline">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lorry Receipts (GR / LR)"
        description="Track freight movements, dispatch states, arrivals, and POD verification."
        primaryAction={{
          label: "New LR Booking",
          icon: <Plus className="w-4 h-4" />,
          onClick: openCreateDrawer,
        }}
      />

      {!isSeriesLoading && seriesInfo && !seriesInfo.configured && (!manualSeriesData || manualSeriesData.ranges.length === 0) && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ Manual Series Required:</span>
            <span>
              {canAccessRoute("/settings/series-master")
                ? "Manual series must be configured in Series Master before LRs can be booked."
                : "Manual series must be configured by your Company Admin before LRs can be booked."}
            </span>
          </div>
          {canAccessRoute("/settings/series-master") && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => router.push("/settings/series-master")}
              className="text-xs bg-white dark:bg-[#1A1823] text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/50 shrink-0"
            >
              Configure LR Series
            </Button>
          )}
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
        tableId="lr_booking_table"
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
          label: "New LR Booking",
          onClick: openCreateDrawer,
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={editingLrRecord ? `Edit Lorry Receipt: ${editingLrRecord.lr_number}` : "Create Lorry Receipt (GR / LR)"}
        description={
          editingLrRecord
            ? "Update commercial consignment fields, transit routes, and compliance data without creating duplicate records."
            : "Record commercial consignment, assigned truck, freight terms, and dispatch parties for transport authorization."
        }
        width="xl"
      >
        {/* Office & Series Context Banner */}
        <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/90 to-purple-50/70 dark:from-[#171928] dark:to-[#1B1728] border border-indigo-200/80 dark:border-[#2E3150] text-indigo-950 dark:text-indigo-200 text-xs shadow-2xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" />
                Issuing Office:
              </span>
              <span className="font-bold text-indigo-800 dark:text-indigo-300 bg-white dark:bg-[#10121D] px-2 py-0.5 rounded border border-indigo-200 dark:border-[#383C66]">
                {activeOfficeDisplay}
              </span>
            </div>
            {activeSeriesObj ? (
              <div className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                Series Batch: <span className="font-bold text-slate-900 dark:text-white">{activeSeriesObj.starting_number} – {activeSeriesObj.end_number || "..."}</span>
              </div>
            ) : seriesInfo?.configured ? (
              <div className="font-mono text-slate-600 dark:text-slate-400 text-[11px] flex items-center gap-1.5">
                Next LR No: <span className="font-bold text-indigo-900 dark:text-indigo-200 bg-white dark:bg-[#10121D] px-2 py-0.5 rounded border border-indigo-200 dark:border-[#383C66]">{seriesInfo.next_number_formatted}</span>
              </div>
            ) : null}
          </div>
          {activeSeriesObj && (
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-indigo-100 dark:border-[#272A42] text-slate-600 dark:text-slate-400">
              <span>{activeSeriesObj.used_count}{" "}vouchers recorded</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60">
                {activeSeriesObj.available_count}{" "}leaves available
              </span>
            </div>
          )}
        </div>

        {/* Unconfigured Series Warning Alert */}
        {!editingLrRecord && !seriesInfo?.configured && (!manualSeriesData || manualSeriesData.ranges.length === 0) && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 dark:bg-[#201418] border border-rose-200 dark:border-[#4E232B] text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-950 dark:text-rose-100">LR Series Not Configured</h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  No active series configured for Lorry Receipt in this issuing office ({activeOfficeDisplay}). LR numbers cannot be generated and this entry cannot be saved until{" "}
                  {canAccessRoute("/settings/series-master")
                    ? "you setup or import the default series template in Settings."
                    : "your Company Admin sets up the series in Series Master."}
                </p>
              </div>
            </div>
            {canAccessRoute("/settings/series-master") && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.push("/settings/series-master")}
                className="bg-white dark:bg-[#161218] text-rose-700 dark:text-rose-300 border-rose-300 dark:border-[#5C2731] hover:bg-rose-50 dark:hover:bg-[#26161D] text-xs shrink-0 font-semibold"
              >
                Setup Series in Settings
              </Button>
            )}
          </div>
        )}

        {/* In-drawer Error Alert */}
        {drawerError && (
          <div
            role="alert"
            className="mb-4 p-4 rounded-xl bg-rose-50 dark:bg-[#201418] border border-rose-300 dark:border-[#4E232B] text-rose-900 dark:text-rose-200 flex items-start justify-between gap-3 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-950 dark:text-rose-100">Unable to Save Lorry Receipt</h4>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">{drawerError}</p>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                  All entered details have been preserved. Please resolve the highlighted issue and submit again.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDrawerError(null)}
              className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-300 text-xs font-semibold px-2 py-1 rounded cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <Form
          key={editingLrId ? `edit-${editingLrId}` : `create-${activeOffice?.id ?? "all"}`}
          sections={formSections}
          initialValues={formInitialValues}
          setFieldValueRef={formSetFieldValueRef}
          onSubmit={handleSubmit}
          onValidationError={(errors) => {
            toast.error(`Please complete: ${errors[0]?.label || "the highlighted required fields"}.`);
          }}
          onCancel={handleCloseDrawer}
          submitLabel={editingLrRecord ? "Save Changes" : "Create Lorry Receipt"}
          isLoading={isSubmitting}
          submitDisabled={!editingLrRecord && !seriesInfo?.configured && (!manualSeriesData || manualSeriesData.ranges.length === 0)}
        />
      </EntityDrawer>

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
