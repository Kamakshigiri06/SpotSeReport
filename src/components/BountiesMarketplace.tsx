import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Gift, 
  MapPin, 
  Award, 
  CheckCircle, 
  UploadCloud, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Copy, 
  AlertTriangle,
  RefreshCw,
  X,
  Camera,
  Video
} from "lucide-react";
import { MicroBounty, IssueCategory } from "../types";

interface BountiesMarketplaceProps {
  currentUserId: string;
  onRewardXP: () => void;
}

// Pre-packaged simulated "after" photos for easy, satisfying testing
const SIMULATED_AFTER_PHOTOS: { label: string; url: string; desc: string }[] = [
  {
    label: "Freshly Painted Wall (Graffiti Restored)",
    url: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=800&q=80",
    desc: "A completely clean, repainted cream-colored municipal wall."
  },
  {
    label: "Swept Footpath (Litter Cleared)",
    url: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=800&q=80",
    desc: "Clean cobblestones with trash bags stacked neatly for collection."
  },
  {
    label: "Neat Walkway (Debris Removed)",
    url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80",
    desc: "Freshly cleared path showing restored accessibility."
  }
];

export default function BountiesMarketplace({ currentUserId, onRewardXP }: BountiesMarketplaceProps) {
  const [bounties, setBounties] = useState<MicroBounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBounty, setSelectedBounty] = useState<MicroBounty | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState("");
  const [customPhotoUrl, setCustomPhotoUrl] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    voucherCode?: string;
    aiAnalysis?: string;
    xpAwarded?: number;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [proofTab, setProofTab] = useState<"upload" | "camera">("upload");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Start webcam stream
  const startCamera = async () => {
    setCameraActive(true);
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Webcam access failed. Please check permissions.");
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
  };

  // Capture photo snapshot
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setAfterPhotoUrl(dataUrl);
      setCustomPhotoUrl("");
    }
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Only image files are supported for Bounty proof verification.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAfterPhotoUrl(reader.result as string);
      setCustomPhotoUrl("");
      setErrorMsg("");
    };
    reader.readAsDataURL(file);
  };

  const closeBountyModal = () => {
    stopCamera();
    setSelectedBounty(null);
    setAfterPhotoUrl("");
    setCustomPhotoUrl("");
    setVerificationResult(null);
    setErrorMsg("");
    setProofTab("upload");
  };

  const fetchBounties = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/bounties");
      if (res.ok) {
        const data = await res.json();
        setBounties(data);
      }
    } catch (err) {
      console.error("Error fetching bounties:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBounties();
  }, []);

  const handleClaim = async (bountyId: string) => {
    try {
      const res = await fetch(`/api/bounties/${bountyId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedBounty(data.bounty);
        fetchBounties();
      } else {
        const errData = await res.json();
        alert(errData.error || "Claim failed");
      }
    } catch (err) {
      console.error("Error claiming bounty:", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // Select the first simulated photo for ease
    setAfterPhotoUrl(SIMULATED_AFTER_PHOTOS[0].url);
  };

  const handleVerify = async () => {
    if (!selectedBounty) return;
    const photoToSubmit = afterPhotoUrl || customPhotoUrl;
    if (!photoToSubmit) {
      setErrorMsg("Please select or paste an 'After' proof photo.");
      return;
    }

    setErrorMsg("");
    setIsVerifying(true);

    // Artificial scan delay for high-fidelity computer vision animation
    setTimeout(async () => {
      try {
        const res = await fetch(`/api/bounties/${selectedBounty.id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ after_photo: photoToSubmit })
        });

        if (res.ok) {
          const data = await res.json();
          setVerificationResult({
            success: true,
            voucherCode: data.voucher_code,
            aiAnalysis: data.aiAnalysis,
            xpAwarded: data.xpAwarded
          });
          onRewardXP();
          fetchBounties();
        } else {
          const data = await res.json();
          setVerificationResult({
            success: false,
            aiAnalysis: data.error || "Image matching score too low."
          });
        }
      } catch (err) {
        console.error("Error completing bounty:", err);
        setVerificationResult({
          success: false,
          aiAnalysis: "Unable to contact verification server."
        });
      } finally {
        setIsVerifying(false);
      }
    }, 3200);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getCategoryColor = (cat: IssueCategory) => {
    switch (cat) {
      case "pothole": return "bg-rose-50 text-rose-700 border-rose-200";
      case "garbage": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "streetlight": return "bg-amber-50 text-amber-700 border-amber-200";
      case "water": return "bg-blue-50 text-blue-700 border-blue-200";
      case "encroachment": return "bg-purple-50 text-purple-700 border-purple-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div id="bounties-marketplace-hub" className="space-y-6">
      
      {/* Dynamic Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl -z-10" />
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-[10px] font-bold uppercase tracking-wider">
            <Gift className="w-3 h-3" /> Sponsored Resolution Hub
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            Fix-It Micro-Bounties Marketplace
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed font-normal">
            Local restaurants and eco-conscious businesses sponsor micro-tasks to keep their immediate surroundings safe and pristine. Claim a task, clear the issue in-situ, upload your "After" photo, and trigger our computer-vision verification scan to unlock real-world reward coupons!
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-xs text-slate-400 font-bold">Fetching verified micro-bounties...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Bounties List Column */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider px-1">Active Neighborhood Tasks</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bounties.map((b) => {
                const isClaimedByMe = b.status === "claimed" && b.claimed_by_id === currentUserId;
                const isCompleted = b.status === "completed";
                
                return (
                  <div 
                    key={b.id} 
                    id={`bounty-card-${b.id}`}
                    className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                      isClaimedByMe ? "border-amber-400 ring-2 ring-amber-100" : isCompleted ? "border-slate-100 opacity-75" : "border-slate-150"
                    }`}
                  >
                    <div className="p-5 space-y-4 flex-1">
                      {/* Sponsor Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-sm shadow-xs">
                            {b.sponsor_logo}
                          </span>
                          <span className="text-xs font-bold text-slate-700 leading-none">{b.sponsor_name}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${getCategoryColor(b.category)}`}>
                          {b.category}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{b.title}</h4>
                        <p className="text-xs text-slate-400 font-normal line-clamp-2">{b.description}</p>
                      </div>

                      {/* Map Location */}
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{b.location_hint}</span>
                      </div>

                      {/* Reward Badge */}
                      <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-teal-600 shrink-0" />
                          <div className="text-left">
                            <p className="text-[10px] text-slate-400 font-bold leading-none uppercase">Reward Voucher</p>
                            <p className="text-xs font-extrabold text-teal-800 mt-0.5">{b.reward_text}</p>
                          </div>
                        </div>
                        <span className="bg-teal-600 text-white font-black text-[10px] px-2 py-1 rounded-lg flex items-center gap-1">
                          <Award className="w-3 h-3" /> +{b.reward_xp} XP
                        </span>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="px-5 py-4 border-t border-slate-50 bg-slate-50/40 flex items-center justify-between gap-4">
                      {b.status === "open" && (
                        <button
                          onClick={() => handleClaim(b.id)}
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <TargetIcon className="w-3.5 h-3.5" /> Claim Micro-Bounty
                        </button>
                      )}

                      {b.status === "claimed" && (
                        <button
                          onClick={() => {
                            setSelectedBounty(b);
                            setAfterPhotoUrl("");
                            setCustomPhotoUrl("");
                            setVerificationResult(null);
                          }}
                          className={`w-full font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                            isClaimedByMe 
                              ? "bg-amber-500 hover:bg-amber-600 text-white" 
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                          disabled={!isClaimedByMe}
                        >
                          <Camera className="w-3.5 h-3.5" /> 
                          {isClaimedByMe ? "Fulfill & Submit Proof" : `Claimed by ${b.claimed_by_name}`}
                        </button>
                      )}

                      {isCompleted && (
                        <div className="w-full flex items-center justify-center gap-1.5 py-1 text-slate-500 font-bold text-xs">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span>Fulfilled by {b.claimed_by_name}</span>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

          {/* Guidelines / Help Desk Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" /> How-to Manual
              </h3>
              <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed font-normal">
                <div className="flex gap-2">
                  <span className="w-5 h-5 bg-teal-50 text-teal-700 border border-teal-100 rounded-full flex items-center justify-center font-black shrink-0 text-[10px]">1</span>
                  <p><strong>Claim:</strong> Hit claim on any open neighborhood bounty. Only one citizen can claim a bounty at a time.</p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 bg-teal-50 text-teal-700 border border-teal-100 rounded-full flex items-center justify-center font-black shrink-0 text-[10px]">2</span>
                  <p><strong>Remediate:</strong> Travel to the specified GPS location (e.g. clean the garbage heap or paint over the defaced brickwork).</p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 bg-teal-50 text-teal-700 border border-teal-100 rounded-full flex items-center justify-center font-black shrink-0 text-[10px]">3</span>
                  <p><strong>Upload Proof:</strong> Take or submit a clear "After" photo. Paste a URL or select one of our quick-testing templates.</p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 bg-teal-50 text-teal-700 border border-teal-100 rounded-full flex items-center justify-center font-black shrink-0 text-[10px]">4</span>
                  <p><strong>Claim Voucher:</strong> Trigger the AI multi-spectral checker. Once approved, copy your unlock code and redeem it at the local store!</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50/30 border border-amber-200 rounded-2xl p-5 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4" /> Anti-Gaming Policy
              </div>
              <p className="text-[11px] text-slate-500 leading-normal font-normal">
                Our edge AI utilizes deep neural models and EXIF hash tracking to compare Before/After variance. Uploading stock web photos, identical pictures, or unrelated scenery triggers automated audit holds and freezes your local Civic XP ranking.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Bounty Proof Submission Modal */}
      <AnimatePresence>
        {selectedBounty && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Submit Bounty Completion Proof</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide font-bold">Claimed by {selectedBounty.claimed_by_name}</p>
                </div>
                <button 
                  onClick={closeBountyModal}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scroll Content */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1 text-left">
                
                {/* Visual Slider: Before vs After Concept */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">Before State</span>
                    <div className="relative rounded-xl overflow-hidden aspect-video border border-slate-150">
                      <img 
                        src={selectedBounty.before_photo} 
                        alt="Before" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">After State (Your Proof)</span>
                    <div className="relative rounded-xl overflow-hidden aspect-video border border-slate-150 bg-slate-50 flex items-center justify-center">
                      {afterPhotoUrl || customPhotoUrl ? (
                        <img 
                          src={afterPhotoUrl || customPhotoUrl} 
                          alt="After" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-center p-3 text-slate-400">
                          <Camera className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                          <p className="text-[9px] font-bold">No Photo Provided</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {!verificationResult ? (
                  <div className="space-y-4">
                    {/* Mode Tabs */}
                    <div className="flex border-b border-slate-200">
                      <button
                        type="button"
                        onClick={() => { stopCamera(); setProofTab("upload"); }}
                        className={`flex-1 text-center py-2 text-xs font-black transition-all cursor-pointer ${
                          proofTab === "upload" 
                            ? "text-teal-600 border-b-2 border-teal-600" 
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        📤 File Upload & Presets
                      </button>
                      <button
                        type="button"
                        onClick={() => { setProofTab("camera"); }}
                        className={`flex-1 text-center py-2 text-xs font-black transition-all cursor-pointer ${
                          proofTab === "camera" 
                            ? "text-teal-600 border-b-2 border-teal-600" 
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        📸 Live Camera Capture
                      </button>
                    </div>

                    {proofTab === "upload" ? (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        {/* File Upload Box with Drag and Drop */}
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all relative ${
                            dragOver 
                              ? "border-amber-500 bg-amber-50/20" 
                              : afterPhotoUrl 
                                ? "border-teal-400 bg-teal-50/10" 
                                : "border-slate-200 hover:border-slate-350"
                          }`}
                        >
                          <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${afterPhotoUrl ? "text-teal-600" : "text-slate-400"}`} />
                          <p className="text-xs font-bold text-slate-700">Drag & Drop After Photo here</p>
                          <p className="text-[10px] text-slate-400 mt-1">or click to browse from device</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>

                        {/* Pre-packaged quick test photos (simulating active file selections) */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Select Resolved Proof Photo (For testing):</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {SIMULATED_AFTER_PHOTOS.map((sim, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setAfterPhotoUrl(sim.url);
                                  setCustomPhotoUrl("");
                                }}
                                className={`p-2 rounded-xl text-left border text-[10px] transition-all cursor-pointer ${
                                  afterPhotoUrl === sim.url 
                                    ? "border-teal-500 bg-teal-50/40 text-teal-800 font-extrabold" 
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                <p className="truncate leading-tight font-bold">{sim.label}</p>
                                <p className="text-[8px] text-slate-400 mt-0.5 line-clamp-1 font-normal">{sim.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom URL Option */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Or Paste Custom Photo URL:</p>
                          <input 
                            type="url"
                            placeholder="https://example.com/resolved-pavement.jpg"
                            value={customPhotoUrl}
                            onChange={(e) => {
                              setCustomPhotoUrl(e.target.value);
                              setAfterPhotoUrl("");
                            }}
                            className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Camera feed or setup option */}
                        {cameraActive ? (
                          <div className="space-y-3">
                            <div className="relative rounded-2xl overflow-hidden border bg-black aspect-video flex items-center justify-center">
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={capturePhoto}
                                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Camera className="w-4 h-4" />
                                Capture Photo
                              </button>
                              <button
                                type="button"
                                onClick={stopCamera}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Option 1: Live Webcam Stream */}
                            <div className="flex flex-col items-center justify-center border rounded-2xl p-5 text-center bg-white space-y-3">
                              <Camera className="w-8 h-8 text-teal-600" />
                              <div className="space-y-1">
                                <h4 className="text-xs font-bold text-slate-800">Use Browser Webcam</h4>
                                <p className="text-[10px] text-slate-400 leading-snug">Starts your computer webcam to capture the resolved scene live.</p>
                              </div>
                              <button
                                type="button"
                                onClick={startCamera}
                                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black text-[10px] py-2 px-3 rounded-lg shadow-sm cursor-pointer transition uppercase"
                              >
                                Start Live Camera
                              </button>
                            </div>

                            {/* Option 2: Mobile Native Direct Capture */}
                            <div className="flex flex-col items-center justify-center border rounded-2xl p-5 text-center bg-white space-y-3 relative">
                              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <span className="font-black text-xs">M</span>
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-xs font-bold text-slate-800">Mobile Native Camera</h4>
                                <p className="text-[10px] text-slate-400 leading-snug">For mobile users: directly trigger your device's default camera app.</p>
                              </div>
                              <div className="w-full relative">
                                <button
                                  type="button"
                                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] py-2 px-3 rounded-lg shadow-sm transition uppercase cursor-pointer"
                                >
                                  Trigger Native Cam
                                </button>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={handleFileUpload}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {errorMsg && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <button
                      onClick={handleVerify}
                      disabled={isVerifying || (!afterPhotoUrl && !customPhotoUrl)}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-3 rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                          <span>AI Multi-Spectral Verification Engine Booting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Trigger AI Proof Audit Scan</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5 text-center py-4">
                    {verificationResult.success ? (
                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                          <CheckCircle className="w-6 h-6 animate-pulse" />
                        </div>
                        
                        <div className="space-y-1">
                          <h4 className="text-base font-black text-slate-900">AI Verification Passed! 🎉</h4>
                          <p className="text-xs text-slate-500">The anomaly has been cleared. Your reward has been disbursed!</p>
                        </div>

                        {/* AI Analysis Log Card */}
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-left space-y-2">
                          <p className="text-[9px] uppercase font-bold text-teal-600 tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 animate-spin" /> Live Computer Vision Analytics
                          </p>
                          <p className="text-[11px] text-slate-600 leading-normal font-mono font-medium">{verificationResult.aiAnalysis}</p>
                        </div>

                        {/* Coupon voucher coupon display */}
                        <div className="bg-amber-500/10 border-2 border-dashed border-amber-300 rounded-2xl p-5 text-center space-y-2.5 relative">
                          <div className="absolute top-0 right-4 transform -translate-y-1/2 bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                            Official Voucher
                          </div>
                          
                          <div className="space-y-0.5">
                            <p className="text-[10px] text-amber-800 font-extrabold uppercase">Coupon Code Unlocked</p>
                            <p className="text-lg font-mono font-black text-amber-950 tracking-widest mt-0.5 uppercase">{verificationResult.voucherCode}</p>
                          </div>

                          <button
                            onClick={() => copyToClipboard(verificationResult.voucherCode || "")}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" /> {copiedCode ? "Copied!" : "Copy Coupon Code"}
                          </button>

                          <p className="text-[9px] text-amber-700/80 font-semibold italic">Present this code at {selectedBounty.sponsor_name} to claim your reward!</p>
                        </div>

                        {/* XP Award Alert */}
                        <div className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 font-bold text-xs border border-teal-100 rounded-full px-3 py-1">
                          <Award className="w-4 h-4 text-teal-600" /> Resolved resolving resolved! Awarded +{verificationResult.xpAwarded} Civic XP!
                        </div>

                        <button
                          onClick={() => setSelectedBounty(null)}
                          className="w-full bg-slate-800 hover:bg-slate-950 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                        >
                          Close Marketplace
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-500">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        
                        <div className="space-y-1">
                          <h4 className="text-base font-black text-slate-900">AI Verification Failed</h4>
                          <p className="text-xs text-slate-500">Our computer vision system detected a compliance flag.</p>
                        </div>

                        <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 text-left">
                          <p className="text-[11px] text-rose-800 font-medium leading-normal">{verificationResult.aiAnalysis}</p>
                        </div>

                        <button
                          onClick={() => setVerificationResult(null)}
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                        >
                          Retry Proof Submission
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Verification Scanners Loading Overlay */}
      <AnimatePresence>
        {isVerifying && (
          <div className="fixed inset-0 bg-slate-950/70 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative overflow-hidden"
            >
              {/* Scan Green Laser Animation Effect */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500 shadow-[0_0_15px_#14b8a6] animate-bounce" />
              
              <div className="relative w-20 h-20 mx-auto border-2 border-slate-100 rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center">
                <img 
                  src={afterPhotoUrl || customPhotoUrl} 
                  alt="Analyzing" 
                  className="w-full h-full object-cover opacity-50 filter blur-xs"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-base flex items-center justify-center gap-1">
                  <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" /> Multi-Spectral AI Audit
                </h4>
                <div className="space-y-1">
                  <p className="text-[10px] text-teal-600 font-mono font-bold animate-pulse">Comparing EXIF GPS hashes...</p>
                  <p className="text-[10px] text-slate-400 font-medium">Matching before/after structural pixels...</p>
                  <p className="text-[10px] text-slate-400 font-medium">Validating camera noise signature consistency...</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Simple custom Target icon for design flavor
function TargetIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
