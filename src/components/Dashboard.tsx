import React, { useEffect, useState } from "react";
import { Report, Profile } from "../types";
import XPBar, { getBadgeDetails, BADGE_LEVELS } from "./XPBar";
import { StatusBadge } from "./StatusBadge";
import { 
  Award, ShieldAlert, CheckCircle, Flame, FileText, 
  ThumbsUp, Calendar, MapPin, Eye, Lock, Unlock, Trophy 
} from "lucide-react";

interface DashboardProps {
  currentUserId: string;
  onViewReport: (id: string) => void;
}

export default function Dashboard({ currentUserId, onViewReport }: DashboardProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch profile
      const profRes = await fetch("/api/auth/me");
      if (!profRes.ok) throw new Error("Could not load user profile");
      const profData = await profRes.json();
      setProfile(profData);

      // Fetch reports
      const reportsRes = await fetch("/api/reports");
      if (!reportsRes.ok) throw new Error("Could not load reports");
      const reportsData: Report[] = await reportsRes.json();
      
      // Filter reports created by current user
      const userReports = reportsData.filter(r => r.reporter_id === profData.id);
      setReports(userReports);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch dashboard. The server may be restarting.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 font-sans">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Retrieving Personal Dashboard...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md mx-auto space-y-4 font-sans">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">Connection Interrupted</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{error || "Please try reloading the portal."}</p>
        <button
          onClick={fetchDashboardData}
          className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Count metrics
  const resolvedCount = reports.filter(r => r.status === "resolved").length;
  const pendingCount = reports.filter(r => r.status === "pending" || r.status === "validated").length;
  const activeCount = reports.filter(r => r.status === "assigned" || r.status === "in_progress").length;

  const currentBadgeDetails = getBadgeDetails(profile.xp_points);

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      
      {/* Upper Profile Section */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <img
            src={profile.avatar_url}
            alt={profile.full_name}
            referrerPolicy="no-referrer"
            className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-slate-700 bg-slate-800 shadow-md"
          />
          <div className="space-y-1">
            <h2 className="text-lg md:text-xl font-black tracking-tight">{profile.full_name}</h2>
            <div className="flex flex-wrap gap-2 items-center text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                {profile.city} Resident
              </span>
              <span>• Joined {new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Gamification Bar Inside Profile */}
        <div className="w-full md:w-96 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 shadow-inner">
          <XPBar xp={profile.xp_points} />
        </div>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Filed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reports Filed</span>
            <h4 className="text-xl md:text-2xl font-black text-slate-800 leading-none mt-1">{reports.length}</h4>
          </div>
        </div>

        {/* Issues Resolved */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resolved</span>
            <h4 className="text-xl md:text-2xl font-black text-slate-800 leading-none mt-1">{resolvedCount}</h4>
          </div>
        </div>

        {/* Upvotes / Validations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <ThumbsUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validations</span>
            <h4 className="text-xl md:text-2xl font-black text-slate-800 leading-none mt-1">{profile.validations_count || 0}</h4>
          </div>
        </div>

        {/* Engagement Streak or XP */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">XP Points</span>
            <h4 className="text-xl md:text-2xl font-black text-slate-800 leading-none mt-1">{profile.xp_points}</h4>
          </div>
        </div>
      </div>

      {/* Main Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: My Reports List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">My Submitted Tickets</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Issues reported under your active profile</p>
              </div>
              <span className="text-xs bg-slate-50 border px-2.5 py-1 rounded-full text-slate-600 font-bold">{reports.length} Reports</span>
            </div>

            {/* List */}
            {reports.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
                  You haven't submitted any civic reports yet. Help improve your community by reporting a pothole, broken streetlight, or trash pile!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                {reports.map((rep) => (
                  <div key={rep.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex gap-3 items-center min-w-0">
                      <img
                        src={rep.photo_urls[0]}
                        alt={rep.title}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-cover rounded-xl border shrink-0 bg-slate-100"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate hover:text-teal-600 cursor-pointer transition duration-150" onClick={() => onViewReport(rep.id)}>
                          {rep.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">{rep.address}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={rep.status} className="text-[10px] py-0.5 px-2" />
                      <button
                        onClick={() => onViewReport(rep.id)}
                        className="p-1.5 bg-slate-50 hover:bg-teal-50 text-slate-500 hover:text-teal-600 rounded-lg border border-slate-200 hover:border-teal-200 transition cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Badges Showcase Shelf */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Avenue Badges Wall</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Earn XP to unlock citizen rank promotions</p>
            </div>

            {/* Badges Stack */}
            <div className="space-y-3.5">
              {Object.entries(BADGE_LEVELS).map(([badgeKey, details]) => {
                const isUnlocked = profile.xp_points >= details.min;
                
                return (
                  <div 
                    key={badgeKey}
                    className={`p-3.5 rounded-2xl border transition duration-200 flex items-center justify-between ${
                      isUnlocked 
                        ? "bg-gradient-to-r from-slate-50 to-white border-teal-100/80" 
                        : "bg-slate-50/50 border-slate-200/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Emoji Icon Circle */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm border ${isUnlocked ? "bg-white" : "bg-slate-100"}`}>
                        {details.icon}
                      </div>
                      <div>
                        <h4 className={`text-xs font-bold leading-none ${isUnlocked ? "text-slate-800" : "text-slate-400"}`}>
                          {badgeKey}
                        </h4>
                        <span className="text-[10px] text-slate-400 block mt-1">Requires {details.min} XP</span>
                      </div>
                    </div>

                    <div>
                      {isUnlocked ? (
                        <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full p-1 inline-flex items-center justify-center" title="Unlocked">
                          <Unlock className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="bg-slate-100 text-slate-400 border border-slate-200 rounded-full p-1 inline-flex items-center justify-center" title="Locked">
                          <Lock className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
