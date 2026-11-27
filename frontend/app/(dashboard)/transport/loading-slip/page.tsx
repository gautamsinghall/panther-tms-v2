"use client";
import { toast } from "@/lib/toast";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Plus,
  Truck,
  FileSignature,
  Wallet,
  IndianRupee,
  Pencil,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { Form } from "@/components/forms/form";
import { KpiCard } from "@/components/ui/kpi-card";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getActiveOffice, getStoredAuth, getStoredNavigation, OfficeSummary } from "@/lib/auth";
import { canAccessRoute } from "@/lib/permissions";
import { useWorkspaceTabs } from "@/lib/workspace-tabs-context";

interface LoadingSlipRecord {
  id: number;
  slip_number: string;
  slip_date: string;
  slip_series_id?: number | null;
  issuing_office_id?: number | null;
  issuing_office_name?: string | null;
  issuing_office_code?: string | null;
  vehicle_number: string;
  consigner_id?: number | null;
  consigner_name?: string | null;
  phone: string;
  email?: string | null;
  pan?: string | null;
  lorry_coordinator?: string | null;
  lorry_coordinator_phone?: string | null;
  origin_location_id?: number | null;
  destination_location_id?: number | null;
  origin_city?: string | null;
  origin_location_display?: string | null;
  destination_city?: string | null;
  destination_location_display?: string | null;
  loading_point?: string | null;
  unloading_point?: string | null;
  lr_id?: number | null;
  lr_number?: string | null;
  loading_date?: string | null;
  remark?: string | null;
  total_freight: string | number;
  advance_amount: string | number;
  detention_charge: string | number;
  commission_amount: string | number;
  mamul_hammali: string | number;
  total_amount: string | number;
  created_at: string;
}

interface VehicleMasterOption {
  id: number;
  vehicle_number: string;
  vehicle_type?: string;
  capacity_mt?: string | number;
  owner_name?: string;
  source: "COMPANY" | "MARKET";
  is_active?: boolean;
}

interface ConsignerOption {
  id: number;
  name: string;
  code?: string;
  phone?: string | null;
  email?: string | null;
  pan?: string | null;
  city?: string | null;
  state?: string | null;
  is_active?: boolean;
}

interface LocationOption {
  id: number;
  city_name: string;
  state?: string | null;
  pincode?: string | null;
  is_active?: boolean;
}

interface LROption {
  id: number;
  lr_number: string;
  lr_date?: string;
  dispatch_date?: string;
  vehicle_number?: string | null;
  consigner_id?: number | null;
  origin_location_id?: number | null;
  destination_location_id?: number | null;
  origin_city?: string | null;
  destination_city?: string | null;
  origin_location_display?: string | null;
  destination_location_display?: string | null;
}

function computeLoadingSlipTotal(values: Record<string, any>): number {
  const freight = parseFloat(String(values.total_freight ?? 0)) || 0;
  const advance = parseFloat(String(values.advance_amount ?? 0)) || 0;
  const detention = parseFloat(String(values.detention_charge ?? 0)) || 0;
  const commission = parseFloat(String(values.commission_amount ?? 0)) || 0;
  const mamul = parseFloat(String(values.mamul_hammali ?? 0)) || 0;
  return freight + detention - (advance + commission + mamul);
}

