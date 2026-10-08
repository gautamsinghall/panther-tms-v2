"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Radio,
  MapPin,
  Info,
  RefreshCw,
  Navigation,
  Activity,
  Signal,
  Smartphone,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Copy,
  ChevronRight,
  Truck,
  Check,
  X,
  Map as MapIcon,
  Phone,
  Send,
  FileText,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { KpiCard } from "@/components/ui/kpi-card";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { SegmentTabs } from "@/components/ui/tabs";
import { ColumnDef } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { cn, formatDateTime, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Telemetry & SIM Tracking Types
// ---------------------------------------------------------------------------

export interface TrackingPingRecord {
  id: number;
  vehicle_number: string;
  tracking_mode: "FASTAG" | "GPS" | "SIM";
  identifier: string;
  last_latitude?: string | number | null;
  last_longitude?: string | number | null;
  location_name?: string | null;
  speed_kmh?: string | number | null;
  last_ping_at: string;
  status: string;
}

export interface SIMTripRecord {
  id: number;
  feed_unique_id: string;
  ft_trip_id?: number | null;
  lr_id?: number | null;
  lr_number?: string | null;
  vehicle_number: string;
  driver_name?: string | null;
  driver_phone: string;
  consent_status: "PENDING" | "ACCEPTED" | "REJECTED";
  is_consent_done: boolean;
  status: string; // Open / Closed
  status_code: number;
  share_url?: string | null;
  last_latitude?: number | string | null;
  last_longitude?: number | string | null;
  last_location_address?: string | null;
  recorded_at?: string | null;
  eta?: string | null;
  eta_updated_at?: string | null;
  distance_remaining_km?: number | string | null;
  total_distance_km?: number | string | null;
  origin_address?: string | null;
  destination_address?: string | null;
  route_code?: string | null;
  last_synced_at?: string | null;
  last_billed_at?: string | null;
  billing_cycles_charged?: number;
  closed_at?: string | null;
  close_comment?: string | null;
  created_at: string;
  updated_at: string;
}

interface LRSummary {
  id: number;
  lr_number: string;
  vehicle_number: string;
  driver_name?: string;
  driver_phone?: string;
  origin_city?: string;
  destination_city?: string;
  origin_name?: string;
  destination_name?: string;
  consigner_name?: string;
  consigner_address?: string;
  consignee_name?: string;
  consignee_address?: string;
  via?: string;
  status?: string;
}

export default function TrackingPage() {
  const [activeTab, setActiveTab] = useState<"sim" | "telemetry">("sim");

  // SIM Tracking State
  const [simTrips, setSimTrips] = useState<SIMTripRecord[]>([]);
  const [isLoadingSim, setIsLoadingSim] = useState(true);
  const [simError, setSimError] = useState<string | null>(null);
  const [isStartTripModalOpen, setIsStartTripModalOpen] = useState(false);
  const [isTripDetailsModalOpen, setIsTripDetailsModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<SIMTripRecord | null>(null);
  const [closeComment, setCloseComment] = useState("");
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingTripId, setSyncingTripId] = useState<number | null>(null);

  // Form State for Starting SIM Trip
  const [availableLRs, setAvailableLRs] = useState<LRSummary[]>([]);
  const [selectedLrId, setSelectedLrId] = useState<string>("");
  const [formData, setFormData] = useState({
    vehicle_number: "",
    driver_phone: "",
    driver_name: "",
    lr_id: undefined as number | undefined,
    lr_number: "",
    origin_address: "",
    destination_address: "",
    route_code: "",
    share_trip: true,
  });

  // Telemetry Pings State
  const [pingData, setPingData] = useState<TrackingPingRecord[]>([]);
  const [isLoadingPings, setIsLoadingPings] = useState(true);
  const [pingError, setPingError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data Loaders
  // ---------------------------------------------------------------------------

  const loadSimTrips = async () => {
    setIsLoadingSim(true);
    setSimError(null);
    try {
      const res = await apiClient<SIMTripRecord[]>("/api/v1/transport/tracking/sim");
      setSimTrips(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error("Failed to load SIM trips:", err);
      setSimError(err?.message || "Failed to load SIM tracking telemetry records.");
    } finally {
      setIsLoadingSim(false);
    }
  };

  const loadPings = async () => {
    setIsLoadingPings(true);
    setPingError(null);
    try {
      const res = await apiClient<TrackingPingRecord[]>("/api/v1/transport/tracking");
      setPingData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error("Failed to load telemetry pings:", err);
      setPingError(err?.message || "Failed to load telemetry checkpoints.");
    } finally {
      setIsLoadingPings(false);
    }
  };

  const loadLRs = async () => {
    try {
      const res = await apiClient<any>("/api/v1/transport/lrs?limit=50");
      const list = Array.isArray(res) ? res : res?.items || [];
      setAvailableLRs(list);
    } catch (err) {
      console.error("Failed to fetch LRs for selection:", err);
    }
  };

  useEffect(() => {
    loadSimTrips();
    loadPings();
    loadLRs();
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers for SIM Actions
  // ---------------------------------------------------------------------------

  const handleLrSelect = (lrIdStr: string) => {
    setSelectedLrId(lrIdStr);
    if (!lrIdStr) return;
    const lrIdNum = parseInt(lrIdStr, 10);
    const chosen = availableLRs.find((l) => l.id === lrIdNum);
    if (chosen) {
      // Functional Requirement: Automatically populate Original Loading Hub and Destination Unloading Hub
      const originHub =
        chosen.origin_city ||
        chosen.consigner_address ||
        chosen.origin_name ||
        chosen.consigner_name ||
        "";

      const destHub =
        chosen.destination_city ||
        chosen.consignee_address ||
        chosen.destination_name ||
        chosen.consignee_name ||
        "";

      const corridor =
        originHub && destHub
          ? `${originHub} ➔ ${destHub}`
          : chosen.via || "";

      setFormData((prev) => ({
        ...prev,
        lr_id: chosen.id,
        lr_number: chosen.lr_number || "",
        vehicle_number: chosen.vehicle_number || prev.vehicle_number,
        driver_phone: chosen.driver_phone
          ? chosen.driver_phone.replace(/\D/g, "").slice(-10)
          : prev.driver_phone,
        driver_name: chosen.driver_name || prev.driver_name,
        origin_address: originHub || prev.origin_address,
        destination_address: destHub || prev.destination_address,
        route_code: corridor || prev.route_code,
      }));
    }
  };

  const handleStartSimTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicle_number.trim() || !formData.driver_phone.trim()) {
      alert("Please provide both Vehicle Number and 10-digit Driver Phone.");
      return;
    }
    const cleanPhone = formData.driver_phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      alert("Driver mobile phone must be at least 10 digits for telecom SIM consent.");
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      const payload = {
        ...formData,
        vehicle_number: formData.vehicle_number.trim().toUpperCase(),
        driver_phone: cleanPhone.slice(-10),
      };
      await apiClient("/api/v1/transport/tracking/sim/start", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setFeedbackMessage({
        type: "success",
        text: `SIM tracking initialized for ${payload.vehicle_number}. Telecom carrier consent SMS queued to +91 ${payload.driver_phone}.`,
      });
      setIsStartTripModalOpen(false);
      resetFormData();
      loadSimTrips();
      loadPings();
    } catch (err: any) {
      alert(err.message || "Failed to initiate SIM trip tracking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFormData = () => {
    setSelectedLrId("");
    setFormData({
      vehicle_number: "",
      driver_phone: "",
      driver_name: "",
      lr_id: undefined,
      lr_number: "",
      origin_address: "",
      destination_address: "",
      route_code: "",
      share_trip: true,
    });
  };

  const handleSyncTrip = async (tripId: number) => {
    setSyncingTripId(tripId);
    try {
      const updated = await apiClient<SIMTripRecord>(`/api/v1/transport/tracking/sim/${tripId}/sync`, {
        method: "POST",
      });
      setSimTrips((prev) => prev.map((t) => (t.id === tripId ? updated : t)));
      if (selectedTrip?.id === tripId) {
        setSelectedTrip(updated);
      }
      setFeedbackMessage({
        type: "success",
        text: `Trip ${updated.feed_unique_id} telemetry refreshed. Consent: ${updated.is_consent_done ? "Granted" : "Pending"}.`,
      });
      loadPings();
    } catch (err: any) {
      alert(err.message || "Failed to sync trip tracking telemetry.");
    } finally {
      setSyncingTripId(null);
    }
  };

  const handleSimulateConsent = async (trip: SIMTripRecord) => {
    try {
      const updated = await apiClient<SIMTripRecord>(
        `/api/v1/transport/tracking/sim/${trip.id}/simulate-consent`,
        {
          method: "POST",
          body: JSON.stringify({ is_consent_done: true }),
        }
      );
      setSimTrips((prev) => prev.map((t) => (t.id === trip.id ? updated : t)));
      if (selectedTrip?.id === trip.id) {
        setSelectedTrip(updated);
      }
      setFeedbackMessage({
        type: "success",
        text: `Driver consent accepted for ${trip.vehicle_number}! Real-time cell tower location fixes activated.`,
      });
      loadPings();
    } catch (err: any) {
      alert(err.message || "Failed to simulate driver consent.");
    }
  };

  const handleSyncAllTrips = async () => {
    setIsSyncingAll(true);
    try {
      const res = await apiClient<{ trips_synced: number; message: string }>("/api/v1/transport/tracking/sim/sync-all", {
        method: "POST",
      });
      setFeedbackMessage({
        type: "success",
        text: res.message || `Refreshed ${res.trips_synced} active SIM trips.`,
      });
      loadSimTrips();
      loadPings();
    } catch (err: any) {
      alert(err.message || "Failed to sync active trips.");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleCloseTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip) return;
    setIsSubmitting(true);
    try {
      await apiClient(`/api/v1/transport/tracking/sim/${selectedTrip.id}/close`, {
        method: "POST",
        body: JSON.stringify({ comment: closeComment }),
      });
      setFeedbackMessage({
        type: "success",
        text: `Trip ${selectedTrip.feed_unique_id} closed successfully.`,
      });
      setIsCloseModalOpen(false);
      setSelectedTrip(null);
      setCloseComment("");
      loadSimTrips();
    } catch (err: any) {
      alert(err.message || "Failed to close trip.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ---------------------------------------------------------------------------
  // KPI Calculations
  // ---------------------------------------------------------------------------

  const simStats = useMemo(() => {
    const total = simTrips.length;
    const active = simTrips.filter((t) => t.status.toLowerCase() === "open").length;
    const consentGranted = simTrips.filter((t) => t.is_consent_done && t.status.toLowerCase() === "open").length;
    const consentPending = simTrips.filter((t) => !t.is_consent_done && t.status.toLowerCase() === "open").length;
    const closed = simTrips.filter((t) => t.status.toLowerCase() === "closed").length;
    return { total, active, consentGranted, consentPending, closed };
  }, [simTrips]);

  const pingStats = useMemo(() => {
    const totalVehicles = new Set(pingData.map((d) => d.vehicle_number)).size;
    const gpsPings = pingData.filter((d) => d.tracking_mode === "GPS").length;
    const simPings = pingData.filter((d) => d.tracking_mode === "SIM").length;
    const checkpointPings = pingData.filter((d) => d.tracking_mode === "FASTAG").length;
    return { totalVehicles, gpsPings, simPings, checkpointPings };
  }, [pingData]);

  // ---------------------------------------------------------------------------
  // Columns for SIM Trips Table
  // ---------------------------------------------------------------------------

  const simColumns: ColumnDef<SIMTripRecord>[] = [
    {
      key: "vehicle_number",
      header: "Vehicle & Route",
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5 max-w-[150px] min-w-0">
          <VehiclePlate vehicleNumber={row.vehicle_number} />
          {row.route_code && (
            <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 min-w-0" title={row.route_code}>
              <Navigation className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{row.route_code}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "driver",
      header: "Driver & Mobile",
      cell: (row) => (
        <div className="max-w-[130px] min-w-0">
          <div className="text-xs font-semibold text-slate-900 truncate" title={row.driver_name || "Assigned Driver"}>
            {row.driver_name || "Assigned Driver"}
          </div>
          <div className="text-[11px] font-mono text-slate-600 inline-flex items-center gap-1 mt-0.5 whitespace-nowrap">
            <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>+91 {row.driver_phone}</span>
          </div>
        </div>
      ),
    },
    {
      key: "consent_status",
      header: "Telecom Consent",
      cell: (row) => {
        if (row.is_consent_done) {
          return (
            <div className="flex flex-col gap-0.5 items-start whitespace-nowrap">
              <Badge variant="success" dot className="text-xs font-medium">
                Consent Granted
              </Badge>
              <span className="text-[10px] text-emerald-700 font-medium">Live fixes active</span>
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-0.5 items-start whitespace-nowrap">
            <Badge variant="warning" className="text-xs font-medium gap-1 flex items-center">
              <Clock className="w-3 h-3 text-amber-600 animate-spin" style={{ animationDuration: "3s" }} />
              Awaiting SMS Reply
            </Badge>
            <span className="text-[10px] text-slate-500 font-medium">
              Driver verification pending
            </span>
          </div>
        );
      },
    },
    {
      key: "last_location",
      header: "Last Cell Fix",
      cell: (row) => {
        if (!row.is_consent_done) {
          return (
            <div className="text-xs text-slate-400 italic flex items-center gap-1 max-w-[150px] min-w-0">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate" title="Awaiting driver SMS consent">Awaiting consent</span>
            </div>
          );
        }
        return (
          <div className="max-w-[150px] min-w-0">
            <div className="font-medium text-slate-800 text-xs flex items-start gap-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <span className="truncate" title={row.last_location_address || "Transit Checkpoint"}>
                {row.last_location_address || "Transit Checkpoint"}
              </span>
            </div>
            {row.last_latitude && (
              <div className="text-[10px] font-mono text-slate-500 mt-0.5 ml-4">
                {Number(row.last_latitude).toFixed(4)}, {Number(row.last_longitude).toFixed(4)}
              </div>
            )}
            {row.recorded_at && (
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 ml-4">
                Fix: {formatDateTime(row.recorded_at)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "destination_eta",
      header: "Destination & ETA",
      cell: (row) => (
        <div className="max-w-[130px] min-w-0">
          <div className="text-xs font-medium text-slate-800 truncate" title={row.destination_address || "Destination"}>
            {row.destination_address || "Destination"}
          </div>
          {row.distance_remaining_km && (
            <div className="text-[11px] font-mono text-slate-600">
              {Number(row.distance_remaining_km).toFixed(1)} km left
            </div>
          )}
          {row.eta && (
            <div className="text-[11px] font-mono text-indigo-600 font-medium">
              ETA: {formatDateTime(row.eta)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Trip Status",
      cell: (row) => (
        <Badge
          variant={row.status.toLowerCase() === "open" ? "primary" : "neutral"}
          className="text-xs font-medium uppercase whitespace-nowrap"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1 whitespace-nowrap">
          {row.share_url && (
            <a
              href={row.share_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 h-7 px-2 text-xs font-semibold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 hover:text-indigo-800 border border-indigo-200/80 rounded-lg whitespace-nowrap shrink-0 shadow-2xs transition-colors cursor-pointer"
              title="Open Public Live Tracking Link"
            >
              <ExternalLink className="w-3 h-3 shrink-0 text-indigo-600" />
              <span>Live Map</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => handleSyncTrip(row.id)}
            disabled={syncingTripId === row.id}
            className={cn(
              "inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300 shadow-2xs transition-all shrink-0 cursor-pointer disabled:opacity-50",
              syncingTripId === row.id && "bg-slate-50 text-indigo-600"
            )}
            title="Refresh latest location telemetry"
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5",
                syncingTripId === row.id && "animate-spin text-indigo-600"
              )}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTrip(row);
              setIsTripDetailsModalOpen(true);
            }}
            className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition-colors shrink-0 cursor-pointer whitespace-nowrap"
            title="View trip details and telemetry timeline"
          >
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Details</span>
          </button>
          {row.status.toLowerCase() === "open" && (
            <button
              type="button"
              onClick={() => {
                setSelectedTrip(row);
                setIsCloseModalOpen(true);
              }}
              className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium text-rose-700 bg-rose-50/80 hover:bg-rose-100 hover:text-rose-800 border border-rose-200 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer whitespace-nowrap"
              title="End and close this tracking trip"
            >
              <X className="w-3.5 h-3.5 shrink-0" />
              <span>Close</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Columns for Checkpoint Logs Table
  // ---------------------------------------------------------------------------

  const pingColumns: ColumnDef<TrackingPingRecord>[] = [
    {
      key: "vehicle_number",
      header: "Vehicle Number",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold uppercase text-slate-900">
          {row.vehicle_number}
        </span>
      ),
    },
    {
      key: "tracking_mode",
      header: "Tracking Mode",
      cell: (row) => {
        let variant: "info" | "primary" | "success" | "neutral" = "neutral";
        let label: string = row.tracking_mode;
        if (row.tracking_mode === "GPS") {
          variant = "primary";
          label = "GPS";
        } else if (row.tracking_mode === "FASTAG") {
          variant = "info";
          label = "CHECKPOINT";
        } else if (row.tracking_mode === "SIM") {
          variant = "success";
          label = "SIM CELL";
        }
        return (
          <Badge variant={variant} dot className="font-mono text-xs">
            {label}
          </Badge>
        );
      },
    },
    {
      key: "identifier",
      header: "Device / SIM Phone",
      cell: (row) => (
        <span className="text-xs font-mono text-slate-600">
          {row.identifier}
        </span>
      ),
    },
    {
      key: "location",
      header: "Last Location / Coordinates",
      cell: (row) => (
        <div>
          <div className="font-medium text-slate-800 text-xs flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            {row.location_name || "En route"}
          </div>
          {row.last_latitude && (
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
              {Number(row.last_latitude).toFixed(4)}, {Number(row.last_longitude).toFixed(4)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "speed",
      header: "Speed",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-slate-800">
          {row.speed_kmh ? `${parseFloat(String(row.speed_kmh)).toFixed(1)} km/h` : "Idle / Stopped"}
        </span>
      ),
    },
    {
      key: "last_ping_at",
      header: "Last Telemetry Ping",
      cell: (row) => (
        <span className="text-xs font-mono text-slate-500 tabular-nums">
          {formatDateTime(row.last_ping_at)}
        </span>
      ),
    },
  ];

  const handleSimulatePing = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        last_latitude: values.last_latitude ? parseFloat(values.last_latitude) : null,
        last_longitude: values.last_longitude ? parseFloat(values.last_longitude) : null,
        speed_kmh: values.speed_kmh ? parseFloat(values.speed_kmh) : 0,
      };
      await apiClient("/api/v1/transport/tracking", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsDrawerOpen(false);
      loadPings();
    } catch (err: any) {
      alert(err.message || "Failed to record telemetry ping.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pingFormSections: FormSectionDef[] = [
    {
      id: "ping_info",
      title: "Simulate Telemetry Ping",
      description: "Record telemetry ping across cellular, GPS, or transit checkpoint modes",
      columns: 2,
      fields: [
        {
          name: "vehicle_number",
          label: "Vehicle Registration Number *",
          placeholder: "e.g. MH12AB1234",
          required: true,
        },
        {
          name: "tracking_mode",
          label: "Tracking Mode *",
          type: "select",
          required: true,
          options: [
            { label: "SIM / Cell Tower Telemetry", value: "SIM" },
            { label: "GPS Telemetry Device", value: "GPS" },
            { label: "Transit / Highway Checkpoint Ping", value: "FASTAG" },
          ],
        },
        {
          name: "identifier",
          label: "Device Identifier (Mobile Phone / IMEI / Tag ID) *",
          placeholder: "e.g. 9876543210",
          required: true,
        },
        {
          name: "location_name",
          label: "Checkpoint / Location Landmark",
          placeholder: "e.g. Nellore Highway Plaza",
          required: true,
        },
        {
          name: "last_latitude",
          label: "Latitude",
          type: "number",
          placeholder: "14.462778",
        },
        {
          name: "last_longitude",
          label: "Longitude",
          type: "number",
          placeholder: "79.994167",
        },
        {
          name: "speed_kmh",
          label: "Vehicle Speed (km/h)",
          type: "number",
          placeholder: "45.0",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Tracking", href: "/tracking/fastag" },
          { label: "Sim Based Tracking" },
        ]}
        title="Sim Based Tracking"
        description="Cell tower triangulation and unified telemetry supporting carrier driver consent (Airtel, Jio, Vi, BSNL), GPS devices, and transit corridor checkpoints."
        primaryAction={{
          label: "Start SIM Tracking",
          icon: Smartphone,
          onClick: () => setIsStartTripModalOpen(true),
        }}
        secondaryActions={[
          {
            label: "FASTag Toll Tracking",
            icon: Navigation,
            href: "/tracking/fastag",
          },
        ]}
      />

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
        <SegmentTabs
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
          tabs={[
            {
              id: "sim",
              label: "SIM Live Tracking",
              icon: <Smartphone className="w-3.5 h-3.5" />,
              badge: simStats.active > 0 ? simStats.active : undefined,
            },
            {
              id: "telemetry",
              label: "Checkpoint Logs (Cell Tower / GPS / All Pings)",
              icon: <Activity className="w-3.5 h-3.5" />,
              badge: pingData.length > 0 ? pingData.length : undefined,
            },
          ]}
        />
        <div className="flex items-center gap-2">
          {activeTab === "sim" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSyncAllTrips}
              disabled={isSyncingAll}
              className="gap-1.5 text-xs shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? "animate-spin" : ""}`} />
              {isSyncingAll ? "Syncing..." : "Sync All Active Trips"}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDrawerOpen(true)}
              className="gap-1.5 text-xs shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Simulate Ping
            </Button>
          )}
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium shadow-2xs ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 ml-3"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =========================================================================
          TAB 1: SIM LIVE TRACKING
         ========================================================================= */}
      {activeTab === "sim" && (
        <div className="space-y-5">
          {/* SIM KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Active SIM Trips"
              value={isLoadingSim ? <Skeleton className="h-7 w-12 rounded" /> : simStats.active.toLocaleString()}
              subtext="Line-haul trips being tracked"
              icon={<Navigation className="w-4 h-4 text-indigo-600" />}
            />
            <KpiCard
              title="Consent Granted"
              value={isLoadingSim ? <Skeleton className="h-7 w-12 rounded" /> : simStats.consentGranted.toLocaleString()}
              subtext="Cell tower fixes streaming"
              icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
            />
            <KpiCard
              title="Consent Pending SMS"
              value={isLoadingSim ? <Skeleton className="h-7 w-12 rounded" /> : simStats.consentPending.toLocaleString()}
              subtext="Awaiting driver SMS reply"
              icon={<Clock className="w-4 h-4 text-amber-600" />}
            />
            <KpiCard
              title="Completed / Closed"
              value={isLoadingSim ? <Skeleton className="h-7 w-12 rounded" /> : simStats.closed.toLocaleString()}
              subtext="Delivered consignment journeys"
              icon={<CheckCircle2 className="w-4 h-4 text-slate-600" />}
            />
          </div>

          {/* SIM Trips DataTable */}
          <DataTable
            columns={simColumns}
            data={simTrips}
            isLoading={isLoadingSim}
            isError={!!simError}
            errorMessage={simError}
            onRetry={loadSimTrips}
            searchPlaceholder="Search by vehicle, LR number, driver phone, or location..."
          />
        </div>
      )}

      {/* =========================================================================
          TAB 2: CHECKPOINT LOGS (Cell Tower / GPS / All Pings)
         ========================================================================= */}
      {activeTab === "telemetry" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Monitored Fleet Units"
              value={isLoadingPings ? <Skeleton className="h-7 w-12 rounded" /> : pingStats.totalVehicles.toLocaleString()}
              subtext="Active tracked registration plates"
              icon={<Navigation className="w-4 h-4 text-indigo-600" />}
            />
            <KpiCard
              title="Active GPS Devices"
              value={isLoadingPings ? <Skeleton className="h-7 w-12 rounded" /> : pingStats.gpsPings.toLocaleString()}
              subtext="High-frequency telemetry fixes"
              icon={<Radio className="w-4 h-4 text-emerald-600" />}
            />
            <KpiCard
              title="SIM Triangulation Hits"
              value={isLoadingPings ? <Skeleton className="h-7 w-12 rounded" /> : pingStats.simPings.toLocaleString()}
              subtext="Cellular network telecom pings"
              icon={<Smartphone className="w-4 h-4 text-indigo-600" />}
            />
            <KpiCard
              title="Transit Checkpoint Hits"
              value={isLoadingPings ? <Skeleton className="h-7 w-12 rounded" /> : pingStats.checkpointPings.toLocaleString()}
              subtext="Transit corridor checkpoint fixes"
              icon={<Signal className="w-4 h-4 text-blue-600" />}
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadPings}
              className="gap-1.5 text-xs shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Checkpoint Logs
            </Button>
          </div>

          <DataTable
            columns={pingColumns}
            data={pingData}
            isLoading={isLoadingPings}
            isError={!!pingError}
            errorMessage={pingError}
            onRetry={loadPings}
            searchPlaceholder="Search by vehicle number, location, or mode..."
          />
        </div>
      )}

      {/* =========================================================================
          START SIM TRACKING MODAL / DRAWER
         ========================================================================= */}
      <EntityDrawer
        isOpen={isStartTripModalOpen}
        onClose={() => {
          setIsStartTripModalOpen(false);
          resetFormData();
        }}
        title="Start SIM Tracking"
        subtitle="Initiate telecom cell-tower tracking by driver mobile & vehicle registration"
        width="xl"
      >
        {/* Pre-fill LR Link Context Banner */}
        <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50/90 to-purple-50/70 border border-indigo-200/80 text-indigo-950 text-xs shadow-2xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-indigo-600" />
                Link Consignment / LR:
              </span>
              <span className="text-[11px] font-semibold text-indigo-700 bg-white/90 px-2 py-0.5 rounded border border-indigo-200">
                Optional Quick Autofill
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Auto-fills vehicle plate, driver phone, and route locations
            </span>
          </div>
          <select
            value={selectedLrId}
            onChange={(e) => handleLrSelect(e.target.value)}
            className="w-full text-xs font-medium bg-white border border-indigo-200/90 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs cursor-pointer"
          >
            <option value="">-- Choose active consignment or enter manually --</option>
            {availableLRs.map((lr) => {
              const originText = lr.origin_city || lr.origin_name || "Origin";
              const destText = lr.destination_city || lr.destination_name || "Destination";
              return (
                <option key={lr.id} value={lr.id}>
                  {lr.lr_number} • {lr.vehicle_number} • {originText} ➔ {destText} ({lr.driver_name || "Driver"})
                </option>
              );
            })}
          </select>
        </div>

        {/* Outer Form Box / Container Card matching LR Add Form */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 lg:p-7 space-y-6 shadow-2xs">
          {/* Section Header */}
          <div className="border-b border-slate-100 pb-3.5">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
              Vehicle &amp; Driver Authorization
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-normal">
              Vehicle registration, driver 10-digit mobile number for telecom ping consent, and transit corridor.
            </p>
          </div>

          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <span className="text-amber-900 font-medium">
                Standard Tariff: <strong className="font-bold">₹8.50 per trip per 24 hours</strong>. Day 1 is debited upon start. Auto-renews if trip exceeds 24h. Unlimited daily location pings.
              </span>
            </div>
            <Link
              href="/api-center/sim"
              className="text-indigo-600 font-semibold hover:text-indigo-800 text-xs shrink-0 flex items-center gap-1"
            >
              <span>Manage SIM Wallet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <form onSubmit={handleStartSimTrip} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 min-w-0">
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  Vehicle Registration Plate <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH12AB1234"
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value.toUpperCase() })}
                  className="w-full h-10 px-3.5 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  Driver Mobile Phone (10 Digits) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-semibold text-slate-400 font-mono select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={formData.driver_phone}
                    onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                    className="w-full h-10 pl-12 pr-3.5 text-xs font-mono font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  Driver Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  className="w-full h-10 px-3.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  Route Code / Corridor
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai-Pune Express"
                  value={formData.route_code}
                  onChange={(e) => setFormData({ ...formData, route_code: e.target.value })}
                  className="w-full h-10 px-3.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5 min-w-0">
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  Origin Loading Hub / Landmark
                </label>
                <input
                  type="text"
                  placeholder="e.g. JNPT Nhava Sheva, Navi Mumbai, Maharashtra"
                  value={formData.origin_address}
                  onChange={(e) => setFormData({ ...formData, origin_address: e.target.value })}
                  className="w-full h-10 px-3.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5 min-w-0">
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  Destination Unloading Hub / City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chakan Industrial Area, Pune, Maharashtra"
                  value={formData.destination_address}
                  onChange={(e) => setFormData({ ...formData, destination_address: e.target.value })}
                  className="w-full h-10 px-3.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Consent Information Banner */}
            <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold text-amber-950">Telecom Carrier Consent Ping:</span>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  Per Indian telecom regulations, starting tracking sends an SMS to the driver. The driver replies with 1 / YES or clicks the verification prompt. Location fixes start immediately once consent is verified.
                </p>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsStartTripModalOpen(false);
                  resetFormData();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? "Initiating..." : "Initiate SIM Tracking & Send SMS"}
              </Button>
            </div>
          </form>
        </div>
      </EntityDrawer>

      {/* =========================================================================
          TRIP DETAILS MODAL
         ========================================================================= */}
      <EntityDrawer
        isOpen={isTripDetailsModalOpen}
        onClose={() => {
          setIsTripDetailsModalOpen(false);
          setSelectedTrip(null);
        }}
        title={`Trip Telemetry: ${selectedTrip?.vehicle_number || ""}`}
        subtitle={`Feed UID: ${selectedTrip?.feed_unique_id || ""}`}
        width="xl"
      >
        {selectedTrip && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 lg:p-7 space-y-6 shadow-2xs">
            {/* Header Plate & Status Banner */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <VehiclePlate vehicleNumber={selectedTrip.vehicle_number} />
                  <div className="text-xs text-slate-500 font-medium mt-1">
                    Driver: <span className="text-slate-800 font-semibold">{selectedTrip.driver_name || "Assigned Driver"}</span> (+91 {selectedTrip.driver_phone})
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Badge
                    variant={selectedTrip.is_consent_done ? "success" : "warning"}
                    dot
                    className="text-xs"
                  >
                    {selectedTrip.is_consent_done ? "Consent Active" : "Consent Pending"}
                  </Badge>
                  <div className="text-[11px] font-mono text-slate-400">
                    Status: {selectedTrip.status}
                  </div>
                </div>
              </div>

              {/* Consignment (LR) & Tracking UID */}
              <div className="pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Consignment (LR):
                  </span>
                  {selectedTrip.lr_number ? (
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50/90 px-2.5 py-0.5 rounded border border-indigo-200/60 inline-block shadow-2xs">
                      {selectedTrip.lr_number}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Unlinked Leg</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono" title={selectedTrip.feed_unique_id}>
                  UID: <span className="text-slate-700 font-semibold">{selectedTrip.feed_unique_id}</span>
                </div>
              </div>
            </div>

            {/* Public Share Link Card */}
            {selectedTrip.share_url && (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/70 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
                    <MapIcon className="w-3.5 h-3.5 text-indigo-600" />
                    Public Live Tracking URL
                  </span>
                  <a
                    href={selectedTrip.share_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    Open Map <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedTrip.share_url}
                    className="w-full text-xs font-mono bg-white border border-indigo-200 rounded-md p-1.5 text-slate-700"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(selectedTrip.share_url!, "share_url")}
                    className="shrink-0 h-8 gap-1 text-xs"
                  >
                    {copiedKey === "share_url" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === "share_url" ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            )}

            {/* Telecom Lifecycle Timeline */}
            <div className="p-4 border border-slate-200 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                SIM Tracking Protocol Progress
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Trip Created & SMS Request Dispatched</div>
                    <div className="text-[11px] text-slate-500">
                      Dispatched to telecom gateway. Created at {formatDateTime(selectedTrip.created_at)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      selectedTrip.is_consent_done
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {selectedTrip.is_consent_done ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-900">
                      Driver Telecom Consent: {selectedTrip.is_consent_done ? "Approved" : "Awaiting Driver Reply"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {selectedTrip.is_consent_done
                        ? "Consent confirmed by mobile operator. Cell tower fixes authorized."
                        : `SMS delivered to +91 ${selectedTrip.driver_phone}. Awaiting subscriber confirmation.`}
                    </div>
                    {!selectedTrip.is_consent_done && (
                      <div className="mt-1.5">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSimulateConsent(selectedTrip)}
                          className="text-xs h-7 gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Simulate SMS Consent Acceptance
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      selectedTrip.last_latitude
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Live Telemetry Fixes</div>
                    <div className="text-[11px] text-slate-500">
                      {selectedTrip.last_location_address || "Awaiting first cell tower fix"}
                    </div>
                    {selectedTrip.last_latitude && (
                      <div className="text-[11px] font-mono text-indigo-600 mt-0.5">
                        {Number(selectedTrip.last_latitude).toFixed(4)}, {Number(selectedTrip.last_longitude).toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SIM Billing & Cycle Counter Status */}
            <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-amber-950 flex items-center gap-2">
                    <span>Billing Day {selectedTrip.billing_cycles_charged || 1} (24h Active Cycle)</span>
                  </div>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    Tariff: ₹8.50 / trip / 24hr • Renews automatically when trip exceeds 24 hrs
                  </div>
                </div>
              </div>
              <Badge variant="warning" className="bg-white text-amber-900 border-amber-300 font-mono text-[10px] px-2 py-0.5">
                {selectedTrip.billing_cycles_charged || 1} x ₹8.50 Billed
              </Badge>
            </div>

            {/* Corridor & Route Specs */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block">Origin Loading</span>
                <span className="font-semibold text-slate-800">{selectedTrip.origin_address || "Origin"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Destination</span>
                <span className="font-semibold text-slate-800">{selectedTrip.destination_address || "Destination"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Distance Remaining</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedTrip.distance_remaining_km ? `${Number(selectedTrip.distance_remaining_km).toFixed(1)} km` : "Calculating..."}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Expected Arrival (ETA)</span>
                <span className="font-mono font-semibold text-indigo-700">
                  {selectedTrip.eta ? formatDateTime(selectedTrip.eta) : "Pending fix"}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSyncTrip(selectedTrip.id)}
                disabled={syncingTripId === selectedTrip.id}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingTripId === selectedTrip.id ? "animate-spin" : ""}`} />
                Refresh Live Location
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsTripDetailsModalOpen(false);
                  setSelectedTrip(null);
                }}
              >
                Close View
              </Button>
            </div>
          </div>
        )}
      </EntityDrawer>

      {/* =========================================================================
          CLOSE TRIP MODAL
         ========================================================================= */}
      <EntityDrawer
        isOpen={isCloseModalOpen}
        onClose={() => {
          setIsCloseModalOpen(false);
          setSelectedTrip(null);
          setCloseComment("");
        }}
        title="Close SIM Tracking Session"
        subtitle={`Mark trip complete for vehicle ${selectedTrip?.vehicle_number || ""}`}
        width="md"
      >
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-5 shadow-2xs">
          <form onSubmit={handleCloseTripSubmit} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Closing this trip will stop polling telecom cell towers for driver +91 {selectedTrip?.driver_phone}.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delivery / Closing Remarks
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Consignment delivered in good condition at warehouse gate."
                value={closeComment}
                onChange={(e) => setCloseComment(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCloseModalOpen(false);
                  setSelectedTrip(null);
                  setCloseComment("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isSubmitting ? "Closing..." : "Confirm & Close Trip"}
              </Button>
            </div>
          </form>
        </div>
      </EntityDrawer>

      {/* =========================================================================
          SIMULATE TELEMETRY CHECKPOINT DRAWER (Cell Tower / GPS / Transit)
         ========================================================================= */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Record Telemetry Checkpoint"
        subtitle="Log GPS waypoint, cellular telemetry fix, or manual transit checkpoint ping"
        size="lg"
      >
        <Form
          sections={pingFormSections}
          onSubmit={handleSimulatePing}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Save Checkpoint"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
