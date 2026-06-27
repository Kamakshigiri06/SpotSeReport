import React, { useEffect, useState } from "react";
import { Report, Comment, Profile } from "../types";
import { StatusBadge, SeverityBadge } from "./StatusBadge";
import { getCategoryIcon } from "./ReportCard";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, ThumbsUp, MapPin, Calendar, Clock, 
  Send, ShieldAlert, CheckCircle, Award, Sparkles, Flame,
  Share2, ChevronLeft, ChevronRight, MessageCircle, Heart, CheckCircle2, TrendingUp, Filter, Trophy
} from "lucide-react";

interface CommunityFeedProps {
  currentUserId: string;
  onViewReport: (id: string) => void;
  onUpdateCount?: () => void;
}

export default function CommunityFeed({ currentUserId, onViewReport, onUpdateCount }: CommunityFeedProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab within community feed
  const [feedFilter, setFeedFilter] = useState<"recent" | "trending" | "resolved" | "my-city">("recent");

  // Expanded comments section state: reportId -> Comment[]
  const [expandedComments, setExpandedComments] = useState<Record<string, Comment[]>>({});
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Image carousels active indexes: reportId -> index
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});

  // Current user's profile
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all reports
      const repRes = await fetch("/api/reports");
      if (!repRes.ok) throw new Error("Could not fetch reports");
      const repData = await repRes.json();
      setReports(repData);

      // Fetch all profiles (to show Local Champions)
      const profsRes = await fetch("/api/auth/profiles");
      if (profsRes.ok) {
        const profsData = await profsRes.json();
        setProfiles(profsData);
      }

      // Fetch current user profile to filter by my city
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUserProfile(meData);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading community feed:", err);
      setError("Failed to load community feed. Please check your network connection.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUserId]);

  // Handle direct upvote inside community feed
  const handleUpvote = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/reports/${reportId}/upvote`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        
        // Update local state count
        setReports(prev => prev.map(r => r.id === reportId ? {
          ...r,
          upvotes_count: data.upvotes_count,
          upvoted_by_user: true,
          status: data.upvotes_count >= 10 && r.status === "pending" ? "validated" : r.status
        } : r));

        if (onUpdateCount) onUpdateCount();
      }
    } catch (err) {
      console.error("Error upvoting report:", err);
    }
  };

  // Toggle comments expand and fetch comments for report
  const toggleComments = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If already expanded, collapse it
    if (expandedComments[reportId]) {
      setExpandedComments(prev => {
        const next = { ...prev };
        delete next[reportId];
        return next;
      });
      return;
    }

    // Set loading
    setCommentLoading(prev => ({ ...prev, [reportId]: true }));
    try {
      const res = await fetch(`/api/reports/${reportId}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedComments(prev => ({ ...prev, [reportId]: data.comments || [] }));
      }
    } catch (err) {
      console.error("Error fetching comments for report:", err);
    } finally {
      setCommentLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  // Handle submitting comments directly within community feed
  const handleSubmitComment = async (reportId: string, e: React.FormEvent) => {
    e.preventDefault();
    const commentText = commentInputs[reportId] || "";
    if (!commentText.trim()) return;

    setSubmittingComment(prev => ({ ...prev, [reportId]: true }));
    try {
      const res = await fetch(`/api/reports/${reportId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText })
      });

      if (res.ok) {
        const commentData = await res.json();
        
        // Add to expanded comments
        setExpandedComments(prev => ({
          ...prev,
          [reportId]: [...(prev[reportId] || []), commentData]
        }));

        // Clear input
        setCommentInputs(prev => ({ ...prev, [reportId]: "" }));

        // Increment comments_count in local reports state
        setReports(prev => prev.map(r => r.id === reportId ? {
          ...r,
          comments_count: (r.comments_count || 0) + 1
        } : r));

        if (onUpdateCount) onUpdateCount();
      }
    } catch (err) {
      console.error("Error posting comment:", err);
    } finally {
      setSubmittingComment(prev => ({ ...prev, [reportId]: false }));
    }
  };

  // Carousel controls
  const handleNextPhoto = (reportId: string, photoUrls: string[], e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = carouselIndices[reportId] || 0;
    const nextIdx = currentIdx === photoUrls.length - 1 ? 0 : currentIdx + 1;
    setCarouselIndices(prev => ({ ...prev, [reportId]: nextIdx }));
  };

  const handlePrevPhoto = (reportId: string, photoUrls: string[], e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = carouselIndices[reportId] || 0;
    const prevIdx = currentIdx === 0 ? photoUrls.length - 1 : currentIdx - 1;
    setCarouselIndices(prev => ({ ...prev, [reportId]: prevIdx }));
  };

  // Filter reports
  const getFilteredReports = () => {
    let filtered = [...reports];

    // Filter by tab
    if (feedFilter === "trending") {
      // Sort by upvotes + comments
      filtered.sort((a, b) => (b.upvotes_count + b.comments_count) - (a.upvotes_count + a.comments_count));
    } else if (feedFilter === "resolved") {
      filtered = filtered.filter(r => r.status === "resolved");
      // Newest resolved first
      filtered.sort((a, b) => new Date(b.resolved_at || b.updated_at).getTime() - new Date(a.resolved_at || a.updated_at).getTime());
    } else if (feedFilter === "my-city" && currentUserProfile) {
      filtered = filtered.filter(r => r.city.toLowerCase() === currentUserProfile.city.toLowerCase());
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      // Recent: Newest created first
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  };

  const displayedReports = getFilteredReports();

  // Compute stats for Community Feed top bar
  const totalUpvotes = reports.reduce((acc, curr) => acc + (curr.upvotes_count || 0), 0);
  const totalComments = reports.reduce((acc, curr) => acc + (curr.comments_count || 0), 0);
  const totalResolved = reports.filter(r => r.status === "resolved").length;
  const resolutionRate = reports.length > 0 ? Math.round((totalResolved / reports.length) * 100) : 0;

  // Compute category statistics for sidebar progress bars
  const categoryCounts: Record<string, number> = {};
  reports.forEach(r => {
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
  });
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      
      {/* 🚀 Community Stats Board */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-teal-800/20 relative overflow-hidden">
        {/* Abstract background decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-teal-500/25 text-teal-300 rounded-lg border border-teal-500/30">
                <Sparkles className="w-5 h-5 text-teal-300 animate-pulse" />
              </span>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white leading-none">The Community Board</h2>
            </div>
            <p className="text-xs text-teal-200/70 font-medium mt-2 max-w-lg leading-relaxed">
              Every citizen report drives change. Watch real-time community engagement unfold, validate issues, and join the conversational civic circle.
            </p>
          </div>

          {/* Quick Stats Metrics */}
          <div className="flex flex-wrap items-center gap-4 lg:gap-6 bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-inner">
            <div className="text-center px-2">
              <span className="text-[10px] text-teal-300 uppercase font-bold tracking-wider block">Validations</span>
              <span className="text-lg font-black block text-white mt-0.5">{totalUpvotes} 👍</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />
            <div className="text-center px-2">
              <span className="text-[10px] text-teal-300 uppercase font-bold tracking-wider block">Discussions</span>
              <span className="text-lg font-black block text-white mt-0.5">{totalComments} 💬</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />
            <div className="text-center px-2">
              <span className="text-[10px] text-teal-300 uppercase font-bold tracking-wider block">Resolved</span>
              <span className="text-lg font-black block text-teal-400 mt-0.5">{resolutionRate}% 🎉</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🧭 Tab Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFeedFilter("recent")}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition flex items-center gap-1.5 cursor-pointer ${
              feedFilter === "recent" 
                ? "bg-slate-900 text-white shadow-sm" 
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            Recent Alerts
          </button>
          
          <button
            onClick={() => setFeedFilter("trending")}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition flex items-center gap-1.5 cursor-pointer ${
              feedFilter === "trending" 
                ? "bg-slate-900 text-white shadow-sm" 
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            Hot & Trending
          </button>

          <button
            onClick={() => setFeedFilter("resolved")}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition flex items-center gap-1.5 cursor-pointer ${
              feedFilter === "resolved" 
                ? "bg-slate-900 text-white shadow-sm" 
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Resolved Pride
          </button>

          {currentUserProfile && (
            <button
              onClick={() => setFeedFilter("my-city")}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition flex items-center gap-1.5 cursor-pointer ${
                feedFilter === "my-city" 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              In My City ({currentUserProfile.city})
            </button>
          )}
        </div>

        <span className="text-xs text-slate-400 font-bold tracking-wide shrink-0">
          Showing {displayedReports.length} reports
        </span>
      </div>

      {/* Main Grid Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 📝 SOCIAL SCROLLABLE FEED (Left Column) */}
        <div className="lg:col-span-2 space-y-5">
          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200 py-24 text-center space-y-4">
              <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-500">Syncing Civic Social Feed...</p>
            </div>
          ) : displayedReports.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-black text-slate-800">No reports found on this board.</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Be the champion! Start a civic discussion by filing a brand new incident report in your neighborhood.
              </p>
            </div>
          ) : (
            displayedReports.map((report) => {
              const cat = getCategoryIcon(report.category);
              const activeIdx = carouselIndices[report.id] || 0;
              const isUpvoted = report.upvoted_by_user || false;
              const isCommentsOpen = !!expandedComments[report.id];
              const commentList = expandedComments[report.id] || [];
              const commentVal = commentInputs[report.id] || "";

              return (
                <div 
                  key={report.id}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition duration-300 flex flex-col"
                >
                  
                  {/* Post Header: Reporter profile details */}
                  <div className="p-5 flex items-center justify-between gap-4 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <img 
                        src={report.reporter_avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150"} 
                        alt={report.reporter_name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
                      />
                      <div className="leading-tight">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-800">{report.reporter_name}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-1.5 py-0.5 rounded-md border tracking-wider">
                            Citizen
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold block mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(report.created_at).toLocaleDateString()} at {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={report.status} className="text-[10px] px-2.5 py-0.5" />
                      <SeverityBadge severity={report.severity} className="text-[9px] px-2 py-0" />
                    </div>
                  </div>

                  {/* Post Body */}
                  <div className="p-5 space-y-3.5">
                    
                    {/* Category Label and Address */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cat.color}`}>
                        <cat.Icon className="w-3 h-3" />
                        {cat.label}
                      </div>

                      <div className="flex items-center gap-1 text-slate-500 font-semibold text-[10px] bg-slate-50 border px-2.5 py-1 rounded-full">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{report.address}, {report.city}</span>
                      </div>
                    </div>

                    {/* Report Title & Description */}
                    <div>
                      <h3 
                        onClick={() => onViewReport(report.id)}
                        className="text-base font-extrabold text-slate-900 tracking-tight leading-snug cursor-pointer hover:text-teal-600 transition duration-150"
                      >
                        {report.title}
                      </h3>
                      <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-normal mt-1.5">
                        {report.description}
                      </p>
                    </div>

                    {/* Photo Carousel directly in feed */}
                    {report.photo_urls && report.photo_urls.length > 0 && (
                      <div className="relative rounded-2xl overflow-hidden h-64 bg-slate-900 border border-slate-100 group">
                        
                        <AnimatePresence mode="wait">
                          <motion.img
                            key={activeIdx}
                            src={report.photo_urls[activeIdx]}
                            alt="Incident Evidence"
                            referrerPolicy="no-referrer"
                            initial={{ opacity: 0, scale: 1.01 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.99 }}
                            transition={{ duration: 0.2 }}
                            className="w-full h-full object-cover"
                          />
                        </AnimatePresence>

                        {/* Video Badge overlay on the feed */}
                        {report.video_url && (
                          <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white bg-indigo-600/90 backdrop-blur-sm rounded-full border border-indigo-500/30 shadow-md z-10">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            🎥 Live Video Proof
                          </div>
                        )}

                        {/* Carousel Arrows */}
                        {report.photo_urls.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handlePrevPhoto(report.id, report.photo_urls, e)}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/40 hover:bg-slate-950/70 backdrop-blur-sm text-white border border-white/5 shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer md:opacity-0 md:group-hover:opacity-100"
                              aria-label="Prev image"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleNextPhoto(report.id, report.photo_urls, e)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/40 hover:bg-slate-950/70 backdrop-blur-sm text-white border border-white/5 shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer md:opacity-0 md:group-hover:opacity-100"
                              aria-label="Next image"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>

                            {/* Carousel Indicators dots */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-slate-950/40 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-xs">
                              {report.photo_urls.map((_, idx) => (
                                <span 
                                  key={idx}
                                  className={`w-1 h-1 rounded-full transition-all duration-300 ${
                                    activeIdx === idx ? "bg-teal-400 w-2.5" : "bg-white/50"
                                  }`}
                                />
                              ))}
                            </div>
                            
                            {/* Fraction indicator */}
                            <div className="absolute bottom-3 right-3 text-[10px] bg-slate-950/50 backdrop-blur-sm px-2 py-0.5 rounded-md font-bold text-white border border-white/5">
                              {activeIdx + 1} / {report.photo_urls.length}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Resolution feedback banner if resolved */}
                    {report.status === "resolved" && report.resolution_note && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2 text-emerald-850">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Officially Resolved</span>
                        </div>
                        <p className="text-xs text-emerald-700 leading-relaxed italic">
                          "{report.resolution_note}"
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Post Footer Interactive Action Bars */}
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      
                      {/* Social Upvote Button */}
                      <button
                        onClick={(e) => handleUpvote(report.id, e)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                          isUpvoted
                            ? "bg-teal-50 text-teal-600 border-teal-200 shadow-xs"
                            : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                        title="Validate this report"
                      >
                        <Heart className={`w-3.5 h-3.5 transition-transform ${isUpvoted ? "fill-rose-500 text-rose-500 scale-110" : "text-slate-400"}`} />
                        <span>Upvote ({report.upvotes_count})</span>
                      </button>

                      {/* Expand Comment Button */}
                      <button
                        onClick={(e) => toggleComments(report.id, e)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                          isCommentsOpen
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        <MessageCircle className={`w-3.5 h-3.5 ${isCommentsOpen ? "text-teal-300" : "text-slate-400"}`} />
                        <span>Discuss ({report.comments_count})</span>
                      </button>
                    </div>

                    <button
                      onClick={() => onViewReport(report.id)}
                      className="text-teal-600 hover:text-teal-700 underline underline-offset-4 cursor-pointer"
                    >
                      Audit Full Timeline →
                    </button>
                  </div>

                  {/* Collapsible Expandable Comments Area */}
                  <AnimatePresence>
                    {isCommentsOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-slate-100 bg-slate-50/30"
                      >
                        <div className="p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest block">Discussions Circle:</h4>
                          
                          {commentLoading[report.id] ? (
                            <div className="flex items-center gap-2 justify-center py-4">
                              <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs text-slate-400 font-semibold">Retrieving conversations...</span>
                            </div>
                          ) : commentList.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-2">
                              No comment threads yet. Start the conversation to gain +8 XP!
                            </p>
                          ) : (
                            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                              {commentList.map((com) => (
                                <div key={com.id} className="flex gap-2.5 items-start bg-white p-3 rounded-2xl border border-slate-100">
                                  <img 
                                    src={com.user_avatar} 
                                    alt={com.user_name} 
                                    referrerPolicy="no-referrer"
                                    className="w-7 h-7 rounded-full object-cover border"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[11px] font-black text-slate-800">{com.user_name}</span>
                                      <span className="text-[9px] text-slate-400 font-medium">
                                        {new Date(com.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-normal">
                                      {com.content}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Quick Inline Comment Post Form */}
                          <form 
                            onSubmit={(e) => handleSubmitComment(report.id, e)}
                            className="flex items-center gap-2 mt-2"
                          >
                            <input
                              type="text"
                              value={commentVal}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [report.id]: e.target.value }))}
                              placeholder="Add a community validation or civic tip..."
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                            />
                            <button
                              type="submit"
                              disabled={submittingComment[report.id] || !commentVal.trim()}
                              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl p-2 cursor-pointer transition flex items-center justify-center shrink-0"
                              title="Send comment"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </form>
                          <span className="text-[9px] text-slate-400 font-bold block mt-1 text-right">
                            💬 Commenting awards you +8 XP Points!
                          </span>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              );
            })
          )}
        </div>

        {/* 📊 DESKTOP SIDEBAR COMMUNTIY INFO (Right Column) */}
        <div className="space-y-6">
          
          {/* Section 1: Community Hotspots */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Community Hotspots</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Most common municipal issues active in your neighborhood</p>
            </div>

            <div className="space-y-3.5">
              {sortedCategories.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold italic text-center py-4">No active categories reported yet</p>
              ) : (
                sortedCategories.slice(0, 4).map(([category, count]) => {
                  const percentage = Math.round((count / reports.length) * 100);
                  const cat = getCategoryIcon(category);
                  
                  return (
                    <div key={category} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <cat.Icon className="w-4 h-4 text-slate-400" />
                          {cat.label}
                        </span>
                        <span className="font-extrabold text-slate-500">{count} {count === 1 ? 'ticket' : 'tickets'}</span>
                      </div>
                      
                      {/* Styled Progress Bar */}
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-900 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section 2: Local Champions mini-leaderboard */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Civic Guardians</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Top contributing citizens in the community</p>
              </div>
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>

            <div className="space-y-3">
              {profiles.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-2">Loading active citizens...</p>
              ) : (
                [...profiles]
                  .sort((a, b) => b.xp_points - a.xp_points)
                  .slice(0, 4)
                  .map((prof, idx) => (
                    <div key={prof.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-5 text-xs font-black text-slate-400 text-center">
                          #{idx + 1}
                        </div>
                        <img 
                          src={prof.avatar_url} 
                          alt={prof.full_name} 
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full border shadow-xs"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 block truncate">{prof.full_name}</span>
                          <span className="text-[9px] text-slate-400 font-semibold block">{prof.city}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-teal-600 block">{prof.xp_points} XP</span>
                        <span className="text-[9px] text-slate-400 font-bold block">{prof.badge_level}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Section 3: Civic engagement guide / tips */}
          <div className="bg-gradient-to-br from-slate-50 to-teal-50/30 rounded-3xl border border-teal-100 p-5 space-y-3 text-slate-700">
            <div className="flex items-center gap-1.5 text-teal-700">
              <Award className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider">How to earn Citizen XP</span>
            </div>
            <ul className="space-y-2 text-[11px] leading-relaxed text-slate-600 font-semibold">
              <li className="flex items-start gap-1.5">
                <span className="text-teal-600 shrink-0">•</span>
                <span><strong>File a new report:</strong> Gain 50 XP after AI triage successfully verifies your local issue.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-teal-600 shrink-0">•</span>
                <span><strong>Validate/Upvote tickets:</strong> Gain 15 XP for confirming other citizens' reports.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-teal-600 shrink-0">•</span>
                <span><strong>Comment in forums:</strong> Gain 8 XP for sharing tips or resolving neighborhood questions.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-teal-600 shrink-0">•</span>
                <span><strong>Resolution verification:</strong> Gain 25 XP when your validated reports are resolved by the city!</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
