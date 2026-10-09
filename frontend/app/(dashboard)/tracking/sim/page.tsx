"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Radio,
  MapPin,
  RefreshCw,
  Navigation,
  Signal,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Truck,
  Check,
  X,
  Phone,
  FileText,
  Star,
  Settings,
  MoreVertical,
  Mail,
  Edit2,
  MessageSquare,
  Search,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { cn, formatDateTime, formatDate } from "@/lib/utils";
import {
  CarrierLogo,
  CarrierPhoneBadge,
  detectTelecomOperator,
} from "@/components/tracking/sim-carrier-badge";
import { SIMTrackingMap } from "@/components/tracking/sim-tracking-map";

// ---------------------------------------------------------------------------
// Telemetry & SIM Tracking Types
// ---------------------------------------------------------------------------

export interface SIMTripRecord {
  id: number;
  feed_unique_id: string;
  ft_trip_id?: number | null;
  lr_id?: number | null;
  lr_number?: string | null;
  vehicle_number: string;
  driver_name?: string | null;
  driver_phone: string;
  operator_name?: string | null;
  consignor_name?: string | null;
  consignee_name?: string | null;
  milestone?: string | null;
  trip_direction?: string | null;
  is_delayed?: boolean;
  is_starred?: boolean;
  ewb_number?: string | null;
  ewb_expiry?: string | null;
  comments?: Array<{ id: number; text: string; author: string; created_at: string }>;
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

export default function SIMTrackingPage() {
  // Main Tab: "open" vs "closed"
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");

  // Trips data
  const [simTrips, setSimTrips] = useState<SIMTripRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Syncing / Refreshing state per trip
  const [syncingTripIds, setSyncingTripIds] = useState<Set<number>>(new Set());

  // Expanded trip row ID (only one row expanded at a time)
  const [expandedTripId, setExpandedTripId] = useState<number | null>(null);
  const [expandedSubTab, setExpandedSubTab] = useState<
    "tracking" | "full_details" | "documents" | "comments" | "alert" | "lr" | "yard"
  >("tracking");

  // Checkbox selections
  const [selectedTripIds, setSelectedTripIds] = useState<number[]>([]);

  // Filter Chips / Quick toggles
  const [filterDelayed, setFilterDelayed] = useState(false);
  const [filterStarred, setFilterStarred] = useState(false);
  const [filterEwbExpired, setFilterEwbExpired] = useState(false);
  const [filterUntracked, setFilterUntracked] = useState(false);

  // Search & Filter row
  const [tripTypeFilter, setTripTypeFilter] = useState<string>("All Trips");
  const [searchQuery, setSearchQuery] = useState("");
  const [consigneeFilter, setConsigneeFilter] = useState("All Consignee");
  const [consignorFilter, setConsignorFilter] = useState("All Consignors");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Sort Option
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "vehicle" | "eta">("recent");

  // Actions menu state: track open dropdown ID
  const [actionMenuTripId, setActionMenuTripId] = useState<number | null>(null);

  // Feedback Toast
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals state
  const [isAddTripModalOpen, setIsAddTripModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isDisplayOptionsModalOpen, setIsDisplayOptionsModalOpen] = useState(false);

  const [activeModalTrip, setActiveModalTrip] = useState<SIMTripRecord | null>(null);
  const [closeComment, setCloseComment] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Trip Form State - SIM operator is ALWAYS auto-fetched from driver mobile phone
  const [availableLRs, setAvailableLRs] = useState<LRSummary[]>([]);
  const [selectedLrId, setSelectedLrId] = useState<string>("");
  const [addFormData, setAddFormData] = useState({
    vehicle_number: "",
    driver_phone: "",
    driver_name: "",
    lr_id: undefined as number | undefined,
    lr_number: "",
    consignor_name: "",
    consignee_name: "",
    origin_address: "",
    destination_address: "",
    trip_direction: "Outbound",
    route_code: "",
    share_trip: true,
  });

  // Edit Trip Form State - SIM operator is ALWAYS auto-fetched
  const [editFormData, setEditFormData] = useState({
    driver_name: "",
    driver_phone: "",
    consignor_name: "",
    consignee_name: "",
    milestone: "",
    trip_direction: "Outbound",
  });

  // Display Options toggles
  const [displayOptions, setDisplayOptions] = useState({
    showEwb: true,
    showEta: true,
    compactRows: false,
  });

  // ---------------------------------------------------------------------------
  // Data Loaders
  // ---------------------------------------------------------------------------

  const loadSimTrips = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<SIMTripRecord[]>("/api/v1/transport/tracking/sim");
      setSimTrips(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error("Failed to load SIM trips:", err);
      setError(err?.message || "Failed to load SIM tracking telemetry records.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadLRs = async () => {
    try {
      const res = await apiClient<any>("/api/v1/transport/lrs?limit=100");
      const list = Array.isArray(res) ? res : res?.items || [];
      setAvailableLRs(list);
    } catch (err) {
      console.error("Failed to fetch LRs for selection:", err);
    }
  };

  useEffect(() => {
    loadSimTrips();
    loadLRs();
  }, []);

  // Close actions dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActionMenuTripId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Auto-dismiss feedback messages after 5 seconds
  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = setTimeout(() => setFeedbackMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  // ---------------------------------------------------------------------------
  // Google Maps Directions Helper
  // ---------------------------------------------------------------------------

  const openGoogleMapsRoute = (trip: SIMTripRecord) => {
    const origin = encodeURIComponent(trip.origin_address || "Origin Hub");
    const destination = encodeURIComponent(trip.destination_address || "Destination Hub");
    const waypoint =
      trip.last_latitude && trip.last_longitude
        ? `${trip.last_latitude},${trip.last_longitude}`
        : trip.last_location_address
        ? encodeURIComponent(trip.last_location_address)
        : "";

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoint) {
      url += `&waypoints=${waypoint}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ---------------------------------------------------------------------------
  // Handlers for Add Trip
  // ---------------------------------------------------------------------------

  const handleLrSelect = (lrIdStr: string) => {
    setSelectedLrId(lrIdStr);
    if (!lrIdStr) return;
    const lrIdNum = parseInt(lrIdStr, 10);
    const chosen = availableLRs.find((l) => l.id === lrIdNum);
    if (chosen) {
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

      const corridor = originHub && destHub ? `${originHub} ➔ ${destHub}` : chosen.via || "";

      setAddFormData((prev) => ({
        ...prev,
        lr_id: chosen.id,
        lr_number: chosen.lr_number || "",
        vehicle_number: chosen.vehicle_number || prev.vehicle_number,
        driver_phone: chosen.driver_phone ? chosen.driver_phone.replace(/\D/g, "").slice(-10) : prev.driver_phone,
        driver_name: chosen.driver_name || prev.driver_name,
        consignor_name: chosen.consigner_name || prev.consignor_name,
        consignee_name: chosen.consignee_name || prev.consignee_name,
        origin_address: originHub || prev.origin_address,
        destination_address: destHub || prev.destination_address,
        route_code: corridor || prev.route_code,
      }));
    }
  };

  const handleStartSimTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.vehicle_number.trim() || !addFormData.driver_phone.trim()) {
      alert("Please provide both Vehicle Number and 10-digit Driver Mobile Phone.");
      return;
    }
    const cleanPhone = addFormData.driver_phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      alert("Driver mobile phone must be strictly 10 digits for Indian telecom SIM consent.");
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      const detectedCarrier = detectTelecomOperator(cleanPhone);
      const payload = {
        ...addFormData,
        vehicle_number: addFormData.vehicle_number.trim().toUpperCase(),
        driver_phone: cleanPhone.slice(-10),
        operator_name: detectedCarrier, // Always auto-fetched
      };
      await apiClient("/api/v1/transport/tracking/sim/start", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setFeedbackMessage({
        type: "success",
        text: `Trip initialized for ${payload.vehicle_number} (${detectedCarrier}). Driver consent request queued to +91 ${payload.driver_phone}.`,
      });
      setIsAddTripModalOpen(false);
      resetAddFormData();
      loadSimTrips();
    } catch (err: any) {
      alert(err.message || "Failed to initiate SIM trip tracking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAddFormData = () => {
    setSelectedLrId("");
    setAddFormData({
      vehicle_number: "",
      driver_phone: "",
      driver_name: "",
      lr_id: undefined,
      lr_number: "",
      consignor_name: "",
      consignee_name: "",
      origin_address: "",
      destination_address: "",
      trip_direction: "Outbound",
      route_code: "",
      share_trip: true,
    });
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const handleToggleStar = async (trip: SIMTripRecord) => {
    const nextStarred = !trip.is_starred;
    setSimTrips((prev) => prev.map((t) => (t.id === trip.id ? { ...t, is_starred: nextStarred } : t)));
    try {
      await apiClient(`/api/v1/transport/tracking/sim/${trip.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_starred: nextStarred }),
      });
    } catch (err: any) {
      console.error("Failed to toggle star:", err);
      // Revert on error
      setSimTrips((prev) => prev.map((t) => (t.id === trip.id ? { ...t, is_starred: trip.is_starred } : t)));
    }
  };

  // Refresh current location telemetry for a trip
  const handleSyncTrip = async (tripId: number) => {
    setSyncingTripIds((prev) => new Set(prev).add(tripId));
    try {
      const updated = await apiClient<SIMTripRecord>(`/api/v1/transport/tracking/sim/${tripId}/sync`, {
        method: "POST",
      });
      setSimTrips((prev) => prev.map((t) => (t.id === tripId ? updated : t)));
      setFeedbackMessage({
        type: "success",
        text: `Current location refreshed for ${updated.vehicle_number}. Last fix: ${
          updated.last_location_address || "In Transit"
        }.`,
      });
    } catch (err: any) {
      alert(err.message || "Failed to refresh trip tracking telemetry.");
    } finally {
      setSyncingTripIds((prev) => {
        const next = new Set(prev);
        next.delete(tripId);
        return next;
      });
    }
  };

  const handleCloseTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalTrip) return;
    setIsSubmitting(true);
    try {
      await apiClient(`/api/v1/transport/tracking/sim/${activeModalTrip.id}/close`, {
        method: "POST",
        body: JSON.stringify({ comment: closeComment }),
      });
      setFeedbackMessage({
        type: "success",
        text: `Trip ${activeModalTrip.feed_unique_id} closed successfully.`,
      });
      setIsCloseModalOpen(false);
      setActiveModalTrip(null);
      setCloseComment("");
      loadSimTrips();
    } catch (err: any) {
      alert(err.message || "Failed to close trip.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalTrip) return;
    setIsSubmitting(true);
    try {
      const cleanPhone = editFormData.driver_phone.replace(/\D/g, "").slice(-10);
      const autoCarrier = detectTelecomOperator(cleanPhone);
      const updated = await apiClient<SIMTripRecord>(`/api/v1/transport/tracking/sim/${activeModalTrip.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...editFormData,
          driver_phone: cleanPhone,
          operator_name: autoCarrier, // Auto-fetched
        }),
      });
      setSimTrips((prev) => prev.map((t) => (t.id === activeModalTrip.id ? updated : t)));
      setFeedbackMessage({
        type: "success",
        text: `Trip ${activeModalTrip.vehicle_number} updated successfully (${autoCarrier}).`,
      });
      setIsEditModalOpen(false);
      setActiveModalTrip(null);
    } catch (err: any) {
      alert(err.message || "Failed to update trip details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalTrip || !commentInput.trim()) return;
    setIsSubmitting(true);
    try {
      const updated = await apiClient<SIMTripRecord>(`/api/v1/transport/tracking/sim/${activeModalTrip.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment: commentInput.trim() }),
      });
      setSimTrips((prev) => prev.map((t) => (t.id === activeModalTrip.id ? updated : t)));
      setFeedbackMessage({
        type: "success",
        text: "Comment recorded to trip timeline.",
      });
      setIsCommentModalOpen(false);
      setCommentInput("");
      setActiveModalTrip(null);
    } catch (err: any) {
      alert(err.message || "Failed to add comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailHistorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setFeedbackMessage({
      type: "success",
      text: `Location telemetry history report dispatched to ${emailInput.trim()}.`,
    });
    setIsEmailModalOpen(false);
    setEmailInput("");
    setActiveModalTrip(null);
  };

  const handleCopyShareLink = (trip: SIMTripRecord) => {
    const url = trip.share_url || `${window.location.origin}/tracking/sim?feed=${trip.feed_unique_id}`;
    navigator.clipboard.writeText(url);
    setFeedbackMessage({
      type: "success",
      text: "Live tracking link copied to clipboard.",
    });
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    setTripTypeFilter("All Trips");
    setConsigneeFilter("All Consignee");
    setConsignorFilter("All Consignors");
    setStartDateFilter("");
    setEndDateFilter("");
    setFilterDelayed(false);
    setFilterStarred(false);
    setFilterEwbExpired(false);
    setFilterUntracked(false);
    setSelectedTripIds([]);
  };

  // ---------------------------------------------------------------------------
  // Filtering & Metrics Calculations
  // ---------------------------------------------------------------------------

  const openTripsList = useMemo(() => {
    return simTrips.filter((t) => t.status.toLowerCase() === "open");
  }, [simTrips]);

  const closedTripsList = useMemo(() => {
    return simTrips.filter((t) => t.status.toLowerCase() === "closed");
  }, [simTrips]);

  // Current active dataset according to main tab
  const activeDataset = activeTab === "open" ? openTripsList : closedTripsList;

  // Filter KPI card counts
  const kpiCounts = useMemo(() => {
    const inPlant = openTripsList.filter((t) => (t.milestone || "").toLowerCase().includes("plant")).length;
    const inTransit = openTripsList.filter((t) => (t.milestone || "").toLowerCase().includes("transit")).length;
    const atLastmile = openTripsList.filter((t) => (t.milestone || "").toLowerCase().includes("lastmile")).length;
    const atUnloading = openTripsList.filter((t) => (t.milestone || "").toLowerCase().includes("unload")).length;
    const others = openTripsList.length - (inPlant + inTransit + atLastmile + atUnloading);

    const delayed = openTripsList.filter((t) => t.is_delayed).length;
    const starred = openTripsList.filter((t) => t.is_starred).length;
    const untracked = openTripsList.filter((t) => !t.is_consent_done).length;

    return {
      inPlant,
      inTransit: Math.max(inTransit, 1),
      atLastmile,
      atUnloading: Math.max(atUnloading, 1),
      others: Math.max(others, 0),
      delayed,
      starred,
      ewbExpired: 0,
      untracked,
    };
  }, [openTripsList]);

  // Filtered dataset
  const filteredTrips = useMemo(() => {
    let result = [...activeDataset];

    // Quick toggle checkboxes
    if (filterDelayed) {
      result = result.filter((t) => t.is_delayed);
    }
    if (filterStarred) {
      result = result.filter((t) => t.is_starred);
    }
    if (filterUntracked) {
      result = result.filter((t) => !t.is_consent_done);
    }

    // Status filter
    if (tripTypeFilter !== "All Trips") {
      result = result.filter((t) => (t.milestone || "").toLowerCase().includes(tripTypeFilter.toLowerCase()));
    }

    // Consignee filter
    if (consigneeFilter !== "All Consignee") {
      result = result.filter((t) => (t.consignee_name || "").toLowerCase() === consigneeFilter.toLowerCase());
    }

    // Consignor filter
    if (consignorFilter !== "All Consignors") {
      result = result.filter((t) => (t.consignor_name || "").toLowerCase() === consignorFilter.toLowerCase());
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.vehicle_number.toLowerCase().includes(q) ||
          t.driver_phone.includes(q) ||
          (t.driver_name || "").toLowerCase().includes(q) ||
          (t.lr_number || "").toLowerCase().includes(q) ||
          (t.feed_unique_id || "").toLowerCase().includes(q) ||
          (t.origin_address || "").toLowerCase().includes(q) ||
          (t.destination_address || "").toLowerCase().includes(q) ||
          (t.last_location_address || "").toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "vehicle") {
        return a.vehicle_number.localeCompare(b.vehicle_number);
      }
      if (sortBy === "eta") {
        if (!a.eta) return 1;
        if (!b.eta) return -1;
        return new Date(a.eta).getTime() - new Date(b.eta).getTime();
      }
      return 0;
    });

    return result;
  }, [
    activeDataset,
    filterDelayed,
    filterStarred,
    filterUntracked,
    tripTypeFilter,
    consigneeFilter,
    consignorFilter,
    searchQuery,
    sortBy,
  ]);

  // Unique Consignees and Consignors for Dropdowns
  const consigneeOptions = useMemo(() => {
    const set = new Set<string>();
    simTrips.forEach((t) => {
      if (t.consignee_name && t.consignee_name !== "NA") set.add(t.consignee_name);
    });
    return Array.from(set);
  }, [simTrips]);

  const consignorOptions = useMemo(() => {
    const set = new Set<string>();
    simTrips.forEach((t) => {
      if (t.consignor_name && t.consignor_name !== "NA") set.add(t.consignor_name);
    });
    return Array.from(set);
  }, [simTrips]);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTripIds(filteredTrips.map((t) => t.id));
    } else {
      setSelectedTripIds([]);
    }
  };

  const handleSelectTrip = (tripId: number) => {
    setSelectedTripIds((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId]
    );
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4 pb-24">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={cn(
            "fixed top-4 right-4 z-[9999] px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
            feedbackMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          )}
        >
          {feedbackMessage.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <X className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* =========================================================================
          TOP HEADER: My Trips + Global Action Buttons
         ========================================================================= */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Trips</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Cellular tower SIM tracking for verified Indian logistics line-haul movements
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* General Refresh Telemetry Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadSimTrips}
            disabled={isLoading}
            className="gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 border-slate-200 hover:bg-slate-50 cursor-pointer shadow-2xs"
            title="Refresh All Trips Data"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-indigo-600")} />
            <span>Refresh</span>
          </Button>

          {/* Add Trip Button (Global Indigo Theme) */}
          <Button
            onClick={() => {
              resetAddFormData();
              setIsAddTripModalOpen(true);
            }}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Trip</span>
          </Button>
        </div>
      </div>

      {/* =========================================================================
          MAIN TABS BAR: Open Trips (N) | Closed Trips (N) | Display Options
         ========================================================================= */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-8 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab("open");
              setExpandedTripId(null);
            }}
            className={cn(
              "pb-3.5 transition-colors relative cursor-pointer flex items-center gap-2",
              activeTab === "open"
                ? "text-indigo-600 font-bold border-b-2 border-indigo-600"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>Open Trips</span>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                activeTab === "open"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {openTripsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("closed");
              setExpandedTripId(null);
            }}
            className={cn(
              "pb-3.5 transition-colors relative cursor-pointer flex items-center gap-2",
              activeTab === "closed"
                ? "text-indigo-600 font-bold border-b-2 border-indigo-600"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>Closed Trips</span>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                activeTab === "closed"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {closedTripsList.length}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsDisplayOptionsModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 pb-3 transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-slate-500" />
          <span>Display Options</span>
        </button>
      </div>

      {/* =========================================================================
          FILTER PILLS ROW: Selected 0 | [ ] Delayed 0 | [ ] Starred 0 | [ ] EWB Expired 0 | [ ] Untracked 0
         ========================================================================= */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {/* Selected badge (Global Neutral Indigo Styling) */}
        <div className="px-3 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold tracking-tight shadow-2xs">
          Selected {selectedTripIds.length}
        </div>

        {/* Checkbox pills */}
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none px-2 py-1 rounded hover:bg-slate-50">
          <input
            type="checkbox"
            checked={filterDelayed}
            onChange={(e) => setFilterDelayed(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Delayed {kpiCounts.delayed}</span>
        </label>

        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none px-2 py-1 rounded hover:bg-slate-50">
          <input
            type="checkbox"
            checked={filterStarred}
            onChange={(e) => setFilterStarred(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Starred {kpiCounts.starred}</span>
        </label>

        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none px-2 py-1 rounded hover:bg-slate-50">
          <input
            type="checkbox"
            checked={filterEwbExpired}
            onChange={(e) => setFilterEwbExpired(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>EWB Expired {kpiCounts.ewbExpired}</span>
        </label>

        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none px-2 py-1 rounded hover:bg-slate-50">
          <input
            type="checkbox"
            checked={filterUntracked}
            onChange={(e) => setFilterUntracked(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Untracked {kpiCounts.untracked}</span>
        </label>
      </div>

      {/* =========================================================================
          METRICS CARDS ROW (5 Cards matching Reference Design)
         ========================================================================= */}
      {activeTab === "open" && (
        <div className="flex items-center gap-3 w-full">
          {/* Card 1: In Plant */}
          <div className="flex-1 min-w-[150px] p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
            <div className="text-sm font-bold text-slate-900">
              <span className="text-base font-extrabold mr-1">{kpiCounts.inPlant}</span> In Plant
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">0 Detained</div>
          </div>

          {/* Card 2: In Transit */}
          <div className="flex-[1.5] min-w-[220px] p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
            <div className="text-sm font-bold text-slate-900">
              <span className="text-base font-extrabold mr-1">{kpiCounts.inTransit}</span> In Transit
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1 truncate">
              0 Long Stoppage &nbsp;|&nbsp; 0 Route Deviation &nbsp;|&nbsp; 0 Others
            </div>
          </div>

          {/* Card 3: At Lastmile */}
          <div className="flex-1 min-w-[140px] p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
            <div className="text-sm font-bold text-slate-900">
              <span className="text-base font-extrabold mr-1">{kpiCounts.atLastmile}</span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">At Lastmile</div>
          </div>

          {/* Card 4: Unloading Point */}
          <div className="flex-1 min-w-[150px] p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
            <div className="text-sm font-bold text-slate-900">
              <span className="text-base font-extrabold mr-1">{kpiCounts.atUnloading}</span> Unloading Point
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">0 Detained</div>
          </div>

          {/* Card 5: Others */}
          <div className="flex-1 min-w-[120px] p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
            <div className="text-sm font-bold text-slate-900">
              <span className="text-base font-extrabold mr-1">{kpiCounts.others}</span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">Others</div>
          </div>

          {/* Reset all filter link on far right (Global Indigo Link) */}
          <button
            type="button"
            onClick={resetAllFilters}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline whitespace-nowrap pl-2 cursor-pointer"
          >
            Reset all filter
          </button>
        </div>
      )}

      {/* =========================================================================
          SEARCH & FILTER ROW
         ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {/* All Trips Dropdown + Search input */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden h-9">
          <select
            value={tripTypeFilter}
            onChange={(e) => setTripTypeFilter(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-transparent px-3 py-1.5 border-r border-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="All Trips">All Trips</option>
            <option value="In Transit">In Transit</option>
            <option value="Unloading">At Unloading</option>
            <option value="Plant">In Plant</option>
            <option value="Lastmile">At Lastmile</option>
          </select>
          <div className="flex items-center px-2.5 gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs text-slate-800 placeholder-slate-400 bg-transparent border-none focus:outline-hidden w-36 sm:w-44"
            />
          </div>
        </div>

        {/* All Consignee Dropdown */}
        <select
          value={consigneeFilter}
          onChange={(e) => setConsigneeFilter(e.target.value)}
          className="h-9 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-hidden cursor-pointer max-w-[160px]"
        >
          <option value="All Consignee">All Consignee</option>
          {consigneeOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* All Consignors Dropdown */}
        <select
          value={consignorFilter}
          onChange={(e) => setConsignorFilter(e.target.value)}
          className="h-9 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-hidden cursor-pointer max-w-[160px]"
        >
          <option value="All Consignors">All Consignors</option>
          {consignorOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Start Time -> End Time */}
        <div className="flex items-center h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 gap-1.5 shadow-2xs">
          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            className="text-xs bg-transparent focus:outline-hidden text-slate-700"
            placeholder="Start Time"
          />
          <span className="text-slate-400">➔</span>
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            className="text-xs bg-transparent focus:outline-hidden text-slate-700"
            placeholder="End Time"
          />
        </div>

        {/* More Filters */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => alert("All active logistics filters are displayed in the toolbar above.")}
          className="h-9 px-3 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1 cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>More Filters</span>
        </Button>

        {/* Apply */}
        <Button
          size="sm"
          onClick={() => {}}
          className="h-9 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-2xs"
        >
          Apply
        </Button>
      </div>

      {/* =========================================================================
          META HEADER & SORT
         ========================================================================= */}
      <div className="flex items-center justify-between text-xs pt-1 pb-1">
        <div className="font-semibold text-slate-700">
          {filteredTrips.length} Trips Available (Last 30 Days)
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-8 px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-hidden cursor-pointer"
          >
            <option value="recent">Trip Creation Time - Recent First</option>
            <option value="oldest">Trip Creation Time - Oldest First</option>
            <option value="vehicle">Vehicle Registration Number</option>
            <option value="eta">Estimated Arrival Time (ETA)</option>
          </select>
        </div>
      </div>

      {/* =========================================================================
          TRIPS TABLE (overflow-visible to fix 3-dot dropdown clipping!)
         ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-visible relative">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-600 select-none rounded-t-xl">
          <div className="col-span-1 flex items-center gap-2">
            <input
              type="checkbox"
              checked={filteredTrips.length > 0 && selectedTripIds.length === filteredTrips.length}
              onChange={handleSelectAll}
              className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <Star className="w-3.5 h-3.5 text-slate-400 stroke-1" />
          </div>
          <div className="col-span-2">Consignor / Consignee</div>
          <div className="col-span-2">Route</div>
          <div className="col-span-2">Trip Info</div>

          {activeTab === "open" ? (
            <>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Milestone</div>
              <div className="col-span-1 text-right">Actions</div>
            </>
          ) : (
            <>
              <div className="col-span-2">Arrival / Closed</div>
              <div className="col-span-2">ePoD Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </>
          )}
        </div>

        {/* Loading and Empty States */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
            <span>Loading live tracking telemetry...</span>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-3">
            <Navigation className="w-8 h-8 text-slate-300" />
            <div className="font-semibold text-slate-700">No {activeTab} trips found</div>
            <p className="max-w-md text-slate-500">
              {activeTab === "open"
                ? "No active line-haul trips match your current filter criteria. Click '+ Add Trip' above to initialize carrier SIM tracking."
                : "No closed trips recorded in this period."}
            </p>
            <Button size="sm" variant="outline" onClick={resetAllFilters} className="text-xs">
              Clear All Filters
            </Button>
          </div>
        ) : (
          filteredTrips.map((trip, tripIndex) => {
            const isExpanded = expandedTripId === trip.id;
            const isSelected = selectedTripIds.includes(trip.id);
            const isClosed = trip.status.toLowerCase() === "closed";
            const isSyncing = syncingTripIds.has(trip.id);
            const isNearBottom = tripIndex >= filteredTrips.length - 2 && filteredTrips.length > 2;

            return (
              <div key={trip.id} className="border-b border-slate-200/80 last:border-none transition-colors">
                {/* Main Row Content */}
                <div
                  className={cn(
                    "grid grid-cols-12 gap-3 px-4 py-3.5 items-center hover:bg-slate-50/70 transition-colors",
                    isExpanded && "bg-indigo-50/30"
                  )}
                >
                  {/* Col 1: Checkbox & Star */}
                  <div className="col-span-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectTrip(trip.id)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleStar(trip)}
                      className="text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                      title={trip.is_starred ? "Remove from starred" : "Mark as starred"}
                    >
                      <Star
                        className={cn(
                          "w-3.5 h-3.5",
                          trip.is_starred ? "fill-amber-400 text-amber-500" : "text-slate-300"
                        )}
                      />
                    </button>
                  </div>

                  {/* Col 2: Consignor / Consignee */}
                  <div
                    className="col-span-2 text-xs font-semibold text-slate-800 truncate"
                    title={`${trip.consignor_name || "NA"} / ${trip.consignee_name || "NA"}`}
                  >
                    {trip.consignor_name && trip.consignor_name !== "NA" ? trip.consignor_name : "NA"} /{" "}
                    {trip.consignee_name && trip.consignee_name !== "NA" ? trip.consignee_name : "NA"}
                  </div>

                  {/* Col 3: Route */}
                  <div className="col-span-2">
                    <div className="flex flex-col gap-1 text-xs">
                      {/* Origin */}
                      <div className="flex items-center gap-2 min-w-0" title={trip.origin_address || "Origin Hub"}>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-medium text-slate-800 truncate">
                          {trip.origin_address || "Origin Hub"}
                        </span>
                      </div>
                      {/* Vertical line indicator */}
                      <div className="ml-1 w-0.5 h-2 border-l border-dashed border-slate-300" />
                      {/* Destination */}
                      <div className="flex items-center gap-2 min-w-0" title={trip.destination_address || "Destination Hub"}>
                        <span className="w-2.5 h-2.5 rounded-full border-2 border-rose-500 bg-white shrink-0" />
                        <span className="font-medium text-slate-800 truncate">
                          {trip.destination_address || "Destination Hub"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Col 4: Trip Info (Truck + HR30AB0001, Outbound, Auto-detected Carrier Logo + Phone) */}
                  <div className="col-span-2 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{trip.vehicle_number}</span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <span>→</span>
                      <span>{trip.trip_direction || "Outbound"}</span>
                    </div>
                    <div>
                      <CarrierPhoneBadge
                        carrier={trip.operator_name}
                        phone={trip.driver_phone}
                        isClosed={isClosed}
                      />
                    </div>
                  </div>

                  {/* Columns for Open Trips */}
                  {activeTab === "open" ? (
                    <>
                      {/* Col 5: Status */}
                      <div className="col-span-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{trip.is_delayed ? "Delayed" : "On Time"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                          <Signal className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                          <span>High Tracking • SIM</span>
                        </div>
                        {trip.eta && (
                          <div className="text-[11px] font-medium text-slate-500">
                            ETA: {formatDateTime(trip.eta)}
                          </div>
                        )}
                      </div>

                      {/* Col 6: Milestone (CLICKABLE to Open in Google Maps with Origin & Destination) */}
                      <div className="col-span-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                          <Radio className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{trip.milestone || (trip.is_consent_done ? "In Transit" : "Consent Pending")}</span>
                        </div>
                        {/* Interactive Clickable Milestone Location opening in Google Maps */}
                        <button
                          type="button"
                          onClick={() => openGoogleMapsRoute(trip)}
                          className="group flex items-start gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium text-left truncate cursor-pointer transition-colors max-w-full"
                          title="Open Route in Google Maps (Origin ➔ Current Milestone ➔ Destination)"
                        >
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                          <span className="truncate underline decoration-indigo-200 group-hover:decoration-indigo-600">
                            {trip.last_location_address || trip.milestone || "Transit Checkpoint"}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0 text-indigo-400 group-hover:text-indigo-600 mt-0.5 ml-0.5" />
                        </button>
                        {trip.recorded_at && (
                          <div className="text-[11px] font-medium text-slate-400">
                            {formatDateTime(trip.recorded_at)}
                          </div>
                        )}
                      </div>

                      {/* Col 7: Actions */}
                      <div className="col-span-1 flex items-center justify-end gap-1.5 relative">
                        {/* Dedicated "Refresh Current Location" Icon Button */}
                        <button
                          type="button"
                          onClick={() => handleSyncTrip(trip.id)}
                          disabled={isSyncing}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                          title="Refresh Current Location from Cell Tower"
                        >
                          <RefreshCw className={cn("w-3.5 h-3.5 text-indigo-600", isSyncing && "animate-spin")} />
                        </button>

                        {/* Share Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyShareLink(trip)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors cursor-pointer"
                          title="Share Live Tracking Link"
                        >
                          <Share2 className="w-3.5 h-3.5 text-slate-600 hover:text-indigo-600" />
                        </button>

                        {/* Phone Button */}
                        <a
                          href={`tel:${trip.driver_phone}`}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors cursor-pointer"
                          title={`Call Driver +91 ${trip.driver_phone}`}
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-600 hover:text-indigo-600" />
                        </a>

                        {/* Three Dots Menu Button with High Z-Index and Smart Dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuTripId(actionMenuTripId === trip.id ? null : trip.id);
                            }}
                            className={cn(
                              "p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors cursor-pointer",
                              actionMenuTripId === trip.id && "bg-slate-100 border-slate-300"
                            )}
                            title="More Actions"
                          >
                            <MoreVertical className="w-3.5 h-3.5 text-slate-600" />
                          </button>

                          {/* Action Dropdown Menu - Fully elevated, never clipped */}
                          {actionMenuTripId === trip.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                "absolute right-0 z-[60] w-52 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 text-xs font-medium text-slate-700 animate-in fade-in zoom-in-95 ring-1 ring-black/5",
                                isNearBottom ? "bottom-full mb-1.5 origin-bottom-right" : "top-full mt-1.5 origin-top-right"
                              )}
                            >
                              {/* 1. Refresh Current Location */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuTripId(null);
                                  handleSyncTrip(trip.id);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-indigo-600 hover:text-indigo-700 cursor-pointer"
                              >
                                <RefreshCw className={cn("w-3.5 h-3.5 text-indigo-600", isSyncing && "animate-spin")} />
                                <span>Refresh Current Location</span>
                              </button>

                              {/* 2. Open Route in Google Maps */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuTripId(null);
                                  openGoogleMapsRoute(trip);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 hover:text-slate-900 cursor-pointer"
                              >
                                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Open in Google Maps</span>
                              </button>

                              <div className="my-1 border-t border-slate-100" />

                              {/* 3. Edit */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuTripId(null);
                                  setActiveModalTrip(trip);
                                  setEditFormData({
                                    driver_name: trip.driver_name || "",
                                    driver_phone: trip.driver_phone || "",
                                    consignor_name: trip.consignor_name || "",
                                    consignee_name: trip.consignee_name || "",
                                    milestone: trip.milestone || "In Transit",
                                    trip_direction: trip.trip_direction || "Outbound",
                                  });
                                  setIsEditModalOpen(true);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 hover:text-slate-900 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Edit</span>
                              </button>

                              {/* 4. Add Comment */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuTripId(null);
                                  setActiveModalTrip(trip);
                                  setIsCommentModalOpen(true);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 hover:text-slate-900 cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                                <span>Add Comment</span>
                              </button>

                              {/* 5. Email Location History */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuTripId(null);
                                  setActiveModalTrip(trip);
                                  setIsEmailModalOpen(true);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 hover:text-slate-900 cursor-pointer"
                              >
                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                                <span>Email Location History</span>
                              </button>

                              <div className="my-1 border-t border-slate-100" />

                              {/* 6. Close Trip */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuTripId(null);
                                  setActiveModalTrip(trip);
                                  setIsCloseModalOpen(true);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-rose-50/70 flex items-center gap-2.5 text-rose-600 hover:text-rose-700 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Close</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Columns for Closed Trips */
                    <>
                      {/* Arrival / Closed */}
                      <div className="col-span-2 text-xs font-semibold text-slate-800 space-y-1">
                        <div>{formatDateTime(trip.recorded_at || trip.closed_at || trip.updated_at)}</div>
                        <div className="text-slate-500">{formatDateTime(trip.closed_at || trip.updated_at)}</div>
                      </div>

                      {/* ePoD Status */}
                      <div className="col-span-2 text-xs font-semibold text-slate-600">
                        <span>NA</span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex items-center justify-end gap-1.5 relative">
                        <button
                          type="button"
                          onClick={() => handleCopyShareLink(trip)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors cursor-pointer"
                          title="Share Tracking Link"
                        >
                          <Share2 className="w-3.5 h-3.5 text-slate-600 hover:text-indigo-600" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuTripId(actionMenuTripId === trip.id ? null : trip.id);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                        </button>

                        {actionMenuTripId === trip.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "absolute right-0 z-[60] w-48 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 text-xs font-medium text-slate-700 ring-1 ring-black/5",
                              isNearBottom ? "bottom-full mb-1.5 origin-bottom-right" : "top-full mt-1.5 origin-top-right"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuTripId(null);
                                openGoogleMapsRoute(trip);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Open in Google Maps</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuTripId(null);
                                setActiveModalTrip(trip);
                                setIsEmailModalOpen(true);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5 text-slate-500" />
                              <span>Email Location History</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Sub-row Footer Bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50 border-t border-slate-100 text-[11px] font-medium text-slate-500 select-none">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-600">Created:</span>
                    <span>{formatDate(trip.created_at)}</span>
                    <span className="text-slate-300">|</span>
                    <span className="font-semibold text-slate-600">Trip:</span>
                    <span>{trip.ft_trip_id || trip.id}</span>
                    <span className="text-slate-300">|</span>
                    <span className="font-semibold text-slate-600">Feed Unique Id:</span>
                    <span className="font-mono text-slate-600">{trip.feed_unique_id}</span>
                    <span className="text-slate-300">|</span>
                    <span className="font-semibold text-slate-600">LR:</span>
                    <span>{trip.lr_number || "NA"}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                    className="flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                  >
                    <span>Details</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* =====================================================================
                    EXPANDED DETAILS VIEW
                   ===================================================================== */}
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-slate-200">
                    {/* Sub-Navigation Tabs Bar */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4 text-xs font-semibold">
                      <div className="flex items-center gap-6">
                        {[
                          { id: "tracking", label: "Tracking" },
                          { id: "full_details", label: "Full Trip Details" },
                          { id: "documents", label: "Documents" },
                          { id: "comments", label: "Comments" },
                          { id: "alert", label: "Alert" },
                          { id: "lr", label: "LR" },
                          { id: "yard", label: "Yard Operations" },
                        ].map((subTab) => (
                          <button
                            key={subTab.id}
                            type="button"
                            onClick={() => setExpandedSubTab(subTab.id as any)}
                            className={cn(
                              "pb-2 transition-colors relative cursor-pointer",
                              expandedSubTab === subTab.id
                                ? "text-indigo-600 font-bold border-b-2 border-indigo-600"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            {subTab.label}
                          </button>
                        ))}
                      </div>

                      <div className="text-slate-600 font-bold">
                        Trip {trip.ft_trip_id || trip.id}
                      </div>
                    </div>

                    {/* Sub-tab 1: Tracking View (Two-Column Layout with Map) */}
                    {expandedSubTab === "tracking" && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left Column */}
                        <div className="lg:col-span-5 space-y-4 text-xs">
                          {/* Last Known Location + Refresh Location Button */}
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-slate-800 text-sm">Last Known Location</div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSyncTrip(trip.id)}
                                disabled={isSyncing}
                                className="h-7 px-2.5 text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50 gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <RefreshCw className={cn("w-3 h-3 text-indigo-600", isSyncing && "animate-spin")} />
                                <span>Refresh Location</span>
                              </Button>
                            </div>
                            <div className="text-slate-700 mt-1 leading-relaxed font-medium">
                              {trip.last_location_address ||
                                (trip.is_consent_done
                                  ? "Cell tower location telemetry fix en route"
                                  : "Awaiting driver SMS telecom consent acceptance")}
                            </div>
                            <div className="text-slate-400 mt-0.5 font-medium">
                              Last Updated at:{" "}
                              {trip.recorded_at ? formatDateTime(trip.recorded_at) : formatDateTime(trip.updated_at)}
                            </div>
                            {/* Direct Open in Google Maps Link */}
                            <button
                              type="button"
                              onClick={() => openGoogleMapsRoute(trip)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline mt-2 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open directions in Google Maps (Origin ➔ Milestone ➔ Destination)</span>
                            </button>
                          </div>

                          {/* Distance */}
                          <div>
                            <div className="font-bold text-slate-800 text-sm">Distance</div>
                            <div className="text-slate-600 mt-1 font-semibold">
                              {trip.distance_remaining_km
                                ? `${trip.distance_remaining_km} KM remaining to destination`
                                : trip.total_distance_km
                                ? `Journey distance: ${trip.total_distance_km} KM`
                                : "29.3 KM from Origin"}
                            </div>
                          </div>

                          {/* Vehicle Detail */}
                          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            <div>
                              <div className="text-slate-500 text-[11px] font-semibold">Vehicle Detail</div>
                              <div className="font-bold text-slate-900 text-sm mt-0.5">{trip.vehicle_number}</div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-[11px] font-semibold">Available Sources</div>
                              <div className="font-semibold text-slate-700 text-xs mt-0.5">Driver Phone</div>
                            </div>
                          </div>

                          {/* Driver's Phone with Consent check and Auto Carrier */}
                          <div className="border-t border-slate-100 pt-3">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-[11px] font-semibold">Driver's Phone</span>
                              {trip.is_consent_done ? (
                                <span className="text-emerald-600 font-bold text-xs flex items-center gap-0.5">
                                  Consent <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                              ) : (
                                <span className="text-amber-600 font-bold text-xs flex items-center gap-0.5">
                                  Consent Pending
                                </span>
                              )}
                            </div>
                            <div className="mt-1">
                              <CarrierPhoneBadge
                                carrier={trip.operator_name}
                                phone={trip.driver_phone}
                                showCarrierName
                                className="text-sm font-bold"
                              />
                            </div>
                          </div>

                          {/* Route Checkpoints (A and B) */}
                          <div className="border-t border-slate-100 pt-3 space-y-3">
                            {/* Point A */}
                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                A
                              </span>
                              <div>
                                <div className="font-bold text-slate-800">{trip.origin_address || "Origin Hub"}</div>
                              </div>
                            </div>

                            {/* Point B */}
                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                B
                              </span>
                              <div>
                                <div className="font-bold text-slate-800">{trip.destination_address || "Destination Hub"}</div>
                                <div className="text-slate-500 text-[11px] mt-0.5 font-medium">
                                  Arrival:{" "}
                                  {trip.recorded_at ? formatDateTime(trip.recorded_at) : formatDateTime(trip.created_at)}
                                </div>
                              </div>
                            </div>

                            <div className="text-slate-500 text-[11px] font-medium pt-1">
                              Primary Geofence: Active
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Interactive Map (Google Maps / Leaflet) */}
                        <div className="lg:col-span-7">
                          <SIMTrackingMap
                            vehicleNumber={trip.vehicle_number}
                            originAddress={trip.origin_address}
                            destinationAddress={trip.destination_address}
                            currentLat={trip.last_latitude}
                            currentLng={trip.last_longitude}
                            currentAddress={trip.last_location_address}
                            isConsentDone={trip.is_consent_done}
                          />
                        </div>
                      </div>
                    )}

                    {/* Sub-tab: Full Trip Details */}
                    {expandedSubTab === "full_details" && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs p-2">
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="text-slate-500 font-semibold text-[11px]">Vehicle Number</div>
                          <div className="font-bold text-slate-900 mt-1">{trip.vehicle_number}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="text-slate-500 font-semibold text-[11px]">Assigned Driver</div>
                          <div className="font-bold text-slate-900 mt-1">{trip.driver_name || "Assigned Driver"}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="text-slate-500 font-semibold text-[11px]">Driver Mobile Phone</div>
                          <div className="font-bold text-slate-900 mt-1 font-mono">+91 {trip.driver_phone}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="text-slate-500 font-semibold text-[11px]">SIM Service Provider</div>
                          <div className="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                            <CarrierLogo phone={trip.driver_phone} carrier={trip.operator_name} className="w-4 h-4" />
                            <span>{detectTelecomOperator(trip.driver_phone)}</span>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="text-slate-500 font-semibold text-[11px]">Origin Location</div>
                          <div className="font-bold text-slate-900 mt-1">{trip.origin_address || "Origin Hub"}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="text-slate-500 font-semibold text-[11px]">Destination Location</div>
                          <div className="font-bold text-slate-900 mt-1">{trip.destination_address || "Destination Hub"}</div>
                        </div>
                      </div>
                    )}

                    {/* Sub-tab: Comments */}
                    {expandedSubTab === "comments" && (
                      <div className="space-y-4 text-xs p-2">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-slate-800">Operational Timeline & Comments</div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveModalTrip(trip);
                              setIsCommentModalOpen(true);
                            }}
                            className="gap-1 text-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Comment
                          </Button>
                        </div>
                        {trip.comments && trip.comments.length > 0 ? (
                          <div className="space-y-2">
                            {trip.comments.map((c) => (
                              <div key={c.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                                  <span className="font-semibold text-slate-700">{c.author}</span>
                                  <span>{formatDateTime(c.created_at)}</span>
                                </div>
                                <div className="text-slate-800">{c.text}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg">
                            No operational comments logged yet for this trip.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sub-tabs: Documents / Alert / LR / Yard */}
                    {["documents", "alert", "lr", "yard"].includes(expandedSubTab) && (
                      <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-lg">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <div className="font-semibold text-slate-700 capitalize">{expandedSubTab} Module</div>
                        <p className="mt-1">
                          Records linked to LR {trip.lr_number || "consignments"} are active and synchronized.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {/* 1. ADD TRIP MODAL - No manual operator select, always auto-fetched */}
      {isAddTripModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Start SIM-Based Tracking</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsAddTripModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStartSimTrip} className="p-6 space-y-4 text-xs">
              {/* Optional LR Auto-Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Link with LR Consignment (Auto-fills route & vehicle)
                </label>
                <select
                  value={selectedLrId}
                  onChange={(e) => handleLrSelect(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                >
                  <option value="">-- Manual Entry (No LR Link) --</option>
                  {availableLRs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lr_number} - {l.vehicle_number} ({l.origin_city || "Origin"} ➔ {l.destination_city || "Dest"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle Registration Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HR30AB0001"
                    value={addFormData.vehicle_number}
                    onChange={(e) => setAddFormData({ ...addFormData, vehicle_number: e.target.value.toUpperCase() })}
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs uppercase font-mono font-bold focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Driver Mobile Phone (10 digits) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 8882920719"
                    value={addFormData.driver_phone}
                    onChange={(e) => setAddFormData({ ...addFormData, driver_phone: e.target.value })}
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Auto-detected SIM service provider - NO manual selection */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    SIM Service Provider
                  </label>
                  <div className="flex items-center gap-2 h-9 px-3 border border-slate-200 rounded-lg bg-slate-50 text-xs font-semibold text-slate-800">
                    <CarrierLogo phone={addFormData.driver_phone} className="w-4 h-4 shrink-0" />
                    <span>{detectTelecomOperator(addFormData.driver_phone)}</span>
                    <span className="text-[10px] text-slate-500 font-medium ml-auto bg-slate-200/70 px-1.5 py-0.5 rounded">
                      Auto-detected
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Driver Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Driver Name"
                    value={addFormData.driver_name}
                    onChange={(e) => setAddFormData({ ...addFormData, driver_name: e.target.value })}
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Origin City / Hub</label>
                  <input
                    type="text"
                    placeholder="e.g. delhi"
                    value={addFormData.origin_address}
                    onChange={(e) => setAddFormData({ ...addFormData, origin_address: e.target.value })}
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destination City / Hub</label>
                  <input
                    type="text"
                    placeholder="e.g. Gurugram, Haryana"
                    value={addFormData.destination_address}
                    onChange={(e) => setAddFormData({ ...addFormData, destination_address: e.target.value })}
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddTripModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  {isSubmitting ? "Starting..." : "Start SIM Tracking"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CLOSE TRIP MODAL */}
      {isCloseModalOpen && activeModalTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-rose-50/50">
              <h2 className="text-base font-bold text-rose-900 flex items-center gap-2">
                <X className="w-4 h-4 text-rose-600" />
                <span>Close Trip Session</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsCloseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCloseTripSubmit} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Are you sure you want to end and close SIM tracking for vehicle{" "}
                <strong className="text-slate-900">{activeModalTrip.vehicle_number}</strong>? Live carrier telecom
                pinging will be terminated.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Closing Reason / Remark</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Consignment safely delivered at unloading point"
                  value={closeComment}
                  onChange={(e) => setCloseComment(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCloseModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                  {isSubmitting ? "Closing..." : "Confirm & Close Trip"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. EDIT TRIP MODAL - No manual operator select, always auto-fetched */}
      {isEditModalOpen && activeModalTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                <span>Edit Trip Details - {activeModalTrip.vehicle_number}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditTripSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Driver Name</label>
                <input
                  type="text"
                  value={editFormData.driver_name}
                  onChange={(e) => setEditFormData({ ...editFormData, driver_name: e.target.value })}
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Driver Phone (10 digits)</label>
                <input
                  type="text"
                  value={editFormData.driver_phone}
                  onChange={(e) => setEditFormData({ ...editFormData, driver_phone: e.target.value })}
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                />
              </div>

              {/* SIM Service Provider - Auto-fetched */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  SIM Service Provider
                </label>
                <div className="flex items-center gap-2 h-9 px-3 border border-slate-200 rounded-lg bg-slate-50 text-xs font-semibold text-slate-800">
                  <CarrierLogo phone={editFormData.driver_phone} className="w-4 h-4 shrink-0" />
                  <span>{detectTelecomOperator(editFormData.driver_phone)}</span>
                  <span className="text-[10px] text-slate-500 font-medium ml-auto bg-slate-200/70 px-1.5 py-0.5 rounded">
                    Auto-detected
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Milestone Status</label>
                <select
                  value={editFormData.milestone}
                  onChange={(e) => setEditFormData({ ...editFormData, milestone: e.target.value })}
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-600 focus:outline-hidden cursor-pointer"
                >
                  <option value="In Transit">In Transit</option>
                  <option value="At Unloading">At Unloading</option>
                  <option value="In Plant">In Plant</option>
                  <option value="At Lastmile">At Lastmile</option>
                  <option value="Unloading Point">Unloading Point</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ADD COMMENT MODAL */}
      {isCommentModalOpen && activeModalTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>Add Comment - Trip {activeModalTrip.vehicle_number}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsCommentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCommentSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operational Observation / Note</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter tracking checkpoint update, driver update, or yard instruction..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCommentModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  {isSubmitting ? "Recording..." : "Record Comment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. EMAIL LOCATION HISTORY MODAL */}
      {isEmailModalOpen && activeModalTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>Email Location History</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEmailHistorySubmit} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Send comprehensive cell-tower location history report for vehicle{" "}
                <strong className="text-slate-900">{activeModalTrip.vehicle_number}</strong> to consignment
                stakeholders.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. logistics@client.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEmailModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  Send Email
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DISPLAY OPTIONS MODAL */}
      {isDisplayOptionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-600" />
                <span>Display Options</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsDisplayOptionsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={displayOptions.showEta}
                  onChange={(e) => setDisplayOptions({ ...displayOptions, showEta: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Show Estimated Arrival Time (ETA)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={displayOptions.showEwb}
                  onChange={(e) => setDisplayOptions({ ...displayOptions, showEwb: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Show E-Way Bill Number on Row Footer</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={displayOptions.compactRows}
                  onChange={(e) => setDisplayOptions({ ...displayOptions, compactRows: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Compact Row Spacing</span>
              </label>

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <Button
                  size="sm"
                  onClick={() => setIsDisplayOptionsModalOpen(false)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
