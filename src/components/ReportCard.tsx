import React from "react";
import { Report } from "../types";
import { StatusBadge, SeverityBadge } from "./StatusBadge";
import { BadgeDisplay } from "./XPBar";
import { 
  Trash, Lightbulb, Droplets, Zap, Store, Hammer, 
  AlertOctagon, ShieldAlert, MapPin, MessageSquare, 
  ThumbsUp, Calendar, Hourglass, Star 
} from "lucide-react";

interface ReportCardProps {
  key?: string;
  report: Report;
  currentUserId: string;
  hasUpvoted: boolean;
  onUpvote: (id: string) => void;
  onViewDetails: (id: string) => void;
}

export function getCategoryIcon(category: string) {
  switch (category) {
    case "pothole":
      return { Icon: Hammer, label: "Pothole", color: "text-amber-600 bg-amber-50 border-amber-100" };
    case "garbage":
      return { Icon: Trash, label: "Garbage Dump", color: "text-emerald-600 bg-emerald-50 border-emerald-100" };
    case "streetlight":
      return { Icon: Lightbulb, label: "Streetlight Broken", color: "text-blue-600 bg-blue-50 border-blue-100" };
    case "water":
      return { Icon: Droplets, label: "Water Leak", color: "text-cyan-600 bg-cyan-50 border-cyan-100" };
    case "electricity":
      return { Icon: Zap, label: "Power Grid", color: "text-purple-600 bg-purple-50 border-purple-100" };
    case "sewage":
      return { Icon: AlertOctagon, label: "Sewage / Drainage", color: "text-rose-600 bg-rose-50 border-rose-100" };
    case "encroachment":
      return { Icon: Store, label: "Encroachment", color: "text-indigo-600 bg-indigo-50 border-indigo-100" };
    default:
      return { Icon: ShieldAlert, label: "Other Issue", color: "text-slate-600 bg-slate-50 border-slate-100" };
  }
}

// Helper to format remaining SLA time
export function getSLARemaining(deadlineStr?: string, status?: string) {
  if (!deadlineStr || status === "resolved" || status === "rejected") return null;

  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (isOverdue) {
    return {
      text: `SLA Overdue by ${days > 0 ? `${days}d ` : ""}${hours}h`,
      isOverdue: true,
      color: "text-rose-600 bg-rose-50 border-rose-200"
    };
  } else {
    return {
      text: `Resolve by: ${days > 0 ? `${days}d ` : ""}${hours}h remaining`,
      isOverdue: days === 0 && hours < 24, // Warn if less than 24 hours left
      color: days === 0 && hours < 24 ? "text-orange-600 bg-orange-50 border-orange-200 animate-pulse" : "text-slate-600 bg-slate-50 border-slate-150"
    };
  }
}

export default function ReportCard({
  report,
  currentUserId,
  hasUpvoted,
  onUpvote,
  onViewDetails
}: ReportCardProps) {
  const cat = getCategoryIcon(report.category);
  const sla = getSLARemaining(report.sla_deadline, report.status);
  
  // Truncate description helper
  const truncatedDesc = report.description.length > 140 
    ? report.description.substring(0, 140) + "..." 
    : report.description;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col md:flex-row font-sans">
      
      {/* Photo Column */}
      <div className="relative w-full md:w-60 h-44 md:h-auto shrink-0 bg-slate-100 overflow-hidden">
        <img
          src={report.photo_urls[0] || "https://images.unsplash.com/photo-1594818858329-051f4917f80f?auto=format&fit=crop&w=800&q=80"}
          alt={report.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
        />
        {/* Category Floating Pill */}
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-md backdrop-blur-sm ${cat.color}`}>
          <cat.Icon className="w-3.5 h-3.5" />
          <span>{cat.label}</span>
        </div>
      </div>

      {/* Content Column */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Status & Urgency Header */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <StatusBadge status={report.status} />
            <SeverityBadge severity={report.severity} />

            {/* Community Verification Stamp */}
            {report.upvotes_count >= 2 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black bg-teal-600 text-white border border-teal-500 rounded-full shadow-sm animate-in fade-in duration-200">
                ✓ Community Verified
              </span>
            )}
            
            {/* SLA Alert */}
            {sla && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full border ${sla.color}`}>
                <Hourglass className="w-3 h-3" />
                {sla.text}
              </span>
            )}

            {/* Resolved Star Count */}
            {report.status === "resolved" && report.citizen_rating && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 rounded-full">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {report.citizen_rating} Stars
              </span>
            )}
          </div>

          {/* Title */}
          <h3 
            onClick={() => onViewDetails(report.id)}
            className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-snug cursor-pointer hover:text-teal-600 transition duration-150"
          >
            {report.title}
          </h3>

          {/* Location details */}
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1.5 mb-3">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[300px] md:max-w-md">{report.address}</span>
            <span className="font-semibold text-slate-700 shrink-0">• {report.city}</span>
          </div>

          {/* Truncated Description */}
          <p className="text-sm text-slate-600 leading-relaxed font-normal mb-4">
            {truncatedDesc}
          </p>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          
          {/* User Profile info */}
          <div className="flex items-center gap-2">
            <img 
              src={report.reporter_avatar} 
              alt={report.reporter_name} 
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full border border-slate-200 shadow-sm"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block leading-tight">{report.reporter_name}</span>
              <span className="text-[10px] text-slate-400 block">Reported {new Date(report.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Upvotes & Comments Actions */}
          <div className="flex items-center gap-3">
            
            {/* Upvote Button */}
            <button
              id={`btn-upvote-${report.id}`}
              onClick={() => onUpvote(report.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition duration-200 cursor-pointer ${
                hasUpvoted 
                  ? "bg-teal-50 text-teal-600 border-teal-200" 
                  : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
              }`}
              title="Verify or support this reported issue"
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? "fill-teal-600 animate-bounce" : ""}`} />
              <span>{hasUpvoted ? "Verified" : "Verify Issue"} ({report.upvotes_count})</span>
            </button>

            {/* Comments Counter */}
            <button
              id={`btn-details-comments-${report.id}`}
              onClick={() => onViewDetails(report.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>{report.comments_count}</span>
            </button>

            {/* Details CTA */}
            <button
              id={`btn-view-details-${report.id}`}
              onClick={() => onViewDetails(report.id)}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 underline underline-offset-4 px-1 py-1 cursor-pointer"
            >
              View Details
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
