"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  Navigation,
  MapPin,
  Clock,
  Truck,
  Layers,
  ChevronDown,
  X,
  Play,
  Square,
  Radio,
  ExternalLink,
  ChevronRight,
  User,
  Gauge,
  KeyRound,
  FileText,
  AlertCircle,
  Settings,
  Building2,
  Calendar,
  CheckCircle2,
  ArrowUpDown,
  Compass,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
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

// Sample fleet data representing Delhi NCR logistics corridor (matching reference screenshot)
const SAMPLE_FLEET: GPSVehicleData[] = [
  {
    vehicleNumber: "DL 01 AB 2847",
    driverName: "Rahul Sharma",
    speed: 48,
    ignition: true,
    status: "running",
    isCompany: true,
    fleetType: "Company Vehicle",
    groupName: "Panther Express",
    lastUpdated: "just now",
    address: "Sector 18, Noida, UP",
    latitude: 28.5700,
    longitude: 77.3200,
    heading: 85,
    todayKm: 142.5,
    inactiveTime: "Moving at 48 km/h",
    battery: 98,
    signal: 4,
    odometer: 48210,
  },
  {
    vehicleNumber: "HR 55 K 9182",
    driverName: "Amit Kumar",
    speed: 0,
    ignition: false,
    status: "stopped",
    isCompany: true,
    fleetType: "Company Vehicle",
    groupName: "Panther Fleet",
    lastUpdated: "12 min ago",
    address: "NH-48, Gurugram, HR",
    latitude: 28.4595,
    longitude: 77.0266,
    heading: 0,
    todayKm: 89.2,
    inactiveTime: "Stopped 12m",
    battery: 92,
    signal: 4,
    odometer: 62150,
  },
  {
    vehicleNumber: "UP 16 BT 4521",
    driverName: "Suresh Yadav",
    speed: 62,
    ignition: true,
    status: "running",
    isCompany: true,
    fleetType: "Company Vehicle",
    groupName: "Panther Express",
    lastUpdated: "2 min ago",
    address: "Delhi - Meerut Expressway",
    latitude: 28.6280,
    longitude: 77.3649,
    heading: 65,
    todayKm: 215.8,
    inactiveTime: "Moving at 62 km/h",
    battery: 96,
    signal: 4,
    odometer: 114200,
  },
  {
    vehicleNumber: "RJ 14 GC 2391",
    driverName: "Vikram Singh",
    speed: 0,
    ignition: false,
    status: "no_signal",
    isCompany: false,
    fleetType: "Market Attached",
    groupName: "Regional Attached",
    lastUpdated: "35 min ago",
    address: "Alwar, Rajasthan",
    latitude: 27.5530,
    longitude: 76.6346,
    heading: 0,
    todayKm: 45.0,
    inactiveTime: "No signal 35m",
    battery: 45,
    signal: 1,
    odometer: 98400,
  },
  {
    vehicleNumber: "DL 1L X 7789",
    driverName: "Neeraj Tiwari",
    speed: 56,
    ignition: true,
    status: "running",
    isCompany: true,
    fleetType: "Company Vehicle",
    groupName: "Airport Logistics",
    lastUpdated: "just now",
    address: "IGI Airport, Delhi",
    latitude: 28.5562,
    longitude: 77.1000,
    heading: 180,
    todayKm: 178.4,
    inactiveTime: "Moving at 56 km/h",
    battery: 100,
    signal: 4,
    odometer: 54100,
  },
  {
    vehicleNumber: "HR 26 EV 3190",
    driverName: "Pooja Mehta",
    speed: 0,
    ignition: false,
    status: "stopped",
    isCompany: true,
    fleetType: "Company Vehicle",
    groupName: "City EV Fleet",
    lastUpdated: "8 min ago",
    address: "Faridabad, HR",
    latitude: 28.4089,
    longitude: 77.3178,
    heading: 0,
    todayKm: 72.1,
    inactiveTime: "Stopped 8m",
    battery: 84,
    signal: 4,
    odometer: 32400,
  },
  {
    vehicleNumber: "MH 12 Q 8821",
    driverName: "Kailash Patil",
    speed: 52,
    ignition: true,
    status: "running",
    isCompany: false,
    fleetType: "Market Attached",
    groupName: "West Corridor",
    lastUpdated: "1 min ago",
    address: "Sonipat Bypass, NH-44",
    latitude: 28.9931,
    longitude: 77.0151,
    heading: 350,
    todayKm: 310.4,
    inactiveTime: "Moving at 52 km/h",
    battery: 90,
    signal: 4,
    odometer: 184500,
  },
  {
    vehicleNumber: "PB 10 CF 9012",
    driverName: "Harpreet Singh",
    speed: 45,
    ignition: true,
    status: "running",
    isCompany: false,
    fleetType: "Market Attached",
    groupName: "North Attached",
    lastUpdated: "4 min ago",
    address: "Muradnagar, Ghaziabad",
    latitude: 28.7758,
    longitude: 77.5029,
    heading: 45,
    todayKm: 198.0,
    inactiveTime: "Moving at 45 km/h",
    battery: 88,
    signal: 4,
    odometer: 135200,
  },
];

