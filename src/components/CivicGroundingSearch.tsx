import React, { useState } from "react";
import { ALL_CITIES } from "../data/locationData";
import { Search, Globe, MapPin, Sparkles, ExternalLink, ArrowRight, ShieldCheck, Newspaper, Building2 } from "lucide-react";

interface CivicGroundingSearchProps {
  defaultCity?: string;
}

export default function CivicGroundingSearch({ defaultCity = "Bengaluru" }: CivicGroundingSearchProps) {
  const [city, setCity] = useState(defaultCity);
  const [groundingType, setGroundingType] = useState<"search" | "maps">("search");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchPresets = [
    `Latest municipal bylaws & waste segregation rules in ${city}`,
    `Water supply outage advisories & helpline numbers in ${city}`,
    `Road repair SLA guidelines & Ward Commissioner contacts in ${city}`,
    `Recent monsoon safety directives & civic announcements for ${city}`
  ];

  const mapPresets = [
    `Find nearest municipal ward office & helpline counter in ${city}`,
    `Find PWD civil works subdivision depots in ${city}`,
    `Find dry waste collection & recycling hubs in ${city}`,
    `Find traffic police control rooms & emergency response hubs in ${city}`
  ];

  const presets = groundingType === "search" ? searchPresets : mapPresets;

  const handleSearch = async (textOverride?: string) => {
    const textToSubmit = textOverride || query;
    if (!textToSubmit.trim()) return;

    setLoading(true);
    setError(null);
    setResultText(null);
    setSources([]);

    try {
      const endpoint = groundingType === "search" ? "/api/grounding/search" : "/api/grounding/maps";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSubmit,
          city
        })
      });

      if (!res.ok) {
        throw new Error("Failed to retrieve grounded response.");
      }

      const data = await res.json();
      setResultText(data.text);
      setSources(data.sources || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="civic-grounded-radar" className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Live Civic Grounding Radar
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black px-2 py-0.5 rounded uppercase">
                  gemini-3.6-flash
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Search real-time city laws, news, SLAs & verified map locations</p>
            </div>
          </div>
        </div>

        {/* City selector */}
        <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs">
          <Building2 className="w-3.5 h-3.5 text-teal-400" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            {ALL_CITIES.map((c) => (
              <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tool Mode Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => {
            setGroundingType("search");
            setResultText(null);
            setSources([]);
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            groundingType === "search"
              ? "bg-blue-600 text-white shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-blue-300" />
          Google Search Grounding
        </button>
        <button
          onClick={() => {
            setGroundingType("maps");
            setResultText(null);
            setSources([]);
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            groundingType === "maps"
              ? "bg-teal-600 text-white shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-rose-300" />
          Google Maps Grounding
        </button>
      </div>

      {/* Preset Queries */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Suggested {groundingType === "search" ? "Live Search Topics" : "Map Places"} in {city}:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {presets.map((preset, pIdx) => (
            <button
              key={pIdx}
              onClick={() => {
                setQuery(preset);
                handleSearch(preset);
              }}
              disabled={loading}
              className="text-left text-xs bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 rounded-xl p-2.5 transition flex items-center justify-between gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="line-clamp-1 font-medium">{preset}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={groundingType === "search" ? `Ask about live rules, SLAs, helpline numbers or news in ${city}...` : `Find ward offices, PWD depots or recycling hubs in ${city}...`}
          className="w-full text-xs bg-slate-950 border border-slate-800 rounded-2xl pl-4 pr-24 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
        <button
          onClick={() => handleSearch()}
          disabled={loading || !query.trim()}
          className={`absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
            groundingType === "search" ? "bg-blue-600 hover:bg-blue-500" : "bg-teal-600 hover:bg-teal-500"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-2 animate-pulse">
          <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${groundingType === "search" ? "border-blue-400" : "border-teal-400"}`} />
          <p className="text-xs font-bold text-slate-400">
            Grounding with gemini-3.6-flash ({groundingType === "search" ? "googleSearch tool" : "googleMaps tool"})...
          </p>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {/* Result Card */}
      {resultText && (
        <div className="p-5 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-4 animate-in fade-in duration-200">
          <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
            {resultText}
          </div>

          {/* Grounding Citation Badges */}
          {sources.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                Verified Grounded Citations ({groundingType === "search" ? "Google Search" : "Google Maps"}):
              </span>
              <div className="flex flex-wrap gap-2">
                {sources.map((src, idx) => {
                  const item = src.web || src.maps;
                  if (!item) return null;
                  const isMaps = Boolean(src.maps);
                  return (
                    <a
                      key={idx}
                      href={item.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition shadow-xs ${
                        isMaps 
                          ? "bg-teal-950/60 hover:bg-teal-900/60 border-teal-700/50 text-teal-300"
                          : "bg-blue-950/60 hover:bg-blue-900/60 border-blue-700/50 text-blue-300"
                      }`}
                    >
                      {isMaps ? <MapPin className="w-3 h-3 text-rose-400" /> : <Globe className="w-3 h-3 text-blue-400" />}
                      <span className="line-clamp-1 max-w-[220px]">{item.title}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
