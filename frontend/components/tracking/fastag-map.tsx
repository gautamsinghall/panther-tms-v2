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
  CheckCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

export interface TollCheckpoint {
  id: number;
  toll_plaza_name: string;
  geocode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  reader_read_time?: string;
  formatted_time: string;
}

export interface TripRouteData {
  id?: number | null;
  trip_number?: string | null;
  vehicle_number?: string | null;
  is_manual?: boolean;
  lr_id?: number | null;
  lr_no?: string | null;
  from_location?: string | null;
  to_location?: string | null;
  waypoints?: string[];
  status?: string;
}

interface FastagMapProps {
  route: TollCheckpoint[];
  trip?: TripRouteData | null;
  focusedToll?: TollCheckpoint | null;
  onMetricsComputed?: (metrics: {
    coveredKm: number;
    remainingKm: number;
    totalKm: number;
    progressPct: number;
  }) => void;
  className?: string;
}

const MARKER_COLORS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
];

// In-memory geocode and road route caches to optimize performance
const geocodeCache: Record<string, [number, number]> = {};
const roadRouteCache: Record<string, [number, number][]> = {};

function getHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

function computePathDistanceKm(coords: [number, number][]): number {
  if (!coords || coords.length < 2) return 0;
  let totalKm = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    totalKm += getHaversineDistanceKm(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
  }
  return totalKm;
}

