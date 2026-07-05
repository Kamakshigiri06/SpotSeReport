import React, { useEffect, useRef, useState } from "react";
import { Report } from "../types";
import { Navigation, Map as MapIcon, Plus, Minus } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// OpenStreetMap Raster Tile Style Specification for Maplibre GL
const OSM_STYLE: any = {
  version: 8,
  sources: {
    "osm": {
      "type": "raster",
      "tiles": [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
      ],
      "tileSize": 256,
      "attribution": "&copy; OpenStreetMap contributors"
    }
  },
  layers: [
    {
      "id": "osm-tiles",
      "type": "raster",
      "source": "osm",
      "minzoom": 0,
      "maxzoom": 19
    }
  ]
};

const getCategoryDetails = (category: string) => {
  switch (category) {
    case "pothole":
      return { label: "Pothole", color: "text-amber-600 bg-amber-50 border-amber-100" };
    case "garbage":
      return { label: "Garbage Dump", color: "text-emerald-600 bg-emerald-50 border-emerald-100" };
    case "streetlight":
      return { label: "Streetlight Broken", color: "text-blue-600 bg-blue-50 border-blue-100" };
    case "water":
      return { label: "Water Leak", color: "text-cyan-600 bg-cyan-50 border-cyan-100" };
    case "electricity":
      return { label: "Power Grid", color: "text-purple-600 bg-purple-50 border-purple-100" };
    case "sewage":
      return { label: "Sewage / Drainage", color: "text-rose-600 bg-rose-50 border-rose-100" };
    case "encroachment":
      return { label: "Encroachment", color: "text-indigo-600 bg-indigo-50 border-indigo-100" };
    default:
      return { label: "Other Issue", color: "text-slate-600 bg-slate-50 border-slate-100" };
  }
};

const getCategorySvgPath = (category: string) => {
  switch (category) {
    case "pothole":
      return `<path d="m15 5 4 4"/><path d="M21.5 12H16c-.5 0-1-.2-1.4-.6L9.4 6.2c-.4-.4-.9-.6-1.4-.6H2.5L9 11.5l-6.5 6.5h5.5c.5 0 1-.2 1.4-.6l5.2-5.2c.4-.4.9-.6 1.4-.6h5.5Z"/>`;
    case "garbage":
      return `<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>`;
    case "streetlight":
      return `<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5.5 5.5 0 0 0 7.5 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>`;
    case "water":
      return `<path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7Z"/>`;
    case "electricity":
      return `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`;
    case "sewage":
      return `<path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7Z"/>`;
    case "encroachment":
      return `<path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8.24-2a1 1 0 0 1 .68 0l8.24 2A1 1 0 0 1 20 6v7z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>`;
    default:
      return `<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/>`;
  }
};

const getSeverityDetails = (severity: string) => {
  switch (severity) {
    case "critical":
      return { label: "Critical", color: "bg-red-500 text-white" };
    case "high":
      return { label: "High", color: "bg-orange-500 text-white" };
    case "medium":
      return { label: "Medium", color: "bg-amber-500 text-white" };
    default:
      return { label: "Low", color: "bg-slate-500 text-white" };
  }
};

