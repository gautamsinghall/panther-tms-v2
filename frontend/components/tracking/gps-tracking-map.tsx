"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Crosshair,
  Truck,
  Layers,
  ZoomIn,
  ZoomOut,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-context";

export interface GPSVehicleData {
  vehicleNumber: string;
  driverName?: string | null;
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
  vehicles?: GPSVehicleData[];
  trip: GPSTripData | null;
  apiKey?: string;
  onMetricsComputed?: (metrics: { coveredKm: number; remainingKm: number; totalKm: number }) => void;
  onSelectVehicle?: (vehicleNumber: string) => void;
  className?: string;
}

// In-memory geocode and road route caches
const waypointGeocodeCache: Record<string, [number, number]> = {};
const roadRouteCache: Record<string, { coords: [number, number][]; distanceKm: number }> = {};

// Official Google Maps Dark Theme JSON tokens for PantherTMS Obsidian/Graphite theme
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1E2029" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#181A22" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8C90A0" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#D1D5DB" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#9CA3AF" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#162723" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#48BB78" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2B2E3D" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#202330" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9CA3AF" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3B3F54" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#282B3B" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#E2E8F0" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#252836" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#111726" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#60A5FA" }] },
];

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

// Marker HTML for the selected / active vehicle
function buildSelectedTruckMarkerHtml(vehicle: GPSVehicleData): string {
  const isRunning = vehicle.speed > 0;
  const isIdle = vehicle.speed === 0 && Boolean(vehicle.ignition);
  const pinColor = isRunning ? "#20B889" : isIdle ? "#E7AE52" : "#E66D7C";
  const heading = Number(vehicle.heading) || 0;

  return `
    <div class="custom-selected-truck-wrapper" style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;transform:translate(-50%, -100%);">
      <!-- Radar Pulse Rings -->
      <div style="position:absolute;top:32px;left:50%;transform:translate(-50%, -50%);width:70px;height:70px;border-radius:50%;background:rgba(121, 101, 233, 0.25);border:1.5px solid rgba(121, 101, 233, 0.5);animation:truckPulse 2s infinite ease-out;pointer-events:none;"></div>
      <div style="position:absolute;top:32px;left:50%;transform:translate(-50%, -50%);width:46px;height:46px;border-radius:50%;background:rgba(121, 101, 233, 0.35);pointer-events:none;"></div>

      <!-- Top Number & Speed Pill -->
      <div style="background:#171922;color:#ffffff;font-size:11px;font-weight:700;padding:3px 9px;border-radius:8px;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,0.5);border:1.5px solid #7965E9;display:flex;align-items:center;gap:6px;margin-bottom:6px;z-index:10;">
        <span style="letter-spacing:0.5px;font-family:monospace;font-weight:800;">${vehicle.vehicleNumber}</span>
        <span style="color:${pinColor};font-size:10px;font-weight:800;">• ${vehicle.speed || 0} km/h</span>
      </div>

      <!-- Icon Container -->
      <div style="position:relative;width:38px;height:38px;border-radius:50%;background:#7965E9;border:2.5px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(121, 101, 233, 0.6);color:#ffffff;z-index:10;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(${heading}deg);transition:transform 0.4s ease;">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M15 18H9"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14v10"/>
          <circle cx="17" cy="18.5" r="2.5" fill="currentColor"/>
          <circle cx="7" cy="18.5" r="2.5" fill="currentColor"/>
        </svg>
      </div>

      <!-- Ground Pointer Pin -->
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid #7965E9;margin-top:-1px;z-index:10;"></div>
    </div>
  `;
}

// Marker HTML for background / other fleet vehicles
function buildFleetVehicleMarkerHtml(vehicle: GPSVehicleData): string {
  const isRunning = vehicle.speed > 0;
  const isStopped = vehicle.status === "stopped";
  const pinColor = isRunning ? "#20B889" : isStopped ? "#E66D7C" : "#94A3B8";

  return `
    <div class="custom-fleet-marker" style="display:flex;align-items:center;justify-content:center;cursor:pointer;transform:translate(-50%, -50%);">
      <div style="width:26px;height:26px;border-radius:50%;background:#171922;border:2.5px solid ${pinColor};box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <div style="width:10px;height:10px;border-radius:50%;background:${pinColor};"></div>
      </div>
    </div>
  `;
}