export function FastagMap({
  route,
  trip,
  focusedToll,
  onMetricsComputed,
  className = "",
}: FastagMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [mapEngine, setMapEngine] = useState<"google" | "leaflet">("leaflet");
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [trafficEnabled, setTrafficEnabled] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState("");
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Callback ref & deduplication to eliminate infinite render loop
  const onMetricsComputedRef = useRef(onMetricsComputed);
  useEffect(() => {
    onMetricsComputedRef.current = onMetricsComputed;
  }, [onMetricsComputed]);
  const lastRenderedKeyRef = useRef<string>("");

  // Map references
  const googleMapRef = useRef<any>(null);
  const googleTrafficLayerRef = useRef<any>(null);
  const googleOverlaysRef = useRef<any[]>([]);
  const googlePolylinesRef = useRef<any[]>([]);

  const leafletMapRef = useRef<any>(null);
  const leafletMarkersRef = useRef<any[]>([]);
  const leafletPolylinesRef = useRef<any[]>([]);

  // Cleanup map instances on component unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch {
          // Ignore unmount error if already cleaned
        }
        leafletMapRef.current = null;
      }
      if (googleMapRef.current) {
        googleOverlaysRef.current.forEach((o) => {
          try { o?.setMap?.(null); } catch {}
        });
        googleOverlaysRef.current = [];
        googlePolylinesRef.current.forEach((p) => {
          try { p?.setMap?.(null); } catch {}
        });
        googlePolylinesRef.current = [];
        googleMapRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Geocoding Service (Google Geocoder -> Nominatim OSM Fallback)
  // ---------------------------------------------------------------------------
  const geocodeLocation = useCallback(async (locationName: string): Promise<[number, number] | null> => {
    if (!locationName || locationName === "--" || locationName === "N/A") return null;
    const cleanName = locationName.replace(/ *\([^)]*\) */g, "").trim();
    if (geocodeCache[cleanName]) return geocodeCache[cleanName];

    // Try Google Maps Geocoder if loaded
    if (typeof window !== "undefined" && (window as any).google?.maps?.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        const res = await new Promise<[number, number] | null>((resolve) => {
          geocoder.geocode({ address: `${cleanName}, India` }, (results: any, status: any) => {
            if (status === "OK" && results?.[0]) {
              const loc = results[0].geometry.location;
              resolve([loc.lat(), loc.lng()]);
            } else {
              resolve(null);
            }
          });
        });
        if (res) {
          geocodeCache[cleanName] = res;
          return res;
        }
      } catch (err) {
        // Fall through to Nominatim
      }
    }

    // Fallback: OpenStreetMap Nominatim
    try {
      const q = encodeURIComponent(`${cleanName}, India`);
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`);
      const data = await resp.json();
      if (data && data.length > 0) {
        const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        geocodeCache[cleanName] = coords;
        return coords;
      }
    } catch (e) {
      // Fallback failed
    }

    return null;
  }, []);

  // ---------------------------------------------------------------------------
  // Road-Following Highway Routing (OSRM Highway Engine)
  // ---------------------------------------------------------------------------
  const getRoadHighwayRoute = useCallback(async (coordsList: [number, number][]): Promise<[number, number][]> => {
    if (!coordsList || coordsList.length < 2) return coordsList;
    const cacheKey = coordsList.map((c) => `${c[0].toFixed(3)},${c[1].toFixed(3)}`).join(";");
    if (roadRouteCache[cacheKey]) return roadRouteCache[cacheKey];

    // Downsample if more than 20 points to respect OSRM url length limits
    let sampledCoords = coordsList;
    if (coordsList.length > 20) {
      sampledCoords = [coordsList[0]];
      const step = Math.ceil((coordsList.length - 2) / 18);
      for (let i = 1; i < coordsList.length - 1; i += step) {
        sampledCoords.push(coordsList[i]);
      }
      sampledCoords.push(coordsList[coordsList.length - 1]);
    }

    try {
      // OSRM requires lng,lat order
      const coordStr = sampledCoords.map((c) => `${c[1]},${c[0]}`).join(";");
      const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data?.routes?.[0]?.geometry?.coordinates) {
        // Convert [lon, lat] -> [lat, lon]
        const roadPath: [number, number][] = data.routes[0].geometry.coordinates.map(
          (pt: [number, number]) => [pt[1], pt[0]]
        );
        roadRouteCache[cacheKey] = roadPath;
        return roadPath;
      }
    } catch (err) {
      console.warn("OSRM routing service unavailable, using direct coordinates:", err);
    }

    return coordsList;
  }, []);

  // ---------------------------------------------------------------------------
  // Initialize Leaflet
  // ---------------------------------------------------------------------------
  const initLeaflet = useCallback(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) {
      console.error("Leaflet script not available.");
      return;
    }

    // Clean up google map if existing
    if (googleMapRef.current) {
      googleOverlaysRef.current.forEach((o) => o?.setMap?.(null));
      googleOverlaysRef.current = [];
      googlePolylinesRef.current.forEach((p) => p?.setMap?.(null));
      googlePolylinesRef.current = [];
      googleMapRef.current = null;
    }

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([22.9074, 79.073], 5);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    leafletMapRef.current = map;
    setMapEngine("leaflet");
    setIsMapReady(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Initialize Google Maps
  // ---------------------------------------------------------------------------
  const initGoogleMaps = useCallback(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;
    const gmaps = (window as any).google?.maps;
    if (!gmaps) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const map = new gmaps.Map(mapContainerRef.current, {
      center: { lat: 22.9074, lng: 79.073 },
      zoom: 5,
      mapTypeId: gmaps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: gmaps.ControlPosition.RIGHT_BOTTOM,
      },
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    googleMapRef.current = map;
    googleTrafficLayerRef.current = new gmaps.TrafficLayer();
    setMapEngine("google");
    setIsMapReady(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Load Map Engines (Try Google Maps first, fallback to Leaflet)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;

    const setupMapEngines = async () => {
      // 1. Ensure Leaflet CSS & JS are loaded into document head (as available fallback)
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
        }
      };

      // 2. Resolve Google Maps key: check localStorage, NEXT_PUBLIC env, or backend /config
      let key =
        localStorage.getItem("fastag_gmap_key") ||
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
        "";

      if (!key) {
        try {
          const cfg = await apiClient<{ google_maps_api_key?: string }>("/api/v1/transport/tracking/fastag/config");
          if (cfg?.google_maps_api_key) {
            key = cfg.google_maps_api_key;
            localStorage.setItem("fastag_gmap_key", key);
          }
        } catch (e) {
          // If backend fetch fails, fall back to Leaflet
        }
      }

      // 3. If Google Maps API Key exists, load Google Maps SDK and activate Google engine
      if (key && key.trim() !== "") {
        if ((window as any).google?.maps) {
          initGoogleMaps();
          return;
        }

        (window as any).gm_authFailure = () => {
          console.warn("Google Maps auth failure. Gracefully falling back to Leaflet.");
          loadLeafletScript();
        };

        (window as any).initGoogleMapsCallback = () => {
          if (isMounted) initGoogleMaps();
        };

        if (!document.getElementById("google-maps-js")) {
          const script = document.createElement("script");
          script.id = "google-maps-js";
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
            key.trim()
          )}&libraries=places,geometry&callback=initGoogleMapsCallback`;
          script.async = true;
          script.onerror = () => {
            console.warn("Failed loading Google Maps script. Falling back to Leaflet.");
            loadLeafletScript();
          };
          document.head.appendChild(script);
        }
      } else {
        // No Google Maps Key configured, use Leaflet immediately
        loadLeafletScript();
      }
    };

    setupMapEngines();

    return () => {
      isMounted = false;
    };
  }, [initGoogleMaps, initLeaflet]);

  // ---------------------------------------------------------------------------
  // Google Maps Custom HTML Overlay Class
  // ---------------------------------------------------------------------------
  const createGoogleHtmlOverlay = useCallback((position: [number, number], htmlContent: string, zIndex = 100) => {
    if (typeof window === "undefined" || !(window as any).google?.maps?.OverlayView) return null;
    const gmaps = (window as any).google.maps;

    class CustomHtmlOverlay extends gmaps.OverlayView {
      private latLng: any;
      private content: string;
      private zIndexVal: number;
      private div: HTMLDivElement | null = null;

      constructor(latLng: any, content: string, z: number) {
        super();
        this.latLng = latLng;
        this.content = content;
        this.zIndexVal = z;
      }

      onAdd() {
        this.div = document.createElement("div");
        this.div.style.position = "absolute";
        this.div.style.zIndex = String(this.zIndexVal);
        this.div.innerHTML = this.content;
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

      onRemove() {
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
          this.div = null;
        }
      }
    }

    const overlay = new CustomHtmlOverlay(new gmaps.LatLng(position[0], position[1]), htmlContent, zIndex);
    overlay.setMap(googleMapRef.current);
    return overlay;
  }, []);

  // ---------------------------------------------------------------------------
  // Render Route and Checkpoints on Map
  // ---------------------------------------------------------------------------
  const renderMapLayers = useCallback(async () => {
    if (!isMapReady) return;
    setIsCalculatingRoute(true);

    const L = typeof window !== "undefined" ? (window as any).L : null;
    const gmaps = typeof window !== "undefined" ? (window as any).google?.maps : null;

    // 1. Clear previous layers
    if (mapEngine === "leaflet" && leafletMapRef.current) {
      leafletMarkersRef.current.forEach((m) => leafletMapRef.current.removeLayer(m));
      leafletMarkersRef.current = [];
      leafletPolylinesRef.current.forEach((p) => leafletMapRef.current.removeLayer(p));
      leafletPolylinesRef.current = [];
    } else if (mapEngine === "google" && googleMapRef.current) {
      googleOverlaysRef.current.forEach((o) => o?.setMap?.(null));
      googleOverlaysRef.current = [];
      googlePolylinesRef.current.forEach((p) => p?.setMap?.(null));
      googlePolylinesRef.current = [];
    }

    const waypointCoords: [number, number][] = [];
    const tollRouteCoordinates: [number, number][] = [];

    // 2. Plot Waypoints (From, Stops, To)
    const waypoints = trip?.waypoints || [];
    if (waypoints.length > 0) {
      for (let i = 0; i < waypoints.length; i++) {
        const locName = waypoints[i];
        const isFrom = i === 0;
        const isTo = i === waypoints.length - 1;
        const label = isFrom ? "FROM" : isTo ? "TO" : `STOP ${i}`;
        const bgColor = isFrom ? "#15803d" : isTo ? "#dc2626" : "#2563eb";

        const coords = await geocodeLocation(locName);
        if (coords) {
          waypointCoords.push(coords);
          const shortName = locName.split("(")[0].trim();

          const pinHtml = `
            <div style="display:inline-flex;align-items:center;padding:4px 8px;border-radius:6px;font-size:10px;font-weight:800;white-space:nowrap;background:${bgColor};color:#ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.3),0 0 0 2px #ffffff;transform:translate(-50%,-100%);margin-top:-6px;cursor:pointer;">
              <span>${label}: ${shortName}</span>
            </div>
          `;

          if (mapEngine === "google" && googleMapRef.current) {
            const overlay = createGoogleHtmlOverlay(coords, pinHtml, 1000 + i);
            if (overlay) googleOverlaysRef.current.push(overlay);
          } else if (mapEngine === "leaflet" && leafletMapRef.current && L) {
            const icon = L.divIcon({
              className: "custom-pin",
              html: pinHtml,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            });
            const marker = L.marker(coords, { icon, zIndexOffset: 1000 })
              .addTo(leafletMapRef.current)
              .bindPopup(`<b>${label}:</b> ${locName}`);
            leafletMarkersRef.current.push(marker);
          }
        }
      }
    }

    // 3. Plot Numbered Toll Checkpoints (1..N)
    if (route && route.length > 0) {
      for (let i = 0; i < route.length; i++) {
        const toll = route[i];
        const isLatest = i === route.length - 1;
        const color = MARKER_COLORS[i % MARKER_COLORS.length];

        let coords: [number, number] | null = null;
        if (toll.latitude && toll.longitude) {
          coords = [Number(toll.latitude), Number(toll.longitude)];
        } else if (toll.geocode && toll.geocode.includes(",")) {
          const parts = toll.geocode.split(",");
          coords = [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())];
        } else if (toll.toll_plaza_name) {
          coords = await geocodeLocation(toll.toll_plaza_name);
        }

        if (coords) {
          tollRouteCoordinates.push(coords);

          const tollHtml = `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);">
              ${
                isLatest
                  ? `<div style="position:absolute;width:34px;height:34px;border-radius:50%;border:2px solid #10b981;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>`
                  : ""
              }
              <div style="width:26px;height:26px;border-radius:50%;background-color:${color};color:#ffffff;font-size:10.5px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.35),0 0 0 2px #ffffff;cursor:pointer;">
                ${i + 1}
              </div>
            </div>
          `;

          if (mapEngine === "google" && googleMapRef.current) {
            const overlay = createGoogleHtmlOverlay(coords, tollHtml, 500 + i);
            if (overlay) googleOverlaysRef.current.push(overlay);
          } else if (mapEngine === "leaflet" && leafletMapRef.current && L) {
            const icon = L.divIcon({
              className: "custom-toll-bubble",
              html: tollHtml,
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            });
            const marker = L.marker(coords, { icon, zIndexOffset: 500 })
              .addTo(leafletMapRef.current)
              .bindPopup(
                `<div style="font-family:inherit;font-size:12px;"><b>Stop #${i + 1}: ${toll.toll_plaza_name}</b><br/><span style="color:#64748b;font-size:11px;">Crossed: ${toll.formatted_time}</span></div>`
              );
            leafletMarkersRef.current.push(marker);
          }
        }
      }
    }

    // 4. Build Traveled & Remaining Highway Waypoints
    const originCoord = waypointCoords.length > 0 ? waypointCoords[0] : null;
    const destCoord = waypointCoords.length > 1 ? waypointCoords[waypointCoords.length - 1] : null;

    const traveledWaypoints: [number, number][] = [];
    const remainingWaypoints: [number, number][] = [];

    if (originCoord) {
      traveledWaypoints.push(originCoord);
    }
    if (tollRouteCoordinates.length > 0) {
      traveledWaypoints.push(...tollRouteCoordinates);
    }

    if (destCoord) {
      if (tollRouteCoordinates.length > 0) {
        remainingWaypoints.push(tollRouteCoordinates[tollRouteCoordinates.length - 1]);
      } else if (originCoord) {
        remainingWaypoints.push(originCoord);
      }
      remainingWaypoints.push(destCoord);
    }

    let traveledRoadPath: [number, number][] = [];
    let remainingRoadPath: [number, number][] = [];

    // 5. Draw Traveled Highway Route (Solid Red/Rose)
    if (traveledWaypoints.length > 1) {
      traveledRoadPath = await getRoadHighwayRoute(traveledWaypoints);

      if (mapEngine === "google" && googleMapRef.current && gmaps) {
        const poly = new gmaps.Polyline({
          path: traveledRoadPath.map((c) => ({ lat: c[0], lng: c[1] })),
          geodesic: true,
          strokeColor: "#ef4444",
          strokeOpacity: 0.95,
          strokeWeight: 5,
          map: googleMapRef.current,
        });
        googlePolylinesRef.current.push(poly);
      } else if (mapEngine === "leaflet" && leafletMapRef.current && L) {
        const poly = L.polyline(traveledRoadPath, {
          color: "#ef4444",
          weight: 5,
          opacity: 0.95,
          lineJoin: "round",
        }).addTo(leafletMapRef.current);
        leafletPolylinesRef.current.push(poly);
      }
    }

    // 6. Draw Remaining Highway Route (Dashed Blue)
    if (remainingWaypoints.length > 1 && destCoord) {
      remainingRoadPath = await getRoadHighwayRoute(remainingWaypoints);

      if (mapEngine === "google" && googleMapRef.current && gmaps) {
        const lineSymbol = { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 };
        const poly = new gmaps.Polyline({
          path: remainingRoadPath.map((c) => ({ lat: c[0], lng: c[1] })),
          geodesic: true,
          strokeColor: "#3b82f6",
          strokeOpacity: 0,
          icons: [{ icon: lineSymbol, offset: "0", repeat: "14px" }],
          map: googleMapRef.current,
        });
        googlePolylinesRef.current.push(poly);
      } else if (mapEngine === "leaflet" && leafletMapRef.current && L) {
        const poly = L.polyline(remainingRoadPath, {
          color: "#3b82f6",
          weight: 4,
          opacity: 0.85,
          dashArray: "8, 8",
          lineJoin: "round",
        }).addTo(leafletMapRef.current);
        leafletPolylinesRef.current.push(poly);
      }
    }

    // 7. Calculate Live Road Distances & Trigger Callback
    const coveredKm = Math.round(computePathDistanceKm(traveledRoadPath));
    let remainingKm = 0;
    if (destCoord && remainingRoadPath.length > 1) {
      remainingKm = Math.round(computePathDistanceKm(remainingRoadPath));
    }
    const totalKm = coveredKm + remainingKm;
    const progressPct = totalKm > 0 ? Math.min(100, Math.round((coveredKm / totalKm) * 100)) : coveredKm > 0 ? 100 : 0;

    if (onMetricsComputedRef.current) {
      onMetricsComputedRef.current({ coveredKm, remainingKm, totalKm, progressPct });
    }

    // 8. Auto-fit Bounds to center the entire route
    const allCoords = [...waypointCoords, ...tollRouteCoordinates];
    if (allCoords.length > 1) {
      if (mapEngine === "google" && googleMapRef.current && gmaps) {
        const bounds = new gmaps.LatLngBounds();
        allCoords.forEach((c) => bounds.extend(new gmaps.LatLng(c[0], c[1])));
        googleMapRef.current.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
      } else if (mapEngine === "leaflet" && leafletMapRef.current && L) {
        leafletMapRef.current.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50] });
      }
    } else if (allCoords.length === 1) {
      if (mapEngine === "google" && googleMapRef.current) {
        googleMapRef.current.setCenter({ lat: allCoords[0][0], lng: allCoords[0][1] });
        googleMapRef.current.setZoom(10);
      } else if (mapEngine === "leaflet" && leafletMapRef.current) {
        leafletMapRef.current.setView(allCoords[0], 10);
      }
    }

    setIsCalculatingRoute(false);
  }, [
    isMapReady,
    mapEngine,
    route,
    trip,
    geocodeLocation,
    getRoadHighwayRoute,
    createGoogleHtmlOverlay,
  ]);

  useEffect(() => {
    if (!isMapReady) return;
    const currentKey = `${mapEngine}_${route?.length || 0}_${route?.map((r) => r.id || r.toll_plaza_name).join(",")}_${trip?.vehicle_number || ""}_${trip?.waypoints?.join(",") || ""}`;
    if (lastRenderedKeyRef.current === currentKey) return;
    lastRenderedKeyRef.current = currentKey;
    renderMapLayers();
  }, [isMapReady, mapEngine, route, trip, renderMapLayers]);

  // ---------------------------------------------------------------------------
  // Smooth Pan & Zoom to Focused Toll
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!focusedToll || !isMapReady) return;

    let coords: [number, number] | null = null;
    if (focusedToll.latitude && focusedToll.longitude) {
      coords = [Number(focusedToll.latitude), Number(focusedToll.longitude)];
    } else if (focusedToll.geocode && focusedToll.geocode.includes(",")) {
      const parts = focusedToll.geocode.split(",");
      coords = [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())];
    } else if (focusedToll.toll_plaza_name && geocodeCache[focusedToll.toll_plaza_name]) {
      coords = geocodeCache[focusedToll.toll_plaza_name];
    }

    if (coords) {
      if (mapEngine === "google" && googleMapRef.current) {
        googleMapRef.current.panTo({ lat: coords[0], lng: coords[1] });
        googleMapRef.current.setZoom(12);
      } else if (mapEngine === "leaflet" && leafletMapRef.current) {
        leafletMapRef.current.setView(coords, 12, { animate: true });
      }
    }
  }, [focusedToll, isMapReady, mapEngine]);

  // ---------------------------------------------------------------------------
  // Map Type and Traffic Toggles
  // ---------------------------------------------------------------------------
  const handleMapTypeChange = (type: "roadmap" | "satellite") => {
    setMapType(type);
    if (mapEngine === "google" && googleMapRef.current && (window as any).google?.maps) {
      const gmaps = (window as any).google.maps;
      googleMapRef.current.setMapTypeId(type === "satellite" ? gmaps.MapTypeId.HYBRID : gmaps.MapTypeId.ROADMAP);
    }
  };

  const handleToggleTraffic = () => {
    const nextVal = !trafficEnabled;
    setTrafficEnabled(nextVal);
    if (mapEngine === "google" && googleTrafficLayerRef.current && googleMapRef.current) {
      if (nextVal) {
        googleTrafficLayerRef.current.setMap(googleMapRef.current);
      } else {
        googleTrafficLayerRef.current.setMap(null);
      }
    }
  };

  const handleSaveApiKey = () => {
    if (customApiKey.trim()) {
      localStorage.setItem("fastag_gmap_key", customApiKey.trim());
      setIsApiKeyModalOpen(false);
      window.location.reload();
    } else {
      localStorage.removeItem("fastag_gmap_key");
      setIsApiKeyModalOpen(false);
      initLeaflet();
    }
  };

  return (
    <div className={`relative w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 flex flex-col ${className}`}>
      {/* Top Floating Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-lg shadow-md border border-slate-200/80 text-xs">
        <button
          type="button"
          onClick={() => {
            if (mapEngine === "google") {
              initLeaflet();
            } else {
              initGoogleMaps();
            }
          }}
          className="px-2 py-1 rounded font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1 border border-slate-200 cursor-pointer"
          title={`Switch to ${mapEngine === "google" ? "Leaflet OpenStreetMap" : "Google Maps"}`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>{mapEngine === "google" ? "Google" : "Leaflet"}</span>
        </button>
        <button
          type="button"
          onClick={() => handleMapTypeChange("roadmap")}
          className={`px-2.5 py-1 rounded font-semibold transition-all ${
            mapType === "roadmap"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Road
        </button>
        <button
          type="button"
          onClick={() => handleMapTypeChange("satellite")}
          className={`px-2.5 py-1 rounded font-semibold transition-all ${
            mapType === "satellite"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          disabled={mapEngine !== "google"}
          title={mapEngine !== "google" ? "Satellite available in Google Maps mode" : ""}
        >
          Satellite
        </button>
        {mapEngine === "google" && (
          <button
            type="button"
            onClick={handleToggleTraffic}
            className={`px-2.5 py-1 rounded font-semibold transition-all ${
              trafficEnabled
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
            }`}
          >
            Traffic
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsApiKeyModalOpen(true)}
          className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors"
          title="Configure Google Maps API Key"
        >
          <Key className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top-Left Engine Indicator Badge */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg shadow-md border border-slate-200/80">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            mapEngine === "google" ? "bg-emerald-500 animate-pulse" : "bg-blue-500"
          }`}
        />
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
          {mapEngine === "google" ? "Google Maps Engine" : "Leaflet Engine"}
        </span>
        {isCalculatingRoute && (
          <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded animate-pulse">
            Calculating Route...
          </span>
        )}
      </div>

      {/* Map Viewport */}
      <div ref={mapContainerRef} className="w-full flex-1 bg-slate-100 z-10 min-h-[350px]" />

      {/* Bottom Floating Legend */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md border border-slate-200/80 text-[10px] font-bold text-slate-700">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-700 inline-block" />
          <span>From</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" />
          <span>To</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-1 bg-red-500 rounded-full inline-block" />
          <span>Traveled Highway</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-blue-500 inline-block" />
          <span>Remaining Route</span>
        </span>
      </div>

      {/* Google Maps API Key Modal */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 text-slate-900">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                Google Maps Setup
              </h3>
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              PantherTMS uses Google Maps JavaScript API for live traffic, satellite imagery, and high-accuracy highway routing. If no key is set or quota is exceeded, Leaflet + OpenStreetMap is used automatically.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Google Maps API Key
              </label>
              <input
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Leave empty to use default Leaflet engine. Key is saved securely in your browser session.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("fastag_gmap_key");
                  setIsApiKeyModalOpen(false);
                  initLeaflet();
                }}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Use Leaflet Default
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