const getStatusDetails = (status: string) => {
  switch (status) {
    case "resolved":
      return { label: "Resolved", dotColor: "bg-emerald-500", bgColor: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    case "assigned":
    case "in_progress":
      return { label: "In Progress", dotColor: "bg-blue-500", bgColor: "bg-blue-50 text-blue-700 border-blue-100" };
    case "validated":
      return { label: "Verified", dotColor: "bg-teal-500", bgColor: "bg-teal-50 text-teal-700 border-teal-100" };
    case "rejected":
      return { label: "Rejected", dotColor: "bg-rose-500", bgColor: "bg-rose-50 text-rose-700 border-rose-100" };
    default:
      return { label: "Pending", dotColor: "bg-amber-500", bgColor: "bg-amber-50 text-amber-700 border-amber-100" };
  }
};

interface IssueMapProps {
  reports: Report[];
  onSelectReport?: (report: Report) => void;
  interactive?: boolean; // For placing a new pin
  onPinChange?: (lat: number, lng: number, address: string) => void;
  selectedCoords?: { lat: number; lng: number };
  defaultCenter?: { lat: number; lng: number };
}

export default function IssueMap({
  reports,
  onSelectReport,
  interactive = false,
  onPinChange,
  selectedCoords,
  defaultCenter = { lat: 12.9562, lng: 77.7011 } // Default to Bengaluru
}: IssueMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const interactiveMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [pinPosition, setPinPosition] = useState(selectedCoords || defaultCenter);

  // Initialize Maplibre Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter = selectedCoords || defaultCenter;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_STYLE,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: interactive ? 15 : 12
    });

    mapRef.current = map;

    // Navigation Controls
    map.addControl(new maplibregl.NavigationControl(), "top-left");

    // Click handler for placing a pin
    map.on("click", async (e) => {
      if (!interactive) return;
      const { lat, lng } = e.lngLat;
      const newCoords = { lat, lng };
      setPinPosition(newCoords);
      await handleCoordsChange(lat, lng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center when selectedCoords updates
  useEffect(() => {
    if (selectedCoords && mapRef.current) {
      setPinPosition(selectedCoords);
      mapRef.current.panTo([selectedCoords.lng, selectedCoords.lat]);
    }
  }, [selectedCoords]);

  // Sync / render report markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Skip existing reports if we are in placement mode
    if (interactive) return;

    reports.forEach((report) => {
      let pinColor = "#F59E0B";
      if (report.status === "resolved") {
        pinColor = "#10B981";
      } else if (report.severity === "critical") {
        pinColor = "#EF4444";
      } else if (report.severity === "high") {
        pinColor = "#F97316";
      } else if (report.status === "assigned" || report.status === "in_progress") {
        pinColor = "#3B82F6";
      }

      // Marker container
      const markerEl = document.createElement("div");
      markerEl.className = "relative cursor-pointer group";
      markerEl.style.width = "32px";
      markerEl.style.height = "32px";

      // Inner pin
      const pinCircle = document.createElement("div");
      pinCircle.className = "flex items-center justify-center w-8 h-8 rounded-full shadow-lg border border-white transform transition-all duration-200 hover:scale-125 hover:rotate-12";
      pinCircle.style.backgroundColor = pinColor;
      pinCircle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          ${getCategorySvgPath(report.category)}
        </svg>
      `;
      markerEl.appendChild(pinCircle);

      // Pulsing effect for critical or high-severity active items
      if ((report.severity === "critical" || report.severity === "high") && report.status !== "resolved") {
        const ring = document.createElement("span");
        ring.className = "absolute top-0 left-0 w-8 h-8 rounded-full border-2 animate-ping opacity-60 pointer-events-none";
        ring.style.borderColor = pinColor;
        markerEl.appendChild(ring);
      }

      // Hover Card Details popover
      const hoverCard = document.createElement("div");
      hoverCard.className = "absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-out z-[9999] w-64 bg-white rounded-xl border border-slate-200/90 shadow-2xl overflow-hidden font-sans";

      let imageHtml = "";
      if (report.photo_urls && report.photo_urls.length > 0) {
        imageHtml = `
          <div class="h-24 w-full bg-slate-100 relative overflow-hidden">
            <img 
              src="${report.photo_urls[0]}" 
              alt="${report.title.replace(/"/g, '&quot;')}" 
              class="w-full h-full object-cover" 
              referrerpolicy="no-referrer" 
            />
            <div class="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        `;
      }

      const cat = getCategoryDetails(report.category);
      const sev = getSeverityDetails(report.severity);
      const stat = getStatusDetails(report.status);

      hoverCard.innerHTML = `
        ${imageHtml}
        <div class="p-3 space-y-2 text-left whitespace-normal">
          <div class="flex items-center justify-between gap-1">
            <span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${cat.color}">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                ${getCategorySvgPath(report.category)}
              </svg>
              ${cat.label}
            </span>
            <span class="inline-flex items-center text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${sev.color}">
              ${sev.label}
            </span>
          </div>

          <h4 class="text-xs font-bold text-slate-800 line-clamp-1 leading-snug">
            ${report.title.replace(/"/g, '&quot;')}
          </h4>

          <div class="flex items-start gap-1 text-[10px] text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400 shrink-0 mt-0.5">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span class="line-clamp-1">${(report.address || "No address provided").replace(/"/g, '&quot;')}</span>
          </div>

          <div class="flex items-center justify-between pt-1.5 border-t border-slate-100">
            <span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${stat.bgColor}">
              <span class="w-1.5 h-1.5 rounded-full ${stat.dotColor}"></span>
              ${stat.label}
            </span>
            <div class="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400">
                <path d="M7 10v12"/>
                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
              </svg>
              <span>${report.upvotes_count || 0}</span>
            </div>
          </div>
        </div>
      `;
      markerEl.appendChild(hoverCard);

      // Trigger selection on click
      pinCircle.addEventListener("click", () => {
        if (onSelectReport) {
          onSelectReport(report);
        }
      });

      const marker = new maplibregl.Marker({ element: markerEl })
        .setLngLat([report.lng, report.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [reports, interactive]);

  // Sync custom draggable pin in interactive placement mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (interactiveMarkerRef.current) {
      interactiveMarkerRef.current.remove();
      interactiveMarkerRef.current = null;
    }

    if (!interactive) return;

    const el = document.createElement("div");
    el.className = "flex items-center justify-center bg-teal-600 text-white rounded-full shadow-lg border border-white animate-bounce cursor-pointer";
    el.style.width = "36px";
    el.style.height = "36px";
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    `;

    const marker = new maplibregl.Marker({
      element: el,
      draggable: true
    })
      .setLngLat([pinPosition.lng, pinPosition.lat])
      .addTo(map);

    interactiveMarkerRef.current = marker;

    marker.on("dragend", async () => {
      const lngLat = marker.getLngLat();
      const newCoords = { lat: lngLat.lat, lng: lngLat.lng };
      setPinPosition(newCoords);
      await handleCoordsChange(lngLat.lat, lngLat.lng);
    });
  }, [interactive, pinPosition]);

  // Handle reverse geocoding via OpenStreetMap Nominatim API
  const handleCoordsChange = async (lat: number, lng: number) => {
    if (!onPinChange) return;

    let address = `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            "User-Agent": "SpotseReport-Applet-Build"
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.display_name) {
          address = data.display_name;
        }
      }
    } catch (err) {
      console.warn("Reverse geocoding service failed:", err);
    }
    onPinChange(lat, lng, address);
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setIsLocating(false);

        const coords = { lat: latitude, lng: longitude };
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            essential: true
          });
        }

        if (interactive) {
          setPinPosition(coords);
          await handleCoordsChange(latitude, longitude);
        }
      },
      (error) => {
        console.error("Geolocation failed:", error);
        setIsLocating(false);
        alert("Failed to detect your location. Please drop a pin manually.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-slate-50 border border-slate-200/80 shadow-inner">
      {/* Map Target Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: "350px" }} />

      {/* Map Control Actions */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        {/* Location Control button */}
        <button
          id="btn-locate-user"
          onClick={handleLocateUser}
          disabled={isLocating}
          title="Find My Location"
          className="flex items-center justify-center w-11 h-11 bg-white hover:bg-slate-50 text-slate-700 hover:text-teal-600 rounded-full shadow-lg border border-slate-200/60 transition duration-200 disabled:opacity-75 cursor-pointer"
        >
          <Navigation className={`w-5 h-5 ${isLocating ? "animate-pulse text-teal-600" : ""}`} />
        </button>

        {/* Zoom In Button */}
        <button
          id="btn-zoom-in"
          onClick={() => mapRef.current?.zoomIn()}
          title="Zoom In"
          className="flex items-center justify-center w-11 h-11 bg-white hover:bg-slate-50 text-slate-700 hover:text-teal-600 rounded-full shadow-lg border border-slate-200/60 transition duration-200 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Zoom Out Button */}
        <button
          id="btn-zoom-out"
          onClick={() => mapRef.current?.zoomOut()}
          title="Zoom Out"
          className="flex items-center justify-center w-11 h-11 bg-white hover:bg-slate-50 text-slate-700 hover:text-teal-600 rounded-full shadow-lg border border-slate-200/60 transition duration-200 cursor-pointer"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>

      {/* Interactive Helper banner */}
      {interactive && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-auto md:w-80 z-[400] bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-xl pointer-events-auto">
          <div className="flex gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-50 text-teal-600 shrink-0">
              <MapIcon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-800 font-sans">Pin Civic Issue Location</h4>
              <p className="text-[10px] text-slate-500 leading-normal mt-0.5 font-sans">
                Drag the marker or click anywhere on the map to pinpoint the exact location of the civic hazard.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
