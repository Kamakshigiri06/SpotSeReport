import React, { useEffect, useState } from "react";
import { Report } from "../types";
import { Navigation, Map as MapIcon } from "lucide-react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

interface IssueMapProps {
  reports: Report[];
  onSelectReport?: (report: Report) => void;
  interactive?: boolean; // For placing a new pin
  onPinChange?: (lat: number, lng: number, address: string) => void;
  selectedCoords?: { lat: number; lng: number };
  defaultCenter?: { lat: number; lng: number };
}

declare const window: any;

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

export default function IssueMap({
  reports,
  onSelectReport,
  interactive = false,
  onPinChange,
  selectedCoords,
  defaultCenter = { lat: 12.9562, lng: 77.7011 } // Default to Bengaluru
}: IssueMapProps) {
  
  if (!hasValidKey) {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-full min-h-[400px] bg-slate-900 text-white rounded-2xl border border-slate-800 text-center font-sans shadow-xl">
        <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400 mb-4 animate-pulse">
          <MapIcon className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-100 font-display">Google Maps API Key Required</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-2 mb-6 leading-relaxed">
          To enable rich satellite and vector maps, please set up your Google Maps Platform API key.
        </p>
        
        <div className="w-full max-w-md bg-slate-950/50 rounded-xl p-4 border border-slate-800/60 text-left text-xs text-slate-300 space-y-3 font-sans">
          <div>
            <span className="font-semibold text-teal-400">Step 1:</span>{" "}
            <a 
              href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-teal-300 transition-colors font-semibold"
            >
              Get a Google Maps API Key
            </a>
          </div>
          <div>
            <span className="font-semibold text-teal-400">Step 2:</span> Open{" "}
            <strong className="text-slate-100 font-semibold">Settings</strong> (⚙️ gear icon in the top-right corner).
          </div>
          <div>
            <span className="font-semibold text-teal-400">Step 3:</span> Select{" "}
            <strong className="text-slate-100 font-semibold">Secrets</strong>, and add a secret named{" "}
            <code className="bg-slate-800 text-teal-300 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold">GOOGLE_MAPS_PLATFORM_KEY</code>.
          </div>
          <div>
            <span className="font-semibold text-teal-400">Step 4:</span> Paste your API key as the secret value and press <strong className="text-slate-100 font-semibold">Enter</strong>.
          </div>
        </div>
        
        <p className="text-[10px] text-slate-500 mt-5 italic">
          The app will automatically rebuild and render your interactive city map once configured.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <MapContainer
        reports={reports}
        onSelectReport={onSelectReport}
        interactive={interactive}
        onPinChange={onPinChange}
        selectedCoords={selectedCoords}
        defaultCenter={defaultCenter}
      />
    </APIProvider>
  );
}

interface MapContainerProps {
  reports: Report[];
  onSelectReport?: (report: Report) => void;
  interactive: boolean;
  onPinChange?: (lat: number, lng: number, address: string) => void;
  selectedCoords?: { lat: number; lng: number };
  defaultCenter: { lat: number; lng: number };
}

