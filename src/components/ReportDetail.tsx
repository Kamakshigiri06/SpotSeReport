import React, { useEffect, useState } from "react";
import { Report, Comment, StatusTimeline } from "../types";
import { StatusBadge, SeverityBadge } from "./StatusBadge";
import { getCategoryIcon, getSLARemaining } from "./ReportCard";
import { motion, AnimatePresence } from "motion/react";
import AILocationAssistant from "./AILocationAssistant";
import { 
  ThumbsUp, MessageSquare, MapPin, Calendar, Clock, 
  Send, ShieldAlert, CheckCircle, Hourglass, Star, User, Info, ArrowLeft,
  ChevronLeft, ChevronRight, Brain, Sparkles, Image as ImageIcon, Wand2, RefreshCw
} from "lucide-react";

interface ReportDetailProps {
  reportId: string;
  currentUserId: string;
  onBack: () => void;
  onUpdateCount?: () => void;
}

export default function ReportDetail({ reportId, currentUserId, onBack, onUpdateCount }: ReportDetailProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [timeline, setTimeline] = useState<StatusTimeline[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expert Plan (High-Thinking)
  const [expertPlan, setExpertPlan] = useState<string>("");
  const [loadingPlan, setLoadingPlan] = useState<boolean>(false);
  const [planError, setPlanError] = useState<string>("");

  // AI Simulation Image Generator
  const [simPrompt, setSimPrompt] = useState<string>("");
  const [simAspectRatio, setSimAspectRatio] = useState<string>("16:9");
  const [simImageUrl, setSimImageUrl] = useState<string>("");
  const [generatingSim, setGeneratingSim] = useState<boolean>(false);
  const [simError, setSimError] = useState<string>("");

  // New Comment state
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Citizen Rating state
  const [rating, setRating] = useState<number | null>(null);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Image carousel state
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [mediaType, setMediaType] = useState<"photo" | "video">("photo");

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/${reportId}`);
      if (!res.ok) throw new Error("Report not found");
      const data = await res.json();
      setReport(data.report);
      setTimeline(data.timeline);
      setComments(data.comments);
      setHasUpvoted(data.hasUpvoted);
      setActivePhotoIdx(0);
      
      if (data.report.citizen_rating) {
        setRating(data.report.citizen_rating);
        setRatingSubmitted(true);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to load details. The ticket may have been removed or database is resetting.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportDetails();
    setActivePhotoIdx(0);
  }, [reportId]);

  const handleUpvote = async () => {
    if (!report) return;
    try {
      const res = await fetch(`/api/reports/${reportId}/upvote`, {
        method: "POST"
      });
      if (!res.ok) return;
      const data = await res.json();
      
      setHasUpvoted(data.upvoted);
      setReport({
        ...report,
        upvotes_count: data.upvotes_count,
        status: data.upvotes_count >= 10 && report.status === "pending" ? "validated" : report.status
      });

      if (onUpdateCount) onUpdateCount();
      // Re-fetch timeline in case status promoted to validated automatically
      if (data.upvotes_count >= 10 && report.status === "pending") {
        fetchReportDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestExpertPlan = async () => {
    try {
      setLoadingPlan(true);
      setPlanError("");
      const res = await fetch(`/api/reports/${reportId}/expert-plan`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate plan");
      setExpertPlan(data.plan);
    } catch (err: any) {
      console.error(err);
      setPlanError(err.message || "Could not retrieve expert plan.");
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleGenerateSimulation = async () => {
    if (!simPrompt.trim()) return;
    try {
      setGeneratingSim(true);
      setSimError("");
      const res = await fetch(`/api/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: simPrompt,
          aspectRatio: simAspectRatio,
          existingImageBase64: report?.photo_urls?.[0] || ""
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate simulation image.");
      setSimImageUrl(data.imageUrl);
      if (report && data.imageUrl) {
        setReport({
          ...report,
          photo_urls: [...report.photo_urls, data.imageUrl]
        });
        setActivePhotoIdx(report.photo_urls.length - 1);
      }
    } catch (err: any) {
      console.error(err);
      setSimError(err.message || "Failed to generate visual simulation.");
    } finally {
      setGeneratingSim(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !report) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment })
      });
      if (res.ok) {
        const commentData = await res.json();
        setComments([...comments, commentData]);
        setReport({
          ...report,
          comments_count: (report.comments_count || 0) + 1
        });
        setNewComment("");
        if (onUpdateCount) onUpdateCount();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleRateResolution = async (stars: number) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: stars })
      });
      if (res.ok) {
        setRating(stars);
        setRatingSubmitted(true);
        if (report) {
          setReport({ ...report, citizen_rating: stars });
        }
        if (onUpdateCount) onUpdateCount();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3 font-sans">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading Issue Details...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto font-sans">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
        <h3 className="text-lg font-bold text-slate-800">Error Fetching Ticket</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{error || "The requested issue does not exist."}</p>
        <button
          onClick={onBack}
          className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
        >
          Back to Reports Feed
        </button>
      </div>
    );
  }

  const cat = getCategoryIcon(report.category);
  const sla = getSLARemaining(report.sla_deadline, report.status);

  // Status timeline nodes for visualization
  const steps: { key: string; label: string; desc: string }[] = [
    { key: "pending", label: "Report Filed", desc: "Citizen reported the issue. AI smart triage triaged routing priority." },
    { key: "validated", label: "Validated", desc: "Community confirmed: reached 10+ confirming upvotes." },
    { key: "assigned", label: "Dispatched", desc: "Assigned to department team for field operations." },
    { key: "in_progress", label: "In Progress", desc: "Maintenance crew dispatched and actively resolving." },
    { key: "resolved", label: "Resolved", desc: "Maintenance completed. Resolution proof uploaded by officers." }
  ];

  const getStepStatus = (stepKey: string) => {
    const statuses = ["pending", "validated", "assigned", "in_progress", "resolved"];
    const currentIdx = statuses.indexOf(report.status);
    const stepIdx = statuses.indexOf(stepKey);

    if (report.status === "rejected") {
      return stepKey === "pending" ? "completed" : "inactive";
    }

    if (stepIdx < 0) return "inactive";
    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "active";
    return "pending";
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      
      {/* Back CTA */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Reports Feed
      </button>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Details & Comments */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Detail Card */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            
            {/* Main proof image / Carousel / Video */}
            <div className="relative w-full h-64 md:h-80 bg-slate-900 overflow-hidden group">
              <AnimatePresence mode="wait">
                {mediaType === "video" && report.video_url ? (
                  <motion.video
                    key="video"
                    src={report.video_url}
                    controls
                    autoPlay
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full object-contain bg-slate-950"
                  />
                ) : (
                  <motion.img
                    key={activePhotoIdx}
                    src={(report.photo_urls && report.photo_urls[activePhotoIdx]) || "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80"}
                    alt={`${report.title} - Photo ${activePhotoIdx + 1}`}
                    referrerPolicy="no-referrer"
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="w-full h-full object-cover"
                  />
                )}
              </AnimatePresence>

              {/* Badges overlay */}
              <div className="absolute top-4 left-4 flex gap-2 z-10">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border shadow-md backdrop-blur-md ${cat.color}`}>
                  <cat.Icon className="w-4 h-4" />
                  {cat.label}
                </span>
                <SeverityBadge severity={report.severity} className="shadow-md" />
              </div>

              {/* Media type toggles (Photo vs Video) */}
              {report.video_url && (
                <div className="absolute top-4 right-4 flex bg-slate-900/80 backdrop-blur-md rounded-xl p-1 border border-white/10 z-20 shadow-lg">
                  <button
                    onClick={() => setMediaType("photo")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-150 cursor-pointer ${
                      mediaType === "photo" ? "bg-emerald-600 text-white shadow" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Photo
                  </button>
                  <button
                    onClick={() => setMediaType("video")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-150 cursor-pointer ${
                      mediaType === "video" ? "bg-emerald-600 text-white shadow" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    🎥 Video
                  </button>
                </div>
              )}

              {/* Carousel navigation and indicators */}
              {mediaType === "photo" && report.photo_urls && report.photo_urls.length > 1 && (
                <>
                  {/* Left Arrow Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIdx((prev) => (prev === 0 ? report.photo_urls.length - 1 : prev - 1));
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-950/40 hover:bg-slate-950/70 backdrop-blur-md text-white transition-all duration-200 border border-white/10 shadow-lg active:scale-95 cursor-pointer md:opacity-0 md:group-hover:opacity-100"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Right Arrow Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIdx((prev) => (prev === report.photo_urls.length - 1 ? 0 : prev + 1));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-950/40 hover:bg-slate-950/70 backdrop-blur-md text-white transition-all duration-200 border border-white/10 shadow-lg active:scale-95 cursor-pointer md:opacity-0 md:group-hover:opacity-100"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Bullet Navigation */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 bg-slate-950/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    {report.photo_urls.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePhotoIdx(idx);
                        }}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          activePhotoIdx === idx 
                            ? "bg-teal-400 w-3.5 shadow-sm" 
                            : "bg-white/55 hover:bg-white/80"
                        }`}
                        aria-label={`Go to photo ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Counter Badge */}
                  <div className="absolute bottom-4 right-4 z-10 px-2.5 py-1 text-[10px] font-bold rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 text-white tracking-wider">
                    {activePhotoIdx + 1} / {report.photo_urls.length}
                  </div>
                </>
              )}
            </div>

            {/* Content area */}
            <div className="p-6 space-y-6">
              
              {/* Heading Section */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <StatusBadge status={report.status} />
                  {sla && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full border ${sla.color}`}>
                      <Hourglass className="w-3 h-3" />
                      {sla.text}
                    </span>
                  )}
                </div>

                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {report.title}
                </h1>

                {/* Location and Date */}
                <div className="flex flex-wrap gap-4 items-center text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    {report.address}
                  </span>
                  <span className="font-semibold text-slate-800">• {report.city}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Report Description</h3>
                <p className="text-sm md:text-base text-slate-700 leading-relaxed font-normal bg-slate-50 p-4 rounded-2xl border border-slate-150/60">
                  {report.description}
                </p>
              </div>

              {/* AI metadata block */}
              {report.ai_category && (
                <div className="p-4 bg-teal-50/25 rounded-2xl border border-teal-100/70 flex gap-3.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 text-teal-600 shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">AI Dispatch Classification</h4>
                    <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                      Classified category as <span className="font-bold capitalize">{report.ai_category}</span>. 
                      Suggested Department Dispatch: <span className="font-semibold text-slate-800">{report.ai_suggested_authority || "Municipal Corporation"}</span>.
                    </p>
                  </div>
                </div>
              )}

              {/* Interaction row */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                
                {/* Reporter Profile */}
                <div className="flex items-center gap-2">
                  <img src={report.reporter_avatar} alt={report.reporter_name} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full border" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block leading-tight">{report.reporter_name}</span>
                    <span className="text-[10px] text-slate-400">Citizen Reporter</span>
                  </div>
                </div>

                {/* Confirming vote trigger */}
                <div className="flex gap-2">
                  <button
                    onClick={handleUpvote}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                      hasUpvoted 
                        ? "bg-teal-50 text-teal-600 border-teal-200" 
                        : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm"
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? "fill-teal-600" : ""}`} />
                    <span>{hasUpvoted ? "Confirmed Issue" : "Confirm / Upvote"}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500">{report.upvotes_count}</span>
                  </button>
                </div>

              </div>

            </div>
          </div>

          {/* Resolution Proof Card (only if status is resolved) */}
          {report.status === "resolved" && (
            <div className="bg-emerald-50/20 rounded-3xl border border-emerald-200 overflow-hidden shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="w-5 h-5 fill-emerald-100" />
                <h3 className="text-base font-bold">Official Resolution Proof</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <img
                  src={report.resolution_photo_url || "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80"}
                  alt="Resolution"
                  referrerPolicy="no-referrer"
                  className="w-full h-32 object-cover rounded-xl border border-emerald-150"
                />
                <div className="md:col-span-2 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Completion Note</span>
                  <p className="text-xs text-slate-700 leading-relaxed italic">
                    " {report.resolution_note || "Maintenance crew successfully resolved and cleaned the reported area."} "
                  </p>
                  <span className="text-[10px] text-slate-400 block font-semibold">Resolved at: {new Date(report.resolved_at || "").toLocaleString()}</span>
                </div>
              </div>

              {/* Citizen feedback rating */}
              {report.reporter_id === currentUserId && (
                <div className="pt-4 border-t border-emerald-150/50">
                  <h4 className="text-xs font-bold text-slate-800 mb-2">Rate the Resolution Work:</h4>
                  {ratingSubmitted ? (
                    <div className="flex items-center gap-2 bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                      <div className="flex text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-4 h-4 ${s <= (rating || 0) ? "fill-amber-500 text-amber-500" : "text-slate-200"}`} />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-emerald-800">You submitted a {rating} Star Rating (+15 XP awarded)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            onClick={() => handleRateResolution(s)}
                            className="text-slate-300 hover:text-amber-500 transition cursor-pointer"
                          >
                            <Star className="w-5 h-5 hover:fill-amber-400" />
                          </button>
                        ))}
                      </div>
                      <span className="text-[11px] text-slate-500">Click star to rate and earn +15 XP.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 🧠 EXPERT RESOLUTION PLAN (HIGH-THINKING ENGINE) */}
          <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-xl p-6 space-y-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Brain className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    Expert Civil Resolution Blueprint
                    <span className="text-[9px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30 font-black uppercase">Deep Thinking</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Execute advanced multi-agency engineering blueprints using gemini-3.1-pro-preview</p>
                </div>
              </div>
              {!expertPlan && !loadingPlan && (
                <button
                  onClick={handleRequestExpertPlan}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate
                </button>
              )}
            </div>

            {loadingPlan && (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-400 animate-pulse">Engaging deep-thinking engine, formulating blueprint...</p>
              </div>
            )}

            {planError && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-xs text-rose-300">
                {planError}
              </div>
            )}

            {expertPlan && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 text-xs text-slate-300 leading-relaxed font-sans max-h-96 overflow-y-auto whitespace-pre-wrap">
                  {expertPlan}
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Engine: gemini-3.1-pro-preview (Thinking: HIGH)</span>
                  <button 
                    onClick={handleRequestExpertPlan}
                    className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Re-Generate Plan
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 🎨 AI IMAGE SIMULATOR & CONCEPTUAL SCHEMATIC GENERATOR */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  AI Repair Simulation Studio
                  <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 font-extrabold uppercase">IMAGEN 3</span>
                </h3>
                <p className="text-[10.5px] text-slate-400 mt-0.5">Visualize resolutions or generate schematic repairs with gemini-3.1-flash-image-preview</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <textarea
                value={simPrompt}
                onChange={(e) => setSimPrompt(e.target.value)}
                placeholder="Describe the desired visual outcome (e.g. 'clean new asphalt road seamlessly covering the pothole with bright new yellow lane markers, sunny morning')"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-2xl p-3.5 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none leading-relaxed"
                rows={3}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Aspect Ratio:</span>
                  <select
                    value={simAspectRatio}
                    onChange={(e) => setSimAspectRatio(e.target.value)}
                    className="text-xs bg-slate-50 border rounded-xl px-2 py-1 focus:outline-none"
                  >
                    <option value="16:9">16:9 Landscape</option>
                    <option value="4:3">4:3 Desktop</option>
                    <option value="1:1">1:1 Square</option>
                    <option value="9:16">9:16 Portrait</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerateSimulation}
                  disabled={generatingSim || !simPrompt.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {generatingSim ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      Rendering Simulation...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      Generate Simulation
                    </>
                  )}
                </button>
              </div>

              {simError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl p-3 text-xs leading-relaxed">
                  {simError}
                </div>
              )}

              {simImageUrl && (
                <div className="space-y-2 pt-2 animate-in fade-in duration-300">
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50/70 border border-indigo-100 px-2.5 py-1 rounded-lg inline-block uppercase">Generated Resolution Visual:</span>
                  <div className="rounded-2xl border overflow-hidden bg-slate-50 relative group">
                    <img src={simImageUrl} alt="Simulation outcome" className="w-full h-auto object-cover" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              Citizen Discussion Feed ({comments.length})
            </h3>

            {/* List */}
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 font-medium">No citizen comments yet. Be the first to share notes or updates!</p>
              ) : (
                comments.map((com) => (
                  <div key={com.id} className="flex gap-3 items-start p-3 bg-slate-50 rounded-2xl border border-slate-150/60 text-xs">
                    <img src={com.user_avatar} alt={com.user_name} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border shadow-xs" />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">{com.user_name}</span>
                        <span className="text-[10px] text-slate-400">{new Date(com.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-normal">{com.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleAddComment} className="flex gap-2.5 items-end pt-4 border-t border-slate-100">
              <input
                type="text"
                placeholder="Write an update, comment, or suggestion..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className="bg-slate-800 hover:bg-slate-900 text-white p-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center transition shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Live Status Tracking & Timeline */}
        <div className="space-y-6">
          
          {/* AI Maps Grounded Assistant */}
          <AILocationAssistant
            reportId={report.id}
            address={report.address}
            category={report.category}
            city={report.city}
          />

          {/* Timeline Tracking Block */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Municipal Dispatch Timeline</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Real-time status updates from officials</p>
            </div>

            {/* Vertical Steps */}
            <div className="space-y-5 relative pl-4 before:absolute before:top-2.5 before:left-1.5 before:bottom-2.5 before:w-0.5 before:bg-slate-150">
              {steps.map((st, i) => {
                const stepStatus = getStepStatus(st.key);
                
                let circleColor = "bg-slate-100 border-slate-200 text-slate-400";
                if (stepStatus === "completed") {
                  circleColor = "bg-teal-500 border-teal-600 text-white";
                } else if (stepStatus === "active") {
                  circleColor = "bg-amber-500 border-amber-600 text-white ring-4 ring-amber-100";
                }

                return (
                  <div key={st.key} className="relative space-y-1">
                    {/* Circle Node */}
                    <span className={`absolute -left-[19.5px] top-1 w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-black z-10 ${circleColor}`}>
                      {stepStatus === "completed" && "✓"}
                    </span>
                    <h4 className={`text-xs font-bold leading-none ${stepStatus === "inactive" ? "text-slate-400" : "text-slate-800"}`}>
                      {st.label}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-normal font-normal">
                      {st.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Action History & Timeline Notes</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Municipal logs of audit status adjustments</p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {timeline.map((tl) => (
                <div key={tl.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150/60 text-[11px] space-y-1.5">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-bold uppercase text-[9px] tracking-wider text-teal-600">{tl.new_status}</span>
                    <span>{new Date(tl.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-700 leading-normal font-normal">{tl.note}</p>
                  <span className="text-[10px] text-slate-400 block font-semibold">— Logged by {tl.changed_by_name}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