export default function GPSTrackingPage() {
  const [config, setConfig] = useState<GPSConfig | null>(null);
  const [googleMapsKey, setGoogleMapsKey] = useState<string>("");

  const [isLoadingFleet, setIsLoadingFleet] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState<GPSVehicleData[]>([]);
  const [isSampleMode, setIsSampleMode] = useState(false);

  const [counts, setCounts] = useState({
    all: 0,
    company: 0,
    market: 0,
    running: 0,
    stopped: 0,
    no_signal: 0,
  });

  // Selected vehicle state
  const [selectedVehicleNum, setSelectedVehicleNum] = useState<string | null>(null);
  const [selectedVehicleData, setSelectedVehicleData] = useState<GPSVehicleData | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<GPSTripData | null>(null);
  const [isDetailsPanelVisible, setIsDetailsPanelVisible] = useState(true);

  // Filters & sorting (Toolbar)
  const [fleetTypeFilter, setFleetTypeFilter] = useState<"all" | "company" | "market">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "stopped" | "no_signal">("all");
  const [currentSort, setCurrentSort] = useState<"name" | "speed" | "recent">("name");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // On-demand drawers
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isSpecsDrawerOpen, setIsSpecsDrawerOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState<"today" | "yesterday" | "last_7_days">("today");
  const [historyTimeline, setHistoryTimeline] = useState<TimelineItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [routeMetrics, setRouteMetrics] = useState<{ coveredKm: number; remainingKm: number; totalKm: number } | null>(null);

  // Sync timing
  const [lastSyncSec, setLastSyncSec] = useState<number>(0);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Responsive left panel collapse on smaller screens
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

  // Track seconds since last sync
  useEffect(() => {
    syncTimerRef.current = setInterval(() => {
      setLastSyncSec((prev) => prev + 1);
    }, 1000);
    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, []);

  // 1. Load GPS configuration
  useEffect(() => {
    apiClient<GPSConfig>("/api/v1/transport/tracking/gps/config")
      .then((cfg) => {
        setConfig(cfg);
        if (cfg.google_maps_api_key) {
          setGoogleMapsKey(cfg.google_maps_api_key);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Load Fleet from Backend API
  const loadFleet = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingFleet(true);
    else setIsRefreshing(true);

    try {
      const res = await apiClient<any>("/api/v1/transport/tracking/gps/vehicles");
      if (res && res.success && Array.isArray(res.vehicles) && res.vehicles.length > 0) {
        setVehicles(res.vehicles);
        if (res.counts) setCounts(res.counts);
        setIsSampleMode(false);

        // Keep current selected vehicle or default to first
        setSelectedVehicleNum((prev) => {
          if (prev && res.vehicles.some((v: any) => v.vehicleNumber === prev)) {
            const found = res.vehicles.find((v: any) => v.vehicleNumber === prev);
            if (found) setSelectedVehicleData(found);
            return prev;
          }
          const firstNum = res.vehicles[0].vehicleNumber;
          setSelectedVehicleData(res.vehicles[0]);
          return firstNum;
        });
      } else {
        // If WheelsEye is not configured or returned 0 vehicles, prepare sample fallback toggle
        // while preserving true empty state if user wants live data only
        if (isSampleMode) {
          setVehicles(SAMPLE_FLEET);
          setCounts({
            all: 24,
            company: 18,
            market: 6,
            running: 15,
            stopped: 6,
            no_signal: 3,
          });
        } else {
          setVehicles([]);
          setCounts({
            all: 0,
            company: 0,
            market: 0,
            running: 0,
            stopped: 0,
            no_signal: 0,
          });
        }
      }
      setLastSyncSec(0);
    } catch (err) {
      console.warn("GPS Fleet fetch notice:", err);
      if (isSampleMode) {
        setVehicles(SAMPLE_FLEET);
      }
    } finally {
      setIsLoadingFleet(false);
      setIsRefreshing(false);
    }
  }, [isSampleMode]);

  useEffect(() => {
    loadFleet();
    const pollInterval = setInterval(() => {
      loadFleet(true);
    }, 15000); // 15-second polling interval
    return () => clearInterval(pollInterval);
  }, [loadFleet]);

  // Handle switching sample mode
  const handleToggleSampleMode = (enableSample: boolean) => {
    setIsSampleMode(enableSample);
    if (enableSample) {
      setVehicles(SAMPLE_FLEET);
      setCounts({
        all: 24,
        company: 18,
        market: 6,
        running: 15,
        stopped: 6,
        no_signal: 3,
      });
      setSelectedVehicleNum(SAMPLE_FLEET[0].vehicleNumber);
      setSelectedVehicleData(SAMPLE_FLEET[0]);
      setIsDetailsPanelVisible(true);
    } else {
      loadFleet();
    }
  };

  // Select a vehicle
  const handleSelectVehicle = (vNum: string) => {
    const cleanNum = vNum.trim();
    if (!cleanNum) return;
    setSelectedVehicleNum(cleanNum);
    setIsDetailsPanelVisible(true);

    const found = vehicles.find((v) => v.vehicleNumber === cleanNum);
    if (found) {
      setSelectedVehicleData(found);
    }

    // Load active trip LR details if not in sample mode
    if (!isSampleMode) {
      apiClient<any>(`/api/v1/transport/tracking/gps/track?vehicle=${encodeURIComponent(cleanNum)}`)
        .then((trackRes) => {
          if (trackRes?.success && trackRes?.truck_data) {
            setSelectedVehicleData(trackRes.truck_data);
            setSelectedTrip(trackRes.trip || null);
          }
        })
        .catch(() => {});
    }
  };

  // Load Route History on-demand
  const handleOpenRouteHistory = (vNum?: string) => {
    const target = vNum || selectedVehicleNum;
    if (!target) return;
    setIsHistoryDrawerOpen(true);
    setIsLoadingHistory(true);

    if (isSampleMode) {
      // Mocked realistic history for sample preview
      setTimeout(() => {
        setHistoryTimeline([
          {
            type: "movement",
            title: "Moving (48 km/h)",
            duration: "2h 15m",
            address: "Sector 18, Noida towards DND Flyway",
            time_range: "08:30 PM - Current",
            latitude: 28.5700,
            longitude: 77.3200,
            speed: 48,
          },
          {
            type: "stoppage",
            title: "Halt at Warehouse",
            duration: "45m",
            address: "Industrial Area Phase 2, Noida",
            time_range: "07:45 PM - 08:30 PM",
            latitude: 28.5600,
            longitude: 77.3300,
            speed: 0,
          },
          {
            type: "movement",
            title: "Moving (55 km/h)",
            duration: "1h 40m",
            address: "NH-9 Ghaziabad to Noida",
            time_range: "06:05 PM - 07:45 PM",
            latitude: 28.6300,
            longitude: 77.3800,
            speed: 55,
          },
        ]);
        setIsLoadingHistory(false);
      }, 400);
      return;
    }

    apiClient<any>(`/api/v1/transport/tracking/gps/history?vehicle=${encodeURIComponent(target)}&date=${historyDate}`)
      .then((res) => {
        if (res?.success) {
          setHistoryTimeline(res.timeline || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingHistory(false);
      });
  };

  // Filtered & sorted vehicle list
  const filteredVehicles = useMemo(() => {
    let list = vehicles;

    // Fleet Type filter
    if (fleetTypeFilter === "company") {
      list = list.filter((v) => v.isCompany);
    } else if (fleetTypeFilter === "market") {
      list = list.filter((v) => !v.isCompany);
    }

    // Status filter
    if (statusFilter === "running") {
      list = list.filter((v) => v.status === "running");
    } else if (statusFilter === "stopped") {
      list = list.filter((v) => v.status === "stopped");
    } else if (statusFilter === "no_signal") {
      list = list.filter((v) => v.status === "no_signal");
    }

    // Search query
    if (searchKeyword.trim()) {
      const q = searchKeyword.trim().toUpperCase();
      list = list.filter(
        (v) =>
          v.vehicleNumber.toUpperCase().includes(q) ||
          (v.driverName && v.driverName.toUpperCase().includes(q)) ||
          (v.address && v.address.toUpperCase().includes(q)) ||
          (v.groupName && v.groupName.toUpperCase().includes(q))
      );
    }

    // Sort order
    if (currentSort === "speed") {
      list = [...list].sort((a, b) => (b.speed || 0) - (a.speed || 0));
    } else if (currentSort === "name") {
      list = [...list].sort((a, b) => a.vehicleNumber.localeCompare(b.vehicleNumber));
    }

    return list;
  }, [vehicles, fleetTypeFilter, statusFilter, searchKeyword, currentSort]);

  // Progressive rendering limit to prevent lag when fleet has thousands of vehicles (e.g. 3,900+ vehicles)
  const [renderLimit, setRenderLimit] = useState(60);

  useEffect(() => {
    setRenderLimit(60);
  }, [searchKeyword, statusFilter, fleetTypeFilter, currentSort]);

  const visibleVehicles = useMemo(() => {
    return filteredVehicles.slice(0, renderLimit);
  }, [filteredVehicles, renderLimit]);

  const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 280) {
      setRenderLimit((prev) => Math.min(prev + 50, filteredVehicles.length));
    }
  };

  // Quick track vehicle action from header button
  const handleQuickTrackAction = () => {
    if (filteredVehicles.length > 0) {
      handleSelectVehicle(filteredVehicles[0].vehicleNumber);
    } else if (searchKeyword.trim()) {
      handleSelectVehicle(searchKeyword.trim().toUpperCase());
    }
  };

  return (
    <div className="flex flex-col gap-3 font-sans pb-4">
      {/* ---------------------------------------------------------------------- */}
      {/* 1. Header Section (Matching reference UI)                              */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex flex-col gap-2">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Link href="/" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Tracking
          </Link>
          <span className="text-slate-400 dark:text-slate-600">/</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">GPS Tracking</span>
        </nav>

        {/* Title, Subtitle, and Right Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-[#251E3E] border border-indigo-200 dark:border-[#3D325E] flex items-center justify-center text-[#7965E9] shrink-0 shadow-xs">
              <Navigation className="w-5 h-5 fill-[#7965E9]/20" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                GPS Tracking
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Live fleet monitoring and real-time location tracking
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Live Connection / Sync Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#171922] border border-slate-200 dark:border-[#2B303C] text-xs text-slate-700 dark:text-slate-300 font-medium shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#20B889] animate-pulse" />
              <span>
                Last sync: {lastSyncSec < 5 ? "just now" : `${lastSyncSec} sec ago`}
              </span>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadFleet()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-[#2B303C] bg-white dark:bg-[#171922] hover:bg-slate-50 dark:hover:bg-[#202330] text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500 dark:text-slate-300", isRefreshing && "animate-spin")} />
              <span>Refresh</span>
            </button>

            {/* Primary Track Vehicle Button */}
            <button
              type="button"
              onClick={handleQuickTrackAction}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#7965E9] hover:bg-[#6854D8] active:bg-[#5844C6] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 fill-white" />
              <span>Track Vehicle</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Fleet Overview Cards (4 Compact Cards)                              */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Vehicles */}
        <div
          onClick={() => {
            setFleetTypeFilter("all");
            setStatusFilter("all");
          }}
          className="bg-white dark:bg-[#171922] hover:bg-slate-50/80 dark:hover:bg-[#1D202B] border border-slate-200 dark:border-[#2B303C] hover:border-slate-300 dark:hover:border-slate-500 rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 transition-all cursor-pointer shadow-xs group"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-[#1B273A] border border-blue-100 dark:border-[#233550] flex items-center justify-center text-blue-600 dark:text-[#3B82F6] shrink-0 group-hover:scale-105 transition-transform">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Vehicles</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-mono mt-0.5">
              {counts.all}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">All fleet vehicles</div>
          </div>
        </div>

        {/* Card 2: Moving */}
        <div
          onClick={() => setStatusFilter("running")}
          className="bg-white dark:bg-[#171922] hover:bg-slate-50/80 dark:hover:bg-[#1D202B] border border-slate-200 dark:border-[#2B303C] hover:border-slate-300 dark:hover:border-slate-500 rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 transition-all cursor-pointer shadow-xs group"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-[#162D24] border border-emerald-100 dark:border-[#1E4334] flex items-center justify-center text-emerald-600 dark:text-[#20B889] shrink-0 group-hover:scale-105 transition-transform">
            <Play className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Moving</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-mono mt-0.5">
              {counts.running}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">Vehicles on move</div>
          </div>
        </div>

        {/* Card 3: Stopped */}
        <div
          onClick={() => setStatusFilter("stopped")}
          className="bg-white dark:bg-[#171922] hover:bg-slate-50/80 dark:hover:bg-[#1D202B] border border-slate-200 dark:border-[#2B303C] hover:border-slate-300 dark:hover:border-slate-500 rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 transition-all cursor-pointer shadow-xs group"
        >
          <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-[#321E23] border border-rose-100 dark:border-[#48252C] flex items-center justify-center text-rose-600 dark:text-[#E66D7C] shrink-0 group-hover:scale-105 transition-transform">
            <Square className="w-4 h-4 fill-current rounded-xs" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Stopped</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-mono mt-0.5">
              {counts.stopped}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">Vehicles stationary</div>
          </div>
        </div>

        {/* Card 4: No Signal */}
        <div
          onClick={() => setStatusFilter("no_signal")}
          className="bg-white dark:bg-[#171922] hover:bg-slate-50/80 dark:hover:bg-[#1D202B] border border-slate-200 dark:border-[#2B303C] hover:border-slate-300 dark:hover:border-slate-500 rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 transition-all cursor-pointer shadow-xs group"
        >
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#222530] border border-slate-200 dark:border-[#313646] flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0 group-hover:scale-105 transition-transform">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">No Signal</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-mono mt-0.5">
              {counts.no_signal}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">No recent updates</div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. Unified Toolbar (Fleet Tabs, Search, Status Filter, Sort)          */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-[#171922] border border-slate-200 dark:border-[#2B303C] rounded-xl p-2 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Left: Segmented Tabs */}
        <div className="inline-flex items-center bg-slate-100 dark:bg-[#11131A] p-1 rounded-lg border border-slate-200/80 dark:border-[#252936]">
          <button
            type="button"
            onClick={() => setFleetTypeFilter("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
              fleetTypeFilter === "all"
                ? "bg-[#7965E9] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            All Fleet
          </button>
          <button
            type="button"
            onClick={() => setFleetTypeFilter("company")}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
              fleetTypeFilter === "company"
                ? "bg-[#7965E9] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            Company
          </button>
          <button
            type="button"
            onClick={() => setFleetTypeFilter("market")}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
              fleetTypeFilter === "market"
                ? "bg-[#7965E9] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            Market / Attached
          </button>
        </div>

        {/* Center: Search Input */}
        <div className="relative flex items-center flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Search registration, driver or device ID..."
            className="h-9 w-full pl-9 pr-8 text-xs bg-slate-50 dark:bg-[#11131A] border border-slate-200 dark:border-[#2B303C] rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#7965E9] focus:border-[#7965E9] focus:bg-white dark:focus:bg-[#11131A] transition-colors"
          />
          {searchKeyword && (
            <button
              type="button"
              onClick={() => setSearchKeyword("")}
              className="absolute right-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Dropdowns & Controls */}
        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="h-9 pl-3 pr-8 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#11131A] border border-slate-200 dark:border-[#2B303C] rounded-lg appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-500 focus:outline-none focus:border-[#7965E9]"
            >
              <option value="all">🟢 All Status</option>
              <option value="running">🟢 Moving</option>
              <option value="stopped">🔴 Stopped</option>
              <option value="no_signal">⚪ No Signal</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={currentSort}
              onChange={(e: any) => setCurrentSort(e.target.value)}
              className="h-9 pl-3 pr-8 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#11131A] border border-slate-200 dark:border-[#2B303C] rounded-lg appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-500 focus:outline-none focus:border-[#7965E9]"
            >
              <option value="name">Sort: Registration</option>
              <option value="speed">Sort: Speed</option>
              <option value="recent">Sort: Recent Update</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sample / Live Preview Toggle (matches screenshot demo fleet) */}
          <button
            type="button"
            onClick={() => handleToggleSampleMode(!isSampleMode)}
            className={cn(
              "h-9 px-3 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1.5",
              isSampleMode
                ? "bg-[#7965E9]/15 border-[#7965E9] text-[#7965E9] font-semibold"
                : "bg-slate-50 dark:bg-[#11131A] border-slate-200 dark:border-[#2B303C] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
            title="Toggle between live connected GPS devices and sample fleet overview"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isSampleMode ? "Sample Fleet ON" : "Live Fleet"}</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. Main Two-Panel Tracking Workspace                                   */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row gap-3.5 h-[calc(100vh-270px)] min-h-[580px] relative">
        {/* =================================================================== */}
        {/* LEFT PANEL: Vehicle List                                            */}
        {/* =================================================================== */}
        <aside
          className={cn(
            "w-full lg:w-[360px] xl:w-[380px] bg-white dark:bg-[#171922] border border-slate-200 dark:border-[#2B303C] rounded-xl flex flex-col shrink-0 overflow-hidden transition-all duration-300 shadow-xs",
            isLeftPanelCollapsed && "lg:w-16"
          )}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-[#2B303C] flex items-center justify-between shrink-0">
            {!isLeftPanelCollapsed ? (
              <>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Vehicles</h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {filteredVehicles.length} vehicles
                </span>
              </>
            ) : (
              <span className="mx-auto text-xs font-bold text-slate-500 dark:text-slate-400">
                {filteredVehicles.length}
              </span>
            )}
          </div>

          {/* Scrollable Cards List (Progressive Loading to Prevent Stutter on 3,900+ Vehicles) */}
          <div onScroll={handleSidebarScroll} className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {isLoadingFleet ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 text-[#7965E9] animate-spin mx-auto mb-2" />
                <p className="font-medium">Connecting to GPS Telemetry...</p>
              </div>
            ) : filteredVehicles.length === 0 ? (
              // Empty State
              <div className="py-12 px-4 text-center text-slate-400 text-xs flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1B202D] border border-slate-200 dark:border-[#2B303C] flex items-center justify-center text-slate-500 mb-3">
                  <Truck className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  No vehicles found
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-4 max-w-xs">
                  {searchKeyword
                    ? `No registered vehicle matches "${searchKeyword}".`
                    : config?.is_configured === false
                    ? "Your WheelsEye GPS account is not yet connected in API Center."
                    : "No fleet vehicles found for this filter."}
                </p>

                {config?.is_configured === false && (
                  <Link
                    href="/api-center/gps"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#7965E9] text-white text-xs font-semibold hover:bg-[#6854D8] transition-colors mb-2"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Connect in API Center</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => handleToggleSampleMode(true)}
                  className="text-xs text-[#7965E9] hover:underline font-medium cursor-pointer"
                >
                  Or preview sample fleet demo →
                </button>
              </div>
            ) : (
              <>
                {visibleVehicles.map((v) => {
                  const isSelected = v.vehicleNumber === selectedVehicleNum;
                  const isRunning = v.speed > 0;
                  const isStopped = v.status === "stopped";

                  return (
                    <div
                      key={v.vehicleNumber}
                      onClick={() => handleSelectVehicle(v.vehicleNumber)}
                      className={cn(
                        "rounded-xl p-3 cursor-pointer transition-all duration-200 flex items-center gap-3 relative select-none",
                        isSelected
                          ? "bg-indigo-50/80 dark:bg-[#181A25] border-2 border-[#7965E9] shadow-sm ring-1 ring-[#7965E9]/50"
                          : "bg-slate-50/80 dark:bg-[#13151D] border border-slate-200/90 dark:border-[#262B37] hover:border-slate-300 dark:hover:border-slate-500 shadow-2xs hover:bg-slate-100/90 dark:hover:bg-[#161822]"
                      )}
                    >
                      {/* Truck Thumbnail Avatar */}
                      <div className="w-12 h-12 rounded-lg bg-white dark:bg-[#1B1E29] border border-slate-200 dark:border-[#2B303C] flex items-center justify-center shrink-0 overflow-hidden">
                        <Truck className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                      </div>

                      {/* Middle Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold font-mono text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight truncate">
                          {v.vehicleNumber}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                          {v.driverName || "Driver Unassigned"}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-500 truncate mt-0.5">
                          {v.address || "Fetching location..."}
                        </div>
                      </div>

                      {/* Right Info: Status, Speed & Time */}
                      <div className="shrink-0 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-[11px] font-semibold">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isRunning
                                ? "bg-emerald-500 dark:bg-[#20B889]"
                                : isStopped
                                ? "bg-rose-500 dark:bg-[#E66D7C]"
                                : "bg-slate-400"
                            )}
                          />
                          <span
                            className={cn(
                              isRunning
                                ? "text-emerald-600 dark:text-[#20B889]"
                                : isStopped
                                ? "text-rose-600 dark:text-[#E66D7C]"
                                : "text-slate-500 dark:text-slate-400"
                            )}
                          >
                            {isRunning ? "Moving" : isStopped ? "Stopped" : "No Signal"}
                          </span>
                        </div>
                        <div className="font-bold font-mono text-slate-900 dark:text-white text-xs mt-1">
                          {v.speed || 0} km/h
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {v.lastUpdated || "live"}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Show Load More Pill if there are more vehicles */}
                {visibleVehicles.length < filteredVehicles.length && (
                  <div className="py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setRenderLimit((prev) => Math.min(prev + 100, filteredVehicles.length))}
                      className="text-xs text-[#7965E9] hover:underline font-semibold cursor-pointer px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60"
                    >
                      Showing {visibleVehicles.length} of {filteredVehicles.length} — Load More
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* =================================================================== */}
        {/* RIGHT PANEL: Dominant GPS Map Workspace                             */}
        {/* =================================================================== */}
        <section className="flex-1 bg-white dark:bg-[#171922] border border-slate-200 dark:border-[#2B303C] rounded-xl overflow-hidden relative flex flex-col shadow-xs">
          {/* Real Map Component */}
          <GPSTrackingMap
            vehicle={selectedVehicleData}
            vehicles={filteredVehicles}
            trip={selectedTrip}
            apiKey={googleMapsKey}
            onSelectVehicle={handleSelectVehicle}
            onMetricsComputed={(m) => setRouteMetrics(m)}
            isSampleData={isSampleMode}
            className="w-full h-full"
          />

          {/* ----------------------------------------------------------------- */}
          {/* Floating Vehicle Details Card (Bottom Right - Matching Reference) */}
          {/* ----------------------------------------------------------------- */}
          {selectedVehicleData && isDetailsPanelVisible && (
            <div className="absolute bottom-5 right-5 z-20 w-80 sm:w-96 bg-white/95 dark:bg-[#171922]/95 backdrop-blur-md border border-slate-200 dark:border-[#2B303C] rounded-2xl p-4 shadow-xl animate-in fade-in duration-200">
              {/* Header: Thumbnail + Number + Status Badge + Close X */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#2B303C]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#1B1E29] border border-slate-200 dark:border-[#2B303C] flex items-center justify-center shrink-0">
                    <Truck className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <h3 className="font-bold font-mono text-slate-900 dark:text-white text-sm tracking-tight">
                      {selectedVehicleData.vehicleNumber}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          selectedVehicleData.speed > 0
                            ? "bg-emerald-500 dark:bg-[#20B889]"
                            : selectedVehicleData.status === "stopped"
                            ? "bg-rose-500 dark:bg-[#E66D7C]"
                            : "bg-slate-400"
                        )}
                      />
                      <span
                        className={cn(
                          "font-semibold text-[11px]",
                          selectedVehicleData.speed > 0
                            ? "text-emerald-600 dark:text-[#20B889]"
                            : selectedVehicleData.status === "stopped"
                            ? "text-rose-600 dark:text-[#E66D7C]"
                            : "text-slate-500 dark:text-slate-400"
                        )}
                      >
                        {selectedVehicleData.speed > 0
                          ? "Moving"
                          : selectedVehicleData.status === "stopped"
                          ? "Stopped"
                          : "No Signal"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDetailsPanelVisible(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  title="Close Card"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid: Driver, Location, Speed, Last Update */}
              <div className="grid grid-cols-2 gap-3 py-3 text-xs border-b border-slate-200 dark:border-[#2B303C]">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                    Driver
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                    {selectedVehicleData.driverName || "Rahul Sharma"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                    Location
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                    {selectedVehicleData.address || "Sector 18, Noida, UP"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                    Speed
                  </span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white block mt-0.5">
                    {selectedVehicleData.speed || 0} km/h
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                    Last Update
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block mt-0.5">
                    {selectedVehicleData.lastUpdated || "Just now"}
                  </span>
                </div>
              </div>

              {/* Actions: Route History & Details */}
              <div className="flex items-center gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => handleOpenRouteHistory()}
                  className="flex-1 h-9 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#11131A] hover:bg-slate-200/80 dark:hover:bg-[#1E212D] border border-slate-200 dark:border-[#2B303C] rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Route History</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSpecsDrawerOpen(true)}
                  className="flex-1 h-9 px-3 text-xs font-semibold text-white bg-[#7965E9] hover:bg-[#6854D8] rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Details</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 5. On-Demand Route History Drawer Modal                                */}
      {/* ---------------------------------------------------------------------- */}
      {isHistoryDrawerOpen && selectedVehicleData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#171922] h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-[#2B303C]">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-[#2B303C] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Route History — {selectedVehicleData.vehicleNumber}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Telemetry history, travel duration &amp; stoppages
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Date filter selector */}
            <div className="p-3 border-b border-slate-200 dark:border-[#2B303C] flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#12141C]">
              <select
                value={historyDate}
                onChange={(e: any) => {
                  setHistoryDate(e.target.value);
                  handleOpenRouteHistory(selectedVehicleData.vehicleNumber);
                }}
                className="h-8 px-2.5 bg-white dark:bg-[#171922] border border-slate-200 dark:border-[#2B303C] rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last_7_days">Last 7 Days</option>
              </select>

              <button
                type="button"
                onClick={() => handleOpenRouteHistory(selectedVehicleData.vehicleNumber)}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Refresh History"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoadingHistory && "animate-spin")} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              {/* Distance Metrics Strip */}
              {routeMetrics && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#12141C] border border-slate-200 dark:border-[#2B303C] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Traveled</span>
                    <span className="font-bold text-emerald-600 dark:text-[#20B889] font-mono">
                      {routeMetrics.coveredKm.toFixed(0)} km
                    </span>
                  </div>
                  <div className="h-6 w-[1px] bg-slate-200 dark:bg-[#2B303C]" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">Remaining</span>
                    <span className="font-bold text-[#7965E9] font-mono">
                      {routeMetrics.remainingKm.toFixed(0)} km
                    </span>
                  </div>
                  <div className="h-6 w-[1px] bg-slate-200 dark:bg-[#2B303C]" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total Trip</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {routeMetrics.totalKm.toFixed(0)} km
                    </span>
                  </div>
                </div>
              )}

              {/* Timeline Items */}
              {isLoadingHistory ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 text-[#7965E9] animate-spin mx-auto mb-2" />
                  <p>Loading historical GPS coordinates...</p>
                </div>
              ) : historyTimeline.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <Clock className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                  <p>No historical telemetry logs available for this period.</p>
                </div>
              ) : (
                historyTimeline.map((item, idx) => {
                  const isStop = item.type === "stoppage";
                  return (
                    <div key={idx} className="flex items-start gap-3 relative">
                      <div className="relative flex items-center justify-center shrink-0 mt-1">
                        <span
                          className={cn(
                            "w-3 h-3 rounded-full border-2",
                            isStop
                              ? "bg-rose-500 dark:bg-[#E66D7C] border-rose-200 dark:border-[#E66D7C]/40"
                              : "bg-emerald-500 dark:bg-[#20B889] border-emerald-200 dark:border-[#20B889]/40"
                          )}
                        />
                      </div>
                      <div className="flex-1 bg-slate-50 dark:bg-[#12141C] border border-slate-200 dark:border-[#2B303C] rounded-xl p-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 dark:text-white">{item.title}</span>
                          <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-white dark:bg-[#171922] px-2 py-0.5 rounded border border-slate-200 dark:border-[#2B303C]">
                            {item.duration}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-1">
                          {item.address || "Location unavailable"}
                        </p>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {item.time_range}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-[#2B303C] flex items-center justify-end bg-slate-50 dark:bg-[#12141C]">
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="h-9 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#171922] hover:bg-slate-100 dark:hover:bg-[#202330] border border-slate-200 dark:border-[#2B303C] rounded-xl transition-colors cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 6. On-Demand Vehicle Details & Diagnostics Drawer                      */}
      {/* ---------------------------------------------------------------------- */}
      {isSpecsDrawerOpen && selectedVehicleData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#171922] h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-[#2B303C]">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-[#2B303C] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Vehicle Details — {selectedVehicleData.vehicleNumber}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Specifications, engine diagnostics &amp; telematics info
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSpecsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
              {/* Vehicle Specifications */}
              <div className="bg-slate-50 dark:bg-[#12141C] p-3.5 rounded-xl border border-slate-200 dark:border-[#2B303C] space-y-2">
                <div className="text-[11px] font-bold text-[#7965E9] uppercase tracking-wide">
                  Fleet Specifications
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Fleet Type</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedVehicleData.isCompany ? "Company Owned" : "Market Attached"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Group / Division</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedVehicleData.groupName || "Panther Logistics"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Driver</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedVehicleData.driverName || "Unassigned"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">GPS Provider</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">WheelsEye Telematics</span>
                  </div>
                </div>
              </div>

              {/* Live Diagnostics */}
              <div className="bg-slate-50 dark:bg-[#12141C] p-3.5 rounded-xl border border-slate-200 dark:border-[#2B303C] space-y-2">
                <div className="text-[11px] font-bold text-emerald-600 dark:text-[#20B889] uppercase tracking-wide">
                  Live Engine Diagnostics
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#171922] border border-slate-200 dark:border-[#2B303C]">
                    <span className="text-slate-500 block text-[10px]">Engine Ignition</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedVehicleData.ignition ? "RUNNING (ON)" : "STOPPED (OFF)"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#171922] border border-slate-200 dark:border-[#2B303C]">
                    <span className="text-slate-500 block text-[10px]">Device Battery</span>
                    <span className="font-bold text-emerald-600 dark:text-[#20B889]">
                      {selectedVehicleData.battery || 100}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#171922] border border-slate-200 dark:border-[#2B303C]">
                    <span className="text-slate-500 block text-[10px]">Odometer Reading</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {selectedVehicleData.odometer ? `${selectedVehicleData.odometer} km` : "N/A"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#171922] border border-slate-200 dark:border-[#2B303C]">
                    <span className="text-slate-500 block text-[10px]">Today Distance</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {selectedVehicleData.todayKm || 0} km
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-[#2B303C] flex items-center justify-end bg-slate-50 dark:bg-[#12141C]">
              <button
                type="button"
                onClick={() => setIsSpecsDrawerOpen(false)}
                className="h-9 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#171922] hover:bg-slate-100 dark:hover:bg-[#202330] border border-slate-200 dark:border-[#2B303C] rounded-xl transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
