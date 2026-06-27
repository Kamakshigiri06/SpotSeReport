import React, { useEffect, useState } from "react";
import { Report, Profile, IssueStatus, IssueSeverity } from "../types";
import { StatusBadge, SeverityBadge } from "./StatusBadge";
import { getCategoryIcon } from "./ReportCard";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, CheckCircle, Clock, MapPin, Eye, ThumbsUp, Calendar, 
  MessageSquare, Filter, Search, Plus, AlertCircle, Inbox, 
  ChevronRight, Sparkles, RefreshCw, BarChart2, TrendingUp, AlertTriangle, Info
} from "lucide-react";

interface UserReportHistoryProps {
  currentUserId: string;
  onViewReport: (id: string) => void;
  onTriggerNewReport?: () => void;
}

export default function UserReportHistory({ currentUserId, onViewReport, onTriggerNewReport }: UserReportHistoryProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "popular">("newest");

  const fetchUserReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/reports");
      if (!res.ok) throw new Error("Could not load reports");
      const data: Report[] = await res.json();
      
      // Filter reports created by current user
      const userReports = data.filter(r => r.reporter_id === currentUserId);
      setReports(userReports);
      setLoading(false);
    } catch (err) {
      console.error("Error loading user reports history:", err);
      setError("Failed to retrieve your ticket history from the local container database.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserReports();
  }, [currentUserId]);

  const handleResetFilters = () => {
    setStatusFilter("all");
    setSeverityFilter("all");
    setSearchQuery("");
    setSortBy("newest");
  };

  // Filter & Sort Logic
  const getFilteredReports = () => {
    let filtered = [...reports];

    // Status Filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Severity Filter
    if (severityFilter !== "all") {
      filtered = filtered.filter(r => r.severity === severityFilter);
    }

    // Text Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(query) || 
        r.description.toLowerCase().includes(query) || 
        r.address.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query)
      );
    }

    // Sorting
    if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "popular") {
      filtered.sort((a, b) => (b.upvotes_count || 0) - (a.upvotes_count || 0));
    } else {
      // Newest first
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  };

  const displayedReports = getFilteredReports();

  // Statistics calculations
  const totalCount = reports.length;
  const resolvedCount = reports.filter(r => r.status === "resolved").length;
  const inProgressCount = reports.filter(r => r.status === "assigned" || r.status === "in_progress").length;
  const pendingCount = reports.filter(r => r.status === "pending" || r.status === "validated").length;
  const rejectedCount = reports.filter(r => r.status === "rejected").length;

  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;
  const totalUpvotesEarned = reports.reduce((acc, curr) => acc + (curr.upvotes_count || 0), 0);
  const totalCommentsEarned = reports.reduce((acc, curr) => acc + (curr.comments_count || 0), 0);

  return (
    <div className="space-y-6 font-sans">
      
      {/* 📋 Header Section */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md border border-slate-700/30 relative overflow-hidden">
        {/* Abstract design elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-teal-500/20 text-teal-300 rounded-lg border border-teal-500/20">
                <FileText className="w-5 h-5 text-teal-400" />
              </span>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white leading-none">My Reported Incidents</h2>
            </div>
            <p className="text-xs text-slate-300/80 font-medium max-w-xl leading-relaxed">
              Track the progress, validations, and administrative actions for all municipal hazards and issues you have reported. Your vigilance helps keep the city safe.
            </p>
          </div>

          <button
            id="history-add-report-btn"
            onClick={onTriggerNewReport}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-600 active:scale-95 text-white font-bold text-xs rounded-xl transition duration-150 shadow-md shadow-teal-500/10 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Report New Issue
          </button>
        </div>
      </div>

      {/* 📊 Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Submitted */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-100">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Filed</span>
            <span className="text-xl md:text-2xl font-black text-slate-800 block mt-0.5">{totalCount}</span>
          </div>
        </div>

        {/* Resolved Pride */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Resolved</span>
            <span className="text-xl md:text-2xl font-black text-emerald-600 block mt-0.5">
              {resolvedCount} <span className="text-xs text-slate-400 font-semibold">({resolutionRate}%)</span>
            </span>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Work</span>
            <span className="text-xl md:text-2xl font-black text-slate-800 block mt-0.5">{inProgressCount}</span>
          </div>
        </div>

        {/* Community Impact (Upvotes) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
            <ThumbsUp className="w-5 h-5 text-teal-500 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Upvotes Earned</span>
            <span className="text-xl md:text-2xl font-black text-teal-600 block mt-0.5">{totalUpvotesEarned}</span>
          </div>
        </div>
      </div>

      {/* 🧭 FILTER CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            Filter Incident History
          </span>
          <div className="flex gap-4 items-center">
            <button
              onClick={fetchUserReports}
              className="text-[10px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Sync List
            </button>
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-slate-400 hover:text-rose-600 underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Inputs Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block uppercase">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Title, description, address..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Status Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block uppercase">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="validated">Community Validated</option>
              <option value="assigned">Assigned to Authority</option>
              <option value="in_progress">Work In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Severity Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block uppercase">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition font-medium"
            >
              <option value="all">All Severities</option>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Severity</option>
              <option value="high">High Severity</option>
              <option value="critical">Critical Priority</option>
            </select>
          </div>

          {/* Sort selection */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block uppercase">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="popular">Most Validated (Upvotes)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 📝 LIST VIEWPORT */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/85 p-20 text-center space-y-4 shadow-sm">
          <div className="w-9 h-9 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Syncing your filing history...</p>
        </div>
      ) : displayedReports.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/85 p-16 text-center space-y-4 shadow-sm">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-800">No reported incidents found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            {reports.length === 0 
              ? "You haven't filed any complaints yet! Contribute to safety and transparency in your ward today." 
              : "No tickets match your active filter settings. Try clearing some filters to expand your search."}
          </p>
          <div className="pt-2">
            {reports.length === 0 ? (
              <button
                onClick={onTriggerNewReport}
                className="bg-slate-850 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-sm"
              >
                File Your First Report
              </button>
            ) : (
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span>Showing {displayedReports.length} of {reports.length} report{reports.length === 1 ? "" : "s"}</span>
            <span className="text-[10px] text-teal-600">Click any ticket to view detailed updates</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {displayedReports.map((report) => {
                const cat = getCategoryIcon(report.category);
                
                return (
                  <motion.div
                    key={report.id}
                    layoutId={`history-card-${report.id}`}
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.98, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => onViewReport(report.id)}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-teal-200 hover:shadow-md transition duration-200 overflow-hidden cursor-pointer flex flex-col justify-between"
                  >
                    {/* Top image & content */}
                    <div>
                      {/* Photo Header */}
                      <div className="h-36 relative bg-slate-100 overflow-hidden shrink-0">
                        {report.photo_urls && report.photo_urls[0] ? (
                          <img 
                            src={report.photo_urls[0]} 
                            alt={report.title} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <FileText className="w-10 h-10" />
                          </div>
                        )}

                        {/* Status absolute badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
                          <StatusBadge status={report.status} className="text-[9px] font-extrabold px-2.5 py-1 rounded-md shadow-sm border border-white/10" />
                        </div>

                        {/* Severity absolute badge */}
                        <div className="absolute top-2.5 right-2.5">
                          <SeverityBadge severity={report.severity} className="text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-sm" />
                        </div>

                        {/* Category bottom left strip */}
                        <div className="absolute bottom-2 left-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold border bg-white/95 backdrop-blur-xs text-slate-800 border-slate-200 shadow-xs`}>
                            <cat.Icon className="w-3 h-3 text-slate-500" />
                            {cat.label}
                          </span>
                        </div>
                      </div>

                      {/* Info body */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                          <span className="truncate max-w-[130px] flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {report.city}
                          </span>
                        </div>

                        <h3 className="text-sm font-extrabold text-slate-850 leading-snug tracking-tight line-clamp-1 hover:text-teal-600 transition">
                          {report.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-normal line-clamp-2">
                          {report.description}
                        </p>

                        {/* If resolved: note banner */}
                        {report.status === "resolved" && report.resolution_note && (
                          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5 mt-2 flex gap-1.5 items-start">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[9px] font-black text-emerald-800 uppercase block tracking-wider leading-none">Official Resolution</span>
                              <p className="text-[10px] text-emerald-700 italic leading-snug mt-0.5 truncate">
                                "{report.resolution_note}"
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* SLA Deadline Tracker */}
                        {report.status !== "resolved" && report.status !== "rejected" && report.sla_deadline && (
                          <div className="bg-amber-50/50 border border-amber-100/60 rounded-xl p-2.5 mt-2 flex gap-1.5 items-center">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <div className="text-[10px] font-bold text-amber-800 leading-none">
                              SLA Due: {new Date(report.sla_deadline).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer bar */}
                    <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs font-bold shrink-0 mt-auto">
                      <div className="flex items-center gap-3.5 text-slate-500">
                        <span className="flex items-center gap-1.5" title="Citizen validations">
                          <ThumbsUp className="w-3.5 h-3.5 text-slate-400" />
                          <span>{report.upvotes_count || 0}</span>
                        </span>
                        <span className="flex items-center gap-1.5" title="Community comments">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                          <span>{report.comments_count || 0}</span>
                        </span>
                      </div>

                      <span className="text-teal-600 hover:text-teal-700 flex items-center gap-0.5 leading-none">
                        View Audit Log
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Footer engagement guide */}
      <div className="bg-gradient-to-r from-teal-50/20 to-slate-50 rounded-2xl border border-slate-200/80 p-4 flex gap-3 items-start text-slate-600">
        <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-black text-slate-800">Need immediate municipal escalation?</h4>
          <p className="text-[11px] leading-relaxed text-slate-500 font-semibold">
            If an issue has been pending or validation has reached 10 upvotes, our AI automated routing dispatcher flags it directly for regional ward officers. You will receive real-time notifications about dispatch assignments and completion photo evidence.
          </p>
        </div>
      </div>

    </div>
  );
}
