import React, { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, Volume2, X, AlertCircle, Sparkles } from "lucide-react";

export default function LiveVoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
  const [errorMessage, setErrorMessage] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlaybackTimeRef = useRef<number>(0);

  // Stop all active audio recording and playback sessions
  const stopSession = () => {
    try {
      if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    } catch (err) {
      console.error("Error stopping audio session:", err);
    }
    setStatus("disconnected");
    nextPlaybackTimeRef.current = 0;
  };

  const startSession = async () => {
    try {
      setStatus("connecting");
      setErrorMessage("");

      // 1. Establish WebSocket Connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        try {
          // 2. Initialize AudioContext at 16000Hz (Gemini Live API preferred rate)
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const audioContext = new AudioCtx({ sampleRate: 16000 });
          audioContextRef.current = audioContext;
          nextPlaybackTimeRef.current = audioContext.currentTime;

          // 3. Request microphone stream
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 16000,
            },
          });
          mediaStreamRef.current = stream;

          // 4. Setup Audio processor to capture and stream user speech
          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(2048, 1, 1);
          scriptProcessorRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;

            const inputData = e.inputBuffer.getChannelData(0);
            
            // Convert Float32 native samples to 16-bit signed Int linear PCM
            const pcmBuffer = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcmBuffer[i] = s < 0 ? s * 32768 : s * 32767;
            }

            // Convert to binary string -> Base64
            const binary = String.fromCharCode.apply(null, new Uint8Array(pcmBuffer.buffer) as any);
            const base64 = btoa(binary);

            ws.send(JSON.stringify({ audio: base64 }));
          };

          source.connect(processor);
          processor.connect(audioContext.destination);

          setStatus("connected");
        } catch (err: any) {
          console.error("Microphone access or audio setup failed:", err);
          setErrorMessage(err.message || "Microphone access denied. Please check permissions.");
          setStatus("error");
          stopSession();
        }
      };

      ws.onmessage = async (event) => {
        try {
          const parsed = JSON.parse(event.data);
          
          if (parsed.error) {
            setErrorMessage(parsed.error);
            setStatus("error");
            stopSession();
            return;
          }

          if (parsed.interrupted) {
            // Cancel pending playbacks if interrupted by new input
            if (audioContextRef.current) {
              nextPlaybackTimeRef.current = audioContextRef.current.currentTime;
            }
            return;
          }

          if (parsed.audio && audioContextRef.current) {
            const rawBinary = atob(parsed.audio);
            const bytes = new Uint8Array(rawBinary.length);
            for (let i = 0; i < rawBinary.length; i++) {
              bytes[i] = rawBinary.charCodeAt(i);
            }

            const int16Samples = new Int16Array(bytes.buffer);
            const float32Samples = new Float32Array(int16Samples.length);
            for (let i = 0; i < int16Samples.length; i++) {
              float32Samples[i] = int16Samples[i] / 32768.0;
            }

            const buffer = audioContextRef.current.createBuffer(1, float32Samples.length, 16000);
            buffer.copyToChannel(float32Samples, 0);

            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);

            const startTime = Math.max(nextPlaybackTimeRef.current, audioContextRef.current.currentTime);
            source.start(startTime);
            nextPlaybackTimeRef.current = startTime + buffer.duration;
          }
        } catch (err) {
          console.error("Failed to decode or play model response stream:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket connection error:", err);
        setErrorMessage("Server connection error.");
        setStatus("error");
        stopSession();
      };

      ws.onclose = () => {
        if (status === "connected") {
          setStatus("disconnected");
        }
      };

    } catch (err: any) {
      console.error("Failed to start Live Voice session:", err);
      setErrorMessage(err.message || "Failed to initialize call.");
      setStatus("error");
      stopSession();
    }
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[180] flex flex-col items-end gap-3 font-sans">
      
      {/* Small floating card control window */}
      {isOpen && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 w-80 space-y-4 animate-in slide-in-from-bottom-5 duration-200">
          
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400 bg-teal-950/40 px-2.5 py-1 rounded-full border border-teal-900/40">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              SpotseReport Voice Help
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-black text-white">Live Voice Assistant</h3>
            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              Have a real-time speech conversation with Gemini to ask questions about municipal SLAs, report guidelines, or community regulations.
            </p>
          </div>

          {/* Connection Status Box */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center min-h-[100px] relative overflow-hidden">
            
            {/* Status indicators */}
            {status === "disconnected" && (
              <div className="text-center space-y-1">
                <PhoneOff className="w-6 h-6 text-slate-500 mx-auto animate-pulse" />
                <p className="text-xs font-bold text-slate-400">Line is Idle</p>
                <p className="text-[10px] text-slate-500">Click start to connect</p>
              </div>
            )}

            {status === "connecting" && (
              <div className="text-center space-y-2">
                <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-teal-400 animate-pulse">Connecting to Gemini...</p>
              </div>
            )}

            {status === "connected" && (
              <div className="text-center space-y-3 w-full">
                <div className="flex justify-center items-end gap-1.5 h-8">
                  <div className="w-1 bg-teal-400 rounded-full animate-wave-bar-1" style={{ height: "40%" }} />
                  <div className="w-1 bg-teal-400 rounded-full animate-wave-bar-2" style={{ height: "100%" }} />
                  <div className="w-1 bg-teal-400 rounded-full animate-wave-bar-3" style={{ height: "70%" }} />
                  <div className="w-1 bg-teal-400 rounded-full animate-wave-bar-4" style={{ height: "90%" }} />
                  <div className="w-1 bg-teal-400 rounded-full animate-wave-bar-1" style={{ height: "50%" }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    Assistant is Listening...
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Start talking now</p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="text-center space-y-1.5 text-rose-400 p-2">
                <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
                <p className="text-xs font-black">Connection Failed</p>
                <p className="text-[10px] leading-snug">{errorMessage || "Unexpected connection drop."}</p>
              </div>
            )}
          </div>

          {/* Main Action Call Trigger Buttons */}
          <div className="pt-2">
            {status === "connected" ? (
              <button
                onClick={stopSession}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                Disconnect Call
              </button>
            ) : (
              <button
                onClick={startSession}
                disabled={status === "connecting"}
                className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                Start Voice Call
              </button>
            )}
          </div>

        </div>
      )}

      {/* Floating launcher trigger button with ambient pulse */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition duration-300 focus:outline-none relative cursor-pointer border ${
          status === "connected"
            ? "bg-emerald-500 border-emerald-400 text-white animate-pulse"
            : isOpen
              ? "bg-slate-900 border-slate-800 text-white scale-110"
              : "bg-teal-600 border-teal-500 text-white hover:bg-teal-500 hover:scale-105"
        }`}
        title="Open Gemini Voice Assistant"
      >
        {status === "connected" ? (
          <Volume2 className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}

        {/* Outer ambient pulse ring */}
        {status === "connected" && (
          <span className="absolute inset-0 rounded-full border-4 border-emerald-500 animate-ping opacity-75 pointer-events-none" />
        )}
      </button>

    </div>
  );
}