export default function LoadingSlipPage() {
  const router = useRouter();
  const { openMasterTab } = useWorkspaceTabs();

  const [data, setData] = useState<LoadingSlipRecord[]>([]);
  const [companyVehicles, setCompanyVehicles] = useState<VehicleMasterOption[]>([]);
  const [marketVehicles, setMarketVehicles] = useState<VehicleMasterOption[]>([]);
  const [consigners, setConsigners] = useState<ConsignerOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [lrs, setLrs] = useState<LROption[]>([]);
  const [seriesInfo, setSeriesInfo] = useState<any>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
  const [activeOffice, setActiveOfficeState] = useState<OfficeSummary | null>(() => getActiveOffice());

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSlip, setEditingSlip] = useState<LoadingSlipRecord | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<Record<string, any>>({});
  const [isVehicleTypePromptOpen, setIsVehicleTypePromptOpen] = useState(false);

  const formSetFieldValueRef = useRef<((name: string, value: any) => void) | null>(null);
  const currentFormValuesRef = useRef<Record<string, any>>({});
  const editingSlipRef = useRef<LoadingSlipRecord | null>(null);
  editingSlipRef.current = editingSlip;

  const isPermitted = useMemo(() => {
    if (typeof window === "undefined") return true;
    const auth = getStoredAuth();
    if (!auth || !auth.user) return true;
    const role = (auth.user.role || "").toUpperCase();
    if (["COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER"].includes(role)) return true;
    const nav = getStoredNavigation();
    if (!nav || !Array.isArray(nav)) return false;
    return nav.some((g: any) =>
      g.items?.some(
        (it: any) =>
          it.href === "/transport/loading-slip" ||
          (g.id === "transport" && (it.feature === "loading_slip" || it.feature === "truck_hiring_note"))
      )
    );
  }, []);

  const searchLocationOptions = useCallback(async (query: string) => {
    const results = await apiClient<LocationOption[]>(
      `/api/v1/general/locations/search?q=${encodeURIComponent(query)}`
    );
    if (Array.isArray(results) && results.length > 0) {
      setLocations((prev) => {
        const existingIds = new Set(prev.map((l) => String(l.id)));
        const newItems = results.filter((r) => !existingIds.has(String(r.id)));
        return newItems.length > 0 ? [...prev, ...newItems] : prev;
      });
    }
    return (results || [])
      .filter((location) => location.city_name)
      .map((location) => ({
        label: [location.city_name, location.state, location.pincode].filter(Boolean).join(", "),
        value: String(location.id),
        keywords: [location.pincode || ""],
      }));
  }, []);

  const loadData = useCallback(async (targetOffice?: OfficeSummary | null) => {
    if (!isPermitted) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const office = targetOffice !== undefined ? targetOffice : getActiveOffice();
      setActiveOfficeState(office);
      const officeParam = office?.id ? `?office_id=${office.id}` : "";

      const [
        slipsRes,
        compVehRes,
        mktVehRes,
        consignersRes,
        locationsRes,
        lrsRes,
        seriesRes,
      ] = await Promise.all([
        apiClient<LoadingSlipRecord[]>(`/api/v1/transport/loading-slips${officeParam}`).catch(() => []),
        apiClient<any[]>("/api/v1/transport/company-vehicles").catch(() => []),
        apiClient<any[]>("/api/v1/transport/market-vehicles").catch(() => []),
        apiClient<ConsignerOption[]>("/api/v1/general/consigners").catch(() => []),
        apiClient<{ items: LocationOption[] }>("/api/v1/general/locations?page_size=100").catch(() => ({ items: [] })),
        apiClient<LROption[]>(`/api/v1/transport/lrs${officeParam}`).catch(() => []),
        apiClient<any>(`/api/v1/settings/series/check/LOADING_SLIP${officeParam}`).catch(() => null),
      ]);

      setData(Array.isArray(slipsRes) ? slipsRes : []);
      setCompanyVehicles(
        (Array.isArray(compVehRes) ? compVehRes : []).map((v) => ({ ...v, source: "COMPANY" as const }))
      );
      setMarketVehicles(
        (Array.isArray(mktVehRes) ? mktVehRes : []).map((v) => ({ ...v, source: "MARKET" as const }))
      );
      setConsigners(Array.isArray(consignersRes) ? consignersRes : []);
      setLocations(locationsRes?.items || []);
      setLrs(Array.isArray(lrsRes) ? lrsRes : []);
      setSeriesInfo(seriesRes);

      const initialSeries = seriesRes?.series_options?.[0];
      const initialSeriesId = initialSeries ? String(initialSeries.id) : seriesRes?.id ? String(seriesRes.id) : "default";
      setSelectedSeriesId(initialSeriesId);
      const initialSlipNo = initialSeries?.next_number_formatted || seriesRes?.next_number_formatted || "";

      if (!editingSlipRef.current) {
        setFormInitialValues((prev) => ({
          ...prev,
          slip_series_id: initialSeriesId,
          slip_number: initialSlipNo,
          issuing_office_id: office?.id,
        }));
        if (formSetFieldValueRef.current) {
          formSetFieldValueRef.current("slip_series_id", initialSeriesId);
          formSetFieldValueRef.current("slip_number", initialSlipNo);
        }
      }
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load loading slips.");
    } finally {
      setIsLoading(false);
    }
  }, [isPermitted]);

  useEffect(() => {
    loadData();
    const handleOfficeChange = (e: Event) => {
      const customEvent = e as CustomEvent<OfficeSummary>;
      loadData(customEvent.detail || getActiveOffice());
    };
    window.addEventListener("panther_office_changed", handleOfficeChange);
    return () => window.removeEventListener("panther_office_changed", handleOfficeChange);
  }, [loadData]);

  const stats = useMemo(() => {
    const count = data.length;
    const totalFreight = data.reduce((s, r) => s + (parseFloat(String(r.total_freight || 0)) || 0), 0);
    const totalAdvance = data.reduce((s, r) => s + (parseFloat(String(r.advance_amount || 0)) || 0), 0);
    const totalNet = data.reduce((s, r) => s + (parseFloat(String(r.total_amount || 0)) || 0), 0);
    return { count, totalFreight, totalAdvance, totalNet };
  }, [data]);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.trim().toLowerCase();
    return data.filter((row) =>
      row.slip_number?.toLowerCase().includes(q) ||
      row.vehicle_number?.toLowerCase().includes(q) ||
      row.consigner_name?.toLowerCase().includes(q) ||
      row.phone?.toLowerCase().includes(q) ||
      row.lorry_coordinator?.toLowerCase().includes(q) ||
      row.origin_city?.toLowerCase().includes(q) ||
      row.destination_city?.toLowerCase().includes(q) ||
      row.lr_number?.toLowerCase().includes(q)
    );
  }, [data, searchTerm]);

  const seriesOptions = useMemo(() => {
    if (seriesInfo?.series_options && seriesInfo.series_options.length > 0) {
      return seriesInfo.series_options.map((s: any) => ({
        value: String(s.id),
        label: s.display_label || `${s.series_name} (${s.next_number_formatted})`,
      }));
    }
    if (seriesInfo?.configured) {
      return [{
        value: seriesInfo.id ? String(seriesInfo.id) : "default",
        label: `Default Series (${seriesInfo.next_number_formatted})`,
      }];
    }
    return [{ value: "default", label: "Auto Loading Slip Series" }];
  }, [seriesInfo]);

  const activeSeries = useMemo(() => {
    if (seriesInfo?.series_options && seriesInfo.series_options.length > 0) {
      if (selectedSeriesId && selectedSeriesId !== "default") {
        const found = seriesInfo.series_options.find((s: any) => String(s.id) === String(selectedSeriesId));
        if (found) return found;
      }
      return seriesInfo.series_options[0];
    }
    return seriesInfo;
  }, [seriesInfo, selectedSeriesId]);

  const activeNextSlipNumber =
    editingSlip?.slip_number || activeSeries?.next_number_formatted || seriesInfo?.next_number_formatted || "";

  // Combined Company & Market vehicles dropdown, plus LR and history vehicles
  const truckOptions = useMemo(() => {
    const seen = new Set<string>();
    const combined: Array<{ label: string; value: string; subLabel?: string; keywords?: string[] }> = [];

    const addVehicle = (v: VehicleMasterOption) => {
      if (v.is_active === false && v.vehicle_number !== editingSlip?.vehicle_number) return;
      const key = (v.vehicle_number || "").trim().toUpperCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      const sourceLabel = v.source === "COMPANY" ? "Company" : "Market";
      const capText = v.capacity_mt && Number(v.capacity_mt) > 0 ? ` (${v.capacity_mt} MT)` : "";
      combined.push({
        label: key,
        value: key,
        subLabel: v.vehicle_type
          ? `${sourceLabel} • ${v.vehicle_type}${capText}`
          : `${sourceLabel} Vehicle${capText}`,
        keywords: [sourceLabel, v.vehicle_type || "", v.owner_name || ""],
      });
    };

    companyVehicles.forEach(addVehicle);
    marketVehicles.forEach(addVehicle);

    // Also include vehicles from LR records
    lrs.forEach((lr) => {
      if (lr.vehicle_number) {
        const key = lr.vehicle_number.trim().toUpperCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          combined.push({
            label: key,
            value: key,
            subLabel: `From LR #${lr.lr_number}`,
            keywords: ["LR", lr.lr_number],
          });
        }
      }
    });

    // Also include vehicles from existing loading slips
    data.forEach((slip) => {
      if (slip.vehicle_number) {
        const key = slip.vehicle_number.trim().toUpperCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          combined.push({
            label: key,
            value: key,
            subLabel: "Loading Slip History",
            keywords: ["History", slip.slip_number],
          });
        }
      }
    });

    if (editingSlip?.vehicle_number) {
      const editKey = editingSlip.vehicle_number.trim().toUpperCase();
      if (editKey && !seen.has(editKey)) {
        combined.unshift({ label: editKey, value: editKey, subLabel: "Saved Vehicle" });
      }
    }
    return combined;
  }, [companyVehicles, marketVehicles, lrs, data, editingSlip]);

  const consignerOptions = useMemo(() => {
    const list = consigners
      .filter((c) => c.is_active !== false || String(c.id) === String(editingSlip?.consigner_id))
      .map((c) => ({
        label: c.name || `Consignor #${c.id}`,
        value: String(c.id),
        subLabel: [c.phone, c.city, c.state].filter(Boolean).join(" · "),
        keywords: [c.pan || "", c.phone || "", c.email || ""],
      }));
    return [{ label: "Select Consignor...", value: "" }, ...list];
  }, [consigners, editingSlip]);

  const locationOptions = useMemo(
    () =>
      locations
        .filter(
          (l) =>
            l.is_active !== false ||
            String(l.id) === String(editingSlip?.origin_location_id) ||
            String(l.id) === String(editingSlip?.destination_location_id)
        )
        .map((l) => ({
          label: l.city_name ? [l.city_name, l.state, l.pincode].filter(Boolean).join(", ") : `Location #${l.id}`,
          value: String(l.id),
        })),
    [locations, editingSlip]
  );

  const lrOptions = useMemo(() => {
    const list = lrs.map((lr) => ({
      label: lr.lr_number,
      value: String(lr.id),
      subLabel: [lr.origin_city, lr.destination_city, lr.vehicle_number].filter(Boolean).join(" → "),
      keywords: [lr.vehicle_number || "", lr.origin_city || "", lr.destination_city || ""],
    }));
    if (editingSlip?.lr_id && !lrs.some((l) => String(l.id) === String(editingSlip.lr_id))) {
      list.unshift({
        label: editingSlip.lr_number || `LR #${editingSlip.lr_id}`,
        value: String(editingSlip.lr_id),
        subLabel: "Linked LR",
        keywords: [],
      });
    }
    return [{ label: "Select LR (Optional)...", value: "" }, ...list];
  }, [lrs, editingSlip]);

  const handleConsignerCreated = (newConsigner: any) => {
    const rec: ConsignerOption = {
      id: Number(newConsigner.id),
      name: newConsigner.name || newConsigner.label,
      phone: newConsigner.phone || null,
      email: newConsigner.email || null,
      pan: newConsigner.pan || null,
      city: newConsigner.city || null,
      state: newConsigner.state || null,
      is_active: true,
    };
    setConsigners((prev) => [rec, ...prev]);
    const idStr = String(rec.id);
    setFormInitialValues((prev) => ({
      ...prev,
      consigner_id: idStr,
      phone: rec.phone || prev.phone || "",
      email: rec.email || prev.email || "",
      pan: (rec.pan || prev.pan || "").toUpperCase(),
    }));
    formSetFieldValueRef.current?.("consigner_id", idStr);
    if (rec.phone) formSetFieldValueRef.current?.("phone", rec.phone);
    if (rec.email) formSetFieldValueRef.current?.("email", rec.email);
    if (rec.pan) formSetFieldValueRef.current?.("pan", rec.pan.toUpperCase());
  };

  const handleLocationCreated = (
    newLoc: any,
    field: "origin_location_id" | "destination_location_id"
  ) => {
    const rec: LocationOption = {
      id: Number(newLoc.id),
      city_name: newLoc.city_name || newLoc.label,
      state: newLoc.state,
      pincode: newLoc.pincode,
      is_active: true,
    };
    setLocations((prev) => [rec, ...prev]);
    const idStr = String(rec.id);
    setFormInitialValues((prev) => ({ ...prev, [field]: idStr }));
    formSetFieldValueRef.current?.(field, idStr);
  };

  const handleVehicleCreated = (vehicle: any, source: "COMPANY" | "MARKET") => {
    const reg = (vehicle.vehicle_number || vehicle.label || "").trim().toUpperCase();
    const rec: VehicleMasterOption = {
      id: Number(vehicle.id),
      vehicle_number: reg,
      vehicle_type: vehicle.vehicle_type,
      capacity_mt: vehicle.capacity_mt,
      source,
      is_active: true,
    };
    if (source === "COMPANY") {
      setCompanyVehicles((prev) => [rec, ...prev]);
    } else {
      setMarketVehicles((prev) => [rec, ...prev]);
    }
    setFormInitialValues((prev) => ({ ...prev, vehicle_number: reg }));
    formSetFieldValueRef.current?.("vehicle_number", reg);
  };

  const openVehicleMaster = (type: "company" | "market") => {
    setIsVehicleTypePromptOpen(false);
    if (type === "company") {
      openMasterTab({
        type: "company_vehicle",
        title: "Add Company Truck",
        onSuccess: (veh) => handleVehicleCreated(veh, "COMPANY"),
      });
    } else {
      openMasterTab({
        type: "market_vehicle",
        title: "Add Market Truck",
        onSuccess: (veh) => handleVehicleCreated(veh, "MARKET"),
      });
    }
  };

  const columns: ColumnDef<LoadingSlipRecord>[] = [
    {
      key: "slip_number",
      header: "Loading Slip No.",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-[#101828] dark:text-white block">
            {row.slip_number}
          </span>
          <span className="block text-[11px] text-[#667085] dark:text-slate-400">
            {formatDate(row.slip_date)}
          </span>
        </div>
      ),
    },
    {
      key: "vehicle_number",
      header: "Truck No. / LR",
      cell: (row) => (
        <div>
          <span className="font-mono font-bold uppercase text-[#101828] dark:text-white block text-xs">
            {row.vehicle_number}
          </span>
          <span className="block text-[11px] text-[#667085] dark:text-slate-400">
            {row.lr_number ? `LR #${row.lr_number}` : row.loading_date ? `Load: ${formatDate(row.loading_date)}` : "No LR linked"}
          </span>
        </div>
      ),
    },
    {
      key: "consigner",
      header: "Consignor & Contact",
      cell: (row) => (
        <div>
          <span className="font-semibold text-xs text-[#101828] dark:text-white block">
            {row.consigner_name || "Walk-in / Direct"}
          </span>
          <span className="block text-[11px] text-[#667085] dark:text-slate-400 font-mono">
            {row.phone}{row.pan ? ` · ${row.pan}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "coordinator",
      header: "Lorry Coordinator",
      cell: (row) => (
        <div>
          <span className="text-xs text-[#344054] dark:text-slate-300 block font-medium">
            {row.lorry_coordinator || "—"}
          </span>
          {row.lorry_coordinator_phone && (
            <span className="block text-[11px] text-[#667085] dark:text-slate-400 font-mono">
              {row.lorry_coordinator_phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "route",
      header: "From → To",
      cell: (row) => (
        <span className="text-xs text-[#344054] dark:text-slate-300 font-medium">
          {row.origin_city || row.loading_point || "Origin"} → {row.destination_city || row.unloading_point || "Destination"}
        </span>
      ),
    },
    {
      key: "total_freight",
      header: "Freight / Advance",
      isNumeric: true,
      cell: (row) => (
        <div className="font-mono text-xs">
          <span className="font-semibold text-[#101828] dark:text-white block">
            {formatCurrency(row.total_freight)}
          </span>
          <span className="block text-[11px] text-[#667085] dark:text-slate-400">
            Adv: {formatCurrency(row.advance_amount)}
          </span>
        </div>
      ),
    },
    {
      key: "total_amount",
      header: "Total",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
          {formatCurrency(row.total_amount)}
        </span>
      ),
    },
  ];

  const actions: RowAction<LoadingSlipRecord>[] = [
    {
      label: "Edit Loading Slip",
      icon: <Pencil className="w-4 h-4 text-blue-600" />,
      onClick: (row) => openEditDrawer(row),
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "loading_slip_dispatch",
      title: "1. Slip & Dispatch Details",
      description: "Auto-numbered loading slip identity, truck assignment, route corridor, and LR link",
      columns: 3,
      fields: [
        {
          name: "slip_date",
          label: "Date",
          type: "date",
          required: true,
          defaultValue: new Date().toISOString().split("T")[0],
        },
        {
          name: "slip_series_id",
          label: "Select Series",
          type: "select",
          options: seriesOptions,
          disabled: Boolean(editingSlip) || seriesOptions.length <= 1,
          disabledReason: editingSlip
            ? "Cannot modify series of an existing loading slip"
            : seriesOptions.length <= 1
            ? "Only one automatic series configured for this branch"
            : undefined,
          defaultValue: selectedSeriesId || (seriesOptions[0]?.value ?? "default"),
          onChange: (newVal: string) => {
            setSelectedSeriesId(newVal);
            const matched = seriesInfo?.series_options?.find((s: any) => String(s.id) === String(newVal));
            const nextNum = matched?.next_number_formatted || seriesInfo?.next_number_formatted || "";
            if (formSetFieldValueRef.current && nextNum) {
              formSetFieldValueRef.current("slip_number", nextNum);
            }
          },
          onAddNew: canAccessRoute("/settings/series-master")
            ? () => router.push("/settings/series-master")
            : undefined,
          addNewLabel: canAccessRoute("/settings/series-master") ? "+ Manage LS Series" : undefined,
          addNewTitle: canAccessRoute("/settings/series-master") ? "Configure Loading Slip Series in Settings" : undefined,
        },
        {
          name: "slip_number",
          label: "Loading Slip No. (Auto)",
          type: "text",
          disabled: true,
          disabledReason: "Auto-generated automatically from the configured Loading Slip series.",
          placeholder: activeNextSlipNumber || "Auto-generated from series",
          helperText: `Next Number: ${activeNextSlipNumber || "Auto-allocated upon save"}`,
        },
        {
          name: "vehicle_number",
          label: "Truck No.",
          type: "select",
          required: true,
          options: truckOptions,
          allowCustom: true,
          placeholder: "Select or type truck number",
          onAddNew: () => setIsVehicleTypePromptOpen(true),
          addNewLabel: "+ Add Truck",
          addNewTitle: "Add new Company or Market truck",
        },
        {
          name: "origin_location_id",
          label: "From",
          type: "select",
          options: locationOptions,
          onSearch: searchLocationOptions,
          placeholder: "Select Origin Location",
          onAddNew: () =>
            openMasterTab({
              type: "location",
              title: "Add Location",
              onSuccess: (rec) => handleLocationCreated(rec, "origin_location_id"),
            }),
          addNewLabel: "+ Add New Location",
          addNewTitle: "Create origin city / hub in TMS tab",
        },
        {
          name: "destination_location_id",
          label: "To",
          type: "select",
          options: locationOptions,
          onSearch: searchLocationOptions,
          placeholder: "Select Destination Location",
          onAddNew: () =>
            openMasterTab({
              type: "location",
              title: "Add Location",
              onSuccess: (rec) => handleLocationCreated(rec, "destination_location_id"),
            }),
          addNewLabel: "+ Add New Location",
          addNewTitle: "Create destination city / hub in TMS tab",
        },
        {
          name: "lr_id",
          label: "LR",
          type: "select",
          options: lrOptions,
          placeholder: "Select LR (Optional)",
          onChange: (val) => {
            const matched = lrs.find((l) => String(l.id) === String(val));
            if (!matched) return;
            if (matched.vehicle_number) {
              formSetFieldValueRef.current?.("vehicle_number", matched.vehicle_number.trim().toUpperCase());
            }
            if (matched.origin_location_id) {
              formSetFieldValueRef.current?.("origin_location_id", String(matched.origin_location_id));
            }
            if (matched.destination_location_id) {
              formSetFieldValueRef.current?.("destination_location_id", String(matched.destination_location_id));
            }
            if (matched.consigner_id) {
              const cid = String(matched.consigner_id);
              formSetFieldValueRef.current?.("consigner_id", cid);
              const cons = consigners.find((c) => String(c.id) === cid);
              if (cons) {
                if (cons.phone) formSetFieldValueRef.current?.("phone", cons.phone);
                if (cons.email) formSetFieldValueRef.current?.("email", cons.email);
                if (cons.pan) formSetFieldValueRef.current?.("pan", cons.pan.toUpperCase());
              }
            }
          },
        },
        {
          name: "loading_date",
          label: "Loading Date",
          type: "date",
          defaultValue: new Date().toISOString().split("T")[0],
        },
        {
          name: "remark",
          label: "Remark",
          type: "text",
          placeholder: "Enter loading / dispatch remarks...",
        },
      ],
    },
    {
      id: "loading_slip_parties",
      title: "2. Consignor & Lorry Coordinator",
      description: "Consignor contact details (auto-populated when selected) and lorry coordinator info",
      columns: 3,
      fields: [
        {
          name: "consigner_id",
          label: "Consignor",
          type: "select",
          options: consignerOptions,
          placeholder: "Select Consignor",
          onAddNew: () =>
            openMasterTab({
              type: "consigner",
              title: "Add Consignor",
              onSuccess: handleConsignerCreated,
            }),
          addNewLabel: "+ Add New Consignor",
          addNewTitle: "Register new consignor in TMS tab",
          onChange: (val) => {
            const matched = consigners.find((c) => String(c.id) === String(val));
            if (matched) {
              formSetFieldValueRef.current?.("phone", matched.phone || "");
              formSetFieldValueRef.current?.("email", matched.email || "");
              formSetFieldValueRef.current?.("pan", (matched.pan || "").toUpperCase());
            }
          },
        },
        {
          name: "phone",
          label: "Phone",
          type: "text",
          required: true,
          placeholder: "e.g. 9876543210",
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          placeholder: "e.g. dispatch@consignor.com",
        },
        {
          name: "pan",
          label: "PAN",
          type: "custom",
          customRender: ({ value, onChange }) => (
            <input
              id="form-field-pan"
              type="text"
              maxLength={10}
              value={value || ""}
              onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="e.g. AAACT2727Q"
              className="w-full h-10 px-3.5 text-xs sm:text-sm font-mono font-semibold uppercase rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            />
          ),
        },
        {
          name: "lorry_coordinator",
          label: "Lorry Coordinator",
          type: "text",
          placeholder: "Coordinator / broker name",
        },
        {
          name: "lorry_coordinator_phone",
          label: "Lorry Coordinator Phone",
          type: "text",
          placeholder: "e.g. 9811122233",
        },
      ],
    },
    {
      id: "loading_slip_financials",
      title: "3. Freight & Charges",
      description: "Freight agreement, advances, detention, commission, mamul/hammali, and net total",
      columns: 3,
      fields: [
        {
          name: "total_freight",
          label: "Total Freight (₹)",
          type: "number",
          placeholder: "0.00",
        },
        {
          name: "advance_amount",
          label: "Advance (₹)",
          type: "number",
          placeholder: "0.00",
        },
        {
          name: "detention_charge",
          label: "Detention (₹)",
          type: "number",
          placeholder: "0.00",
        },
        {
          name: "commission_amount",
          label: "Commission (₹)",
          type: "number",
          placeholder: "0.00",
        },
        {
          name: "mamul_hammali",
          label: "Mamul/Hammali (₹)",
          type: "number",
          placeholder: "0.00",
        },
        {
          name: "total_amount",
          label: "Total (₹)",
          type: "custom",
          helperText: "Auto-calculated: (Total Freight + Detention) − (Advance + Commission + Mamul/Hammali)",
          customRender: ({ values }) => {
            const total = computeLoadingSlipTotal(values);
            return (
              <div className="relative">
                <input
                  id="form-field-total_amount"
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={total.toFixed(2)}
                  className="w-full h-10 px-3.5 pr-9 text-xs sm:text-sm font-mono font-bold rounded-xl border border-indigo-200 dark:border-[#383C66] bg-indigo-50/70 dark:bg-[#171928] text-indigo-900 dark:text-indigo-200 cursor-not-allowed select-none focus:outline-none shadow-2xs"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              </div>
            );
          },
        },
      ],
    },
  ];

  const openCreateDrawer = () => {
    setEditingSlip(null);
    const office = getActiveOffice();
    setActiveOfficeState(office);
    const initialSeries = seriesInfo?.series_options?.[0];
    const initialSeriesId = initialSeries
      ? String(initialSeries.id)
      : seriesInfo?.id
      ? String(seriesInfo.id)
      : "default";
    setSelectedSeriesId(initialSeriesId);
    const initialSlipNo = initialSeries?.next_number_formatted || seriesInfo?.next_number_formatted || "";
    const today = new Date().toISOString().split("T")[0];

    const init = {
      issuing_office_id: office?.id,
      slip_date: today,
      slip_series_id: initialSeriesId,
      slip_number: initialSlipNo,
      vehicle_number: "",
      origin_location_id: "",
      destination_location_id: "",
      lr_id: "",
      loading_date: today,
      remark: "",
      consigner_id: "",
      phone: "",
      email: "",
      pan: "",
      lorry_coordinator: "",
      lorry_coordinator_phone: "",
      total_freight: "",
      advance_amount: "",
      detention_charge: "",
      commission_amount: "",
      mamul_hammali: "",
    };
    currentFormValuesRef.current = init;
    setFormInitialValues(init);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (row: LoadingSlipRecord) => {
    setEditingSlip(row);
    if (row.consigner_id && !consigners.some((c) => String(c.id) === String(row.consigner_id))) {
      setConsigners((prev) => [
        {
          id: row.consigner_id!,
          name: row.consigner_name || `Consignor #${row.consigner_id}`,
          phone: row.phone,
          email: row.email,
          pan: row.pan,
        },
        ...prev,
      ]);
    }
    setLocations((prev) => {
      const next = [...prev];
      if (row.origin_location_id && !next.some((l) => String(l.id) === String(row.origin_location_id))) {
        next.push({ id: row.origin_location_id, city_name: row.origin_city || row.loading_point || `Location #${row.origin_location_id}` });
      }
      if (row.destination_location_id && !next.some((l) => String(l.id) === String(row.destination_location_id))) {
        next.push({ id: row.destination_location_id, city_name: row.destination_city || row.unloading_point || `Location #${row.destination_location_id}` });
      }
      return next;
    });

    const init = {
      issuing_office_id: row.issuing_office_id,
      slip_date: row.slip_date,
      slip_series_id: row.slip_series_id ? String(row.slip_series_id) : "default",
      slip_number: row.slip_number,
      vehicle_number: (row.vehicle_number || "").toUpperCase(),
      origin_location_id: row.origin_location_id ? String(row.origin_location_id) : "",
      destination_location_id: row.destination_location_id ? String(row.destination_location_id) : "",
      lr_id: row.lr_id ? String(row.lr_id) : "",
      loading_date: row.loading_date || "",
      remark: row.remark || "",
      consigner_id: row.consigner_id ? String(row.consigner_id) : "",
      phone: row.phone || "",
      email: row.email || "",
      pan: (row.pan || "").toUpperCase(),
      lorry_coordinator: row.lorry_coordinator || "",
      lorry_coordinator_phone: row.lorry_coordinator_phone || "",
      total_freight: String(row.total_freight ?? ""),
      advance_amount: String(row.advance_amount ?? ""),
      detention_charge: String(row.detention_charge ?? ""),
      commission_amount: String(row.commission_amount ?? ""),
      mamul_hammali: String(row.mamul_hammali ?? ""),
    };
    currentFormValuesRef.current = init;
    setFormInitialValues(init);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const rawSeriesId = values.slip_series_id || selectedSeriesId;
      const parsedSeriesId = rawSeriesId && rawSeriesId !== "default" ? parseInt(rawSeriesId, 10) : null;
      const computedTotal = computeLoadingSlipTotal(values);

      const payload = {
        slip_date: values.slip_date || new Date().toISOString().split("T")[0],
        slip_series_id: editingSlip ? undefined : parsedSeriesId,
        slip_number: editingSlip ? values.slip_number : undefined,
        issuing_office_id: activeOffice?.id || editingSlip?.issuing_office_id || undefined,
        vehicle_number: String(values.vehicle_number || "").trim().toUpperCase(),
        consigner_id: values.consigner_id ? parseInt(values.consigner_id, 10) : null,
        phone: String(values.phone || "").trim(),
        email: values.email ? String(values.email).trim() : null,
        pan: values.pan ? String(values.pan).trim().toUpperCase() : null,
        lorry_coordinator: values.lorry_coordinator ? String(values.lorry_coordinator).trim() : null,
        lorry_coordinator_phone: values.lorry_coordinator_phone ? String(values.lorry_coordinator_phone).trim() : null,
        origin_location_id: values.origin_location_id ? parseInt(values.origin_location_id, 10) : null,
        destination_location_id: values.destination_location_id ? parseInt(values.destination_location_id, 10) : null,
        lr_id: values.lr_id ? parseInt(values.lr_id, 10) : null,
        loading_date: values.loading_date || null,
        remark: values.remark ? String(values.remark).trim() : null,
        total_freight: parseFloat(values.total_freight) || 0,
        advance_amount: parseFloat(values.advance_amount) || 0,
        detention_charge: parseFloat(values.detention_charge) || 0,
        commission_amount: parseFloat(values.commission_amount) || 0,
        mamul_hammali: parseFloat(values.mamul_hammali) || 0,
        total_amount: computedTotal,
      };

      if (editingSlip) {
        await apiClient(`/api/v1/transport/loading-slips/${editingSlip.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success(`Loading Slip ${editingSlip.slip_number} updated successfully.`);
      } else {
        const created = await apiClient<LoadingSlipRecord>("/api/v1/transport/loading-slips", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(`Loading Slip ${created?.slip_number || ""} created successfully.`);
      }
      setIsDrawerOpen(false);
      setEditingSlip(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save loading slip.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isPermitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center mb-4 text-rose-600 dark:text-rose-400">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
          You do not have permission to view or create Loading Slips. Please contact your Company Admin.
        </p>
        <ButtonOnDeny router={router} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isVehicleTypePromptOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in-0 duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#12131A] border border-slate-200 dark:border-[#22232E] animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Add Truck</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select the truck category to register
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Is this truck a <strong>Company Truck</strong> (own fleet) or a <strong>Market Truck</strong> (hired / broker)?
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => openVehicleMaster("company")}
                className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 border-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer font-medium"
              >
                <span className="font-semibold text-sm">Company Truck</span>
                <span className="text-[11px] opacity-75">Own / Leased fleet</span>
              </button>
              <button
                type="button"
                onClick={() => openVehicleMaster("market")}
                className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 border-slate-200 dark:border-[#2B2E42] bg-slate-50/70 dark:bg-[#1A1D2B] hover:!bg-indigo-600 hover:!text-white hover:!border-indigo-600 text-slate-700 dark:text-slate-300 transition-all cursor-pointer font-medium"
              >
                <span className="font-semibold text-sm">Market Truck</span>
                <span className="text-[11px] opacity-75">Hired / Broker vehicle</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsVehicleTypePromptOpen(false)}
              className="mt-4 w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}

      <PageHeader
        title="Loading Slips"
        description="Issue loading slips, manage company and market truck allocations, and track freight settlements."
        breadcrumbs={[
          { label: "Transport", href: "/transport/jobs" },
          { label: "Loading Slip" },
        ]}
        primaryAction={{
          label: "Create Loading Slip",
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: openCreateDrawer,
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Loading Slips"
          value={stats.count.toLocaleString()}
          subtext="Issued vehicle loading slips"
          icon={<FileSignature className="w-4 h-4" />}
        />
        <KpiCard
          title="Total Freight"
          value={formatCurrency(stats.totalFreight)}
          subtext="Agreed gross freight"
          icon={<IndianRupee className="w-4 h-4 text-indigo-600" />}
        />
        <KpiCard
          title="Total Advance"
          value={formatCurrency(stats.totalAdvance)}
          subtext="Advance paid at loading"
          icon={<Wallet className="w-4 h-4 text-amber-600" />}
        />
        <KpiCard
          title="Net Total Payable"
          value={formatCurrency(stats.totalNet)}
          subtext="After advances & deductions"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search slip number, truck no., consignor, coordinator, route, or LR..."
        onClear={() => setSearchTerm("")}
      />

      <DataTable
        columns={columns}
        data={filteredData}
        actions={actions}
        actionLayout="dropdown"
        searchable={false}
        selectable={false}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={() => loadData()}
        tableId="transport-loading-slip-table"
        emptyMessage="No loading slips recorded"
        emptySubtext="Create a loading slip to assign a company or market truck, record consignor & coordinator details, and compute freight totals."
        emptyAction={{
          label: "Create Loading Slip",
          onClick: openCreateDrawer,
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingSlip(null);
        }}
        title={
          editingSlip
            ? `Edit Loading Slip: ${editingSlip.slip_number}`
            : `Create Loading Slip${activeOffice?.name ? ` • ${activeOffice.name}` : ""}`
        }
        description={
          editingSlip
            ? "Update truck, consignor, route, and freight calculation details."
            : "Issue a new Loading Slip with auto-generated series numbering, vehicle & consignor details, and freight summary."
        }
        width="xl"
      >
        <Form
          key={editingSlip ? `edit-${editingSlip.id}` : `create-${activeOffice?.id ?? "all"}`}
          sections={formSections}
          initialValues={formInitialValues}
          setFieldValueRef={formSetFieldValueRef}
          onChange={(vals) => {
            currentFormValuesRef.current = vals;
          }}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingSlip(null);
          }}
          submitLabel={editingSlip ? "Save Changes" : "Create Loading Slip"}
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}

function ButtonOnDeny({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <button
      type="button"
      onClick={() => router.push("/")}
      className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
    >
      Return to Dashboard
    </button>
  );
}
