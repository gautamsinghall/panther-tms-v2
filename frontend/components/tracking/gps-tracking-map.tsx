"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Layers,
  Map as MapIcon,
  Navigation,
  Key,
  Maximize2,
  Minimize2,
  RefreshCw,
  Compass,
  AlertTriangle,
  Play,
  Crosshair,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface GPSVehicleData {
  vehicleNumber: string;
  speed: number;
  ignition: boolean;
  status: string;
  isCompany: boolean;
  fleetType: string;
  groupName?: string;
  lastUpdated: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  heading: number;
  todayKm: number;
  inactiveTime: string;
  battery: number;
  signal: number;
  odometer?: any;
  raw?: any;
}

export interface GPSTripData {
  lr_no?: string | null;
  waypoints?: string[];
  origin?: string | null;
  destination?: string | null;
}

interface GPSTrackingMapProps {
  vehicle: GPSVehicleData | null;
  trip: GPSTripData | null;
  apiKey?: string;
  onMetricsComputed?: (metrics: { coveredKm: number; remainingKm: number; totalKm: number }) => void;
  className?: string;
}

// In-memory geocode and road route caches
const waypointGeocodeCache: Record<string, [number, number]> = {};
const roadRouteCache: Record<string, { coords: [number, number][]; distanceKm: number }> = {};

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function decodeOSRMPolyline(encoded: string, precision = 5): [number, number][] {
  const factor = Math.pow(10, precision);
  let index = 0, lat = 0, lng = 0;
  const coordinates: [number, number][] = [];
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
}

