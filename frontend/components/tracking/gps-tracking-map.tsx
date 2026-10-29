"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Crosshair,
  Truck,
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

function buildTruckMarkerHtml(vehicle: GPSVehicleData): string {
  const isRunning = vehicle.speed > 0;
  const isIdle = vehicle.speed === 0 && Boolean(vehicle.ignition);
  const pinColor = isRunning ? "#10b981" : isIdle ? "#f59e0b" : "#ef4444";
  const heading = Number(vehicle.heading) || 0;

  return `
    <div class="custom-truck-wrapper" style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;transform:translate(-50%, -100%);">
      <!-- Top Number & Speed Pill -->
      <div style="background:#0f172a;color:#ffffff;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:6px;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:1.5px solid rgba(255,255,255,0.4);display:flex;align-items:center;gap:5px;margin-bottom:4px;">
        <span style="letter-spacing:0.5px;font-family:monospace;">${vehicle.vehicleNumber}</span>
        <span style="color:${pinColor};font-size:9.5px;font-weight:800;">• ${vehicle.speed || 0} km/h</span>
      </div>

      <!-- Icon Container with Pulse -->
      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
        ${isRunning ? `
          <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:${pinColor};opacity:0.4;animation:truckPulse 1.8s infinite ease-out;"></div>
        ` : ''}

        <!-- Main Circular Truck Badge -->
        <div style="width:38px;height:38px;border-radius:50%;background:${pinColor};border:2.5px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.35);color:#ffffff;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(${heading}deg);transition:transform 0.4s ease;">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
            <path d="M15 18H9"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14v10"/>
            <circle cx="17" cy="18.5" r="2.5" fill="currentColor"/>
            <circle cx="7" cy="18.5" r="2.5" fill="currentColor"/>
          </svg>
        </div>

        <!-- Direction Arrow Triangle Pointer if moving -->
        ${isRunning && heading ? `
          <div style="position:absolute;top:-5px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:7px solid #ffffff;transform:rotate(${heading}deg);transform-origin:50% 25px;"></div>
        ` : ''}
      </div>

      <!-- Ground Pointer Pin -->
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${pinColor};margin-top:-1px;"></div>
    </div>
  `;
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

  // Keep latest onMetricsComputed callback ref to avoid effect recreation
  const onMetricsComputedRef = useRef(onMetricsComputed);
  useEffect(() => {
    onMetricsComputedRef.current = onMetricsComputed;
  }, [onMetricsComputed]);

  // Keep track of which vehicle was initial-centered per engine
  const lastCenteredForLeafletRef = useRef<string | null>(null);
  const lastCenteredForGoogleRef = useRef<string | null>(null);
  // Keep track of last routed truck coordinates to prevent unnecessary OSRM re-fetches
  const lastRoutedCoordsRef = useRef<[number, number] | null>(null);
  const lastRoutedTripKeyRef = useRef<string>("");

  // Map References
  const googleMapRef = useRef<any>(null);
  const googleOverlayRef = useRef<any>(null);
  const googleRouteMarkersRef = useRef<any[]>([]);
  const googleTraveledLineRef = useRef<any>(null);
  const googleRemainingLineRef = useRef<any>(null);

  const leafletMapRef = useRef<any>(null);
  const leafletMarkerRef = useRef<any>(null);
  const leafletRouteMarkersRef = useRef<any[]>([]);
  const leafletTraveledLineRef = useRef<any>(null);
  const leafletRemainingLineRef = useRef<any>(null);

  // Keep a reference to current vehicle so map initialization doesn't depend on it
  const vehicleRef = useRef(vehicle);
  useEffect(() => {
    vehicleRef.current = vehicle;
  }, [vehicle]);

  // ---------------------------------------------------------------------------
  // Clean up on component unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        try { leafletMapRef.current.remove(); } catch {}
        leafletMapRef.current = null;
      }
      if (googleOverlayRef.current) {
        try { googleOverlayRef.current.setMap(null); } catch {}
        googleOverlayRef.current = null;
      }
      if (googleMapRef.current) {
        googleMapRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Initialize Leaflet Map (Created once, never destroyed on position ticks)
  // ---------------------------------------------------------------------------
  const initLeaflet = useCallback(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (leafletMapRef.current) {
      return; // Already initialized, keep existing map instance
    }

    const initialCenter: [number, number] = vehicleRef.current?.latitude && vehicleRef.current?.longitude
      ? [vehicleRef.current.latitude, vehicleRef.current.longitude]
      : [22.9074, 79.073];

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(initialCenter, vehicleRef.current?.latitude ? 14 : 5);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    leafletMapRef.current = map;
    setMapEngine("leaflet");
    setIsMapReady(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Initialize Google Maps (Created once, never destroyed on position ticks)
  // ---------------------------------------------------------------------------
  const initGoogleMaps = useCallback(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;
    const gmaps = (window as any).google?.maps;
    if (!gmaps) return;

    if (googleMapRef.current) {
      return; // Already initialized, keep existing map instance
    }

    const initialCenter = vehicleRef.current?.latitude && vehicleRef.current?.longitude
      ? { lat: vehicleRef.current.latitude, lng: vehicleRef.current.longitude }
      : { lat: 22.9074, lng: 79.073 };

    const map = new gmaps.Map(mapContainerRef.current, {
      center: initialCenter,
      zoom: vehicleRef.current?.latitude ? 14 : 5,
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
  }, []);

  // ---------------------------------------------------------------------------
  // Map Engine Loading (Mount once)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Inject styles for transparent divIcons and smooth CSS transforms
    if (!document.getElementById("gps-tracking-map-style")) {
      const style = document.createElement("style");
      style.id = "gps-tracking-map-style";
      style.innerHTML = `
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
        .custom-truck-div-icon {
          background: transparent !important;
          border: none !important;
          transition: transform 0.8s cubic-bezier(0.25, 1, 0.5, 1) !important;
        }
        @keyframes truckPulse {
          0% { transform: scale(0.9); opacity: 0.7; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
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

  // ---------------------------------------------------------------------------
  // Smooth Truck Marker Update & Route Rendering
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isMapReady || !vehicle || !vehicle.latitude || !vehicle.longitude) return;

    const lat = Number(vehicle.latitude);
    const lng = Number(vehicle.longitude);
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

    const markerHtml = buildTruckMarkerHtml(vehicle);

    // -------------------------------------------------------------------------
    // 1. LEAFLET ENGINE: Smooth Position Transition
    // -------------------------------------------------------------------------
    if (mapEngine === "leaflet" && leafletMapRef.current) {
      const lMap = leafletMapRef.current;
      const L = (window as any).L;
      if (L) {
        const customIcon = L.divIcon({
          className: "custom-truck-div-icon",
          html: markerHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        if (leafletMarkerRef.current) {
          // Smoothly glide marker to new coordinates using CSS transform
          leafletMarkerRef.current.setLatLng([lat, lng]);
          leafletMarkerRef.current.setIcon(customIcon);
        } else {
          // Create marker once
          leafletMarkerRef.current = L.marker([lat, lng], {
            icon: customIcon,
            zIndexOffset: 2000,
          }).addTo(lMap);
        }

        // Popup details on click
        leafletMarkerRef.current.bindPopup(`
          <div style="font-family:sans-serif;font-size:12px;min-width:180px;line-height:1.5;">
            <div style="font-weight:700;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px;">
              🚛 ${vehicle.vehicleNumber}
            </div>
            <div><b>Status:</b> ${vehicle.speed > 0 ? "Running" : "Stopped"} (${vehicle.speed || 0} km/h)</div>
            <div><b>Ignition:</b> ${vehicle.ignition ? "ON" : "OFF"}</div>
            ${vehicle.address ? `<div style="color:#64748b;font-size:11px;margin-top:4px;">${vehicle.address}</div>` : ""}
            <div style="color:#94a3b8;font-size:10px;margin-top:4px;">Updated: ${vehicle.lastUpdated}</div>
          </div>
        `);

        // Viewport: Center once when vehicle changes for Leaflet. On subsequent ticks, only pan if out of view!
        if (lastCenteredForLeafletRef.current !== vehicle.vehicleNumber) {
          lastCenteredForLeafletRef.current = vehicle.vehicleNumber;
          lMap.setView([lat, lng], 14, { animate: true });
        } else {
          try {
            const bounds = lMap.getBounds();
            if (bounds && !bounds.contains([lat, lng])) {
              lMap.panTo([lat, lng], { animate: true, duration: 0.8 });
            }
          } catch {}
        }
      }
    }

    // -------------------------------------------------------------------------
    // 2. GOOGLE MAPS ENGINE: Custom HTML Overlay View with Smooth Transition
    // -------------------------------------------------------------------------
    if (mapEngine === "google" && googleMapRef.current) {
      const gMap = googleMapRef.current;
      const gmaps = (window as any).google?.maps;
      if (gmaps) {
        if (!googleOverlayRef.current) {
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
              this.div.style.zIndex = "2000";
              this.div.style.transition = "left 0.8s cubic-bezier(0.25, 1, 0.5, 1), top 0.8s cubic-bezier(0.25, 1, 0.5, 1)";
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
          googleOverlayRef.current = overlay;
        } else {
          // Update existing overlay position and html without recreating
          googleOverlayRef.current.setPosition(new gmaps.LatLng(lat, lng));
          googleOverlayRef.current.setHtml(markerHtml);
        }

        // Viewport: Center once when vehicle changes for Google Maps. On subsequent ticks, only pan if out of view!
        if (lastCenteredForGoogleRef.current !== vehicle.vehicleNumber) {
          lastCenteredForGoogleRef.current = vehicle.vehicleNumber;
          gMap.panTo({ lat, lng });
          if (gMap.getZoom() < 12) gMap.setZoom(14);
        } else {
          try {
            const bounds = gMap.getBounds();
            if (bounds && !bounds.contains({ lat, lng })) {
              gMap.panTo({ lat, lng });
            }
          } catch {}
        }
      }
    }

    // -------------------------------------------------------------------------
    // 3. LR TRIP HIGHWAY ROUTING (Only recomputed when vehicle moved > 100m or trip changes)
    // -------------------------------------------------------------------------
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
                  leafletRouteMarkersRef.current.forEach((m) => lMap.removeLayer(m));
                  leafletRouteMarkersRef.current = [];
                  if (leafletTraveledLineRef.current) { lMap.removeLayer(leafletTraveledLineRef.current); leafletTraveledLineRef.current = null; }
                  if (leafletRemainingLineRef.current) { lMap.removeLayer(leafletRemainingLineRef.current); leafletRemainingLineRef.current = null; }

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

                  leafletTraveledLineRef.current = L.polyline(traveledRoute.coords, {
                    color: "#ef4444",
                    weight: 5,
                    opacity: 0.85,
                  }).addTo(lMap);

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
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-slate-600" /> : <Maximize2 className="w-4 h-4 text-slate-600" />}
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
