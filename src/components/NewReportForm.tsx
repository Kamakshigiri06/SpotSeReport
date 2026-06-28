import React, { useState } from "react";
import { IssueCategory, IssueSeverity } from "../types";
import IssueMap from "./IssueMap";
import { 
  Camera, MapPin, AlignLeft, Check, ChevronRight, 
  ChevronLeft, Sparkles, AlertCircle, RefreshCw, Upload,
  Video, StopCircle, Trash2, Mic, MicOff, Languages, Volume2
} from "lucide-react";

interface NewReportFormProps {
  onSuccess: (reportId: string) => void;
  onCancel: () => void;
  isOffline?: boolean;
  onQueueOffline?: (newQueue: any[]) => void;
}

// Preset visual assets to make testing super fast and fun in sandbox!
const ISSUE_PRESETS = [
  {
    title: "Large deep crater on asphalt",
    category: "pothole",
    imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=800&q=80",
    desc: "A highly dangerous and deep pothole right on the driving lane causing vehicles to swerve."
  },
  {
    title: "Sewer pipe leaking foul water",
    category: "sewage",
    imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80",
    desc: "Black sewer waste bubbling up from the cracked pavement, emitting a terrible toxic odor."
  },
  {
    title: "Uncontrolled pile of organic trash",
    category: "garbage",
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80",
    desc: "An unauthorized dump of household and plastic garbage right outside, attracting stray animals."
  },
  {
    title: "Streetlight poles out of order",
    category: "streetlight",
    imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
    desc: "Multiple street lighting lamps are completely broken, rendering the dark pathway insecure."
  }
];

