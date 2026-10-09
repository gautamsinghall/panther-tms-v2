"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

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
  const [mapEngine, setMapEngine] = useState<"google" | "leaflet">("leaflet");
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // References for Leaflet
  const leafletMapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

  // References for Google Maps
  const googleMapRef = useRef<any>(null);
  const googleMarkersRef = useRef<any[]>([]);
  const googlePolylineRef = useRef<any>(null);
  const googleCircleRef = useRef<any>(null);

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

  // ---------------------------------------------------------------------------
  // Initialize Leaflet
  // ---------------------------------------------------------------------------
  const initLeaflet = useCallback(() => {
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
    setMapEngine("leaflet");
    setIsMapReady(true);
  }, [mapType]);

  // ---------------------------------------------------------------------------
  // Initialize Google Maps
  // ---------------------------------------------------------------------------
  const initGoogleMaps = useCallback(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    const gmaps = (window as any).google?.maps;
    if (!gmaps) return;

    if (leafletMapRef.current) {
      try {
        leafletMapRef.current.remove();
      } catch {}
      leafletMapRef.current = null;
    }

    const map = new gmaps.Map(containerRef.current, {
      center: { lat: 28.6139, lng: 77.209 },
      zoom: 10,
      mapTypeId: mapType === "satellite" ? gmaps.MapTypeId.HYBRID : gmaps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: gmaps.ControlPosition.RIGHT_BOTTOM,
      },
    });

    googleMapRef.current = map;
    setMapEngine("google");
    setIsMapReady(true);
  }, [mapType]);

  // ---------------------------------------------------------------------------
  // Load Map Engines (Google Maps API Key first, fallback to Leaflet)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    let isMounted = true;

    const setupEngines = async () => {
      // 1. Ensure Leaflet CSS/JS fallback is loaded in document head
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const loadLeafletScript = () => {
        if (!isMounted) return;
        if ((window as any).L) {
          initLeaflet();
          return;
        }
        if (!document.getElementById("leaflet-js")) {
          const script = document.createElement("script");
          script.id = "leaflet-js";
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.async = true;
          script.onload = () => {
            if (isMounted) initLeaflet();
          };
          document.head.appendChild(script);
        } else {
          const existing = document.getElementById("leaflet-js");
          existing?.addEventListener("load", () => {
            if (isMounted) initLeaflet();
          });
        }
      };

      // 2. Fetch Google Maps API Key from env or backend config
      let key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
      if (!key) {
        try {
          const cfg = await apiClient<{ google_maps_api_key?: string }>("/api/v1/transport/tracking/fastag/config");
          if (cfg?.google_maps_api_key) {
            key = cfg.google_maps_api_key;
          }
        } catch {}
      }

      // 3. Load Google Maps if Key configured
      if (key && key.trim() !== "") {
        if ((window as any).google?.maps) {
          initGoogleMaps();
          return;
        }

        (window as any).gm_authFailure = () => {
          console.warn("Google Maps auth failure. Gracefully falling back to Leaflet.");
          loadLeafletScript();
        };

        (window as any).initSimGoogleMaps = () => {
          if (isMounted) initGoogleMaps();
        };

        if (!document.getElementById("google-maps-js")) {
          const script = document.createElement("script");
          script.id = "google-maps-js";
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
            key.trim()
          )}&libraries=places,geometry&loading=async&callback=initSimGoogleMaps`;
          script.async = true;
          script.onerror = () => {
            console.warn("Google Maps script failed to load. Falling back to Leaflet.");
            loadLeafletScript();
          };
          document.head.appendChild(script);
        }
      } else {
        loadLeafletScript();
      }
    };

    setupEngines();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch {}
        leafletMapRef.current = null;
      }
    };
  }, [initGoogleMaps, initLeaflet]);

  // ---------------------------------------------------------------------------
  // Toggle Map Type (Roadmap vs Satellite)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mapEngine === "google" && googleMapRef.current) {
      const gmaps = (window as any).google?.maps;
      if (gmaps) {
        googleMapRef.current.setMapTypeId(
          mapType === "satellite" ? gmaps.MapTypeId.HYBRID : gmaps.MapTypeId.ROADMAP
        );
      }
    } else if (mapEngine === "leaflet" && leafletMapRef.current) {
      const L = (window as any).L;
      if (!L) return;
      if (tileLayerRef.current) {
        leafletMapRef.current.removeLayer(tileLayerRef.current);
      }
      const tileUrl =
        mapType === "satellite"
          ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(leafletMapRef.current);
    }
  }, [mapType, mapEngine]);

  // ---------------------------------------------------------------------------
  // Render Markers & Overlays
  // ---------------------------------------------------------------------------
  const renderOverlays = useCallback(async () => {
    if (!isMapReady) return;

    // Coordinate resolution
    const originCoords = await resolveCoords(originAddress);
    const destCoords = await resolveCoords(destinationAddress);
    const numLat = currentLat ? parseFloat(String(currentLat)) : null;
    const numLng = currentLng ? parseFloat(String(currentLng)) : null;
    const vehCoords: [number, number] | null = numLat && numLng && !isNaN(numLat) && !isNaN(numLng) ? [numLat, numLng] : null;

    if (mapEngine === "google" && googleMapRef.current) {
      const gmaps = (window as any).google?.maps;
      if (!gmaps) return;

      // Clear existing Google overlays
      googleMarkersRef.current.forEach((m) => m?.setMap?.(null));
      googleMarkersRef.current = [];
      if (googlePolylineRef.current) googlePolylineRef.current.setMap(null);
      if (googleCircleRef.current) googleCircleRef.current.setMap(null);

      const bounds = new gmaps.LatLngBounds();
      const pathCoordinates: any[] = [];

      // Origin Marker [A]
      if (originCoords) {
        const pos = { lat: originCoords[0], lng: originCoords[1] };
        bounds.extend(pos);
        pathCoordinates.push(pos);
        const markerA = new gmaps.Marker({
          position: pos,
          map: googleMapRef.current,
          label: { text: "A", color: "#FFFFFF", fontWeight: "bold" },
          title: `Origin: ${originAddress || "Origin Hub"}`,
        });
        googleMarkersRef.current.push(markerA);
      }

      // Destination Marker [B] & Geofence
      if (destCoords) {
        const pos = { lat: destCoords[0], lng: destCoords[1] };
        bounds.extend(pos);
        pathCoordinates.push(pos);
        const markerB = new gmaps.Marker({
          position: pos,
          map: googleMapRef.current,
          label: { text: "B", color: "#FFFFFF", fontWeight: "bold" },
          title: `Destination: ${destinationAddress || "Destination Hub"}`,
        });
        googleMarkersRef.current.push(markerB);

        // Circular geofence buffer around destination
        googleCircleRef.current = new gmaps.Circle({
          strokeColor: "#64748B",
          strokeOpacity: 0.8,
          strokeWeight: 1.5,
          fillColor: "#94A3B8",
          fillOpacity: 0.2,
          map: googleMapRef.current,
          center: pos,
          radius: 4000,
        });
      }

      // Vehicle Live Marker
      if (vehCoords) {
        const pos = { lat: vehCoords[0], lng: vehCoords[1] };
        bounds.extend(pos);
        pathCoordinates.splice(1, 0, pos); // place vehicle between origin and destination

        const markerVeh = new gmaps.Marker({
          position: pos,
          map: googleMapRef.current,
          title: `${vehicleNumber} - ${currentAddress || "Current Location"}`,
          icon: {
            path: gmaps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#1E293B",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
          },
        });
        googleMarkersRef.current.push(markerVeh);
      }

      // Polyline route
      if (pathCoordinates.length >= 2) {
        googlePolylineRef.current = new gmaps.Polyline({
          path: pathCoordinates,
          geodesic: true,
          strokeColor: "#4F46E5",
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map: googleMapRef.current,
        });
      }

      if (!bounds.isEmpty()) {
        googleMapRef.current.fitBounds(bounds);
      }
    } else if (mapEngine === "leaflet" && leafletMapRef.current && markersGroupRef.current) {
      const L = (window as any).L;
      if (!L) return;

      markersGroupRef.current.clearLayers();
      const boundsPoints: [number, number][] = [];

      // Origin Marker [A]
      if (originCoords) {
        boundsPoints.push(originCoords);
        const iconA = L.divIcon({
          className: "custom-div-icon",
          html: `<div style="background-color: #10B981; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">A</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        L.marker(originCoords, { icon: iconA })
          .bindPopup(`<b>Origin Hub</b><br/>${originAddress || "Loading Origin"}`)
          .addTo(markersGroupRef.current);
      }

      // Destination Marker [B] & Geofence
      if (destCoords) {
        boundsPoints.push(destCoords);
        L.circle(destCoords, {
          radius: 4000,
          color: "#64748B",
          weight: 1.5,
          dashArray: "4, 6",
          fillColor: "#94A3B8",
          fillOpacity: 0.18,
        }).addTo(markersGroupRef.current);

        const iconB = L.divIcon({
          className: "custom-div-icon",
          html: `<div style="background-color: #EF4444; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">B</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        L.marker(destCoords, { icon: iconB })
          .bindPopup(`<b>Destination Hub</b><br/>${destinationAddress || "Unloading Destination"}`)
          .addTo(markersGroupRef.current);
      }

      // Vehicle Live Marker
      if (vehCoords) {
        boundsPoints.push(vehCoords);
        const vehicleIcon = L.divIcon({
          className: "custom-div-icon",
          html: `
            <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(79, 70, 229, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 24px; height: 24px; border-radius: 50%; background: #1E293B; color: white; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.45);">
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
            `<b>${vehicleNumber}</b><br/>${currentAddress || "Cell tower location fix"}<br/>Coords: ${vehCoords[0].toFixed(4)}, ${vehCoords[1].toFixed(4)}`
          )
          .addTo(markersGroupRef.current);
      }

      // Draw Polyline
      if (boundsPoints.length >= 2) {
        L.polyline(boundsPoints, {
          color: "#4F46E5",
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
    }
  }, [
    isMapReady,
    mapEngine,
    originAddress,
    destinationAddress,
    currentLat,
    currentLng,
    currentAddress,
    vehicleNumber,
    resolveCoords,
  ]);

  useEffect(() => {
    if (isMapReady) {
      renderOverlays();
    }
  }, [isMapReady, renderOverlays]);

  // Open in Google Maps Directions
  const openInGoogleMaps = () => {
    const origin = originAddress ? encodeURIComponent(originAddress) : "";
    const destination = destinationAddress ? encodeURIComponent(destinationAddress) : "";
    const waypoint = currentLat && currentLng
      ? `${currentLat},${currentLng}`
      : currentAddress
      ? encodeURIComponent(currentAddress)
      : "";

    let url = "https://www.google.com/maps/dir/?api=1";
    if (origin) url += `&origin=${origin}`;
    if (destination) url += `&destination=${destination}`;
    if (waypoint) url += `&waypoints=${waypoint}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

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
      {/* Top Left: Map / Satellite switcher */}
      <div className="absolute top-3 left-3 z-[400] flex items-center bg-white/95 backdrop-blur-xs rounded-lg border border-slate-200 shadow-xs overflow-hidden text-xs font-semibold text-slate-700">
        <button
          type="button"
          onClick={() => setMapType("roadmap")}
          className={cn(
            "px-3 py-1.5 transition-colors cursor-pointer",
            mapType === "roadmap" ? "bg-indigo-600 text-white font-bold" : "hover:bg-slate-100 text-slate-600"
          )}
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => setMapType("satellite")}
          className={cn(
            "px-3 py-1.5 transition-colors cursor-pointer",
            mapType === "satellite" ? "bg-indigo-600 text-white font-bold" : "hover:bg-slate-100 text-slate-600"
          )}
        >
          Satellite
        </button>
      </div>

      {/* Top Right: Open in Google Maps & Fullscreen */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5">
        <button
          type="button"
          onClick={openInGoogleMaps}
          className="px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-slate-100 text-indigo-600 border border-slate-200 shadow-xs transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5"
          title="Open complete route in Google Maps"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open in Google Maps</span>
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg bg-white/95 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors cursor-pointer"
          title={isFullscreen ? "Exit Fullscreen" : "View Fullscreen Map"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Status Overlay if No Consent */}
      {!isConsentDone && !currentLat && (
        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-xs border border-amber-300 text-amber-900 px-3 py-1.5 rounded-lg shadow-xs text-xs font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Awaiting Driver SIM SMS Consent for Cell Tower Fixes</span>
        </div>
      )}

      {/* Map Container */}
      <div ref={containerRef} className="w-full h-full z-0" />
    </div>
  );
}