async function fetchOSRMRoute(
  fromLatLng: [number, number],
  toLatLng: [number, number]
): Promise<{ coords: [number, number][]; distanceKm: number }> {
  const cacheKey = `${fromLatLng[0].toFixed(3)},${fromLatLng[1].toFixed(3)}_${toLatLng[0].toFixed(3)},${toLatLng[1].toFixed(3)}`;
  if (roadRouteCache[cacheKey]) return roadRouteCache[cacheKey];

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLatLng[1]},${fromLatLng[0]};${toLatLng[1]},${toLatLng[0]}?overview=full&geometries=polyline`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data?.code === "Ok" && data.routes && data.routes[0]) {
        const route = data.routes[0];
        const coords = decodeOSRMPolyline(route.geometry, 5);
        const distanceKm = (route.distance || 0) / 1000;
        const result = { coords, distanceKm };
        roadRouteCache[cacheKey] = result;
        return result;
      }
    }
  } catch (e) {
    // Fallback
  }

  const directDist = haversineDistanceKm(fromLatLng[0], fromLatLng[1], toLatLng[0], toLatLng[1]);
  return {
    coords: [fromLatLng, toLatLng],
    distanceKm: directDist,
  };
}

async function geocodeWaypoint(locationName: string): Promise<[number, number] | null> {
  if (!locationName || locationName === "--" || locationName === "N/A") return null;
  const cleanName = locationName.replace(/ *\([^)]*\) */g, "").trim();
  if (waypointGeocodeCache[cleanName]) return waypointGeocodeCache[cleanName];

  try {
    const query = encodeURIComponent(cleanName + ", India");
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        waypointGeocodeCache[cleanName] = coords;
        return coords;
      }
    }
  } catch (e) {}

  return null;
}

export function GPSTrackingMap({
  vehicle,
  trip,
  apiKey = "",
  onMetricsComputed,
  className = "",
}: GPSTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapEngine, setMapEngine] = useState<"google" | "leaflet">("leaflet");
  const [isMapReady, setIsMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // References
  const googleMapRef = useRef<any>(null);
  const googleMarkerRef = useRef<any>(null);
  const googleRouteMarkersRef = useRef<any[]>([]);
  const googleTraveledLineRef = useRef<any>(null);
  const googleRemainingLineRef = useRef<any>(null);

  const leafletMapRef = useRef<any>(null);
  const leafletMarkerRef = useRef<any>(null);
  const leafletRouteMarkersRef = useRef<any[]>([]);
  const leafletTraveledLineRef = useRef<any>(null);
  const leafletRemainingLineRef = useRef<any>(null);

  // Cleanup map instances on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        try { leafletMapRef.current.remove(); } catch {}
        leafletMapRef.current = null;
      }
      if (googleMapRef.current) {
        googleMapRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Initialize Leaflet
  // ---------------------------------------------------------------------------
  const initLeaflet = useCallback(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const defaultCenter: [number, number] = vehicle?.latitude && vehicle?.longitude
      ? [vehicle.latitude, vehicle.longitude]
      : [22.9074, 79.073];

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(defaultCenter, vehicle?.latitude ? 14 : 5);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    leafletMapRef.current = map;
    setMapEngine("leaflet");
    setIsMapReady(true);
  }, [vehicle]);

  // ---------------------------------------------------------------------------
  // Initialize Google Maps
  // ---------------------------------------------------------------------------
  const initGoogleMaps = useCallback(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;
    const gmaps = (window as any).google?.maps;
    if (!gmaps) return;

    const defaultCenter = vehicle?.latitude && vehicle?.longitude
      ? { lat: vehicle.latitude, lng: vehicle.longitude }
      : { lat: 22.9074, lng: 79.073 };

    const map = new gmaps.Map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: vehicle?.latitude ? 14 : 5,
      mapTypeId: gmaps.MapTypeId.ROADMAP,
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: gmaps.ControlPosition.BOTTOM_LEFT,
      },
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
  }, [vehicle]);

  // ---------------------------------------------------------------------------
  // Map Engine Setup
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const loadLeafletScript = () => {
      if ((window as any).L) {
        initLeaflet();
        return;
      }
      if (!document.getElementById("leaflet-js")) {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = () => initLeaflet();
        document.head.appendChild(script);
      }
    };

    if (apiKey && apiKey.trim() !== "" && apiKey.length > 10) {
      if ((window as any).google?.maps) {
        initGoogleMaps();
      } else if (!document.getElementById("google-maps-js")) {
        const script = document.createElement("script");
        script.id = "google-maps-js";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
        script.async = true;
        script.defer = true;
        script.onload = () => initGoogleMaps();
        script.onerror = () => loadLeafletScript();
        document.head.appendChild(script);
      }
    } else {
      loadLeafletScript();
    }
  }, [apiKey, initGoogleMaps, initLeaflet]);

  // ---------------------------------------------------------------------------
  // Render Live Truck Marker & Road Routes
  // ---------------------------------------------------------------------------
  const renderMapLayers = useCallback(async () => {
    if (!isMapReady) return;
    if (!vehicle || !vehicle.latitude || !vehicle.longitude) return;

    const lat = vehicle.latitude;
    const lng = vehicle.longitude;
    const isRunning = vehicle.speed > 0;
    const pinColor = isRunning ? "#10b981" : "#ef4444";

    // 1. Google Maps Engine
    if (mapEngine === "google" && googleMapRef.current) {
      const gMap = googleMapRef.current;
      const gmaps = (window as any).google?.maps;
      if (!gmaps) return;

      const pos = new gmaps.LatLng(lat, lng);

      // Marker
      if (googleMarkerRef.current) {
        googleMarkerRef.current.setPosition(pos);
        googleMarkerRef.current.setTitle(`${vehicle.vehicleNumber} (${vehicle.speed} km/h)`);
      } else {
        googleMarkerRef.current = new gmaps.Marker({
          position: pos,
          map: gMap,
          title: `${vehicle.vehicleNumber} (${vehicle.speed} km/h)`,
          label: { text: "🚛", fontSize: "20px" },
          icon: {
            path: gmaps.SymbolPath.CIRCLE,
            fillColor: pinColor,
            fillOpacity: 0.95,
            strokeColor: "#ffffff",
            strokeWeight: 3,
            scale: 16,
          },
          zIndex: 2000,
        });
      }
      gMap.panTo(pos);
    }

    // 2. Leaflet Engine
    if (mapEngine === "leaflet" && leafletMapRef.current) {
      const lMap = leafletMapRef.current;
      const L = (window as any).L;
      if (!L) return;

      const markerHtml = `
        <div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background-color:${pinColor};border:3px solid #fff;color:#fff;font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,0.35);">
          🚛
        </div>
      `;
      const customIcon = L.divIcon({
        className: "leaflet-div-icon",
        html: markerHtml,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.setLatLng([lat, lng]);
        leafletMarkerRef.current.setIcon(customIcon);
      } else {
        leafletMarkerRef.current = L.marker([lat, lng], { icon: customIcon, zIndexOffset: 2000 }).addTo(lMap);
      }
      lMap.panTo([lat, lng]);
    }

    // 3. Draw LR Road Routes (Origin -> Truck -> Destination)
    if (trip && trip.waypoints && trip.waypoints.length > 0) {
      setIsCalculatingRoute(true);
      try {
        const waypointCoords: { name: string; coords: [number, number]; role: string }[] = [];
        for (let i = 0; i < trip.waypoints.length; i++) {
          const wpName = trip.waypoints[i];
          const coords = await geocodeWaypoint(wpName);
          if (coords) {
            const role = i === 0 ? "Origin" : (i === trip.waypoints.length - 1 ? "Destination" : `Stop ${i}`);
            waypointCoords.push({ name: wpName, coords, role });
          }
        }

        if (waypointCoords.length > 0) {
          const originCoord = waypointCoords[0].coords;
          const destCoord = waypointCoords[waypointCoords.length - 1].coords;
          const truckCoord: [number, number] = [lat, lng];

          const [traveledRoute, remainingRoute] = await Promise.all([
            fetchOSRMRoute(originCoord, truckCoord),
            fetchOSRMRoute(truckCoord, destCoord),
          ]);

          const traveledKm = traveledRoute.distanceKm;
          const remainingKm = remainingRoute.distanceKm;
          const totalKm = traveledKm + remainingKm;

          if (onMetricsComputed) {
            onMetricsComputed({ coveredKm: traveledKm, remainingKm, totalKm });
          }

          // Draw on Leaflet
          if (mapEngine === "leaflet" && leafletMapRef.current) {
            const lMap = leafletMapRef.current;
            const L = (window as any).L;
            if (L) {
              // Clear previous
              leafletRouteMarkersRef.current.forEach((m) => lMap.removeLayer(m));
              leafletRouteMarkersRef.current = [];
              if (leafletTraveledLineRef.current) { lMap.removeLayer(leafletTraveledLineRef.current); leafletTraveledLineRef.current = null; }
              if (leafletRemainingLineRef.current) { lMap.removeLayer(leafletRemainingLineRef.current); leafletRemainingLineRef.current = null; }

              // Waypoint markers
              waypointCoords.forEach((wp) => {
                const isOrigin = wp.role === "Origin";
                const bg = isOrigin ? "#16a34a" : "#dc2626";
                const label = isOrigin ? `📍 ${wp.name}` : `🏁 ${wp.name}`;
                const icon = L.divIcon({
                  className: "leaflet-div-icon",
                  html: `<div style="padding:4px 8px;border-radius:6px;background:${bg};color:#fff;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #fff;">${label}</div>`,
                  iconAnchor: [0, 0],
                });
                const m = L.marker(wp.coords, { icon, zIndexOffset: 900 }).addTo(lMap);
                leafletRouteMarkersRef.current.push(m);
              });

              // Red solid traveled polyline
              leafletTraveledLineRef.current = L.polyline(traveledRoute.coords, {
                color: "#ef4444",
                weight: 5,
                opacity: 0.85,
              }).addTo(lMap);

              // Blue dashed remaining polyline
              leafletRemainingLineRef.current = L.polyline(remainingRoute.coords, {
                color: "#3b82f6",
                weight: 4,
                opacity: 0.75,
                dashArray: "8, 8",
              }).addTo(lMap);
            }
          }

          // Draw on Google Maps
          if (mapEngine === "google" && googleMapRef.current) {
            const gMap = googleMapRef.current;
            const gmaps = (window as any).google?.maps;
            if (gmaps) {
              googleRouteMarkersRef.current.forEach((m) => m.setMap(null));
              googleRouteMarkersRef.current = [];
              if (googleTraveledLineRef.current) { googleTraveledLineRef.current.setMap(null); googleTraveledLineRef.current = null; }
              if (googleRemainingLineRef.current) { googleRemainingLineRef.current.setMap(null); googleRemainingLineRef.current = null; }

              waypointCoords.forEach((wp) => {
                const isOrigin = wp.role === "Origin";
                const bg = isOrigin ? "#16a34a" : "#dc2626";
                const m = new gmaps.Marker({
                  position: { lat: wp.coords[0], lng: wp.coords[1] },
                  map: gMap,
                  label: { text: isOrigin ? `📍 ${wp.name}` : `🏁 ${wp.name}`, color: "#fff", fontSize: "11px", fontWeight: "700" },
                  icon: {
                    path: gmaps.SymbolPath.CIRCLE,
                    fillColor: bg,
                    fillOpacity: 1,
                    strokeColor: "#fff",
                    strokeWeight: 2,
                    scale: 10,
                  },
                  zIndex: 900,
                });
                googleRouteMarkersRef.current.push(m);
              });

              googleTraveledLineRef.current = new gmaps.Polyline({
                path: traveledRoute.coords.map((c) => ({ lat: c[0], lng: c[1] })),
                strokeColor: "#ef4444",
                strokeOpacity: 0.85,
                strokeWeight: 5,
                map: gMap,
              });

              googleRemainingLineRef.current = new gmaps.Polyline({
                path: remainingRoute.coords.map((c) => ({ lat: c[0], lng: c[1] })),
                strokeColor: "#3b82f6",
                strokeOpacity: 0.75,
                strokeWeight: 4,
                icons: [{
                  icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
                  offset: "0",
                  repeat: "14px",
                }],
                map: gMap,
              });
            }
          }
        }
      } catch (err) {
        console.warn("Failed rendering LR route polylines:", err);
      } finally {
        setIsCalculatingRoute(false);
      }
    }
  }, [isMapReady, vehicle, trip, mapEngine, onMetricsComputed]);

  useEffect(() => {
    renderMapLayers();
  }, [renderMapLayers]);

  // Center on Vehicle action
  const handleCenterOnVehicle = () => {
    if (!vehicle || !vehicle.latitude || !vehicle.longitude) return;
    if (mapEngine === "google" && googleMapRef.current) {
      googleMapRef.current.panTo({ lat: vehicle.latitude, lng: vehicle.longitude });
      googleMapRef.current.setZoom(15);
    } else if (mapEngine === "leaflet" && leafletMapRef.current) {
      leafletMapRef.current.setView([vehicle.latitude, vehicle.longitude], 15);
    }
  };

  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`relative w-full h-full min-h-[450px] bg-slate-100 overflow-hidden ${className}`}>
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Floating Action Controls */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCenterOnVehicle}
          className="bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 text-xs font-semibold gap-1.5 shadow-md border-slate-200 cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5 text-blue-600" />
          <span>Focus on Truck</span>
        </Button>

        {isCalculatingRoute && (
          <div className="px-3 py-1.5 rounded-lg bg-white/95 backdrop-blur-md shadow-md border border-slate-200 text-[11px] font-medium text-slate-600 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />
            <span>Calculating highway routes...</span>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCenterOnVehicle}
          title="Center on Vehicle"
          className="w-9 h-9 p-0 bg-white/95 backdrop-blur-md hover:bg-white text-slate-700 shadow-md border-slate-200 cursor-pointer flex items-center justify-center rounded-xl"
        >
          <Crosshair className="w-4 h-4 text-blue-600" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          title="Toggle Fullscreen"
          className="w-9 h-9 p-0 bg-white/95 backdrop-blur-md hover:bg-white text-slate-700 shadow-md border-slate-200 cursor-pointer flex items-center justify-center rounded-xl"
        >
          <Maximize2 className="w-4 h-4 text-slate-600" />
        </Button>
      </div>

      {/* Engine Badge Overlay */}
      <div className="absolute bottom-4 left-4 z-20">
        <span className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[10px] font-mono font-semibold text-slate-600 shadow-sm border border-slate-200 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Engine: {mapEngine === "google" ? "Google Maps" : "OpenStreetMap (Leaflet)"}</span>
        </span>
      </div>
    </div>
  );
}

