import React, { useEffect, useState } from "react";
import { Report, Profile, IssueCategory, IssueStatus, IssueSeverity } from "./types";
import IssueMap from "./components/IssueMap";
import { StatusBadge } from "./components/StatusBadge";
import ReportCard from "./components/ReportCard";
import NewReportForm from "./components/NewReportForm";
import ReportDetail from "./components/ReportDetail";
import Dashboard from "./components/Dashboard";
import UserReportHistory from "./components/UserReportHistory";
import CleanlinessGame from "./components/CleanlinessGame";
import EcoBuddyChat from "./components/EcoBuddyChat";
import AdminPanel from "./components/AdminPanel";
import NotificationList from "./components/NotificationList";
import XPBar, { getBadgeDetails } from "./components/XPBar";
import CommunityFeed from "./components/CommunityFeed";
import BountiesMarketplace from "./components/BountiesMarketplace";
import AuthPortal from "./components/AuthPortal";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import { 
  MapPin, Eye, Filter, RefreshCw, Layers, Grid, List, 
  Map, Trophy, User, ShieldAlert, Sparkles, Plus, CheckCircle, Flame, Star, ShieldCheck,
  BarChart2, Activity, Shield, Building, Hammer, HelpCircle, ChevronRight,
  MessageSquare, Bot, X, Gift, Wifi, WifiOff, LogOut
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"map-feed" | "community" | "history" | "arcade" | "dashboard" | "admin" | "admin-map" | "bounties">("map-feed");
  const [viewMode, setViewMode] = useState<"map" | "feed">("map");

  // Simulated Connection Mode
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  // Authentication & Profile States
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [notifTrigger, setNotifTrigger] = useState(0);

  // Reports
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Navigation overlays
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedReportForDrawer, setSelectedReportForDrawer] = useState<Report | null>(null);
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  const [showRoleConfirmModal, setShowRoleConfirmModal] = useState(false);
  const [pendingRole, setPendingRole] = useState<"admin" | "citizen" | null>(null);

  const fetchActiveProfile = async () => {
    try {
      setLoadingAuth(true);
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentProfile(data);
        // Sync active tab state with loaded profile role
        if (data.role === "admin" && activeTab !== "admin-map") {
          setActiveTab("admin");
        } else if (data.role === "citizen") {
          setActiveTab("map-feed");
        }
      } else {
        setCurrentProfile(null);
      }
    } catch (err) {
      console.error(err);
      setCurrentProfile(null);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Reset server active session to a default or clear it
      await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: "usr_citizen" })
      });
      setCurrentProfile(null);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const fetchAllProfilesList = async () => {
    try {
      const res = await fetch("/api/auth/profiles");
      if (res.ok) {
        const data = await res.json();
        setAllProfiles(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const url = `/api/reports?city=${cityFilter}&status=${statusFilter}&severity=${severityFilter}&category=${categoryFilter}&query=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Could not load reports");
      const data = await res.json();
      setReports(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to sync issue feeds with full-stack container database.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveProfile();
    fetchAllProfilesList();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [cityFilter, statusFilter, severityFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    const saved = localStorage.getItem("offline_reports_queue");
    if (saved) {
      try {
        setOfflineQueue(JSON.parse(saved));
      } catch (err) {
        console.error("Error loading offline queue:", err);
      }
    }
  }, []);

  const handleSyncOfflineQueue = async () => {
    if (isOffline) {
      alert("Please toggle your simulated connection back to Online to synchronize your offline reports queue!");
      return;
    }
    if (offlineQueue.length === 0) return;

    setLoading(true);
    let successCount = 0;
    let mergeCount = 0;

    for (const report of offlineQueue) {
      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...report,
            is_offline_draft: false // Now syncing online!
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.merged) {
            mergeCount++;
          } else {
            successCount++;
          }
        }
      } catch (err) {
        console.error("Error syncing offline report:", err);
      }
    }

    localStorage.removeItem("offline_reports_queue");
    setOfflineQueue([]);
    setLoading(false);
    fetchReports();
    fetchActiveProfile();
    setNotifTrigger(prev => prev + 1);

    alert(`Sync Hub Complete: Uploaded ${successCount} reports, and safely resolved ${mergeCount} duplicate incidents under spatial-deduplication checks! +${(successCount + mergeCount) * 50} Civic XP credited to your profile.`);
  };

  const handleProfileSwitch = async (profileId: string) => {
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentProfile(data);
        fetchReports();
        setNotifTrigger(prev => prev + 1);
        if (data.role === "admin") {
          setActiveTab("admin");
        } else {
          setActiveTab("map-feed");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoleToggle = () => {
    if (!currentProfile) return;
    const targetRole = currentProfile.role === "admin" ? "citizen" : "admin";
    setPendingRole(targetRole);
    setShowRoleConfirmModal(true);
  };

  const confirmRoleToggle = async () => {
    if (!currentProfile || !pendingRole) return;
    try {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: pendingRole })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentProfile(data);
        if (pendingRole === "admin") {
          setActiveTab("admin");
        } else {
          setActiveTab("map-feed");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setShowRoleConfirmModal(false);
      setPendingRole(null);
    }
  };

  const handleUpvote = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/${id}/upvote`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        // Update local report count
        setReports(reports.map(r => r.id === id ? { 
          ...r, 
          upvotes_count: data.upvotes_count,
          status: data.upvotes_count >= 10 && r.status === "pending" ? "validated" : r.status
        } : r));

        if (selectedReportForDrawer?.id === id) {
          setSelectedReportForDrawer({
            ...selectedReportForDrawer,
            upvotes_count: data.upvotes_count,
            status: data.upvotes_count >= 10 && selectedReportForDrawer.status === "pending" ? "validated" : selectedReportForDrawer.status
          });
        }

        // Increment notifications count
        setNotifTrigger(prev => prev + 1);
        fetchActiveProfile(); // Update XP
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNewReportSuccess = (reportId: string) => {
    setShowReportForm(false);
    fetchReports();
    fetchActiveProfile(); // update XP points
    setNotifTrigger(prev => prev + 1);
    if (reportId) {
      setActiveReportId(reportId);
    }
  };

  const handleMapPinSelected = (report: Report) => {
    setSelectedReportForDrawer(report);
  };

  const clearFilters = () => {
    setCityFilter("all");
    setStatusFilter("all");
    setSeverityFilter("all");
    setCategoryFilter("all");
    setSearchQuery("");
  };

  // Wait for initial profile load
  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-500 tracking-wide uppercase">Initializing SpotseReport Portal...</p>
      </div>
    );
  }

  const badgeDetails = getBadgeDetails(currentProfile.xp_points);
  const isAdmin = currentProfile.role === "admin";

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-white transition-colors duration-300 ${
      isAdmin ? "bg-slate-950/5 text-slate-900" : "bg-slate-50 text-slate-800"
    }`}>
      
      {/* ========================================================= */}
      {/* HEADER NAVBAR SHELL (Separated for Admin vs Citizen) */}
      {/* ========================================================= */}
      {isAdmin ? (
        // 🏢 ADMIN PORTAL HEADER
        <header className="sticky top-0 bg-slate-900 text-slate-100 border-b border-slate-800 z-[100] shadow-md">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
            
            {/* Logo Brand */}
            <div className="flex items-center gap-2.5 shrink-0 cursor-pointer" onClick={() => { setActiveTab("admin"); setActiveReportId(null); }}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-rose-400 shadow-md">
                <Shield className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black tracking-tight text-white leading-none">SpotseReport</span>
                  <span className="text-[9px] bg-rose-500/15 text-rose-300 font-extrabold px-1.5 py-0.5 rounded-md border border-rose-500/20 uppercase tracking-widest">Admin</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold block leading-tight">Municipal Operations Command Console</span>
              </div>
            </div>

            {/* Navigation Tabs (Admin Desktop) */}
            <nav className="hidden md:flex items-center gap-1.5">
              <button
                onClick={() => { setActiveTab("admin"); setActiveReportId(null); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold tracking-wide transition flex items-center gap-1.5 ${
                  activeTab === "admin" 
                    ? "bg-slate-800 text-white border border-slate-700 shadow-inner" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Activity className="w-4 h-4 text-rose-400" />
                Operations Desk
              </button>
              <button
                onClick={() => { setActiveTab("admin-map"); setActiveReportId(null); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold tracking-wide transition flex items-center gap-1.5 ${
                  activeTab === "admin-map" 
                    ? "bg-slate-800 text-white border border-slate-700 shadow-inner" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Map className="w-4 h-4 text-sky-400" />
                Incident Map
              </button>
            </nav>

            {/* Right-Side controls */}
            <div className="flex items-center gap-3 shrink-0">
              
              {/* Simulated Network Switcher */}
              <button
                onClick={() => setIsOffline(!isOffline)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer active:scale-95 border ${
                  isOffline 
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/25 hover:bg-rose-500/20" 
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                }`}
                title="Click to toggle simulated connection for offline queue testing"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? "bg-rose-500 animate-pulse" : "bg-emerald-500 animate-ping"}`} />
                {isOffline ? "Offline Mode" : "Online"}
              </button>

              {/* Quick Sandbox Role Toggle */}
              <button
                id="btn-role-switcher"
                onClick={handleRoleToggle}
                className="relative group hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/25 transition cursor-pointer hover:bg-rose-500/20 active:scale-95"
                title="Switch back to citizen view"
              >
                <User className="w-3.5 h-3.5" />
                Officer Mode: Active

                {/* Descriptive hover tooltip */}
                <div className="absolute top-full right-0 mt-2.5 w-72 bg-slate-900 border border-slate-800 text-slate-100 p-3.5 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[210] pointer-events-none font-sans text-left normal-case tracking-normal">
                  <div className="font-extrabold text-rose-400 mb-1.5 flex items-center gap-1.5 text-[11px]">
                    <User className="w-3.5 h-3.5" /> Switch to Citizen Mode
                  </div>
                  <p className="text-[10.5px] text-slate-300 font-semibold leading-relaxed">
                    Returns you to the public workspace. You can submit new local reports, earn civic XP, level up badges, chat with your Eco-Buddy AI companion, and play interactive games.
                  </p>
                </div>
              </button>

              {/* Profile Selection Dropdown (to test gamified profiles!) */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700/80 rounded-xl border border-slate-700 transition focus:outline-none text-left cursor-pointer">
                  <img src={currentProfile.avatar_url} alt={currentProfile.full_name} referrerPolicy="no-referrer" className="w-6 h-6 rounded-full border border-slate-600 shadow-xs" />
                  <div className="hidden lg:block leading-none">
                    <span className="text-[10px] font-black text-slate-100 block truncate max-w-[100px]">{currentProfile.full_name}</span>
                    <span className="text-[9px] font-bold text-rose-400 block mt-0.5">Municipal Officer</span>
                  </div>
                </button>
                {/* Profile switcher list */}
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-[200]">
                  <div className="p-2 border-b border-slate-800 bg-slate-950 rounded-t-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Switch Demo Persona:</span>
                  </div>
                  <div className="p-1 divide-y divide-slate-800/50">
                    {allProfiles.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleProfileSwitch(p.id)}
                        className="w-full text-left px-2.5 py-2 hover:bg-slate-800/80 rounded-lg text-xs font-bold text-slate-300 transition flex items-center gap-2 cursor-pointer"
                      >
                        <img src={p.avatar_url} alt={p.full_name} referrerPolicy="no-referrer" className="w-5 h-5 rounded-full" />
                        <div className="truncate">
                          <p className="truncate leading-none text-slate-200">{p.full_name}</p>
                          <span className={`text-[9px] font-bold block mt-0.5 ${p.role === "admin" ? "text-rose-400" : "text-teal-400"}`}>
                            {p.role === "admin" ? "Municipal Admin" : `${p.xp_points} XP (${p.badge_level})`}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Notifications */}
              <NotificationList 
                currentUserId={currentProfile.id} 
                onNotificationClick={(repId) => {
                  setActiveReportId(repId);
                  setActiveTab("admin");
                }}
                refreshTrigger={notifTrigger}
              />

            </div>

          </div>
        </header>
      ) : (
        // 🌱 CITIZEN PORTAL HEADER
        <header className="sticky top-0 bg-white border-b border-slate-200/80 z-[100] shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
            
            {/* Logo Brand */}
            <div className="flex items-center gap-2.5 shrink-0 cursor-pointer" onClick={() => { setActiveTab("map-feed"); setActiveReportId(null); setShowReportForm(false); }}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/15">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-base font-black tracking-tight text-slate-900 leading-none">SpotseReport</span>
                  <span className="text-[9px] bg-teal-50 text-teal-700 font-extrabold px-1.5 py-0.5 rounded-full border border-teal-100 uppercase tracking-widest">Citizen</span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold block leading-tight">Spot It. Report It. Resolve It.</span>
              </div>
            </div>

            {/* Navigation Tabs (Citizen Desktop) */}
            <nav className="hidden md:flex items-center gap-1.5">
              <button
                onClick={() => { setActiveTab("map-feed"); setActiveReportId(null); }}
                className={`px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition ${
                  activeTab === "map-feed" 
                    ? "bg-teal-50 text-teal-700 font-extrabold" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                🗺️ Map & Feeds
              </button>
              <button
                onClick={() => { setActiveTab("community"); setActiveReportId(null); }}
                className={`px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition ${
                  activeTab === "community" 
                    ? "bg-teal-50 text-teal-700 font-extrabold" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                👥 Community Board
              </button>
              <button
                onClick={() => { setActiveTab("history"); setActiveReportId(null); }}
                className={`px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition ${
                  activeTab === "history" 
                    ? "bg-teal-50 text-teal-700 font-extrabold" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                📋 My Reports
              </button>
              <button
                onClick={() => { setActiveTab("arcade"); setActiveReportId(null); }}
                className={`px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition ${
                  activeTab === "arcade" 
                    ? "bg-teal-50 text-teal-700 font-extrabold" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                🎮 Eco Arcade
              </button>
              <button
                onClick={() => { setActiveTab("bounties"); setActiveReportId(null); }}
                className={`px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition ${
                  activeTab === "bounties" 
                    ? "bg-teal-50 text-teal-700 font-extrabold" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                💰 Fix-It Bounties
              </button>
              <button
                onClick={() => { setActiveTab("dashboard"); setActiveReportId(null); }}
                className={`px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition ${
                  activeTab === "dashboard" 
                    ? "bg-teal-50 text-teal-700 font-extrabold" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                👤 Profile Hub
              </button>
            </nav>

            {/* Right-Side controls */}
            <div className="flex items-center gap-3 shrink-0">
              
              {/* Simulated Network Switcher */}
              <button
                onClick={() => setIsOffline(!isOffline)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer active:scale-95 border ${
                  isOffline 
                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" 
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                }`}
                title="Click to toggle simulated connection for offline queue testing"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? "bg-rose-600 animate-pulse" : "bg-emerald-600 animate-ping"}`} />
                {isOffline ? "Offline Mode (Edge AI)" : "Online (Sync)"}
              </button>

              {offlineQueue.length > 0 && (
                <button
                  onClick={handleSyncOfflineQueue}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer animate-pulse"
                  title="Click to sync offline reports to server"
                >
                  <RefreshCw className="w-3 h-3 text-white shrink-0 animate-spin" /> Sync Queue ({offlineQueue.length})
                </button>
              )}

              {/* Quick Sandbox Role Toggle */}
              <button
                id="btn-role-switcher"
                onClick={handleRoleToggle}
                className="relative group hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200 transition cursor-pointer hover:bg-teal-100 active:scale-95"
                title="Switch to administrative console"
              >
                <Shield className="w-3.5 h-3.5" />
                Citizen Mode

                {/* Descriptive hover tooltip */}
                <div className="absolute top-full right-0 mt-2.5 w-72 bg-white border border-slate-200 text-slate-700 p-3.5 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[210] pointer-events-none font-sans text-left normal-case tracking-normal">
                  <div className="font-extrabold text-teal-600 mb-1.5 flex items-center gap-1.5 text-[11px]">
                    <Shield className="w-3.5 h-3.5 text-teal-600" /> Switch to Officer Mode
                  </div>
                  <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed">
                    Enables the internal Municipal Administrative suite. You can view AI-triage results, prioritize issues using AI emergency urgency scores, assign field agents, and update incident resolution status.
                  </p>
                </div>
              </button>

              {/* Profile Selection Dropdown (to test gamified profiles!) */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition focus:outline-none text-left cursor-pointer">
                  <img src={currentProfile.avatar_url} alt={currentProfile.full_name} referrerPolicy="no-referrer" className="w-6 h-6 rounded-full border shadow-xs" />
                  <div className="hidden lg:block leading-none">
                    <span className="text-[10px] font-black text-slate-800 block truncate max-w-[100px]">{currentProfile.full_name}</span>
                    <span className="text-[9px] font-bold text-teal-600 block mt-0.5">{currentProfile.xp_points} XP</span>
                  </div>
                </button>
                {/* Profile switcher list */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-[200]">
                  <div className="p-2 border-b bg-slate-50 rounded-t-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Switch Demo Citizen:</span>
                  </div>
                  <div className="p-1 divide-y divide-slate-100">
                    {allProfiles.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleProfileSwitch(p.id)}
                        className="w-full text-left px-2.5 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition flex items-center gap-2 cursor-pointer"
                      >
                        <img src={p.avatar_url} alt={p.full_name} referrerPolicy="no-referrer" className="w-5 h-5 rounded-full" />
                        <div className="truncate">
                          <p className="truncate leading-none">{p.full_name}</p>
                          <span className={`text-[9px] font-bold block mt-0.5 ${p.role === "admin" ? "text-rose-600" : "text-slate-400 font-semibold"}`}>
                            {p.role === "admin" ? "Municipal Admin" : `${p.xp_points} XP (${p.badge_level})`}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Notifications */}
              <NotificationList 
                currentUserId={currentProfile.id} 
                onNotificationClick={(repId) => {
                  setActiveReportId(repId);
                  setActiveTab("map-feed");
                }}
                refreshTrigger={notifTrigger}
              />

            </div>

          </div>
        </header>
      )}

      {/* ========================================================= */}
      {/* MOBILE TAB NAV (Separated for Admin vs Citizen) */}
      {/* ========================================================= */}
      {isAdmin ? (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 py-2.5 px-4 flex justify-around gap-2 text-xs font-bold">
          <button 
            onClick={() => { setActiveTab("admin"); setActiveReportId(null); }} 
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${activeTab === "admin" ? "bg-slate-800 text-white" : "text-slate-400"}`}
          >
            <Activity className="w-3.5 h-3.5 text-rose-400" />
            Desk
          </button>
          <button 
            onClick={() => { setActiveTab("admin-map"); setActiveReportId(null); }} 
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${activeTab === "admin-map" ? "bg-slate-800 text-white" : "text-slate-400"}`}
          >
            <Map className="w-3.5 h-3.5 text-sky-400" />
            Map Tracker
          </button>
          <button 
            onClick={handleRoleToggle} 
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px]"
          >
            Go Citizen Mode
          </button>
        </div>
      ) : (
        <div className="md:hidden bg-white border-b border-slate-150 py-2.5 px-4 flex justify-around gap-2 text-xs font-bold overflow-x-auto">
          <button onClick={() => { setActiveTab("map-feed"); setActiveReportId(null); }} className={`px-2.5 py-1.5 rounded-lg shrink-0 ${activeTab === "map-feed" ? "bg-teal-50 text-teal-700" : "text-slate-600"}`}>🗺️ Map</button>
          <button onClick={() => { setActiveTab("community"); setActiveReportId(null); }} className={`px-2.5 py-1.5 rounded-lg shrink-0 ${activeTab === "community" ? "bg-teal-50 text-teal-700" : "text-slate-600"}`}>👥 Board</button>
          <button onClick={() => { setActiveTab("history"); setActiveReportId(null); }} className={`px-2.5 py-1.5 rounded-lg shrink-0 ${activeTab === "history" ? "bg-teal-50 text-teal-700" : "text-slate-600"}`}>📋 Reports</button>
          <button onClick={() => { setActiveTab("arcade"); setActiveReportId(null); }} className={`px-2.5 py-1.5 rounded-lg shrink-0 ${activeTab === "arcade" ? "bg-teal-50 text-teal-700" : "text-slate-600"}`}>🎮 Arcade</button>
          <button onClick={() => { setActiveTab("bounties"); setActiveReportId(null); }} className={`px-2.5 py-1.5 rounded-lg shrink-0 ${activeTab === "bounties" ? "bg-teal-50 text-teal-700" : "text-slate-600"}`}>💰 Bounties</button>
          <button onClick={() => { setActiveTab("dashboard"); setActiveReportId(null); }} className={`px-2.5 py-1.5 rounded-lg shrink-0 ${activeTab === "dashboard" ? "bg-teal-50 text-teal-700" : "text-slate-600"}`}>👤 Profile</button>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN CONTAINER WINDOW */}
      {/* ========================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-24">
        
        {/* NEW REPORT FORM FULL OVERLAY */}
        {showReportForm ? (
          <div className="space-y-4">
            <button
              onClick={() => setShowReportForm(false)}
              className="text-xs font-bold text-slate-500 hover:text-teal-600 cursor-pointer flex items-center gap-1"
            >
              ← Cancel and Return
            </button>
            <NewReportForm
              onSuccess={handleNewReportSuccess}
              onCancel={() => setShowReportForm(false)}
              isOffline={isOffline}
              onQueueOffline={(newQueue) => setOfflineQueue(newQueue)}
            />
          </div>
        ) : activeReportId ? (
          // REPORT DETAIL SHEET
          <ReportDetail
            reportId={activeReportId}
            currentUserId={currentProfile.id}
            onBack={() => setActiveReportId(null)}
            onUpdateCount={() => {
              fetchReports();
              fetchActiveProfile();
              setNotifTrigger(prev => prev + 1);
            }}
          />
        ) : (
          // PRIMARY PORTALS MANAGER
          <>
            {/* ========================================================= */}
            {/* 🏢 ADMIN ONLY PORTAL VIEWS */}
            {/* ========================================================= */}
            {isAdmin && (
              <>
                {/* VIEW 1: OPERATIONS DISPATCH CENTER */}
                {activeTab === "admin" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
                        <Building className="w-6 h-6 text-slate-700" />
                        Municipal Dispatch Control Room
                      </h2>
                      <p className="text-xs text-slate-500 font-semibold mt-1.5">
                        Assess urgency, dispatch municipal maintenance squads, and track resolution SLA markers.
                      </p>
                    </div>

                    <AdminPanel 
                      currentUserId={currentProfile.id} 
                      onViewReport={(id) => {
                        setActiveReportId(id);
                      }}
                      onRefreshFeed={fetchReports}
                    />
                  </div>
                )}

                {/* VIEW 2: MUNICIPAL INCIDENT MAP */}
                {activeTab === "admin-map" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
                        <Map className="w-6 h-6 text-slate-700" />
                        Municipal Incident Map Tracker
                      </h2>
                      <p className="text-xs text-slate-500 font-semibold mt-1.5">
                        Geographic monitoring of active tickets, priority areas, and municipal SLA statuses.
                      </p>
                    </div>

                    {/* Filters desk for administrative map review */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-3">
                      <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="text-xs bg-slate-50 border rounded-xl px-3.5 py-2 focus:outline-none text-slate-600 font-medium">
                        <option value="all">All Cities</option>
                        <option value="Bengaluru">Bengaluru</option>
                        <option value="Chennai">Chennai</option>
                        <option value="Mumbai">Mumbai</option>
                        <option value="Delhi">Delhi</option>
                      </select>
                      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs bg-slate-50 border rounded-xl px-3.5 py-2 focus:outline-none text-slate-600 font-medium">
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="validated">Validated</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="text-xs bg-slate-50 border rounded-xl px-3.5 py-2 focus:outline-none text-slate-600 font-medium">
                        <option value="all">All Severities</option>
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Severity</option>
                        <option value="high">High Severity</option>
                        <option value="critical">Critical</option>
                      </select>
                      <button 
                        onClick={clearFilters}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 underline text-right mr-2 transition cursor-pointer"
                      >
                        Reset Map Filters
                      </button>
                    </div>

                    {/* Interactive Map Block */}
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-3">
                        <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-semibold text-slate-400">Loading Incident Markers...</p>
                      </div>
                    ) : (
                      <div className="relative rounded-3xl border border-slate-200 overflow-hidden shadow-md flex flex-col md:flex-row h-[550px] bg-slate-100">
                        {/* Interactive map */}
                        <div className="flex-1 h-full relative">
                          <IssueMap
                            reports={reports}
                            interactive={false}
                            onSelectReport={handleMapPinSelected}
                          />
                        </div>

                        {/* Admin Dispatcher Pin Drawer */}
                        {selectedReportForDrawer && (
                          <div className="absolute bottom-4 left-4 right-4 md:static md:w-80 md:h-full md:border-l md:border-slate-200 bg-white p-5 shrink-0 flex flex-col justify-between z-[400] overflow-y-auto animate-in slide-in-from-bottom duration-200 shadow-xl md:shadow-none">
                            <div className="space-y-4">
                              <div className="flex justify-between items-start">
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100 block uppercase tracking-wider">Officer Map Pin</span>
                                <button
                                  onClick={() => setSelectedReportForDrawer(null)}
                                  className="text-xs font-bold text-slate-400 hover:text-slate-800"
                                >
                                  Close ✕
                                </button>
                              </div>

                              <img src={selectedReportForDrawer.photo_urls[0]} alt="Pic" referrerPolicy="no-referrer" className="w-full h-32 object-cover rounded-xl border bg-slate-50" />
                              <div className="space-y-1.5">
                                <div className="flex gap-1 items-center flex-wrap">
                                  <StatusBadge status={selectedReportForDrawer.status} className="text-[9px] py-0.5 px-2" />
                                </div>
                                <h3 className="text-sm font-black text-slate-800 leading-tight line-clamp-2">{selectedReportForDrawer.title}</h3>
                                <p className="text-[10px] text-slate-500 leading-normal line-clamp-3">{selectedReportForDrawer.description}</p>
                              </div>

                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{selectedReportForDrawer.address}</span>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 mt-4">
                              <button
                                onClick={() => {
                                  setActiveReportId(selectedReportForDrawer.id);
                                  setSelectedReportForDrawer(null);
                                }}
                                className="w-full bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-sm text-center flex items-center justify-center gap-1 cursor-pointer"
                              >
                                Inspect Full Timeline
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ========================================================= */}
            {/* 🌱 CITIZEN ONLY PORTAL VIEWS */}
            {/* ========================================================= */}
            {!isAdmin && (
              <>
                {/* TAB 1: MAP & FEED SCREEN */}
                {activeTab === "map-feed" && (
                  <div className="space-y-6">
                    
                    {/* Header title */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">Local Hazards & Civic Tickets</h2>
                        <p className="text-xs text-slate-400 font-semibold mt-1.5">Spot local issues, validate complaints, and review resolution timeline status.</p>
                      </div>

                      {/* Feed toggle & Report button row */}
                      <div className="flex items-center gap-3">
                        {/* View Switcher toggle */}
                        <div className="bg-white p-1 rounded-xl border border-slate-200/80 shadow-xs flex">
                          <button
                            onClick={() => setViewMode("map")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer ${
                              viewMode === "map" 
                                ? "bg-teal-50 text-teal-700" 
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            <Map className="w-3.5 h-3.5" />
                            Interactive Map
                          </button>
                          <button
                            onClick={() => setViewMode("feed")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer ${
                              viewMode === "feed" 
                                ? "bg-teal-50 text-teal-700" 
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            <List className="w-3.5 h-3.5" />
                            Tickets Feed
                          </button>
                        </div>

                        {/* Floating Report Trigger */}
                        <button
                          id="btn-trigger-report-form"
                          onClick={() => setShowReportForm(true)}
                          className="bg-slate-800 hover:bg-slate-950 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          Report Issue
                        </button>
                      </div>
                    </div>

                    {/* FILTERS CONTROL DESK */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Filter className="w-4 h-4 text-slate-400" />
                          Filter Community Board
                        </span>
                        <button
                          onClick={clearFilters}
                          className="text-[10px] font-bold text-slate-400 hover:text-teal-600 underline cursor-pointer"
                        >
                          Clear All Filters
                        </button>
                      </div>

                      {/* Inputs Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                        {/* City */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block uppercase">City</label>
                          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="w-full text-xs bg-slate-50 border rounded-xl px-2.5 py-2 focus:outline-none">
                            <option value="all">All Cities</option>
                            <option value="Bengaluru">Bengaluru</option>
                            <option value="Chennai">Chennai</option>
                            <option value="Mumbai">Mumbai</option>
                            <option value="Delhi">Delhi</option>
                          </select>
                        </div>

                        {/* Category */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block uppercase">Category</label>
                          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full text-xs bg-slate-50 border rounded-xl px-2.5 py-2 focus:outline-none">
                            <option value="all">All Categories</option>
                            <option value="pothole">Pothole</option>
                            <option value="garbage">Garbage</option>
                            <option value="streetlight">Streetlight</option>
                            <option value="water">Water supply</option>
                            <option value="electricity">Electricity</option>
                            <option value="sewage">Sewage</option>
                            <option value="encroachment">Encroachment</option>
                          </select>
                        </div>

                        {/* Status */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block uppercase">Status</label>
                          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full text-xs bg-slate-50 border rounded-xl px-2.5 py-2 focus:outline-none">
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="validated">Validated</option>
                            <option value="assigned">Assigned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>

                        {/* Severity */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block uppercase">Severity</label>
                          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="w-full text-xs bg-slate-50 border rounded-xl px-2.5 py-2 focus:outline-none">
                            <option value="all">All Severities</option>
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Severity</option>
                            <option value="high">High Severity</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>

                        {/* Query Search */}
                        <div className="space-y-1 col-span-2 md:col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 block uppercase">Search</label>
                          <input
                            type="text"
                            placeholder="Search street, title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs bg-slate-50 border rounded-xl px-2.5 py-2 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* RESULTS VIEWPORT */}
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-3">
                        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-semibold text-slate-400">Syncing Civic Board...</p>
                      </div>
                    ) : (
                      <>
                        {/* MAP MODE LAYOUT */}
                        {viewMode === "map" && (
                          <div className="relative rounded-3xl border border-slate-200 overflow-hidden shadow-md flex flex-col md:flex-row h-[550px] bg-slate-100">
                            {/* Interactive map */}
                            <div className="flex-1 h-full relative">
                              <IssueMap
                                reports={reports}
                                interactive={false}
                                onSelectReport={handleMapPinSelected}
                              />
                            </div>

                            {/* Slide drawer preview card inside layout */}
                            {selectedReportForDrawer && (
                              <div className="absolute bottom-4 left-4 right-4 md:static md:w-80 md:h-full md:border-l md:border-slate-200 bg-white p-4 shrink-0 flex flex-col justify-between z-[400] overflow-y-auto animate-in slide-in-from-bottom duration-200 shadow-xl md:shadow-none">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">PIN PREVIEW:</span>
                                    <button
                                      onClick={() => setSelectedReportForDrawer(null)}
                                      className="text-xs font-bold text-slate-400 hover:text-slate-800"
                                    >
                                      Close ✕
                                    </button>
                                  </div>

                                  <img src={selectedReportForDrawer.photo_urls[0]} alt="Pic" referrerPolicy="no-referrer" className="w-full h-32 object-cover rounded-xl border bg-slate-50" />
                                  <div className="space-y-1.5">
                                    <div className="flex gap-1 items-center flex-wrap">
                                      <StatusBadge status={selectedReportForDrawer.status} className="text-[9px] py-0 px-1.5" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800 leading-tight line-clamp-2">{selectedReportForDrawer.title}</h3>
                                    <p className="text-[10px] text-slate-400 leading-normal line-clamp-3">{selectedReportForDrawer.description}</p>
                                  </div>

                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{selectedReportForDrawer.address}</span>
                                  </div>
                                </div>

                                <div className="pt-3 border-t flex gap-2 justify-between items-center mt-3">
                                  <button
                                    onClick={() => handleUpvote(selectedReportForDrawer.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-[10px] font-bold bg-slate-50 hover:bg-slate-100 transition text-slate-700 cursor-pointer"
                                  >
                                    Thumbs Up ({selectedReportForDrawer.upvotes_count})
                                  </button>
                                  <button
                                    onClick={() => setActiveReportId(selectedReportForDrawer.id)}
                                    className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow cursor-pointer"
                                  >
                                    Inspect Timeline
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* VERTICAL FEED MODE LAYOUT */}
                        {viewMode === "feed" && (
                          <div className="space-y-4">
                            {reports.length === 0 ? (
                              <div className="bg-white rounded-3xl border p-12 text-center space-y-3">
                                <Grid className="w-10 h-10 text-slate-300 mx-auto" />
                                <h3 className="text-sm font-bold text-slate-800">No active reports match your selection.</h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                                  Try clearing some filter criteria, looking up another city, or file a brand new local issue to test!
                                </p>
                              </div>
                            ) : (
                              reports.map((rep) => (
                                <ReportCard
                                  key={rep.id}
                                  report={rep}
                                  currentUserId={currentProfile.id}
                                  hasUpvoted={rep.upvoted_by_user || false}
                                  onUpvote={handleUpvote}
                                  onViewDetails={(id) => setActiveReportId(id)}
                                />
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}

                  </div>
                )}

                {/* TAB 1.5: SOCIAL COMMUNITY ENGAGEMENT BOARD */}
                {activeTab === "community" && (
                  <CommunityFeed
                    currentUserId={currentProfile.id}
                    onViewReport={(id) => {
                      setActiveReportId(id);
                    }}
                    onUpdateCount={() => {
                      fetchReports();
                      fetchActiveProfile();
                      setNotifTrigger(prev => prev + 1);
                    }}
                  />
                )}

                {/* TAB 2: PERSONAL CITIZEN FILING HISTORY */}
                {activeTab === "history" && (
                  <UserReportHistory 
                    currentUserId={currentProfile.id} 
                    onViewReport={(id) => {
                      setActiveReportId(id);
                    }}
                    onTriggerNewReport={() => {
                      setShowReportForm(true);
                      setActiveTab("map-feed");
                    }}
                  />
                )}

                {/* TAB 2.5: ECO ARCADE MINI-GAMES FOR CITIZEN AWARENESS */}
                {activeTab === "arcade" && (
                  <CleanlinessGame 
                    currentUserId={currentProfile.id}
                    onRewardXP={() => {
                      fetchActiveProfile();
                      setNotifTrigger(prev => prev + 1);
                    }}
                  />
                )}

                {/* TAB 2.7: FIX-IT BOUNTIES MARKETPLACE */}
                {activeTab === "bounties" && (
                  <BountiesMarketplace 
                    currentUserId={currentProfile.id}
                    onRewardXP={() => {
                      fetchActiveProfile();
                      setNotifTrigger(prev => prev + 1);
                    }}
                  />
                )}

                {/* TAB 3: USER PROFILE ENGAGEMENT HUB */}
                {activeTab === "dashboard" && (
                  <Dashboard 
                    currentUserId={currentProfile.id} 
                    onViewReport={(id) => {
                      setActiveReportId(id);
                      setActiveTab("map-feed");
                    }}
                  />
                )}
              </>
            )}
          </>
        )}

      </main>

      {/* Footer copyright */}
      <footer className={`mt-auto py-5 border-t text-center text-[11px] font-semibold transition-colors duration-300 ${
        isAdmin ? "bg-slate-950 border-slate-800 text-slate-500" : "bg-white border-slate-200/80 text-slate-400"
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© 2026 SpotseReport Civic Engagement Foundation. All rights reserved.</span>
          <span className={`flex gap-2 ${isAdmin ? "text-rose-400" : "text-teal-600"}`}>
            <span>Spot It.</span>
            <span>•</span>
            <span>Report It.</span>
            <span>•</span>
            <span>Resolve It.</span>
          </span>
        </div>
      </footer>

      {/* FLOATING ECO-BUDDY AI CHATBOT IN EVERY INTERFACE */}
      {currentProfile && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          <div
            className={`w-[360px] sm:w-[420px] max-w-[calc(100vw-2rem)] shadow-2xl overflow-hidden rounded-3xl bg-white transition-all duration-300 transform origin-bottom-right ${
              showFloatingChat 
                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" 
                : "opacity-0 scale-95 translate-y-4 pointer-events-none h-0"
            }`}
          >
            <EcoBuddyChat
              currentUserId={currentProfile.id}
              onRewardXP={() => {
                fetchActiveProfile();
                setNotifTrigger(prev => prev + 1);
              }}
            />
          </div>

          <button
            onClick={() => setShowFloatingChat(prev => !prev)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300 cursor-pointer ${
              showFloatingChat 
                ? "bg-slate-800 text-white hover:bg-slate-900" 
                : "bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105"
            }`}
            title="Chat with Eco-Buddy AI"
          >
            {showFloatingChat ? (
              <X className="w-6 h-6" />
            ) : (
              <div className="relative">
                <Bot className="w-6 h-6 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-bounce" />
              </div>
            )}
          </button>
        </div>
      )}

      {/* ROLE SWITCH CONFIRMATION MODAL */}
      {showRoleConfirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                pendingRole === "admin" ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-teal-50 text-teal-600 border border-teal-100"
              }`}>
                {pendingRole === "admin" ? <ShieldAlert className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 leading-none">
                  Confirm Role Switch
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-1">
                  SpotseReport Security Safeguard
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              {pendingRole === "admin" ? (
                <span>
                  Are you sure you want to switch to <b>Officer Mode</b>? This will redirect you to the administrative desk and localized resolution maps. Your current active report forms or drafts will be saved.
                </span>
              ) : (
                <span>
                  Are you sure you want to switch back to <b>Citizen Mode</b>? This will return you to the public community feed, civic reporting tools, and the Eco Arcade center.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowRoleConfirmModal(false);
                  setPendingRole(null);
                }}
                className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs py-2.5 px-4 rounded-xl transition border cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmRoleToggle}
                className={`text-white font-black text-xs py-2.5 px-4 rounded-xl transition cursor-pointer ${
                  pendingRole === "admin" 
                    ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800" 
                    : "bg-teal-600 hover:bg-teal-700 active:bg-teal-800"
                }`}
              >
                Confirm Switch
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
