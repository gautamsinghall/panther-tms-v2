"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Maximize2, Minimize2, Navigation, Layers, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// Prominent Indian logistics coordinates dictionary for instant fallback geocoding
const KNOWN_INDIAN_COORDINATES: Record<string, [number, number]> = {
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  "new delhi": [28.6139, 77.209],
  gurugram: [28.4595, 77.0266],
  gurgaon: [28.4595, 77.0266],
  noida: [28.5355, 77.391],
  bhiwandi: [19.3002, 73.0635],
  pune: [18.5204, 73.8567],
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  ahmedabad: [23.0225, 72.5714],
  surat: [21.1702, 72.8311],
  jaipur: [26.9124, 75.7873],
  indore: [22.7196, 75.8577],
  pithampur: [22.6105, 75.6885],
  lucknow: [26.8467, 80.9462],
  kanpur: [26.4499, 80.3319],
  nagpur: [21.1458, 79.0882],
  faridabad: [28.4089, 77.3178],
  ghaziabad: [28.6692, 77.4538],
  panipat: [29.3909, 76.9635],
  ludhiana: [30.901, 75.8573],
  chandigarh: [30.7333, 76.7794],
};

const geocodeCache: Record<string, [number, number]> = {};

interface SIMTrackingMapProps {
  vehicleNumber: string;
  originAddress?: string | null;
  destinationAddress?: string | null;
  currentLat?: number | string | null;
  currentLng?: number | string | null;
  currentAddress?: string | null;
  isConsentDone?: boolean;
  className?: string;
}