function MapContainer({
  reports,
  onSelectReport,
  interactive,
  onPinChange,
  selectedCoords,
  defaultCenter
}: MapContainerProps) {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);
  const [pinPosition, setPinPosition] = useState(selectedCoords || defaultCenter);

  // Update pin position if selectedCoords changes externally
  useEffect(() => {
    if (selectedCoords) {
      setPinPosition(selectedCoords);
      if (map) {
        map.panTo(selectedCoords);
      }
    }
  }, [selectedCoords, map]);

  const handleCoordsChange = async (lat: number, lng: number) => {
    if (!onPinChange) return;

    let address = `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    
    if (window.google?.maps?.Geocoder) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results && response.results[0]) {
          address = response.results[0].formatted_address;
          onPinChange(lat, lng, address);
          return;
        }
      } catch (err) {
        console.warn("Google Geocoding failed, falling back to OSM Nominatim:", err);
      }
    }

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

  const handleMapClick = async (e: any) => {
    if (!interactive) return;
    const latLng = e.detail?.latLng || e.latLng;
    if (!latLng) return;
    const lat = typeof latLng.lat === "function" ? latLng.lat() : latLng.lat;
    const lng = typeof latLng.lng === "function" ? latLng.lng() : latLng.lng;
    if (lat !== undefined && lng !== undefined) {
      const coords = { lat, lng };
      setPinPosition(coords);
      await handleCoordsChange(lat, lng);
    }
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
        if (map) {
          map.panTo(coords);
          map.setZoom(15);
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
      <Map
        defaultCenter={selectedCoords || defaultCenter}
        defaultZoom={interactive ? 15 : 12}
        mapId="DEMO_MAP_ID"
        onClick={handleMapClick}
        internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
        style={{ width: "100%", height: "100%" }}
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        {/* Render markers for existing reports */}
        {!interactive && reports.map((report) => {
          let pinColor = "#F59E0B"; // Warning yellow (pending)
          if (report.status === "resolved") {
            pinColor = "#10B981"; // Status resolved (green)
          } else if (report.severity === "critical") {
            pinColor = "#EF4444"; // Red
          } else if (report.severity === "high") {
            pinColor = "#F97316"; // Orange
          } else if (report.status === "assigned" || report.status === "in_progress") {
            pinColor = "#3B82F6"; // Blue
          }

          return (
            <AdvancedMarker
              key={report.id}
              position={{ lat: report.lat, lng: report.lng }}
              onClick={() => {
                if (onSelectReport) {
                  onSelectReport(report);
                }
              }}
            >
              <div className="relative cursor-pointer group" style={{ width: "32px", height: "32px" }}>
                <div 
                  className="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border border-white transform transition-transform duration-200 hover:scale-125" 
                  style={{ backgroundColor: pinColor }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-shield-alert">
                    <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8.24-2a1 1 0 0 1 .68 0l8.24 2A1 1 0 0 1 20 6v7z"/>
                    <line x1="12" x2="12" y1="9" y2="13"/>
                    <line x1="12" x2="12.01" y1="17" y2="17"/>
                  </svg>
                </div>
                {(report.severity === "critical" || report.severity === "high") && report.status !== "resolved" && (
                  <span 
                    className="absolute top-0 left-0 w-8 h-8 rounded-full border-2 animate-ping opacity-60 pointer-events-none" 
                    style={{ borderColor: pinColor }}
                  />
                )}
              </div>
            </AdvancedMarker>
          );
        })}

        {/* Render interactive draggable marker */}
        {interactive && (
          <AdvancedMarker
            position={pinPosition}
            draggable={true}
            onDragEnd={async (e: google.maps.MapMouseEvent) => {
              const lat = e.latLng?.lat();
              const lng = e.latLng?.lng();
              if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
                const coords = { lat, lng };
                setPinPosition(coords);
                await handleCoordsChange(lat, lng);
              }
            }}
          >
            <div className="flex items-center justify-center bg-teal-600 text-white rounded-full shadow-lg border border-white animate-bounce" style={{ width: "36px", height: "36px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-map-pin">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          </AdvancedMarker>
        )}
      </Map>

      {/* Location Control */}
      <button
        id="btn-locate-user"
        onClick={handleLocateUser}
        disabled={isLocating}
        title="Find My Location"
        className="absolute top-4 right-4 z-[400] flex items-center justify-center w-11 h-11 bg-white hover:bg-slate-50 text-slate-700 hover:text-teal-600 rounded-full shadow-lg border border-slate-200/60 transition duration-200 disabled:opacity-75 cursor-pointer"
      >
        <Navigation className={`w-5 h-5 ${isLocating ? "animate-pulse text-teal-600" : ""}`} />
      </button>

      {/* Interactive Helper Banner */}
      {interactive && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-auto md:w-80 z-[400] bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-xl pointer-events-auto">
          <div className="flex gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-50 text-teal-600 shrink-0">
              <MapIcon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-800">Pin Civic Issue Location</h4>
              <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                Drag the marker or click anywhere on the map to pinpoint the exact location of the civic hazard.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
