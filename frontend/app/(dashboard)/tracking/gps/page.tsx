"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search,
  RefreshCw,
  Navigation,
  MapPin,
  Clock,
  Building2,
  Truck,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Radio,
  Compass,
  ArrowUpDown,
  Tag,
  UserPlus,
  Play,
  KeyRound,
  ShieldCheck,
  ChevronDown,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { GPSTrackingMap, GPSVehicleData, GPSTripData } from "@/components/tracking/gps-tracking-map";

interface GPSConfig {
  is_configured: boolean;
  wheelseye_active: boolean;
  google_maps_configured: boolean;
  default_map_engine: string;
  google_maps_api_key?: string;
}

interface TimelineItem {
  type: string;
  title: string;
  duration: string;
  address?: string | null;
  time_range: string;
  latitude: number;
  longitude: number;
  speed: number;
}

export default function GPSTrackingPage() {
  const [config, setConfig] = useState<GPSConfig | null>(null);
  const [googleMapsKey, setGoogleMapsKey] = useState<string>("");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");

  const [isLoadingFleet, setIsLoadingFleet] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState<GPSVehicleData[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    company: 0,
    market: 0,
    running: 0,
    stopped: 0,
    no_signal: 0,
  });

  // Selected vehicle & telemetry state
  const [selectedVehicleNum, setSelectedVehicleNum] = useState<string | null>(null);
  const selectedVehicleNumRef = useRef<string | null>(null);
  const [selectedVehicleData, setSelectedVehicleData] = useState<GPSVehicleData | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<GPSTripData | null>(null);

  // Filters & sorting
  const [activeFilter, setActiveFilter] = useState<"company" | "all" | "market" | "running" | "stopped" | "no_signal">("company");
  const [currentSort, setCurrentSort] = useState<"default" | "speed" | "name">("default");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // Middle drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<"route_history" | "features">("route_history");
  const [historyDate, setHistoryDate] = useState<"today" | "yesterday" | "last_7_days">("today");
  const [historyTimeline, setHistoryTimeline] = useState<TimelineItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "stopped">("all");
  const [showRawPayload, setShowRawPayload] = useState(false);

  // Road distance metrics
  const [routeMetrics, setRouteMetrics] = useState<{ coveredKm: number; remainingKm: number; totalKm: number } | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("Just now");

  // Load config & initial fleet
  useEffect(() => {
    const savedKey = typeof window !== "undefined" ? localStorage.getItem("TMS_GOOGLE_MAPS_API_KEY") : null;

    apiClient<GPSConfig>("/api/v1/transport/tracking/gps/config")
      .then((cfg) => {
        setConfig(cfg);
        const resolvedKey = savedKey || cfg.google_maps_api_key || "";
        setGoogleMapsKey(resolvedKey);
      })
      .catch(() => {});

    loadFleet();

    const interval = setInterval(() => {
      loadFleet(true);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const loadFleet = async (silent = false) => {
    if (!silent) setIsLoadingFleet(true);
    else setIsRefreshing(true);

    try {
      const res = await apiClient<any>("/api/v1/transport/tracking/gps/vehicles");
      if (res && res.success) {
        setVehicles(res.vehicles || []);
        if (res.counts) setCounts(res.counts);

        // Auto select first vehicle ONLY if nothing is currently selected
        if (!selectedVehicleNumRef.current && res.vehicles && res.vehicles.length > 0) {
          const firstTarget = res.companyVehicles && res.companyVehicles.length > 0
            ? res.companyVehicles[0].vehicleNumber
            : res.vehicles[0].vehicleNumber;
          selectVehicle(firstTarget, res.vehicles);
        } else if (selectedVehicleNumRef.current && res.vehicles) {
          // Keep current vehicle selected and smoothly update its telemetry data
          const current = res.vehicles.find(
            (v: any) =>
              v.vehicleNumber === selectedVehicleNumRef.current ||
              v.vehicleNumber.replace(/[^A-Z0-9]/gi, "") === selectedVehicleNumRef.current?.replace(/[^A-Z0-9]/gi, "")
          );
          if (current) setSelectedVehicleData(current);
        }
      }
      setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      console.warn("Error loading fleet list:", err);
    } finally {
      setIsLoadingFleet(false);
      setIsRefreshing(false);
    }
  };

  const selectVehicle = async (vNum: string, currentList?: GPSVehicleData[]) => {
    const cleanNum = vNum.trim();
    if (!cleanNum) return;
    selectedVehicleNumRef.current = cleanNum;
    setSelectedVehicleNum(cleanNum);

    const list = currentList || vehicles;
    const found = list.find(
      (v) =>
        v.vehicleNumber === cleanNum ||
        v.vehicleNumber.replace(/[^A-Z0-9]/gi, "") === cleanNum.replace(/[^A-Z0-9]/gi, "")
    );
    if (found) {
      setSelectedVehicleData(found);
    }

    try {
      const trackRes = await apiClient<any>(`/api/v1/transport/tracking/gps/track?vehicle=${encodeURIComponent(cleanNum)}`);
      if (trackRes && trackRes.success && trackRes.truck_data) {
        if (selectedVehicleNumRef.current === cleanNum) {
          setSelectedVehicleData(trackRes.truck_data);
          setSelectedTrip(trackRes.trip || null);
        }
      }
    } catch (e) {
      console.warn("Failed tracking vehicle:", e);
    }

    loadVehicleHistory(cleanNum, historyDate);
  };

  const handleTrackAction = () => {
    const query = searchKeyword.trim();
    if (query) {
      const cleanQ = query.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const match = vehicles.find((v) => {
        const vClean = v.vehicleNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase();
        return vClean === cleanQ || vClean.includes(cleanQ);
      });

      if (match) {
        selectVehicle(match.vehicleNumber);
      } else {
        selectVehicle(query);
      }
    } else if (selectedVehicleNumRef.current) {
      selectVehicle(selectedVehicleNumRef.current);
    } else if (filteredVehicles.length > 0) {
      selectVehicle(filteredVehicles[0].vehicleNumber);
    }
  };

  const loadVehicleHistory = async (vNum: string, date: string) => {
    if (!vNum) return;
    setIsLoadingHistory(true);
    try {
      const res = await apiClient<any>(`/api/v1/transport/tracking/gps/history?vehicle=${encodeURIComponent(vNum)}&date=${date}`);
      if (res && res.success) {
        setHistoryTimeline(res.timeline || []);
      }
    } catch (e) {
      console.warn("Failed loading history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Filtered & sorted vehicle list
  const filteredVehicles = useMemo(() => {
    let list = vehicles;

    // Filter by type or status
    if (activeFilter === "company") {
      list = list.filter((v) => v.isCompany);
    } else if (activeFilter === "market") {
      list = list.filter((v) => !v.isCompany);
    } else if (activeFilter === "running") {
      list = list.filter((v) => v.status === "running");
    } else if (activeFilter === "stopped") {
      list = list.filter((v) => v.status === "stopped");
    } else if (activeFilter === "no_signal") {
      list = list.filter((v) => v.status === "no_signal");
    }

    // Keyword search
    if (searchKeyword.trim()) {
      const q = searchKeyword.trim().toUpperCase();
      list = list.filter(
        (v) =>
          v.vehicleNumber.toUpperCase().includes(q) ||
          (v.address && v.address.toUpperCase().includes(q)) ||
          (v.groupName && v.groupName.toUpperCase().includes(q))
      );
    }

    // Sorting
    if (currentSort === "speed") {
      list = [...list].sort((a, b) => (b.speed || 0) - (a.speed || 0));
    } else if (currentSort === "name") {
      list = [...list].sort((a, b) => a.vehicleNumber.localeCompare(b.vehicleNumber));
    }

    return list;
  }, [vehicles, activeFilter, searchKeyword, currentSort]);

  const toggleSort = () => {
    if (currentSort === "default") setCurrentSort("speed");
    else if (currentSort === "speed") setCurrentSort("name");
    else setCurrentSort("default");
  };

  const handleSaveModalApiKey = () => {
    if (tempApiKey.trim()) {
      localStorage.setItem("TMS_GOOGLE_MAPS_API_KEY", tempApiKey.trim());
      setGoogleMapsKey(tempApiKey.trim());
    }
    setIsKeyModalOpen(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -m-6 overflow-hidden bg-slate-100">
      {/* ===================================================================== */}
      {/* 🔑 GOOGLE MAPS API KEY MODAL */}
      {/* ===================================================================== */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-600">
                  <MapPin className="w-4 h-4" />
                </span>
                <span>Google Maps Configuration</span>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Google Maps API key is automatically loaded from the project environment. You can also paste a custom key below to activate Google Maps vector roads, satellite, and traffic layers.
            </p>
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                API Key
              </label>
              <input
                type="text"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsKeyModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveModalApiKey}
                className="text-xs"
              >
                Save &amp; Reload Map
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TOP FILTER & ACTION BAR */}
      {/* ===================================================================== */}
      <header className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-2xs z-30 shrink-0">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {/* Company Vehicles */}
          <button
            onClick={() => setActiveFilter("company")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
              activeFilter === "company"
                ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs"
                : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
            }`}
          >
            <Building2 className="w-3 h-3 text-indigo-600" />
            <span>Company Vehicles</span>
            <span className="font-extrabold text-indigo-800">({counts.company})</span>
          </button>

          {/* All Filter */}
          <button
            onClick={() => setActiveFilter("all")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              activeFilter === "all"
                ? "bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-2xs"
                : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
            }`}
          >
            <span>All</span>
            <span className="font-bold text-slate-500">({counts.all})</span>
          </button>

          {/* Market / Attached */}
          <button
            onClick={() => setActiveFilter("market")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              activeFilter === "market"
                ? "bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-2xs"
                : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
            }`}
          >
            <Truck className="w-3 h-3 text-slate-400" />
            <span>Market / Attached</span>
            <span className="font-bold text-slate-500">({counts.market})</span>
          </button>

          {/* Running Filter */}
          <button
            onClick={() => setActiveFilter("running")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              activeFilter === "running"
                ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold shadow-2xs"
                : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Running</span>
            <span className="font-bold text-slate-500">({counts.running})</span>
          </button>

          {/* Stopped Filter */}
          <button
            onClick={() => setActiveFilter("stopped")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              activeFilter === "stopped"
                ? "bg-rose-50 border-rose-500 text-rose-700 font-bold shadow-2xs"
                : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Stopped</span>
            <span className="font-bold text-slate-500">({counts.stopped})</span>
          </button>

          {/* No Signal Filter */}
          <button
            onClick={() => setActiveFilter("no_signal")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              activeFilter === "no_signal"
                ? "bg-slate-100 border-slate-400 text-slate-800 font-bold shadow-2xs"
                : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>No Signal</span>
            <span className="font-bold text-slate-500">({counts.no_signal})</span>
          </button>

          {/* Sort Button */}
          <button
            onClick={toggleSort}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all ml-1 cursor-pointer"
          >
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <span className="capitalize">Sort: {currentSort}</span>
          </button>
        </div>

        {/* Right Search & Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Map Engine Config Button */}
          <button
            onClick={() => {
              setTempApiKey(googleMapsKey);
              setIsKeyModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>{googleMapsKey ? "Google Maps" : "Leaflet Map"}</span>
          </button>

          {/* Search Input */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleTrackAction();
                }
              }}
              placeholder="ENTER TRUCK NO..."
              className="w-full pl-8 pr-3 py-1.5 text-xs font-mono uppercase bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-slate-800"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleTrackAction}
            className="text-xs h-8 px-3 shrink-0 cursor-pointer"
          >
            Track
          </Button>

          <button
            onClick={() => loadFleet()}
            disabled={isRefreshing}
            title="Refresh live positions"
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-[11px] text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live (10s)</span>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* MAIN 3-PANEL APPLICATION LAYOUT */}
      {/* ===================================================================== */}
      <div className="flex-1 flex overflow-hidden relative w-full h-full">
        {/* PANEL 1: LEFT VEHICLE LIST */}
        <aside className="w-full md:w-[330px] lg:w-[350px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-10 h-full">
          {/* Section switch pills */}
          <div className="px-3 pt-2 pb-1.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-1 text-[11px]">
            <button
              onClick={() => setActiveFilter("company")}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-center transition cursor-pointer ${
                activeFilter === "company"
                  ? "bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              🏢 Company
            </button>
            <button
              onClick={() => setActiveFilter("all")}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-center transition cursor-pointer ${
                activeFilter === "all"
                  ? "bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              All Fleet
            </button>
            <button
              onClick={() => setActiveFilter("market")}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-center transition cursor-pointer ${
                activeFilter === "market"
                  ? "bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              🚛 Market
            </button>
          </div>

          {/* Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {isLoadingFleet ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin mx-auto mb-2" />
                <p className="font-medium">Connecting to WheelsEye GPS...</p>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-medium">No vehicles found in this filter.</p>
              </div>
            ) : (
              filteredVehicles.map((v) => {
                const isSelected = v.vehicleNumber === selectedVehicleNum;
                const speed = v.speed || 0;
                return (
                  <div
                    key={v.vehicleNumber}
                    onClick={() => selectVehicle(v.vehicleNumber)}
                    className={`rounded-xl p-3 cursor-pointer transition-all duration-200 flex flex-col gap-2 relative ${
                      isSelected
                        ? "border-2 border-indigo-600 bg-indigo-50/20 shadow-md ring-2 ring-indigo-500/10"
                        : "border border-slate-200 bg-white hover:border-slate-300 shadow-2xs hover:shadow-xs"
                    }`}
                  >
                    {/* Top Row: Speed Badge + Truck Number & Meta */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {speed > 0 ? (
                          <div className="flex flex-col items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg p-2 border border-emerald-200 min-w-[50px]">
                            <span className="text-sm font-black leading-tight">{speed}</span>
                            <span className="text-[8px] font-bold uppercase tracking-wider">Kmph</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center bg-slate-100 text-slate-600 rounded-lg p-2 border border-slate-200 min-w-[50px]">
                            <span className="text-sm font-black leading-tight">0</span>
                            <span className="text-[8px] font-bold uppercase tracking-wider">Kmph</span>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold font-mono tracking-tight text-slate-900">
                              {v.vehicleNumber}
                            </h3>
                            {speed > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                            {v.isCompany ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Company
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600">
                                Market
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-400 font-medium">Last updated on {v.lastUpdated}</p>
                        </div>
                      </div>

                      {/* Status Indicators */}
                      <div className="flex items-center gap-1.5 text-slate-400">
                        {v.ignition ? (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-full border border-emerald-200">
                            IGN ON
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                            OFF
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Address Text */}
                    <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                      {v.address || "Fetching location..."}
                    </p>

                    {/* Bottom Metadata */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span className="truncate pr-2">
                        {v.todayKm || 0} km today | {v.inactiveTime || "Live"}
                      </span>
                      <span className="text-slate-500 font-mono text-[9px]">{v.groupName || "Main"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
            <span>
              Total Tracked: <strong className="text-slate-800 font-bold">{vehicles.length}</strong>
            </span>
            <span>Updated: {lastUpdatedTime}</span>
          </div>
        </aside>

        {/* PANEL 2: MIDDLE DRAWER (ROUTE HISTORY & FEATURES) */}
        {isDrawerOpen && (
          <aside className="w-full md:w-[340px] lg:w-[360px] bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-lg z-10 transition-all duration-300 relative h-full">
            {/* Drawer Tabs */}
            <div className="border-b border-slate-200 px-4 pt-3 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setDrawerTab("route_history")}
                  className={`pb-2.5 text-xs font-bold transition-all cursor-pointer ${
                    drawerTab === "route_history"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-slate-500 hover:text-slate-800 border-b-2 border-transparent"
                  }`}
                >
                  Route History
                </button>
                <button
                  onClick={() => setDrawerTab("features")}
                  className={`pb-2.5 text-xs font-bold transition-all cursor-pointer ${
                    drawerTab === "features"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-slate-500 hover:text-slate-800 border-b-2 border-transparent"
                  }`}
                >
                  Features &amp; Diag
                </button>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                title="Collapse Panel"
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded hover:bg-slate-200/60 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* TAB 1: ROUTE HISTORY */}
            {drawerTab === "route_history" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Period selector */}
                <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-white shrink-0">
                  <select
                    value={historyDate}
                    onChange={(e: any) => {
                      setHistoryDate(e.target.value);
                      if (selectedVehicleNum) loadVehicleHistory(selectedVehicleNum, e.target.value);
                    }}
                    className="text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                  >
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last_7_days">Last 7 Days</option>
                  </select>

                  <div className="flex items-center gap-1.5 text-slate-600">
                    <button
                      onClick={() => selectedVehicleNum && loadVehicleHistory(selectedVehicleNum, historyDate)}
                      title="Refresh Live Data"
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition text-xs cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Active Trip LR Box */}
                {selectedTrip && selectedTrip.lr_no && (
                  <div className="mx-3 my-2 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/40 border border-blue-100 text-xs shrink-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Active Trip LR</span>
                      <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-blue-200">
                        LR #{selectedTrip.lr_no}
                      </span>
                    </div>

                    {routeMetrics && (
                      <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-white border border-blue-100 text-[10px]">
                        <span className="text-red-600 font-bold">Traveled: {routeMetrics.coveredKm.toFixed(0)} km</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-blue-600 font-bold">Remaining: {routeMetrics.remainingKm.toFixed(0)} km</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-indigo-700 font-bold">Total: {routeMetrics.totalKm.toFixed(0)} km</span>
                      </div>
                    )}

                    {selectedTrip.waypoints && (
                      <div className="space-y-1 text-slate-700 font-medium text-[11px]">
                        {selectedTrip.waypoints.map((wp, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[9px] uppercase font-bold text-blue-500">
                              {idx === 0 ? "Origin:" : idx === (selectedTrip.waypoints?.length || 1) - 1 ? "Dest:" : `Stop ${idx}:`}
                            </span>
                            <span className="truncate">{wp}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {isLoadingHistory ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <RefreshCw className="w-4 h-4 text-blue-500 animate-spin mx-auto mb-1.5" />
                      <p>Loading telemetry logs...</p>
                    </div>
                  ) : historyTimeline.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">
                      No historical telemetry logs available for this period.
                    </p>
                  ) : (
                    historyTimeline.map((item, index) => {
                      const isStop = item.type === "stoppage";
                      return (
                        <div key={index} className="flex items-start gap-3 relative group">
                          <div className="relative flex items-center justify-center shrink-0 mt-1">
                            <span
                              className={`w-3.5 h-3.5 rounded-full border-2 ${
                                isStop ? "bg-slate-400 border-slate-200" : "bg-emerald-500 border-emerald-200"
                              }`}
                            />
                          </div>
                          <div className="flex-1 bg-slate-50 group-hover:bg-blue-50/50 border border-slate-200 rounded-xl p-3 transition text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-800">{item.title}</span>
                              <span className="font-semibold px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-mono">
                                {item.duration}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-700 leading-snug mb-1 font-medium">
                              {item.address || "Location unavailable"}
                            </p>
                            <div className="text-[10px] text-slate-400 font-medium">({item.time_range})</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FEATURES & DIAGNOSTICS */}
            {drawerTab === "features" && selectedVehicleData && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <h4 className="text-xs font-bold uppercase text-indigo-900 tracking-wider">
                      Vehicle Specifications
                    </h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-indigo-100 pb-1.5">
                      <span className="text-slate-500">Fleet Type:</span>
                      <span className="font-bold text-indigo-700">
                        {selectedVehicleData.isCompany ? "Company Owned" : "Market Attached"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-indigo-100 pb-1.5">
                      <span className="text-slate-500">Group / Division:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedVehicleData.groupName || "Panther Fleet"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-indigo-100 pb-1.5">
                      <span className="text-slate-500">GPS Telemetry Provider:</span>
                      <span className="font-semibold text-slate-800">WheelsEye Telematics</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                    Live Diagnostics
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase">Engine Status</span>
                      <span className="font-bold text-slate-800">
                        {selectedVehicleData.ignition ? "RUNNING (ON)" : "STOPPED (OFF)"}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase">Battery</span>
                      <span className="font-bold text-emerald-600">{selectedVehicleData.battery || 100}%</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase">Odometer</span>
                      <span className="font-bold text-slate-800">
                        {selectedVehicleData.odometer ? `${selectedVehicleData.odometer} KM` : `${selectedVehicleData.todayKm || 0} KM`}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase">Live Speed</span>
                      <span className="font-bold text-blue-600">{selectedVehicleData.speed || 0} km/h</span>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => setShowRawPayload(!showRawPayload)}
                    className="w-full text-left flex justify-between items-center text-[11px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider py-2 cursor-pointer"
                  >
                    <span>Raw Telemetry Payload</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showRawPayload ? "rotate-180" : ""}`} />
                  </button>
                  {showRawPayload && (
                    <div className="mt-1 p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[10px] max-h-48 overflow-y-auto break-all">
                      {JSON.stringify(selectedVehicleData.raw || selectedVehicleData, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Closed Drawer Re-Open Button */}
        {!isDrawerOpen && (
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="absolute top-4 left-4 z-20 bg-white hover:bg-slate-50 text-slate-700 p-2.5 rounded-xl shadow-md border border-slate-200 transition cursor-pointer"
            title="Expand History Drawer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* PANEL 3: RIGHT MAIN MAP AREA */}
        <section className="flex-1 relative h-full w-full bg-slate-100 overflow-hidden">
          {/* Distance Summary Overlay (Top Center) */}
          {routeMetrics && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-xl shadow-lg border border-slate-200 text-xs flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded bg-red-500" />
                <span className="text-slate-600 font-medium">Traveled:</span>
                <span className="font-bold text-red-600 font-mono">{routeMetrics.coveredKm.toFixed(0)} km</span>
              </div>
              <div className="h-3 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded bg-blue-500 border-t border-dashed border-blue-500" />
                <span className="text-slate-600 font-medium">Remaining:</span>
                <span className="font-bold text-blue-600 font-mono">{routeMetrics.remainingKm.toFixed(0)} km</span>
              </div>
              <div className="h-3 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-indigo-500" />
                <span className="text-slate-600 font-medium">Total:</span>
                <span className="font-bold text-indigo-700 font-mono">{routeMetrics.totalKm.toFixed(0)} km</span>
              </div>
            </div>
          )}

          {/* Map Component */}
          <GPSTrackingMap
            vehicle={selectedVehicleData}
            trip={selectedTrip}
            apiKey={googleMapsKey}
            onMetricsComputed={(m) => setRouteMetrics(m)}
          />

          {/* Selected Vehicle Info Pill (Bottom Floating) */}
          {selectedVehicleData && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-slate-200 text-xs flex items-center gap-3">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>{selectedVehicleData.vehicleNumber}</span>
              </div>
              <div className="h-3 w-[1px] bg-slate-200" />
              <div className="text-emerald-600 font-bold font-mono">
                {selectedVehicleData.speed || 0} km/h
              </div>
              <div className="h-3 w-[1px] bg-slate-200" />
              <div className="text-slate-500 truncate max-w-xs md:max-w-md">
                {selectedVehicleData.address || "Fetching location..."}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