export function SIMTrackingMap({
  vehicleNumber,
  originAddress,
  destinationAddress,
  currentLat,
  currentLng,
  currentAddress,
  isConsentDone = false,
  className = "",
}: SIMTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Layer references
  const tileLayerRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

  // Helper to geocode address
  const resolveCoords = useCallback(async (addr?: string | null): Promise<[number, number] | null> => {
    if (!addr || !addr.trim()) return null;
    const clean = addr.toLowerCase().trim();
    if (geocodeCache[clean]) return geocodeCache[clean];

    for (const [key, coords] of Object.entries(KNOWN_INDIAN_COORDINATES)) {
      if (clean.includes(key)) {
        geocodeCache[clean] = coords;
        return coords;
      }
    }

    // Try OSM Nominatim
    try {
      const q = encodeURIComponent(addr + ", India");
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`);
      const data = await resp.json();
      if (data && data.length > 0) {
        const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        geocodeCache[clean] = coords;
        return coords;
      }
    } catch {
      // Fallback silent
    }
    return null;
  }, []);

  // Initialize Leaflet
  const initMap = useCallback(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (leafletMapRef.current) {
      try {
        leafletMapRef.current.remove();
      } catch {}
      leafletMapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([28.6139, 77.209], 10);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const tileUrl =
      mapType === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
    markersGroupRef.current = L.layerGroup().addTo(map);

    leafletMapRef.current = map;
    setIsMapReady(true);
  }, [mapType]);

  // Load Leaflet Scripts
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if ((window as any).L) {
      initMap();
    } else if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else {
      const existing = document.getElementById("leaflet-js");
      existing?.addEventListener("load", () => initMap());
    }

    return () => {
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch {}
        leafletMapRef.current = null;
      }
    };
  }, [initMap]);

  // Switch Tile Layer when mapType changes
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !leafletMapRef.current) return;

    if (tileLayerRef.current) {
      leafletMapRef.current.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      mapType === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(leafletMapRef.current);
  }, [mapType]);

  // Render Overlays: Origin (A), Destination (B), Vehicle Marker, Geofence, Polyline
  const renderOverlays = useCallback(async () => {
    const L = (window as any).L;
    if (!L || !leafletMapRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();
    const boundsPoints: [number, number][] = [];

    // 1. Resolve Origin
    const originCoords = await resolveCoords(originAddress);
    if (originCoords) {
      boundsPoints.push(originCoords);
      const iconA = L.divIcon({
        className: "custom-div-icon",
        html: `
          <div style="background-color: #10b981; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
            A
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker(originCoords, { icon: iconA })
        .bindPopup(`<b>Origin Hub</b><br/>${originAddress || "Loading Origin"}`)
        .addTo(markersGroupRef.current);
    }

    // 2. Resolve Destination & Geofence
    const destCoords = await resolveCoords(destinationAddress);
    if (destCoords) {
      boundsPoints.push(destCoords);

      // Shaded Circular Geofence buffer around destination (as seen in Image 2)
      L.circle(destCoords, {
        radius: 4000,
        color: "#64748b",
        weight: 1.5,
        dashArray: "4, 6",
        fillColor: "#94a3b8",
        fillOpacity: 0.18,
      }).addTo(markersGroupRef.current);

      const iconB = L.divIcon({
        className: "custom-div-icon",
        html: `
          <div style="background-color: #ef4444; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
            B
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker(destCoords, { icon: iconB })
        .bindPopup(`<b>Destination Hub</b><br/>${destinationAddress || "Unloading Destination"}`)
        .addTo(markersGroupRef.current);
    }

    // 3. Vehicle Live Marker
    const numLat = currentLat ? parseFloat(String(currentLat)) : null;
    const numLng = currentLng ? parseFloat(String(currentLng)) : null;

    if (numLat && numLng && !isNaN(numLat) && !isNaN(numLng)) {
      const vehCoords: [number, number] = [numLat, numLng];
      boundsPoints.push(vehCoords);

      const vehicleIcon = L.divIcon({
        className: "custom-div-icon",
        html: `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(59, 130, 246, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #1e293b; color: white; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.45);">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path>
                <path d="M15 18H9"></path>
                <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path>
                <circle cx="17" cy="18" r="2"></circle>
                <circle cx="7" cy="18" r="2"></circle>
              </svg>
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker(vehCoords, { icon: vehicleIcon })
        .bindPopup(
          `<b>${vehicleNumber}</b><br/>${currentAddress || "Cell tower location fix"}<br/>Coords: ${numLat.toFixed(4)}, ${numLng.toFixed(4)}`
        )
        .addTo(markersGroupRef.current);
    }

    // 4. Draw Route Polyline
    if (boundsPoints.length >= 2) {
      L.polyline(boundsPoints, {
        color: "#2563eb",
        weight: 3.5,
        opacity: 0.85,
        dashArray: "6, 8",
        lineCap: "round",
      }).addTo(markersGroupRef.current);

      try {
        const bounds = L.latLngBounds(boundsPoints);
        leafletMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } catch {}
    } else if (boundsPoints.length === 1) {
      leafletMapRef.current.setView(boundsPoints[0], 12);
    }
  }, [originAddress, destinationAddress, currentLat, currentLng, currentAddress, vehicleNumber, resolveCoords]);

  useEffect(() => {
    if (isMapReady) {
      renderOverlays();
    }
  }, [isMapReady, renderOverlays]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
    setTimeout(() => {
      leafletMapRef.current?.invalidateSize();
    }, 200);
  };

  return (
    <div
      className={cn(
        "relative w-full h-[460px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs",
        isFullscreen && "fixed inset-0 z-50 h-screen w-screen rounded-none",
        className
      )}
    >
      {/* Map Control Bar Top-Left */}
      <div className="absolute top-3 left-3 z-[400] flex items-center bg-white/95 backdrop-blur-xs rounded-lg border border-slate-200/90 shadow-xs overflow-hidden text-xs font-semibold text-slate-700">
        <button
          type="button"
          onClick={() => setMapType("roadmap")}
          className={cn(
            "px-3 py-1.5 transition-colors cursor-pointer",
            mapType === "roadmap" ? "bg-slate-900 text-white font-bold" : "hover:bg-slate-100 text-slate-600"
          )}
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => setMapType("satellite")}
          className={cn(
            "px-3 py-1.5 transition-colors cursor-pointer",
            mapType === "satellite" ? "bg-slate-900 text-white font-bold" : "hover:bg-slate-100 text-slate-600"
          )}
        >
          Satellite
        </button>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg bg-white/95 hover:bg-slate-100 text-slate-700 border border-slate-200/90 shadow-xs transition-colors cursor-pointer"
          title={isFullscreen ? "Exit Fullscreen" : "View Fullscreen Map"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Status Overlay if No Consent */}
      {!isConsentDone && !currentLat && (
        <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur-xs border border-amber-300 text-amber-900 px-3 py-1.5 rounded-lg shadow-xs text-xs font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Awaiting Driver SIM SMS Consent for Cell Tower Fixes</span>
        </div>
      )}

      {/* Map Div */}
      <div ref={containerRef} className="w-full h-full z-0" />
    </div>
  );
}
