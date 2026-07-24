import React, { useState } from "react";
import { Sparkles, MapPin, Globe, Bot, Search, ArrowRight, ExternalLink, Mic, MicOff } from "lucide-react";

interface AILocationAssistantProps {
  reportId: string;
  address: string;
  category: string;
  city: string;
}

export default function AILocationAssistant({ reportId, address, category, city }: AILocationAssistantProps) {
  const [groundingMode, setGroundingMode] = useState<"maps" | "search">("maps");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please use Google Chrome or Safari.");
      return;
    }

    try {
      setError(null);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-IN";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[event.results.length - 1][0].transcript;
        if (resultText) {
          setQuery(prev => prev ? `${prev} ${resultText}` : resultText);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error !== "no-speech") {
          if (event.error === "not-allowed") {
            setError("Microphone blocked (not-allowed). Please ensure microphone permissions are granted in your browser, or click the 'Open in New Tab' button in the top right of the preview to bypass iframe policy restrictions.");
          } else {
            setError(`Speech recognition error: ${event.error}`);
          }
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.error(err);
      setError("Failed to initialize speech recognition.");
      setIsListening(false);
    }
  };

  const mapPresets = category === "garbage" || category === "sewage" 
    ? [
        `Find dry waste collection centres & recycling hubs near ${address}`,
        `Find the nearest ward sanitation office in ${city}`
      ]
    : category === "pothole" || category === "streetlight" || category === "road"
    ? [
        `Find the nearest Public Works Department (PWD) office near ${address}`,
        `Find nearest administrative ward office in ${city}`
      ]
    : [
        `Find nearest municipal ward office near ${address}`,
        `Find nearest police station & emergency centres near ${address}`
      ];

  const searchPresets = [
    `What are the official municipal SLA resolution timelines for ${category} in ${city}?`,
    `What are the public guidelines & escalation rules for unresolved civic issues in ${city}?`,
    `Find latest municipal announcements & citizen helpline contacts in ${city}`
  ];

  const activePresets = groundingMode === "maps" ? mapPresets : searchPresets;

  const handleQuery = async (customText?: string) => {
    const textToSubmit = customText || query;
    if (!textToSubmit.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setSources([]);

    try {
      const res = await fetch(`/api/reports/${reportId}/ai-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: textToSubmit,
          mode: groundingMode 
        })
      });

      if (!res.ok) {
        throw new Error("Failed to consult AI location intelligence");
      }

      const data = await res.json();
      setResponse(data.text);
      setSources(data.sources || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="ai-location-hub" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            AI Intelligence & Grounding Assistant
          </h3>
          <p className="text-[11px] text-slate-400">
            Powered by gemini-3.6-flash with real-time Google Grounding
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-wider border ${
          groundingMode === "maps"
            ? "text-teal-700 bg-teal-50 border-teal-100"
            : "text-blue-700 bg-blue-50 border-blue-100"
        }`}>
          {groundingMode === "maps" ? <MapPin className="w-2.5 h-2.5 text-teal-600" /> : <Globe className="w-2.5 h-2.5 text-blue-600" />}
          {groundingMode === "maps" ? "Maps Grounded" : "Search Grounded"}
        </span>
      </div>

      {/* Grounding Tool Selector Tabs */}
      <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
        <button
          onClick={() => {
            setGroundingMode("maps");
            setResponse(null);
            setSources([]);
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            groundingMode === "maps"
              ? "bg-white text-teal-800 shadow-xs border border-teal-100"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-rose-500" />
          Google Maps
        </button>
        <button
          onClick={() => {
            setGroundingMode("search");
            setResponse(null);
            setSources([]);
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            groundingMode === "search"
              ? "bg-white text-blue-800 shadow-xs border border-blue-100"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-blue-500" />
          Google Search
        </button>
      </div>

      {/* Query Presets */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Recommended {groundingMode === "maps" ? "Geographic" : "Policy & News"} Enquiries
        </p>
        <div className="flex flex-col gap-1.5">
          {activePresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(preset);
                handleQuery(preset);
              }}
              disabled={loading}
              className="text-left text-xs text-slate-600 hover:text-teal-700 hover:bg-slate-50 border border-slate-100 rounded-xl p-2.5 transition flex items-center justify-between gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="font-medium line-clamp-1">{preset}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Custom Grounded Enquiry</p>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={groundingMode === "maps" ? "Ask about nearest facilities or ward hubs..." : "Search live rules, municipal SLAs or news..."}
            className={`w-full text-xs bg-slate-50 border rounded-xl pl-3.5 pr-20 py-3 focus:ring-2 focus:bg-white focus:outline-none transition-all duration-150 ${
              isListening ? "border-rose-300 ring-2 ring-rose-100" : "border-slate-200"
            } ${groundingMode === "maps" ? "focus:ring-teal-500" : "focus:ring-blue-500"}`}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleQuery();
            }}
          />
          <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
            <button
              onClick={toggleSpeechRecognition}
              className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                isListening
                  ? "bg-rose-50 text-rose-600 border-rose-200"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
              title={isListening ? "Stop listening" : "Speak question"}
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
            <button
              onClick={() => handleQuery()}
              disabled={loading || !query.trim()}
              className={`p-1.5 text-white rounded-lg disabled:opacity-40 transition cursor-pointer flex items-center justify-center ${
                groundingMode === "maps" ? "bg-slate-800 hover:bg-slate-900" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading / Response block */}
      {loading && (
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center space-y-2 py-6 animate-pulse">
          <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${groundingMode === "maps" ? "border-teal-500" : "border-blue-500"}`} />
          <p className="text-[10px] font-bold text-slate-500">
            Querying gemini-3.6-flash with {groundingMode === "maps" ? "Google Maps" : "Google Search"} Grounding...
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {response && (
        <div className={`p-4 rounded-2xl space-y-4 border ${
          groundingMode === "maps" ? "bg-teal-50/20 border-teal-100/40" : "bg-blue-50/20 border-blue-100/40"
        }`}>
          <div className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line prose-sm">
            {response}
          </div>

          {/* Grounding Citation Sources */}
          {sources.length > 0 && (
            <div className={`space-y-1.5 pt-3 border-t ${groundingMode === "maps" ? "border-teal-100/30" : "border-blue-100/30"}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${groundingMode === "maps" ? "text-teal-700" : "text-blue-700"}`}>
                Verified Grounded Citations ({groundingMode === "maps" ? "Google Maps" : "Google Search"}):
              </span>
              <div className="flex flex-wrap gap-2">
                {sources.map((src, sIdx) => {
                  const item = src.maps || src.web;
                  if (!item) return null;
                  const isMaps = Boolean(src.maps);
                  return (
                    <a
                      key={sIdx}
                      href={item.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border rounded-lg text-[10px] font-bold transition shadow-xs ${
                        isMaps 
                          ? "hover:bg-teal-50 border-teal-100 text-teal-800" 
                          : "hover:bg-blue-50 border-blue-100 text-blue-800"
                      }`}
                    >
                      {isMaps ? <MapPin className="w-3 h-3 text-rose-500 shrink-0" /> : <Globe className="w-3 h-3 text-blue-500 shrink-0" />}
                      <span className="line-clamp-1 max-w-[200px]">{item.title}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400 shrink-0" />
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