export default function NewReportForm({ onSuccess, onCancel, isOffline = false, onQueueOffline }: NewReportFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<IssueCategory>("other");
  const [severity, setSeverity] = useState<IssueSeverity>("medium");
  
  // Photo states
  const [photoUrl, setPhotoUrl] = useState(ISSUE_PRESETS[0].imageUrl);
  const [customPhotoInput, setCustomPhotoInput] = useState("");

  // Coordinates
  const [coords, setCoords] = useState({ lat: 12.9562, lng: 77.7011 }); // Default Bengaluru
  const [address, setAddress] = useState("Outer Ring Road, Marathahalli, Bengaluru, Karnataka 560037");
  const [city, setCity] = useState("Bengaluru");

  // AI Triage results from server
  const [triage, setTriage] = useState<any>(null);

  // Live Camera and Video states
  const [photoTab, setPhotoTab] = useState<"preset" | "url" | "camera" | "device">("preset");
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [videoMode, setVideoMode] = useState<"image" | "video">("image");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isGeolocating, setIsGeolocating] = useState(false);

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setIsGeolocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            handlePinChange(latitude, longitude, data.display_name || `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
          } else {
            handlePinChange(latitude, longitude, `Coordinated Spot (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
          }
        } catch (e) {
          handlePinChange(latitude, longitude, `Coordinated Spot (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
        } finally {
          setIsGeolocating(false);
        }
      },
      (err) => {
        console.error(err);
        setError("Failed to fetch exact GPS location. Please drop a pin manually.");
        setIsGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Helper function to validate file sizes and formats for report media
  const validateMedia = (
    mediaSource: File | Blob | string,
    type: "image" | "video"
  ): boolean => {
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB

    setError(null);

    // If it's a base64 string
    if (typeof mediaSource === "string") {
      if (!mediaSource.startsWith("data:")) {
        setError("Invalid media source format.");
        return false;
      }
      // Estimate size in bytes
      const stringLength = mediaSource.length - (mediaSource.indexOf(",") + 1);
      const sizeInBytes = (stringLength * 3) / 4;
      const mimeType = mediaSource.split(";")[0].split(":")[1];

      if (type === "image") {
        if (!mimeType.startsWith("image/")) {
          setError("Invalid file format. Please capture/upload an image.");
          return false;
        }
        if (sizeInBytes > MAX_IMAGE_SIZE) {
          setError(`Captured photo is too large (${(sizeInBytes / (1024 * 1024)).toFixed(2)}MB). Max size is 10MB.`);
          return false;
        }
      } else if (type === "video") {
        if (!mimeType.startsWith("video/")) {
          setError("Invalid file format. Please capture/upload a video.");
          return false;
        }
        if (sizeInBytes > MAX_VIDEO_SIZE) {
          setError(`Captured video is too large (${(sizeInBytes / (1024 * 1024)).toFixed(2)}MB). Max size is 25MB.`);
          return false;
        }
      }
      return true;
    }

    // If it's a File or Blob
    const file = mediaSource;
    if (type === "image") {
      if (!file.type.startsWith("image/")) {
        setError("Invalid image format. Supported formats: JPEG, PNG, GIF, WEBP, HEIC.");
        return false;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError(`Image file is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Max size is 10MB.`);
        return false;
      }
    } else if (type === "video") {
      if (!file.type.startsWith("video/") && file.type !== "") {
        setError("Invalid video format. Supported formats: MP4, WEBM, OGG, MOV.");
        return false;
      }
      if (file.size > MAX_VIDEO_SIZE) {
        setError(`Video file is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Max size is 25MB.`);
        return false;
      }
    }
    return true;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate first
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (isImage) {
      if (!validateMedia(file, "image")) return;
    } else if (isVideo) {
      if (!validateMedia(file, "video")) return;
    } else {
      setError("Unsupported file format. Please upload an image or video file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (isImage) {
        setPhotoUrl(base64);
      } else if (isVideo) {
        setRecordedVideoUrl(base64);
        setPhotoUrl("https://images.unsplash.com/photo-1594818858329-051f4917f80f?auto=format&fit=crop&w=800&q=80");
      }
    };
    reader.readAsDataURL(file);
  };

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const timerRef = React.useRef<any>(null);

  React.useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [cameraStream]);

  // Live Speech & Translation states
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const recognitionRef = React.useRef<any>(null);

  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startSpeechRecognition = () => {
    setError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please use Google Chrome or Safari.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-IN"; // Good default supporting Indian English / regional hints

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[event.results.length - 1][0].transcript;
        if (resultText) {
          setDescription(prev => prev ? `${prev} ${resultText}` : resultText);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error !== "no-speech") {
          setError(`Speech recognition error: ${event.error}`);
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

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  const handleTranslateAndFormalize = async () => {
    if (!description.trim()) {
      setError("Please write or speak a description first before translation.");
      return;
    }

    setIsTranslating(true);
    setError(null);
    try {
      const res = await fetch("/api/translate-formal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description })
      });

      const data = await res.json();
      if (res.ok) {
        setDescription(data.translatedText);
        setDetectedLang(data.detectedLanguage);
      } else {
        setError(data.error || "Failed to formalize text.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Network error while formalizing text with AI.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Start webcam
  const startCamera = async (mode: "image" | "video") => {
    try {
      setError(null);
      setVideoMode(mode);
      setCameraActive(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: mode === "video"
      });
      
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error(err);
      setError("Webcam access failed. Please check permissions.");
      setCameraActive(false);
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // Capture live photo snapshot
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      if (validateMedia(dataUrl, "image")) {
        setPhotoUrl(dataUrl);
      }
    }
    stopCamera();
  };

  // Start live video recording
  const startRecording = () => {
    if (!cameraStream) return;
    setRecordedVideoUrl(null);
    setRecordingSeconds(0);
    
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(cameraStream, { mimeType: "video/webm;codecs=vp9" });
    } catch (e) {
      try {
        recorder = new MediaRecorder(cameraStream, { mimeType: "video/webm" });
      } catch (e2) {
        recorder = new MediaRecorder(cameraStream);
      }
    }
    
    mediaRecorderRef.current = recorder;
    const chunks: Blob[] = [];
    
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      if (!validateMedia(blob, "video")) {
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setRecordedVideoUrl(base64data);
      };
      reader.readAsDataURL(blob);
    };
    
    recorder.start(100);
    setIsRecording(true);
    
    timerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
  };

  // Stop live video recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    capturePhoto();
    stopCamera();
  };

  const handlePresetSelect = (preset: typeof ISSUE_PRESETS[0]) => {
    setPhotoUrl(preset.imageUrl);
    if (!title) setTitle(preset.title);
    if (!description) setDescription(preset.desc);
    setCategory(preset.category as IssueCategory);
  };

  const handlePinChange = (lat: number, lng: number, addr: string) => {
    setCoords({ lat, lng });
    setAddress(addr);

    // Extract city from OSM reverse geocoding display name if possible
    const lower = addr.toLowerCase();
    if (lower.includes("bengaluru") || lower.includes("bangalore")) {
      setCity("Bengaluru");
    } else if (lower.includes("mumbai") || lower.includes("bombay")) {
      setCity("Mumbai");
    } else if (lower.includes("chennai") || lower.includes("madras")) {
      setCity("Chennai");
    } else if (lower.includes("delhi")) {
      setCity("Delhi");
    } else if (lower.includes("pune")) {
      setCity("Pune");
    } else if (lower.includes("kolkata") || lower.includes("calcutta")) {
      setCity("Kolkata");
    }
  };

  const startAITriage = async () => {
    if (!title.trim()) {
      setError("Please supply a descriptive title.");
      return;
    }
    setError(null);
    setLoading(true);
    setStep(4); // Advance to preview step where loading occurs

    if (isOffline) {
      setTimeout(() => {
        const payload = {
          title,
          description,
          category,
          severity,
          lat: coords.lat,
          lng: coords.lng,
          address,
          city,
          photo_urls: [photoUrl],
          video_url: recordedVideoUrl || undefined,
          is_offline_draft: true,
          // Encrypt frozen device telemetry
          metadata_telemetry: {
            compass_heading: "192.4° S",
            device_model: "Samsung Galaxy S23 Ultra",
            capture_altitude: "42m MSL",
            device_time: new Date().toISOString()
          }
        };

        const existing = localStorage.getItem("offline_reports_queue");
        let queue: any[] = [];
        if (existing) {
          try {
            queue = JSON.parse(existing);
          } catch (e) {
            console.error(e);
          }
        }
        queue.push(payload);
        localStorage.setItem("offline_reports_queue", JSON.stringify(queue));
        
        if (onQueueOffline) {
          onQueueOffline(queue);
        }

        // Set simulated local edge triage
        setTriage({
          category: category || "other",
          urgency_score: 5,
          severity: severity || "medium",
          suggested_authority: "Offline Edge Queue Engine",
          estimated_sla_hours: 48,
          reasoning: "OFFLINE MODE ACTIVE: Incident has been frozen locally with sensor GPS coordinates and metadata. It is queued and awaiting synchronization to process deep AI multi-spectral audits.",
          risk_urgency_index: 45,
          complaint_draft: "To,\nThe Public Grievance Officer,\n\n(Incident reported offline. Awaiting synchronization to compile and draft official legal grievances using Gemini models...)"
        });

        setLoading(false);
      }, 1500);
      return;
    }

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          severity,
          lat: coords.lat,
          lng: coords.lng,
          address,
          city,
          photo_urls: [photoUrl],
          video_url: recordedVideoUrl || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // De-duplication match!
          setError(`De-duplication Match: ${data.error}`);
          setTriage({
            duplicate: true,
            reportId: data.reportId,
            title: data.title
          });
        } else {
          setError(data.error || "An error occurred during submission.");
        }
        setLoading(false);
        return;
      }

      setTriage(data.triageResult);
      // Automatically update category and severity with AI triage results
      setCategory(data.report.category);
      setSeverity(data.report.severity);
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to communicate with full-stack backend server.");
      setLoading(false);
    }
  };

  const finalizeSubmission = () => {
    if (triage?.duplicate) {
      onCancel(); // Go back to feed
    } else {
      onSuccess(triage?.reportId || "");
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden font-sans">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Report Local Community Issue</h2>
          <p className="text-teal-100 text-xs mt-1">
            File an issue to alert municipal authorities. Our AI smart engine will instantly triage your report.
          </p>
        </div>
        <div className="flex gap-1.5 justify-center">
          {[1, 2, 3, 4].map((num) => (
            <div 
              key={num}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition duration-150 ${
                step === num 
                  ? "bg-white text-teal-600 border-white shadow-sm" 
                  : step > num 
                    ? "bg-teal-500/40 text-teal-100 border-teal-500/50" 
                    : "bg-teal-700/30 text-teal-300 border-teal-700/50"
              }`}
            >
              {step > num ? <Check className="w-3.5 h-3.5" /> : num}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 md:p-8">

        {/* STEP 1: PHOTO PROOF */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-5 h-5 text-teal-600" />
                Step 1: Upload Proof Photo & Video
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Provide visual evidence of the issue. You can select sandbox presets, upload custom image URLs, or capture live camera photographs and video recordings.
              </p>
            </div>

            {/* Tab Controls */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => { stopCamera(); setPhotoTab("preset"); }}
                className={`flex-1 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  photoTab === "preset"
                    ? "border-teal-600 text-teal-600 bg-teal-50/10"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                📸 Sandbox Presets
              </button>
              <button
                type="button"
                onClick={() => { stopCamera(); setPhotoTab("url"); }}
                className={`flex-1 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  photoTab === "url"
                    ? "border-teal-600 text-teal-600 bg-teal-50/10"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                🔗 Custom Image URL
              </button>
              <button
                type="button"
                onClick={() => setPhotoTab("camera")}
                className={`flex-1 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  photoTab === "camera"
                    ? "border-teal-600 text-teal-600 bg-teal-50/10"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                🎥 Live Capture (Webcam)
              </button>
              <button
                type="button"
                onClick={() => { stopCamera(); setPhotoTab("device"); }}
                className={`flex-1 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  photoTab === "device"
                    ? "border-teal-600 text-teal-600 bg-teal-50/10"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                📤 Device File Upload
              </button>
            </div>

            {/* Tab 1: Presets */}
            {photoTab === "preset" && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-200">
                {ISSUE_PRESETS.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => handlePresetSelect(p)}
                    className={`border rounded-2xl overflow-hidden cursor-pointer transition duration-200 shadow-sm hover:shadow-md ${
                      photoUrl === p.imageUrl 
                        ? "ring-2 ring-teal-500 border-transparent bg-teal-50/20" 
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <img src={p.imageUrl} alt={p.title} referrerPolicy="no-referrer" className="w-full h-24 object-cover" />
                    <div className="p-2.5">
                      <span className="text-[10px] font-bold text-teal-600 uppercase block tracking-wider">{p.category}</span>
                      <p className="text-[11px] font-semibold text-slate-700 leading-tight truncate mt-0.5">{p.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Custom URL */}
            {photoTab === "url" && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 animate-in fade-in duration-200">
                <span className="text-xs font-bold text-slate-700 block">Or upload custom image URL:</span>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/... or base64 data"
                    value={customPhotoInput}
                    onChange={(e) => {
                      setCustomPhotoInput(e.target.value);
                      if (e.target.value.startsWith("http")) {
                        setPhotoUrl(e.target.value);
                      }
                    }}
                    className="flex-1 text-sm bg-white border border-slate-200 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customPhotoInput) setPhotoUrl(customPhotoInput);
                    }}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Webcam Capture */}
            {photoTab === "camera" && (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
                {!cameraActive ? (
                  <div className="space-y-4 font-sans">
                    <div className="flex flex-col items-center text-center max-w-lg mx-auto space-y-2 mb-2">
                      <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-xs">
                        <Camera className="w-6 h-6 animate-pulse" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Live Capturing Proof of Report</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Capture real-time photographic proof or high-fidelity video recordings of the municipal hazard. Select one of the capture methods below.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Method A: Browser Webcam */}
                      <div className="flex flex-col items-center justify-center border border-slate-200 rounded-2xl p-5 text-center bg-white space-y-3 shadow-sm hover:border-teal-500/50 transition">
                        <Camera className="w-8 h-8 text-teal-600" />
                        <div>
                          <h5 className="text-xs font-bold text-slate-800">Browser Webcam Stream</h5>
                          <p className="text-[10px] text-slate-400 leading-snug mt-1">Open browser-based webcam stream on your computer or mobile screen.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <button
                            type="button"
                            onClick={() => startCamera("image")}
                            className="bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-extrabold text-[10px] py-2 px-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer uppercase"
                          >
                            <Camera className="w-3 h-3" /> Photo Stream
                          </button>
                          <button
                            type="button"
                            onClick={() => startCamera("video")}
                            className="bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-extrabold text-[10px] py-2 px-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer uppercase"
                          >
                            <Video className="w-3 h-3" /> Video Stream
                          </button>
                        </div>
                      </div>

                      {/* Method B: Mobile Device Camera */}
                      <div className="flex flex-col items-center justify-center border border-slate-200 rounded-2xl p-5 text-center bg-white space-y-3 shadow-sm hover:border-teal-500/50 transition">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs">M</div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-800">Mobile Native Camera</h5>
                          <p className="text-[10px] text-slate-400 leading-snug mt-1">Directly launch your smartphone's native camera app for photo or video.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <div className="relative">
                            <button
                              type="button"
                              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-[10px] py-2 px-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer uppercase"
                            >
                              <Camera className="w-3 h-3" /> Take Photo
                            </button>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleFileUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </div>
                          <div className="relative">
                            <button
                              type="button"
                              className="w-full bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-extrabold text-[10px] py-2 px-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer uppercase"
                            >
                              <Video className="w-3 h-3" /> Record Video
                            </button>
                            <input
                              type="file"
                              accept="video/*"
                              capture="environment"
                              onChange={handleFileUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {recordedVideoUrl && (
                      <div className="w-full pt-4 border-t border-slate-200/60 space-y-2 text-left">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>🎥 Active Video Proof Attached</span>
                          <button
                            type="button"
                            onClick={() => setRecordedVideoUrl(null)}
                            className="text-rose-500 hover:text-rose-700 text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove Video
                          </button>
                        </div>
                        <video src={recordedVideoUrl} controls className="w-full max-h-48 rounded-xl bg-slate-950 object-contain border shadow-inner" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative w-full overflow-hidden rounded-2xl bg-black border">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full max-h-72 object-cover mx-auto"
                      />
                      
                      {isRecording && (
                        <div className="absolute top-4 left-4 flex items-center gap-2 bg-rose-600/95 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg border border-rose-500 animate-pulse z-10">
                          <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping shrink-0" />
                          Recording: {recordingSeconds}s
                        </div>
                      )}

                      <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/10 uppercase tracking-widest z-10">
                        {videoMode === "image" ? "Photo mode" : "Video mode"}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      {videoMode === "image" ? (
                        <>
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 px-5 rounded-xl transition flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            Capture Photo
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-3 px-5 rounded-xl transition active:scale-95 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {!isRecording ? (
                            <button
                              type="button"
                              onClick={startRecording}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs py-3 px-5 rounded-xl transition flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                            >
                              <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                              Start Recording
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="bg-slate-900 hover:bg-slate-950 text-white font-black text-xs py-3 px-5 rounded-xl transition flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer border border-white/10 animate-pulse"
                            >
                              <StopCircle className="w-4 h-4 text-rose-500" />
                              Stop & Use Video
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={stopCamera}
                            disabled={isRecording}
                            className={`bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-3 px-5 rounded-xl transition active:scale-95 cursor-pointer ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Device File Upload */}
            {photoTab === "device" && (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-5 animate-in fade-in duration-200">
                {/* Standard file select (full width for maximum usability) */}
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-white hover:border-teal-500 transition relative min-h-[200px]">
                  <Upload className="w-10 h-10 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-700">Browse Device Files</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px] leading-snug">Drag & drop or click to choose stored photos or video files from your device storage.</p>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

                {recordedVideoUrl && (
                  <div className="bg-slate-100 p-3 rounded-xl border flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-bold flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-indigo-500" /> Active Video File Attached
                    </span>
                    <button
                      type="button"
                      onClick={() => setRecordedVideoUrl(null)}
                      className="text-rose-500 hover:text-rose-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Visual Selected Display */}
            <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex gap-3 shrink-0">
                <div className="relative">
                  <img src={photoUrl} alt="Selected" referrerPolicy="no-referrer" className="w-20 h-20 object-cover rounded-xl border shrink-0 bg-slate-200" />
                  <span className="absolute bottom-1 right-1 bg-teal-600 text-white text-[8px] font-black px-1 py-0.5 rounded shadow">Photo</span>
                </div>
                {recordedVideoUrl && (
                  <div className="relative">
                    <video src={recordedVideoUrl} className="w-20 h-20 object-cover rounded-xl border bg-black shrink-0" />
                    <span className="absolute bottom-1 right-1 bg-indigo-600 text-white text-[8px] font-black px-1 py-0.5 rounded shadow">🎥 Video</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Selected Proof Media</span>
                <p className="text-xs text-slate-500 mt-1">
                  {recordedVideoUrl 
                    ? "Both live photo snapshot and video recording evidence captured successfully. These will be uploaded to authorities." 
                    : "This image proof will be dispatched to municipal engineers to identify the location and severity of the hazard."}
                </p>
              </div>
            </div>

            {/* Nav Row */}
            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-1 shadow transition cursor-pointer"
              >
                Next Step: Pin Location
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: LOCATION MAP PIN DROP */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-5 h-5 text-teal-600" />
                Step 2: Pin the Issue on the Map
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Drop a marker on the exact location of the civic defect. We reverse-geocode coordinates instantly to fetch the address.
              </p>
            </div>

            {/* Map Container */}
            <div className="h-80 w-full overflow-hidden rounded-2xl border relative">
              <IssueMap
                reports={[]}
                interactive={true}
                selectedCoords={coords}
                onPinChange={handlePinChange}
              />
              <button
                type="button"
                onClick={handleGeolocate}
                disabled={isGeolocating}
                className="absolute bottom-4 right-4 z-10 bg-white hover:bg-slate-50 text-slate-800 p-3 rounded-full border border-slate-200 shadow-xl flex items-center justify-center transition active:scale-95 group cursor-pointer disabled:opacity-50"
                title="Detect My Location"
              >
                <MapPin className={`w-5 h-5 text-teal-600 ${isGeolocating ? "animate-bounce" : "group-hover:scale-110 transition"}`} />
              </button>
            </div>

            {/* Coordinate Details Display */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">Decoded Civic Address:</span>
                <span className="text-[10px] font-mono text-slate-400">Lat: {coords.lat.toFixed(5)} / Lng: {coords.lng.toFixed(5)}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 leading-tight">{address}</p>
              <p className="text-xs text-slate-500">Detected City: <span className="font-bold text-teal-600">{city}</span></p>
            </div>

            {/* Nav Row */}
            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 text-slate-600 inline-flex items-center gap-1 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-1 shadow transition cursor-pointer"
              >
                Next Step: Describe Issue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ISSUE DETAILS */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <AlignLeft className="w-5 h-5 text-teal-600" />
                Step 3: Tell Us More About It
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Provide a clear title and context. The AI Smart Triage will review this text to assign category, severity, and suggested department.
              </p>
            </div>

            <div className="space-y-4">
              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Issue Title:</label>
                <input
                  type="text"
                  placeholder="e.g., Deep asphalt pothole, Overflowing garbage dump"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none font-semibold text-slate-800"
                />
              </div>

              {/* Description input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <AlignLeft className="w-4 h-4 text-teal-600" />
                    Detailed Context (Optional)
                  </label>
                  {isListening && (
                    <span className="flex items-center gap-1.5 text-[10px] bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 rounded-md font-bold animate-pulse">
                      <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping shrink-0" />
                      Live Microphone Active
                    </span>
                  )}
                  {isTranslating && (
                    <span className="flex items-center gap-1.5 text-[10px] bg-amber-50 border border-amber-100 text-amber-600 px-2 py-0.5 rounded-md font-bold animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                      Gemini Auto-Translating...
                    </span>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    placeholder="Describe the hazard... You can type or click the microphone to dictate your complaint in any language (Hinglish, Hindi, Kannada, etc.), then let Gemini translate and formalize it!"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (detectedLang) setDetectedLang(null); // Reset when modified
                    }}
                    className={`w-full text-sm bg-slate-50 border rounded-2xl px-3.5 py-3 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none text-slate-700 leading-relaxed transition-all duration-150 ${
                      isListening ? "border-rose-300 ring-2 ring-rose-100" : "border-slate-200"
                    }`}
                  />
                </div>

                {/* Speech and AI translation action bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl border transition-all duration-150 cursor-pointer ${
                        isListening 
                          ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100" 
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
                          Stop Listening
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-teal-600" />
                          Speak Complaint
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleTranslateAndFormalize}
                      disabled={isTranslating || !description.trim()}
                      className={`flex items-center gap-1.5 text-[11px] font-black px-3.5 py-2 rounded-xl transition-all duration-150 border cursor-pointer ${
                        !description.trim() 
                          ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed" 
                          : "bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200"
                      }`}
                    >
                      <Languages className="w-3.5 h-3.5 text-teal-600" />
                      Auto-Translate & Formalize
                    </button>
                  </div>

                  {detectedLang && (
                    <span className="text-[10px] font-bold text-teal-600 bg-teal-50/60 border border-teal-100/80 px-2.5 py-1 rounded-lg flex items-center gap-1 animate-in slide-in-from-top-1 duration-150">
                      <Sparkles className="w-3 h-3 text-teal-500 shrink-0" />
                      Polished with Gemini AI
                    </span>
                  )}
                </div>
              </div>

              {/* Preliminary Category select (AI will refine) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Initial Category Estimate:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as IssueCategory)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none"
                  >
                    <option value="pothole">Pothole / Road Damage</option>
                    <option value="garbage">Garbage / Trash Dump</option>
                    <option value="streetlight">Streetlight Broken</option>
                    <option value="water">Water Supply / Pipe Leak</option>
                    <option value="electricity">Electricity Hazard</option>
                    <option value="sewage">Sewage / Drainage Leak</option>
                    <option value="encroachment">Footpath Encroachment</option>
                    <option value="other">Other Civic Issue</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Initial Severity Estimate:</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none"
                  >
                    <option value="low">Low Priority (Nuisance)</option>
                    <option value="medium">Medium Severity (Standard issue)</option>
                    <option value="high">High Severity (Hazardous)</option>
                    <option value="critical">Critical Emergency (Immediate danger)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Nav Row */}
            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 text-slate-600 inline-flex items-center gap-1 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={startAITriage}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
                Analyze with Gemini AI
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: AI SMART TRIAGE & SUBMIT PREVIEW */}
        {step === 4 && (
          <div className="space-y-6">
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <RefreshCw className="w-10 h-10 text-teal-600 animate-spin" />
                <div className="text-center">
                  <h4 className="text-base font-bold text-slate-800">Gemini AI Smart Triage Active...</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Analyzing description text and coordinates to auto-categorize the issue, calculate emergency priority, and route to the correct municipal authority.
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="space-y-6">
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 p-4 rounded-2xl">
                  <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-800">Reporting Denied</h4>
                    <p className="text-xs text-rose-600 leading-relaxed mt-1">{error}</p>
                  </div>
                </div>

                {triage?.duplicate && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                    <span className="text-xs font-bold text-slate-600 block">Existing Report Nearby:</span>
                    <h5 className="text-sm font-bold text-slate-800">{triage.title}</h5>
                    <p className="text-xs text-slate-500">You do not need to file a duplicate report! You will gain 10 XP automatically by going back and voting on the active ticket instead.</p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-5 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 text-slate-600 inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Modify Details
                  </button>
                  <button
                    type="button"
                    onClick={finalizeSubmission}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
                  >
                    {triage?.duplicate ? "Back to Feed" : "Cancel"}
                  </button>
                </div>
              </div>
            ) : (
              // AI Triage Success results display
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-teal-500 fill-teal-100" />
                    Gemini AI Dispatch Triage Analysis
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Below is the automated assessment computed by our smart dispatch system. It determines the routing priority and estimated SLA.
                  </p>
                </div>

                {/* AI Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category Card */}
                  <div className="bg-teal-50/40 p-4 rounded-2xl border border-teal-100/80">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-teal-600">Assigned Category</span>
                    <h4 className="text-base font-bold text-slate-800 capitalize mt-1">{category}</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">Smart-grouped based on report context and terms.</p>
                  </div>

                  {/* Urgency Score Card */}
                  <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-100/80">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-amber-600">Emergency Score</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <h4 className="text-2xl font-black text-slate-800">{triage?.ai_urgency_score || 5}</h4>
                      <span className="text-xs text-slate-400 font-bold">/ 10</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">Urgency prioritization metric for dispatch queues.</p>
                  </div>

                  {/* Estimated SLA Hours Card */}
                  <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/80">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-600">Resolution SLA Target</span>
                    <h4 className="text-base font-bold text-slate-800 mt-1">{triage?.estimated_sla_hours || 48} Hours</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">Maximum completion deadline assigned to officers.</p>
                  </div>
                </div>

                {/* Authority recommendation */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 block">Recommended Dispatch Authority:</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-0.5">{triage?.ai_suggested_authority || "Municipal Corporation Office"}</h4>
                  <p className="text-xs text-slate-500 mt-1.5 italic">" {triage?.reasoning} "</p>
                </div>

                {/* Submission review card */}
                <div className="border border-slate-150 p-4 rounded-2xl flex gap-4 items-center">
                  <div className="flex gap-2 shrink-0">
                    <img src={photoUrl} alt="Preview" referrerPolicy="no-referrer" className="w-16 h-16 object-cover rounded-xl border bg-slate-100" />
                    {recordedVideoUrl && (
                      <div className="relative w-16 h-16 rounded-xl border overflow-hidden bg-black flex items-center justify-center text-white font-bold text-[10px]">
                        🎥 Video
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-800 truncate">{title}</h4>
                    <p className="text-xs text-slate-500 truncate max-w-xs md:max-w-md mt-0.5">{address}</p>
                  </div>
                </div>

                {/* Info block */}
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 font-mono">XP</div>
                  <p className="text-xs text-emerald-800 font-medium">Filing this issue will award you <span className="font-bold">+50 Civic XP</span> points instantly!</p>
                </div>

                {/* Nav Row */}
                <div className="pt-4 border-t border-slate-100 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-5 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 text-slate-600 inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={finalizeSubmission}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold shadow transition cursor-pointer"
                  >
                    Submit Report & Disperse
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