export function GPSTrackingMap({
  vehicle,
  vehicles = [],
  trip,
  apiKey = "",
  onMetricsComputed,
  onSelectVehicle,
  className = "",
}: GPSTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();
  const [mapEngine, setMapEngine] = useState<"google" | "leaflet">("leaflet");
  const [isMapReady, setIsMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  const onMetricsComputedRef = useRef(onMetricsComputed);
  useEffect(() => {
    onMetricsComputedRef.current = onMetricsComputed;
  }, [onMetricsComputed]);

  const onSelectVehicleRef = useRef(onSelectVehicle);
  useEffect(() => {
    onSelectVehicleRef.current = onSelectVehicle;
  }, [onSelectVehicle]);

  const lastCenteredVehicleRef = useRef<string | null>(null);
  const lastRoutedCoordsRef = useRef<[number, number] | null>(null);
  const lastRoutedTripKeyRef = useRef<string>("");

  // Map References
  const googleMapRef = useRef<any>(null);
  const googleSelectedMarkerRef = useRef<any>(null);
  const googleFleetMarkersRef = useRef<any[]>([]);
  const googleRouteMarkersRef = useRef<any[]>([]);
  const googleTraveledLineRef = useRef<any>(null);
  const googleRemainingLineRef = useRef<any>(null);

  const leafletMapRef = useRef<any>(null);
  const leafletTileLayerRef = useRef<any>(null);
  const leafletSelectedMarkerRef = useRef<any>(null);
  const leafletFleetMarkersRef = useRef<any[]>([]);
  const leafletRouteMarkersRef = useRef<any[]>([]);
  const leafletTraveledLineRef = useRef<any>(null);
  const leafletRemainingLineRef = useRef<any>(null);

  const vehicleRef = useRef(vehicle);
  useEffect(() => {
    vehicleRef.current = vehicle;
  }, [vehicle]);

  const vehiclesRef = useRef(vehicles);
  useEffect(() => {
    vehiclesRef.current = vehicles;
  }, [vehicles]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        try { leafletMapRef.current.remove(); } catch {}
        leafletMapRef.current = null;
      }
      if (googleSelectedMarkerRef.current) {
        try { googleSelectedMarkerRef.current.setMap(null); } catch {}
        googleSelectedMarkerRef.current = null;
      }
      googleMapRef.current = null;
    };
  }, []);

  // Initialize Leaflet Map
  const initLeaflet = useCallback(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (leafletMapRef.current) {
      return;
    }

    const initialCenter: [number, number] = vehicleRef.current?.latitude && vehicleRef.current?.longitude
      ? [vehicleRef.current.latitude, vehicleRef.current.longitude]
      : [28.6139, 77.2090]; // Delhi NCR default

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(initialCenter, vehicleRef.current?.latitude ? 13 : 11);

    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const subdomains = isDark ? "abcd" : "abc";

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains,
      attribution: isDark ? "&copy; CARTO &copy; OpenStreetMap" : "&copy; OpenStreetMap",
    }).addTo(map);

    leafletTileLayerRef.current = tileLayer;
    leafletMapRef.current = map;
    setMapEngine("leaflet");
    setIsMapReady(true);
  }, [isDark]);

  // Initialize Google Maps
  const initGoogleMaps = useCallback(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;
    const gmaps = (window as any).google?.maps;
    if (!gmaps) return;

    if (googleMapRef.current) {
      return;
    }

    const initialCenter = vehicleRef.current?.latitude && vehicleRef.current?.longitude
      ? { lat: vehicleRef.current.latitude, lng: vehicleRef.current.longitude }
      : { lat: 28.6139, lng: 77.2090 };

    const map = new gmaps.Map(mapContainerRef.current, {
      center: initialCenter,
      zoom: vehicleRef.current?.latitude ? 13 : 11,
      mapTypeId: gmaps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      styles: isDark ? DARK_MAP_STYLE : [],
    });

    googleMapRef.current = map;
    setMapEngine("google");
    setIsMapReady(true);
  }, [isDark]);

  // Dynamically synchronize Google Maps & Leaflet styles when theme changes
  useEffect(() => {
    if (googleMapRef.current) {
      googleMapRef.current.setOptions({
        styles: isDark ? DARK_MAP_STYLE : [],
      });
    }

    if (leafletMapRef.current && (window as any).L) {
      const L = (window as any).L;
      if (leafletTileLayerRef.current) {
        leafletMapRef.current.removeLayer(leafletTileLayerRef.current);
      }
      const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      const subdomains = isDark ? "abcd" : "abc";

      leafletTileLayerRef.current = L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains,
        attribution: isDark ? "&copy; CARTO &copy; OpenStreetMap" : "&copy; OpenStreetMap",
      }).addTo(leafletMapRef.current);
    }
  }, [isDark]);

  // Map Engine Loading
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("gps-tracking-map-style")) {
      const style = document.createElement("style");
      style.id = "gps-tracking-map-style";
      style.innerHTML = `
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
        .custom-selected-truck-wrapper {
          background: transparent !important;
          border: none !important;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1) !important;
        }
        @keyframes truckPulse {
          0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.8; }
          70% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

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

  // Render Fleet Markers (all other vehicles)
  useEffect(() => {
    if (!isMapReady) return;

    const currentVehicles = vehicles || [];
    const selectedNum = vehicle?.vehicleNumber;

    // 1. Leaflet Fleet Markers
    if (mapEngine === "leaflet" && leafletMapRef.current) {
      const lMap = leafletMapRef.current;
      const L = (window as any).L;
      if (!L) return;

      // Clear previous fleet markers
      leafletFleetMarkersRef.current.forEach((m) => {
        try { lMap.removeLayer(m); } catch {}
      });
      leafletFleetMarkersRef.current = [];

      currentVehicles.forEach((v) => {
        if (v.vehicleNumber === selectedNum) return; // Selected vehicle is rendered with prominent radar marker
        const lat = Number(v.latitude);
        const lng = Number(v.longitude);
        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

        const icon = L.divIcon({
          className: "leaflet-div-icon",
          html: buildFleetVehicleMarkerHtml(v),
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const m = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(lMap);
        m.on("click", () => {
          if (onSelectVehicleRef.current) {
            onSelectVehicleRef.current(v.vehicleNumber);
          }
        });

        m.bindTooltip(`<b>${v.vehicleNumber}</b><br/>${v.speed > 0 ? `Moving: ${v.speed} km/h` : 'Stopped'}`, {
          direction: "top",
          offset: [0, -10],
          className: "gps-marker-tooltip",
        });

        leafletFleetMarkersRef.current.push(m);
      });
    }

    // 2. Google Maps Fleet Markers
    if (mapEngine === "google" && googleMapRef.current) {
      const gMap = googleMapRef.current;
      const gmaps = (window as any).google?.maps;
      if (!gmaps) return;

      googleFleetMarkersRef.current.forEach((m) => {
        try { m.setMap(null); } catch {}
      });
      googleFleetMarkersRef.current = [];

      currentVehicles.forEach((v) => {
        if (v.vehicleNumber === selectedNum) return;
        const lat = Number(v.latitude);
        const lng = Number(v.longitude);
        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

        const pinColor = v.speed > 0 ? "#20B889" : v.status === "stopped" ? "#E66D7C" : "#94A3B8";

        const m = new gmaps.Marker({
          position: { lat, lng },
          map: gMap,
          icon: {
            path: gmaps.SymbolPath.CIRCLE,
            fillColor: pinColor,
            fillOpacity: 1,
            strokeColor: "#171922",
            strokeWeight: 2,
            scale: 6,
          },
          title: `${v.vehicleNumber} (${v.speed || 0} km/h)`,
          zIndex: 1000,
        });

        m.addListener("click", () => {
          if (onSelectVehicleRef.current) {
            onSelectVehicleRef.current(v.vehicleNumber);
          }
        });

        googleFleetMarkersRef.current.push(m);
      });
    }
  }, [isMapReady, vehicles, vehicle?.vehicleNumber, mapEngine]);

  // Render Selected Vehicle Marker & Route
  useEffect(() => {
    if (!isMapReady) return;

    if (!vehicle || !vehicle.latitude || !vehicle.longitude) {
      // Clear selected marker if none
      if (leafletSelectedMarkerRef.current && leafletMapRef.current) {
        leafletMapRef.current.removeLayer(leafletSelectedMarkerRef.current);
        leafletSelectedMarkerRef.current = null;
      }
      if (googleSelectedMarkerRef.current) {
        googleSelectedMarkerRef.current.setMap(null);
        googleSelectedMarkerRef.current = null;
      }
      return;
    }

    const lat = Number(vehicle.latitude);
    const lng = Number(vehicle.longitude);
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

    const markerHtml = buildSelectedTruckMarkerHtml(vehicle);

    // 1. LEAFLET ENGINE: Selected Truck Marker
    if (mapEngine === "leaflet" && leafletMapRef.current) {
      const lMap = leafletMapRef.current;
      const L = (window as any).L;
      if (L) {
        const customIcon = L.divIcon({
          className: "leaflet-div-icon",
          html: markerHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        if (leafletSelectedMarkerRef.current) {
          leafletSelectedMarkerRef.current.setLatLng([lat, lng]);
          leafletSelectedMarkerRef.current.setIcon(customIcon);
        } else {
          leafletSelectedMarkerRef.current = L.marker([lat, lng], {
            icon: customIcon,
            zIndexOffset: 3000,
          }).addTo(lMap);
        }

        // Center on vehicle when vehicle registration changes
        if (lastCenteredVehicleRef.current !== vehicle.vehicleNumber) {
          lastCenteredVehicleRef.current = vehicle.vehicleNumber;
          lMap.setView([lat, lng], 14, { animate: true });
        }
      }
    }

    // 2. GOOGLE MAPS ENGINE: Selected Truck Marker
    if (mapEngine === "google" && googleMapRef.current) {
      const gMap = googleMapRef.current;
      const gmaps = (window as any).google?.maps;
      if (gmaps) {
        if (!googleSelectedMarkerRef.current) {
          class TruckOverlay extends gmaps.OverlayView {
            private latLng: any;
            private html: string;
            public div: HTMLDivElement | null = null;

            constructor(latLng: any, html: string) {
              super();
              this.latLng = latLng;
              this.html = html;
            }

            onAdd() {
              this.div = document.createElement("div");
              this.div.style.position = "absolute";
              this.div.style.zIndex = "3000";
              this.div.innerHTML = this.html;
              const panes = this.getPanes();
              panes?.overlayMouseTarget?.appendChild(this.div);
            }

            draw() {
              if (!this.div) return;
              const overlayProjection = this.getProjection();
              if (!overlayProjection) return;
              const pos = overlayProjection.fromLatLngToDivPixel(this.latLng);
              if (pos) {
                this.div.style.left = `${pos.x}px`;
                this.div.style.top = `${pos.y}px`;
              }
            }

            setPosition(newLatLng: any) {
              this.latLng = newLatLng;
              this.draw();
            }

            setHtml(newHtml: string) {
              this.html = newHtml;
              if (this.div) this.div.innerHTML = newHtml;
            }

            onRemove() {
              if (this.div && this.div.parentNode) {
                this.div.parentNode.removeChild(this.div);
                this.div = null;
              }
            }
          }

          const overlay = new TruckOverlay(new gmaps.LatLng(lat, lng), markerHtml);
          overlay.setMap(gMap);
          googleSelectedMarkerRef.current = overlay;
        } else {
          googleSelectedMarkerRef.current.setPosition(new gmaps.LatLng(lat, lng));
          googleSelectedMarkerRef.current.setHtml(markerHtml);
        }

        if (lastCenteredVehicleRef.current !== vehicle.vehicleNumber) {
          lastCenteredVehicleRef.current = vehicle.vehicleNumber;
          gMap.panTo({ lat, lng });
          if (gMap.getZoom() < 12) gMap.setZoom(14);
        }
      }
    }

    // 3. TRIP ROUTE RENDERING
    if (trip && trip.waypoints && trip.waypoints.length > 0) {
      const tripKey = `${vehicle.vehicleNumber}_${trip.waypoints.join(",")}`;
      const lastCoords = lastRoutedCoordsRef.current;
      const movedDistKm = lastCoords ? haversineDistanceKm(lastCoords[0], lastCoords[1], lat, lng) : 999;

      if (lastRoutedTripKeyRef.current !== tripKey || movedDistKm > 0.1) {
        lastRoutedCoordsRef.current = [lat, lng];
        lastRoutedTripKeyRef.current = tripKey;
        setIsCalculatingRoute(true);

        (async () => {
          try {
            const waypointCoords: { name: string; coords: [number, number]; role: string }[] = [];
            for (let i = 0; i < trip.waypoints!.length; i++) {
              const wpName = trip.waypoints![i];
              const coords = await geocodeWaypoint(wpName);
              if (coords) {
                const role = i === 0 ? "Origin" : (i === trip.waypoints!.length - 1 ? "Destination" : `Stop ${i}`);
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

              if (onMetricsComputedRef.current) {
                onMetricsComputedRef.current({ coveredKm: traveledKm, remainingKm, totalKm });
              }

              // Draw on Leaflet
              if (mapEngine === "leaflet" && leafletMapRef.current) {
                const lMap = leafletMapRef.current;
                const L = (window as any).L;
                if (L) {
                  leafletRouteMarkersRef.current.forEach((m) => {
                    try { lMap.removeLayer(m); } catch {}
                  });
                  leafletRouteMarkersRef.current = [];
                  if (leafletTraveledLineRef.current) {
                    try { lMap.removeLayer(leafletTraveledLineRef.current); } catch {}
                    leafletTraveledLineRef.current = null;
                  }
                  if (leafletRemainingLineRef.current) {
                    try { lMap.removeLayer(leafletRemainingLineRef.current); } catch {}
                    leafletRemainingLineRef.current = null;
                  }

                  waypointCoords.forEach((wp) => {
                    const isOrigin = wp.role === "Origin";
                    const bg = isOrigin ? "#20B889" : "#7965E9";
                    const label = isOrigin ? `📍 ${wp.name}` : `🏁 ${wp.name}`;
                    const icon = L.divIcon({
                      className: "leaflet-div-icon",
                      html: `<div style="padding:4px 8px;border-radius:6px;background:${bg};color:#fff;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,0.4);border:1.5px solid #fff;">${label}</div>`,
                      iconAnchor: [0, 0],
                    });
                    const m = L.marker(wp.coords, { icon, zIndexOffset: 900 }).addTo(lMap);
                    leafletRouteMarkersRef.current.push(m);
                  });

                  leafletTraveledLineRef.current = L.polyline(traveledRoute.coords, {
                    color: "#20B889",
                    weight: 4,
                    opacity: 0.85,
                  }).addTo(lMap);

                  leafletRemainingLineRef.current = L.polyline(remainingRoute.coords, {
                    color: "#7965E9",
                    weight: 4,
                    opacity: 0.75,
                    dashArray: "6, 6",
                  }).addTo(lMap);
                }
              }
            }
          } catch (err) {
            console.warn("Failed rendering LR route polylines:", err);
          } finally {
            setIsCalculatingRoute(false);
          }
        })();
      }
    }
  }, [isMapReady, vehicle, trip, mapEngine]);

  // Center on Vehicle action
  const handleCenterOnVehicle = () => {
    if (!vehicle || !vehicle.latitude || !vehicle.longitude) return;
    const lat = Number(vehicle.latitude);
    const lng = Number(vehicle.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    if (mapEngine === "google" && googleMapRef.current) {
      googleMapRef.current.panTo({ lat, lng });
      googleMapRef.current.setZoom(15);
    } else if (mapEngine === "leaflet" && leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lng], 15, { animate: true });
    }
  };

  // Fit All Fleet Vehicles
  const handleFitFleet = () => {
    const activeVehicles = (vehicles && vehicles.length > 0) ? vehicles : (vehicle ? [vehicle] : []);
    const validCoords = activeVehicles
      .filter((v) => v.latitude && v.longitude && Number(v.latitude) !== 0)
      .map((v) => [Number(v.latitude), Number(v.longitude)] as [number, number]);

    if (validCoords.length === 0) return;

    if (mapEngine === "leaflet" && leafletMapRef.current) {
      const L = (window as any).L;
      if (L) {
        const bounds = L.latLngBounds(validCoords);
        leafletMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    } else if (mapEngine === "google" && googleMapRef.current) {
      const gmaps = (window as any).google?.maps;
      if (gmaps) {
        const bounds = new gmaps.LatLngBounds();
        validCoords.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
        googleMapRef.current.fitBounds(bounds);
      }
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (mapEngine === "leaflet" && leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    } else if (mapEngine === "google" && googleMapRef.current) {
      googleMapRef.current.setZoom(googleMapRef.current.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapEngine === "leaflet" && leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    } else if (mapEngine === "google" && googleMapRef.current) {
      googleMapRef.current.setZoom(googleMapRef.current.getZoom() - 1);
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
    <div className={`relative w-full h-full min-h-[450px] bg-slate-100 dark:bg-[#171922] overflow-hidden ${className}`}>
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Floating Map Controls (Top Right - Matching Reference Screenshot) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Layers Button */}
        <button
          type="button"
          onClick={() => {
            // Toggle map layer / engine
            setMapEngine((prev) => (prev === "leaflet" ? "google" : "leaflet"));
          }}
          title="Switch Map Engine"
          className="w-10 h-10 rounded-xl bg-white/95 dark:bg-[#171922]/95 hover:bg-slate-100 dark:hover:bg-[#202330] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#2B303C] shadow-md flex flex-col items-center justify-center gap-0.5 text-[9px] font-semibold transition-all cursor-pointer"
        >
          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Layers</span>
        </button>

        {/* Fit Fleet Button */}
        <button
          type="button"
          onClick={handleFitFleet}
          title="Fit All Vehicles"
          className="w-10 h-10 rounded-xl bg-white/95 dark:bg-[#171922]/95 hover:bg-slate-100 dark:hover:bg-[#202330] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#2B303C] shadow-md flex flex-col items-center justify-center gap-0.5 text-[9px] font-semibold transition-all cursor-pointer"
        >
          <Crosshair className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Fit Fleet</span>
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-10 h-10 rounded-xl bg-white/95 dark:bg-[#171922]/95 hover:bg-slate-100 dark:hover:bg-[#202330] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#2B303C] shadow-md flex items-center justify-center transition-all cursor-pointer text-lg font-bold"
        >
          <ZoomIn className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-10 h-10 rounded-xl bg-white/95 dark:bg-[#171922]/95 hover:bg-slate-100 dark:hover:bg-[#202330] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#2B303C] shadow-md flex items-center justify-center transition-all cursor-pointer text-lg font-bold"
        >
          <ZoomOut className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      {/* Floating Status Pill (Bottom Left - Live Fleet Status) */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="px-3 py-1.5 rounded-lg bg-white/95 dark:bg-[#171922]/95 backdrop-blur-md text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2B303C] shadow-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live fleet tracking active</span>
        </div>
      </div>
    </div>
  );
}
