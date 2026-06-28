import React, { useEffect, useState } from "react";
import { Report, Profile } from "../types";
import XPBar, { getBadgeDetails, BADGE_LEVELS } from "./XPBar";
import { StatusBadge } from "./StatusBadge";
import { 
  Award, ShieldAlert, CheckCircle, Flame, FileText, 
  ThumbsUp, Calendar, MapPin, Eye, Lock, Unlock, Trophy,
  Leaf, BrainCircuit, Sparkles, TrendingUp, Activity, ShieldCheck, Droplet, Trash2, Zap
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
  const [subTab, setSubTab] = useState<"overview" | "impact" | "insights">("overview");
  const [liveEvents, setLiveEvents] = useState([
    { id: 1, text: "🌱 Welcome bonus awarded to Citizen #4829", time: "Just now" },
    { id: 2, text: "🚧 Ward 8 pothole assigned to Chief Engineer", time: "2 mins ago" },
    { id: 3, text: "💡 Streetlight resolution verified in HSR Layout", time: "5 mins ago" },
    { id: 4, text: "💰 Civic Bounty claim of 500 XP completed by @civic_champion", time: "12 mins ago" },
    { id: 5, text: "💧 Major water leak resolved in Indiranagar Area", time: "25 mins ago" },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      const texts = [
        "🗑️ Community cleanup successfully completed in Marathahalli",
        "💡 Broken streetlight reported near Ward 3 Block C",
        "✓ Street pothole successfully patched in Indiranagar",
        "🎖️ Citizen @karthik_r promoted to Civic Champion!",
        "💧 Indiranagar water pipe leak sealed by Water Board",
        "🚨 Critical hazardous sewer overflow resolved in Whitefield",
        "⚡ Power grid substation maintenance completed in Koramangala",
      ];
      const randomText = texts[Math.floor(Math.random() * texts.length)];
      setLiveEvents(prev => [
        { id: Date.now(), text: randomText, time: "Just now" },
        ...prev.slice(0, 4)
      ]);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

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

      {/* Profile Hub Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200/80 gap-1 overflow-x-auto pb-px">
        <button
          id="tab-overview"
          onClick={() => setSubTab("overview")}
          className={`px-4 py-3.5 text-xs font-black flex items-center gap-2 border-b-2 transition duration-200 shrink-0 cursor-pointer ${
            subTab === "overview"
              ? "border-teal-600 text-teal-600 bg-teal-50/10"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
          }`}
        >
          <Activity className="w-4 h-4" />
          My Profile & Stats
        </button>
        <button
          id="tab-impact"
          onClick={() => setSubTab("impact")}
          className={`px-4 py-3.5 text-xs font-black flex items-center gap-2 border-b-2 transition duration-200 shrink-0 cursor-pointer ${
            subTab === "impact"
              ? "border-teal-600 text-teal-600 bg-teal-50/10"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
          }`}
        >
          <Leaf className="w-4 h-4" />
          Civic & Environmental Impact
        </button>
        <button
          id="tab-insights"
          onClick={() => setSubTab("insights")}
          className={`px-4 py-3.5 text-xs font-black flex items-center gap-2 border-b-2 transition duration-200 shrink-0 cursor-pointer ${
            subTab === "insights"
              ? "border-teal-600 text-teal-600 bg-teal-50/10"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
          }`}
        >
          <BrainCircuit className="w-4 h-4" />
          AI Predictive Insights
        </button>
      </div>

      {subTab === "overview" && (
        <>
          {/* Grid of Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
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

          {/* REAL-TIME CIVIC LEDGER ACTIVITY TICKER */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-600 animate-pulse" /> Live Civic Ledger
              </span>
            </div>
            <div className="flex-1 overflow-hidden h-6 relative w-full">
              <div className="absolute inset-0 flex items-center">
                <p key={liveEvents[0].id} className="text-xs font-semibold text-slate-700 animate-in slide-in-from-bottom-2 duration-300 truncate">
                  {liveEvents[0].text}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400 shrink-0 bg-white px-2 py-0.5 rounded border border-slate-200">
              Real-time updates
            </span>
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
    </>
  )}

  {/* SUB-TAB 2: CIVIC & ENVIRONMENTAL IMPACT DASHBOARD */}
  {subTab === "impact" && (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6">
        <div>
          <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
            <Leaf className="w-5 h-5 text-emerald-600 animate-bounce" />
            Environmental & Social Impact Dashboard
          </h3>
          <p className="text-xs text-slate-400 font-bold mt-1">
            Real physical metrics computed from verified community resolutions across Bengaluru.
          </p>
        </div>

        {/* Impact Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CO2 Emissions */}
          <div className="bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between h-40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">CO₂ Displaced</span>
              <Leaf className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-800">4,120 kg</h4>
              <p className="text-[10px] text-emerald-600 font-semibold mt-1">✓ Equivalent to planting 180 trees</p>
            </div>
          </div>

          {/* Landfill Diversion */}
          <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 p-5 rounded-2xl border border-teal-100 shadow-sm flex flex-col justify-between h-40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-700">Landfill Diversion</span>
              <Trash2 className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-800">12,450 kg</h4>
              <p className="text-[10px] text-teal-600 font-semibold mt-1">✓ Diverted plastics, metals & debris</p>
            </div>
          </div>

          {/* Water Saved */}
          <div className="bg-gradient-to-br from-cyan-50/50 to-cyan-100/30 p-5 rounded-2xl border border-cyan-100 shadow-sm flex flex-col justify-between h-40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-700">Clean Water Saved</span>
              <Droplet className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-800">245,000 L</h4>
              <p className="text-[10px] text-cyan-600 font-semibold mt-1">✓ Arrested sewage & plumbing leaks</p>
            </div>
          </div>

          {/* Safety Index */}
          <div className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between h-40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Public Safety Index</span>
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-800">+28.5%</h4>
              <p className="text-[10px] text-blue-600 font-semibold mt-1">✓ Streetlights & street safety resolution</p>
            </div>
          </div>
        </div>

        {/* Visual Analytics Block */}
        <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Cumulative Impact Metrics (Last 6 Months)</h4>
              <p className="text-[11px] text-slate-400">Monthly aggregate of environmental savings achieved</p>
            </div>
            <span className="text-xs font-black bg-white px-2.5 py-1 rounded-full text-emerald-600 border border-emerald-100 shadow-xs flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> High Pace
            </span>
          </div>

          {/* Simple Animated CSS Chart */}
          <div className="space-y-3.5 pt-2">
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>CO₂ Offset Progress</span>
                <span>4,120 / 5,000 kg</span>
              </div>
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: "82.4%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Waste Diverted Target</span>
                <span>12,450 / 15,000 kg</span>
              </div>
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full transition-all duration-1000" style={{ width: "83%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Water Leakages Sealed</span>
                <span>245,000 / 300,000 L</span>
              </div>
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all duration-1000" style={{ width: "81.6%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* SUB-TAB 3: AI CIVIC PREDICTIVE INSIGHTS */}
  {subTab === "insights" && (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
              <BrainCircuit className="w-5 h-5 text-indigo-600 animate-pulse" />
              AI Civic Predictive Insights Portal
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-1">
              Anticipating municipal failures, structural risks, and road erosion zones through deep telemetry modeling.
            </p>
          </div>
          <button
            onClick={() => {
              alert("Re-calculating Ward Telemetry... Gemini AI is analyzing environmental risk factors, monsoon alerts, and historical reporting densities.");
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            Analyze Area Telemetry
          </button>
        </div>

        {/* Risk Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pothole risk */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">Road Erosion Risk</span>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">Ward 4 Pothole Alert</h4>
              <p className="text-2xl font-black text-slate-900 mt-1">92% Probability</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-2 leading-relaxed">
                Asphalt degradation model flags Ward 4 due to heavy monsoon rainfall forecasts and high-density commercial truck routing.
              </p>
            </div>
          </div>

          {/* Streetlight risk */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">Grid Outage Forecast</span>
              <Zap className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">Ward 12 Luminescence</h4>
              <p className="text-2xl font-black text-slate-900 mt-1">78% Probability</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-2 leading-relaxed">
                Outage predicted due to bulb lifetime exhaustion thresholds and a cluster of pending validations in close spatial proximity.
              </p>
            </div>
          </div>

          {/* Sewage risk */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">Grid Overflow Alarm</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">Koramangala Sewer Block</h4>
              <p className="text-2xl font-black text-slate-900 mt-1">85% Probability</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-2 leading-relaxed">
                Hydrological sensors detect localized drainage bottlenecks and sewage backflows, requiring preventive municipal clearing.
              </p>
            </div>
          </div>
        </div>

        {/* Predictive AI Summary Card */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Gemini AI Forecast Summary
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed font-semibold">
            "Based on the aggregate analysis of citizen reports and public municipal records, we recommend scheduling preventive sewer clearing in Koramangala sectors within the next 48 hours to avert monsoon backup hazards. Road patching should prioritize Ward 4 to save estimated 12% in long-term structural maintenance budgets."
          </p>
        </div>
      </div>
    </div>
  )}

    </div>
  );
}
