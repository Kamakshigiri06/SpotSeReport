import React, { useState } from "react";
import { Sparkles, MapPin, Bot, Search, ArrowRight, ExternalLink, Mic, MicOff } from "lucide-react";

interface AILocationAssistantProps {
  reportId: string;
  address: string;
  category: string;
  city: string;
}

export default function AILocationAssistant({ reportId, address, category, city }: AILocationAssistantProps) {
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
      rec.lang = "en-IN"; // Dynamic dialect

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

  const presets = category === "garbage" || category === "sewage" 
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
        body: JSON.stringify({ query: textToSubmit })
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
            AI Location & Support Assistant
          </h3>
          <p className="text-[11px] text-slate-400">
            Real-time local civic support powered by Google Maps
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-extrabold text-teal-700 bg-teal-50 border border-teal-100 rounded-full uppercase tracking-wider">
          <Bot className="w-2.5 h-2.5" />
          Grounded Maps
        </span>
      </div>

      {/* Query Presets */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recommended Enquiries</p>
        <div className="flex flex-col gap-1.5">
          {presets.map((preset, idx) => (
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
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Custom Location Enquiry</p>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about nearest administrative, utility or safety hubs..."
            className={`w-full text-xs bg-slate-50 border rounded-xl pl-3.5 pr-20 py-3 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition-all duration-150 ${
              isListening ? "border-rose-300 ring-2 ring-rose-100" : "border-slate-200"
            }`}
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
              className="p-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg disabled:opacity-40 transition cursor-pointer flex items-center justify-center"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading / Response block */}
      {loading && (
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center space-y-2 py-6 animate-pulse">
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-bold text-slate-500">Querying Google Maps & AI Intelligence...</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {response && (
        <div className="p-4 bg-teal-50/20 border border-teal-100/40 rounded-2xl space-y-4">
          <div className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line prose-sm">
            {response}
          </div>

          {/* Sources Badge */}
          {sources.length > 0 && (
            <div className="space-y-1.5 pt-3 border-t border-teal-100/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">Verified Google Maps Places:</span>
              <div className="flex flex-wrap gap-2">
                {sources.map((src, sIdx) => {
                  const item = src.maps || src.web;
                  if (!item) return null;
                  return (
                    <a
                      key={sIdx}
                      href={item.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-teal-50 border border-teal-100/50 rounded-lg text-[10px] font-bold text-teal-800 transition shadow-xs"
                    >
                      <MapPin className="w-3 h-3 text-rose-500" />
                      {item.title}
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
