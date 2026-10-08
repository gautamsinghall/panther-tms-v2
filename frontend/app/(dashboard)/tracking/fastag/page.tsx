"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Plus,
  Navigation,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Truck,
  Layers,
  ChevronRight,
  Sparkles,
  RotateCcw,
  ExternalLink,
  Edit3,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { apiClient } from "@/lib/api-client";
import { FastagMap, TollCheckpoint, TripRouteData } from "@/components/tracking/fastag-map";

interface FastagTripSummary {
  id: number;
  trip_number: string;
  vehicle_number: string;
  is_manual: boolean;
  lr_id?: number | null;
  lr_number?: string | null;
  origin_name: string;
  destination_name: string;
  intermediate_stops?: string[];
  status: string;
  start_date: string;
  end_date?: string | null;
  total_distance_km?: number | null;
  covered_distance_km?: number | null;
  remaining_distance_km?: number | null;
  toll_count: number;
  last_toll_name?: string | null;
  last_toll_time?: string | null;
  last_sync_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

interface LRSummary {
  id: number;
  lr_number: string;
  vehicle_number: string;
  origin_name?: string;
  destination_name?: string;
}

export default function FastagTrackingPage() {
  const [vehicleInput, setVehicleInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  // Active Tracked Trip State
  const [activeVehicle, setActiveVehicle] = useState<string>("");
  const [currentTrip, setCurrentTrip] = useState<TripRouteData | null>(null);
  const [currentRoute, setCurrentRoute] = useState<TollCheckpoint[]>([]);
  const [focusedToll, setFocusedToll] = useState<TollCheckpoint | null>(null);
  const [apiCalled, setApiCalled] = useState(false);
  const [cooldownRemainingSec, setCooldownRemainingSec] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Live KPI progress metrics computed from road path
  const [metrics, setMetrics] = useState({
    coveredKm: 0,
    remainingKm: 0,
    totalKm: 0,
    progressPct: 0,
    status: "Awaiting Search",
  });

  const handleMetricsComputed = useCallback(
    (computed: { coveredKm: number; remainingKm: number; totalKm: number; progressPct: number }) => {
      setMetrics((prev) => {
        const newStatus =
          currentTrip?.to_location && computed.progressPct >= 95
            ? "Trip Completed"
            : currentTrip?.to_location
            ? "In Transit"
            : "Active Tracking";

        if (
          prev.coveredKm === computed.coveredKm &&
          prev.remainingKm === computed.remainingKm &&
          prev.totalKm === computed.totalKm &&
          prev.progressPct === computed.progressPct &&
          prev.status === newStatus
        ) {
          return prev;
        }

        return {
          ...prev,
          ...computed,
          status: newStatus,
        };
      });
    },
    [currentTrip?.to_location]
  );

  // Recent searches stored in localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Saved FASTag Trips List
  const [savedTrips, setSavedTrips] = useState<FastagTripSummary[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [tripFilter, setTripFilter] = useState<"ACTIVE" | "COMPLETED" | "ALL">("ACTIVE");

  // Manual Trip Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    vehicle_number: "",
    origin_name: "",
    destination_name: "",
    intermediate_stops: "",
    lr_id: undefined as number | undefined,
    notes: "",
  });
  const [availableLRs, setAvailableLRs] = useState<LRSummary[]>([]);
  const [isSubmittingTrip, setIsSubmittingTrip] = useState(false);

  // Manual Route Override within tracking view
  const [isCustomRouteOpen, setIsCustomRouteOpen] = useState(false);
  const [customOrigin, setCustomOrigin] = useState("");
  const [customDestination, setCustomDestination] = useState("");

  // ---------------------------------------------------------------------------
  // Load Initial Data & Recent Searches
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("fastag_searches") || "[]");
        if (Array.isArray(stored)) setRecentSearches(stored);
      } catch (e) {}

      // Auto-load if vehicle query parameter is present in URL
      const params = new URLSearchParams(window.location.search);
      const v = params.get("vehicle");
      if (v) {
        setVehicleInput(v.trim().toUpperCase());
        executeTrack(v.trim().toUpperCase(), false);
      }
    }

    loadSavedTrips();
    loadAvailableLRs();
  }, []);

  const loadSavedTrips = async () => {
    setIsLoadingTrips(true);
    try {
      const res = await apiClient<FastagTripSummary[]>("/api/v1/transport/tracking/fastag/trips");
      setSavedTrips(res || []);
    } catch (err) {
      console.error("Failed to load saved FASTag trips:", err);
    } finally {
      setIsLoadingTrips(false);
    }
  };

  const loadAvailableLRs = async () => {
    try {
      const res = await apiClient<any>("/api/v1/transport/lrs?limit=50");
      const list = Array.isArray(res) ? res : res?.items || [];
      setAvailableLRs(list);
    } catch (err) {
      console.error("Failed to load LRs:", err);
    }
  };

  const addRecentSearch = (veh: string) => {
    const clean = veh.toUpperCase().trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const updated = [clean, ...prev.filter((item) => item !== clean)].slice(0, 6);
      localStorage.setItem("fastag_searches", JSON.stringify(updated));
      return updated;
    });
  };

  // ---------------------------------------------------------------------------
  // Execute Tracking API Call
  // ---------------------------------------------------------------------------
  const executeTrack = async (
    vehicleNo: string,
    force: boolean = false,
    manualFrom?: string,
    manualTo?: string
  ) => {
    const cleanVehicle = vehicleNo.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (!cleanVehicle) {
      setFeedback({ type: "error", message: "Please enter a valid vehicle registration number." });
      return;
    }

    if (force) {
      setIsForceSyncing(true);
    } else {
      setIsSearching(true);
    }
    setFeedback(null);
    setFocusedToll(null);

    try {
      let url = `/api/v1/transport/tracking/fastag/track?vehicle=${encodeURIComponent(cleanVehicle)}&force=${
        force ? "true" : "false"
      }`;
      if (manualFrom && manualTo) {
        url += `&manual_from=${encodeURIComponent(manualFrom)}&manual_to=${encodeURIComponent(manualTo)}`;
      }

      const res = await apiClient<any>(url);

      setActiveVehicle(res.vehicle || cleanVehicle);
      setApiCalled(Boolean(res.api_called));
      const cooldownLimit = res.cooldown_seconds ?? 600;
      setCooldownRemainingSec(
        res.seconds_since_last_sync !== null && res.seconds_since_last_sync !== undefined
          ? Math.max(0, cooldownLimit - res.seconds_since_last_sync)
          : null
      );

      // Route and Checkpoints
      setCurrentRoute(res.route || []);

      // Trip Information
      if (res.trip) {
        setCurrentTrip(res.trip);
        setCustomOrigin(res.trip.from_location || "");
        setCustomDestination(res.trip.to_location || "");
      } else {
        setCurrentTrip(null);
        setCustomOrigin("");
        setCustomDestination("");
      }

      // Initial Metrics
      if (res.metrics) {
        setMetrics({
          coveredKm: res.metrics.covered_km || 0,
          remainingKm: res.metrics.remaining_km || 0,
          totalKm: res.metrics.total_km || 0,
          progressPct: res.metrics.progress_pct || 0,
          status: res.metrics.status || "Active Tracking",
        });
      }

      addRecentSearch(cleanVehicle);

      if (res.error) {
        setFeedback({
          type: res.error.toLowerCase().includes("exhausted") || res.error.includes("0 calls") ? "error" : "info",
          message: res.error,
        });
      } else if (res.api_called) {
        setFeedback({
          type: "success",
          message: `Fresh live FASTag telemetry retrieved from NETC for ${cleanVehicle}.`,
        });
      }
    } catch (err: any) {
      console.error("FASTag tracking failed:", err);
      setFeedback({
        type: "error",
        message: err.message || "Failed to query FASTag tracking API. Please verify vehicle number.",
      });
    } finally {
      setIsSearching(false);
      setIsForceSyncing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Save Manual FASTag Trip Handler
  // ---------------------------------------------------------------------------
  const handleSaveManualTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.vehicle_number.trim() || !manualForm.origin_name.trim() || !manualForm.destination_name.trim()) {
      alert("Please provide Vehicle Number, Origin (From), and Destination (To).");
      return;
    }

    setIsSubmittingTrip(true);
    try {
      const stops = manualForm.intermediate_stops
        ? manualForm.intermediate_stops
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const payload = {
        vehicle_number: manualForm.vehicle_number.trim().toUpperCase(),
        origin_name: manualForm.origin_name.trim(),
        destination_name: manualForm.destination_name.trim(),
        intermediate_stops: stops,
        lr_id: manualForm.lr_id || undefined,
        notes: manualForm.notes || undefined,
      };

      const created = await apiClient<FastagTripSummary>("/api/v1/transport/tracking/fastag/trips", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setFeedback({
        type: "success",
        message: `Trip ${created.trip_number} for ${created.vehicle_number} saved successfully!`,
      });

      setIsManualModalOpen(false);
      setManualForm({
        vehicle_number: "",
        origin_name: "",
        destination_name: "",
        intermediate_stops: "",
        lr_id: undefined,
        notes: "",
      });

      loadSavedTrips();

      // Automatically track the newly created manual trip
      setVehicleInput(created.vehicle_number);
      executeTrack(created.vehicle_number, false);
    } catch (err: any) {
      alert(err.message || "Failed to save manual FASTag trip.");
    } finally {
      setIsSubmittingTrip(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Auto-Sync All In-Transit Vehicles
  // ---------------------------------------------------------------------------
  const handleAutoSync = async () => {
    setIsAutoSyncing(true);
    try {
      const res = await apiClient<any>("/api/v1/transport/tracking/fastag/auto-sync", {
        method: "POST",
      });
      setFeedback({
        type: "success",
        message: `Auto-Sync Complete! Checked ${res.vehicles_checked} transit vehicles, synced ${res.live_api_synced} live updates.`,
      });
      loadSavedTrips();
      if (activeVehicle) {
        executeTrack(activeVehicle, false);
      }
    } catch (err: any) {
      alert(err.message || "Auto-sync request failed.");
    } finally {
      setIsAutoSyncing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Complete / Close Saved Trip
  // ---------------------------------------------------------------------------
  const handleCloseTrip = async (tripId: number) => {
    if (!confirm("Are you sure you want to mark this FASTag trip as Completed?")) return;
    try {
      await apiClient(`/api/v1/transport/tracking/fastag/trips/${tripId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      loadSavedTrips();
      setFeedback({ type: "success", message: "Trip marked as Completed." });
    } catch (err: any) {
      alert(err.message || "Failed to update trip status.");
    }
  };

  // ---------------------------------------------------------------------------
  // Delete Saved Trip
  // ---------------------------------------------------------------------------
  const handleDeleteTrip = async (tripId: number) => {
    if (!confirm("Are you sure you want to delete this trip record?")) return;
    try {
      await apiClient(`/api/v1/transport/tracking/fastag/trips/${tripId}`, {
        method: "DELETE",
      });
      loadSavedTrips();
      setFeedback({ type: "info", message: "Trip deleted successfully." });
    } catch (err: any) {
      alert(err.message || "Failed to delete trip.");
    }
  };

  // ---------------------------------------------------------------------------
  // Export Excel Summary
  // ---------------------------------------------------------------------------
  const handleExportExcel = () => {
    if (!activeVehicle) return;

    const routePath = currentTrip?.waypoints?.join(" -> ") || "N/A";
    let tableHTML = `<table border="1" style="font-family: Arial, sans-serif; border-collapse: collapse;">`;

    tableHTML += `
      <tr style="background-color: #4338ca; color: white; font-weight: bold; text-align: center;">
        <td style="padding: 10px;">Trip / LR Number</td>
        <td style="padding: 10px;">Vehicle Number</td>
        <td style="padding: 10px;" colspan="2">Full Highway Route Path</td>
      </tr>
      <tr style="text-align: center;">
        <td style="padding: 8px; font-weight: bold;">${currentTrip?.trip_number || currentTrip?.lr_no || "MANUAL"}</td>
        <td style="padding: 8px; font-weight: bold;">${activeVehicle}</td>
        <td style="padding: 8px;" colspan="2">${routePath}</td>
      </tr>
      <tr><td colspan="4"></td></tr>
      <tr style="background-color: #15803d; color: white; font-weight: bold; text-align: left;">
        <td style="padding: 10px;">S.No</td>
        <td style="padding: 10px;" colspan="2">Toll Plaza Checkpoint</td>
        <td style="padding: 10px;">Crossed Timestamp</td>
      </tr>
    `;

    if (currentRoute && currentRoute.length > 0) {
      currentRoute.forEach((toll, idx) => {
        tableHTML += `
          <tr>
            <td style="padding: 8px; text-align: center;">${idx + 1}</td>
            <td style="padding: 8px;" colspan="2">${toll.toll_plaza_name}</td>
            <td style="padding: 8px;">${toll.formatted_time}</td>
          </tr>
        `;
      });
    } else {
      tableHTML += `<tr><td colspan="4" style="text-align: center; padding: 10px; color: red;">No Toll Plaza Records Found</td></tr>`;
    }

    tableHTML += `</table>`;

    const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `FASTag_Trip_Summary_${activeVehicle}.xls`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Filtered trips list
  const filteredSavedTrips = useMemo(() => {
    if (tripFilter === "ALL") return savedTrips;
    return savedTrips.filter((t) => t.status.toUpperCase() === tripFilter);
  }, [savedTrips, tripFilter]);

  return (
    <div className="space-y-4 max-w-full">
      {/* Page Header with Action Buttons */}
      <PageHeader
        title="FASTag Vehicle Tracking"
        description="National Electronic Toll Collection (NETC) highway telemetry, road-following transit routes, and trip progress tracking"
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Tracking", href: "/tracking/fastag" },
          { label: "FASTag Tracking" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoSync}
              disabled={isAutoSyncing}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAutoSyncing ? "animate-spin" : ""}`} />
              Auto-Sync In-Transit
            </Button>
            {activeVehicle && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="gap-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Excel Summary
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsManualModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Manual Trip
            </Button>
          </div>
        }
      />

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-3 rounded-lg text-xs font-medium border transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : feedback.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : feedback.type === "error" ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0 text-blue-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input & Action */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={vehicleInput}
                onChange={(e) => setVehicleInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") executeTrack(vehicleInput, false);
                }}
                placeholder="ENTER VEHICLE NUMBER (e.g. MH04GP1234)"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-wider uppercase text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white shadow-inner transition"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => executeTrack(vehicleInput, false)}
              disabled={isSearching}
              className="gap-1.5 shrink-0 px-4"
            >
              <Navigation className={`w-3.5 h-3.5 ${isSearching ? "animate-spin" : ""}`} />
              Track
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => executeTrack(vehicleInput, true)}
              disabled={isForceSyncing || !vehicleInput.trim()}
              title="Bypass 1-hour rate limit and query live FASTag API"
              className="gap-1 shrink-0 text-[11px] font-semibold"
            >
              <RotateCcw className={`w-3 h-3 ${isForceSyncing ? "animate-spin" : ""}`} />
              Force Live Sync
            </Button>
          </div>

          {/* Status & Live API Indicator */}
          {activeVehicle && (
            <div className="flex items-center gap-3 shrink-0">
              <VehiclePlate vehicleNumber={activeVehicle} />
              <div className="flex items-center gap-1.5">
                {apiCalled ? (
                  <Badge variant="primary" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                    Live API
                  </Badge>
                ) : (
                  <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-300">
                    Cached
                  </Badge>
                )}
                {cooldownRemainingSec !== null && cooldownRemainingSec > 0 && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    Cooldown: {Math.ceil(cooldownRemainingSec / 60)}m
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent Searches Chips */}
        {recentSearches.length > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 overflow-x-auto">
            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Recent:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {recentSearches.map((veh) => (
                <button
                  key={veh}
                  type="button"
                  onClick={() => {
                    setVehicleInput(veh);
                    executeTrack(veh, false);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border transition ${
                    activeVehicle === veh
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                >
                  {veh}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main 3-Column Interactive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Trip Progress, Route Details, & Waypoints (Cols 3) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Trip Progress KPI Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-800">
                Trip Progress
              </span>
              <Badge
                variant={
                  metrics.status === "Trip Completed"
                    ? "primary"
                    : metrics.status === "In Transit"
                    ? "primary"
                    : "neutral"
                }
                className="text-[10px] uppercase font-bold"
              >
                {metrics.status}
              </Badge>
            </div>

            {/* 3-Way Distance Grid */}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                <span className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Covered</span>
                <span className="text-xs font-extrabold text-emerald-600 font-mono">
                  {metrics.coveredKm.toLocaleString()} km
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                <span className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Remaining</span>
                <span className="text-xs font-extrabold text-blue-600 font-mono">
                  {currentTrip?.to_location ? `${metrics.remainingKm.toLocaleString()} km` : "--"}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                <span className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Total</span>
                <span className="text-xs font-extrabold text-slate-800 font-mono">
                  {metrics.totalKm > 0 ? `${metrics.totalKm.toLocaleString()} km` : `${metrics.coveredKm} km`}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-500 uppercase">Highway Journey</span>
                <span className="text-indigo-600 font-mono font-extrabold">{metrics.progressPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200 shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-indigo-600 h-full rounded-full transition-all duration-700"
                  style={{ width: `${metrics.progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Trip Overview Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-800">
                Trip Overview
              </span>
              <button
                type="button"
                onClick={() => setIsCustomRouteOpen(!isCustomRouteOpen)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                {isCustomRouteOpen ? "Close Route" : "Edit Route"}
              </button>
            </div>

            {/* In-line Custom Route Editor */}
            {isCustomRouteOpen && (
              <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-200/80 space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase text-indigo-900 block">
                  Manual Origin & Destination
                </span>
                <div>
                  <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Origin (From):</label>
                  <input
                    type="text"
                    value={customOrigin}
                    onChange={(e) => setCustomOrigin(e.target.value)}
                    placeholder="e.g. Jaipur, Rajasthan"
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Destination (To):</label>
                  <input
                    type="text"
                    value={customDestination}
                    onChange={(e) => setCustomDestination(e.target.value)}
                    placeholder="e.g. Mumbai, Maharashtra"
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-end gap-1.5 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (!activeVehicle) {
                        alert("Please track a vehicle first.");
                        return;
                      }
                      executeTrack(activeVehicle, false, customOrigin, customDestination);
                      setIsCustomRouteOpen(false);
                    }}
                    className="text-[11px] py-1 h-7"
                  >
                    Apply Route
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] font-semibold uppercase">Vehicle:</span>
                <span className="font-mono font-extrabold text-slate-900">
                  {activeVehicle || "--"}
                </span>
              </div>

              <div className="flex justify-between items-center bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] font-semibold uppercase">Trip / LR Ref:</span>
                <span className="font-mono font-bold text-indigo-600">
                  {currentTrip?.trip_number || currentTrip?.lr_no || "Manual Tracking"}
                </span>
              </div>

              {/* Waypoints Hierarchy */}
              <div className="pt-1 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Route Corridor
                </span>
                {currentTrip?.waypoints && currentTrip.waypoints.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {currentTrip.waypoints.map((wp, i) => {
                      const isFrom = i === 0;
                      const isTo = i === currentTrip.waypoints!.length - 1;
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                        >
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 text-white ${
                              isFrom ? "bg-emerald-700" : isTo ? "bg-red-600" : "bg-blue-600"
                            }`}
                          >
                            {isFrom ? "From" : isTo ? "To" : `Stop ${i}`}
                          </span>
                          <span className="font-semibold text-slate-800 truncate">{wp}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-[11px] text-slate-400 italic">
                    Enter vehicle to detect active LR or enter route waypoints above.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Full Interactive Map Engine (Cols 6) */}
        <div className="lg:col-span-6 h-[580px] flex flex-col">
          <FastagMap
            route={currentRoute}
            trip={currentTrip}
            focusedToll={focusedToll}
            onMetricsComputed={handleMetricsComputed}
            className="flex-1"
          />
        </div>

        {/* RIGHT COLUMN: Chronological Toll Timeline (Latest on Top!) (Cols 3) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col h-[580px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900">
                Toll Timeline
              </h3>
            </div>
            <Badge variant="primary" className="text-[10px]">
              {currentRoute.length} Tolls
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {currentRoute.length > 0 ? (
              // Render reverse chronological order: Latest toll on top!
              [...currentRoute].reverse().map((toll, reverseIdx) => {
                const chronologicalNum = currentRoute.length - reverseIdx;
                const isLatest = reverseIdx === 0;

                return (
                  <div
                    key={toll.id || reverseIdx}
                    onClick={() => setFocusedToll(toll)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${
                      isLatest
                        ? "bg-indigo-50/80 border-indigo-300 shadow-sm"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          Stop #{chronologicalNum}
                        </span>
                        {isLatest && (
                          <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white shadow-sm animate-pulse">
                            Latest
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        {toll.formatted_time}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                      {toll.toll_plaza_name}
                    </h4>

                    {toll.geocode && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] font-mono text-slate-400">
                        <MapPin className="w-3 h-3 text-indigo-500" />
                        <span>{toll.geocode}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Navigation className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No Toll Checkpoints Recorded</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter a vehicle registration number above to query the FASTag network.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved FASTag Trips Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Saved FASTag Trips</h3>
            <p className="text-xs text-slate-500">
              Manage saved vehicle trips created manually or linked to active GR/LR bookings
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTripFilter("ACTIVE")}
              className={`px-3 py-1 rounded-md transition ${
                tripFilter === "ACTIVE" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active ({savedTrips.filter((t) => t.status.toUpperCase() === "ACTIVE").length})
            </button>
            <button
              type="button"
              onClick={() => setTripFilter("COMPLETED")}
              className={`px-3 py-1 rounded-md transition ${
                tripFilter === "COMPLETED"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Completed ({savedTrips.filter((t) => t.status.toUpperCase() === "COMPLETED").length})
            </button>
            <button
              type="button"
              onClick={() => setTripFilter("ALL")}
              className={`px-3 py-1 rounded-md transition ${
                tripFilter === "ALL" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({savedTrips.length})
            </button>
          </div>
        </div>

        {/* Trips Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 border-y border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Trip Ref</th>
                <th className="py-2.5 px-3">Vehicle</th>
                <th className="py-2.5 px-3">Route (Origin &rarr; Destination)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Tolls</th>
                <th className="py-2.5 px-3">Last Checkpoint</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSavedTrips.length > 0 ? (
                filteredSavedTrips.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                      {t.trip_number}
                    </td>
                    <td className="py-2.5 px-3">
                      <VehiclePlate vehicleNumber={t.vehicle_number} />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">
                        {t.origin_name} &rarr; {t.destination_name}
                      </div>
                      {t.lr_number && (
                        <div className="text-[10px] text-slate-400 font-mono">LR: {t.lr_number}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={t.status.toUpperCase() === "ACTIVE" ? "primary" : "neutral"}
                        className="text-[10px] uppercase font-bold"
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">{t.toll_count}</td>
                    <td className="py-2.5 px-3">
                      <div className="truncate max-w-[180px] font-medium text-slate-800">
                        {t.last_toll_name || "--"}
                      </div>
                      {t.last_toll_time && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(t.last_toll_time).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setVehicleInput(t.vehicle_number);
                            executeTrack(t.vehicle_number, false, t.origin_name, t.destination_name);
                          }}
                          className="h-7 text-xs font-bold gap-1 text-indigo-700 bg-indigo-50 border-indigo-200"
                        >
                          <Navigation className="w-3 h-3" />
                          Track
                        </Button>
                        {t.status.toUpperCase() === "ACTIVE" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCloseTrip(t.id)}
                            className="h-7 text-xs text-slate-600 hover:text-emerald-700"
                            title="Mark as Completed"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTrip(t.id)}
                          className="h-7 text-xs text-rose-500 hover:text-rose-700"
                          title="Delete trip record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                    {isLoadingTrips ? "Loading saved trips..." : "No trips found in this view."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Manual FASTag Trip */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create FASTag Trip</h3>
                  <p className="text-xs text-slate-500">Track vehicle journey without requiring an LR</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualTrip} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                  Vehicle Number *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.vehicle_number}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, vehicle_number: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. MH04GP1234 or RJ14GB5678"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold tracking-wider text-slate-900 uppercase outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    Origin (From) *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualForm.origin_name}
                    onChange={(e) => setManualForm({ ...manualForm, origin_name: e.target.value })}
                    placeholder="e.g. Jaipur, Rajasthan"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    Destination (To) *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualForm.destination_name}
                    onChange={(e) => setManualForm({ ...manualForm, destination_name: e.target.value })}
                    placeholder="e.g. Mumbai, Maharashtra"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                  Intermediate Stops (Via)
                </label>
                <input
                  type="text"
                  value={manualForm.intermediate_stops}
                  onChange={(e) => setManualForm({ ...manualForm, intermediate_stops: e.target.value })}
                  placeholder="Comma separated: Pali, Ahmedabad, Surat"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                  Link with LR Consignment (Optional)
                </label>
                <select
                  value={manualForm.lr_id || ""}
                  onChange={(e) => {
                    const chosenId = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    const matchedLR = availableLRs.find((l) => l.id === chosenId);
                    setManualForm({
                      ...manualForm,
                      lr_id: chosenId,
                      vehicle_number: matchedLR?.vehicle_number || manualForm.vehicle_number,
                      origin_name: matchedLR?.origin_name || manualForm.origin_name,
                      destination_name: matchedLR?.destination_name || manualForm.destination_name,
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="">None (Independent Manual Trip)</option>
                  {availableLRs.map((lr) => (
                    <option key={lr.id} value={lr.id}>
                      LR #{lr.lr_number} &mdash; {lr.vehicle_number} ({lr.origin_name || "N/A"} &rarr;{" "}
                      {lr.destination_name || "N/A"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                  Notes / Consignment Details
                </label>
                <textarea
                  rows={2}
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  placeholder="Driver contact, cargo particulars, or trip remarks..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsManualModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmittingTrip}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSubmittingTrip ? "Saving..." : "Save & Start Tracking"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
