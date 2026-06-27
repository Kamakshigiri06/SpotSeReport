import React, { useEffect, useState } from "react";
import { Report, IssueStatus, IssueSeverity } from "../types";
import { StatusBadge, SeverityBadge } from "./StatusBadge";
import { getSLARemaining } from "./ReportCard";
import { 
  ShieldAlert, CheckCircle, Truck, Wrench, Ban, Clock, 
  Search, MapPin, ArrowRight, Eye, RefreshCw, BarChart2, Star 
} from "lucide-react";

interface AdminPanelProps {
  currentUserId: string;
  onViewReport: (id: string) => void;
  onRefreshFeed?: () => void;
}

export default function AdminPanel({ currentUserId, onViewReport, onRefreshFeed }: AdminPanelProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals / Action states
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  // Form Fields
  const [authority, setAuthority] = useState("");
  const [slaHours, setSlaHours] = useState(48);
  const [newStatus, setNewStatus] = useState<IssueStatus>("pending");
  const [statusNote, setStatusNote] = useState("");
  const [resolutionPhoto, setResolutionPhoto] = useState("https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80");
  const [resolutionNote, setResolutionNote] = useState("");

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsRes = await fetch("/api/admin/stats");
      if (!statsRes.ok) throw new Error("Could not load admin metrics");
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch reports
      const url = `/api/reports?city=${cityFilter}&status=${statusFilter}&severity=${severityFilter}&query=${encodeURIComponent(searchQuery)}`;
      const reportsRes = await fetch(url);
      if (!reportsRes.ok) throw new Error("Could not load reports");
      const reportsData = await reportsRes.json();
      setReports(reportsData);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch administrator workspace. The database is resetting.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [cityFilter, statusFilter, severityFilter, searchQuery]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !authority) return;

    try {
      const res = await fetch(`/api/admin/reports/${selectedReport.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authority, sla_hours: Number(slaHours) })
      });

      if (res.ok) {
        setAssignModalOpen(false);
        setAuthority("");
        setSlaHours(48);
        setSelectedReport(null);
        fetchAdminData();
        if (onRefreshFeed) onRefreshFeed();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    try {
      const payload: any = { status: newStatus, note: statusNote };
      if (newStatus === "resolved") {
        payload.resolution_photo_url = resolutionPhoto;
        payload.resolution_note = resolutionNote;
      }

      const res = await fetch(`/api/admin/reports/${selectedReport.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatusModalOpen(false);
        setNewStatus("pending");
        setStatusNote("");
        setResolutionNote("");
        setSelectedReport(null);
        fetchAdminData();
        if (onRefreshFeed) onRefreshFeed();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 font-sans">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Entering Municipal Control Room...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md mx-auto space-y-4 font-sans">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">Connection Failed</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{error}</p>
        <button
          onClick={fetchAdminData}
          className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      
      {/* Upper Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
          {/* Total */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Issues</span>
            <h3 className="text-lg md:text-xl font-black text-slate-800 mt-1">{stats.totals.total}</h3>
          </div>
          {/* Pending */}
          <div className="bg-amber-50/20 p-4 rounded-xl border border-amber-100 shadow-xs">
            <span className="text-[10px] font-bold text-amber-600 block uppercase">Pending Triage</span>
            <h3 className="text-lg md:text-xl font-black text-amber-700 mt-1">{stats.totals.pending}</h3>
          </div>
          {/* Assigned */}
          <div className="bg-blue-50/20 p-4 rounded-xl border border-blue-100/80 shadow-xs">
            <span className="text-[10px] font-bold text-blue-600 block uppercase">Dispatched</span>
            <h3 className="text-lg md:text-xl font-black text-blue-700 mt-1">{stats.totals.assigned + stats.totals.validated}</h3>
          </div>
          {/* In Progress */}
          <div className="bg-orange-50/20 p-4 rounded-xl border border-orange-100 shadow-xs">
            <span className="text-[10px] font-bold text-orange-600 block uppercase">In Progress</span>
            <h3 className="text-lg md:text-xl font-black text-orange-700 mt-1">{stats.totals.inProgress}</h3>
          </div>
          {/* Resolved */}
          <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100 shadow-xs">
            <span className="text-[10px] font-bold text-emerald-600 block uppercase">Resolved</span>
            <h3 className="text-lg md:text-xl font-black text-emerald-700 mt-1">{stats.totals.resolved}</h3>
          </div>
          {/* Breached SLA */}
          <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-xl shadow-xs animate-pulse">
            <span className="text-[10px] font-bold text-rose-600 block uppercase">SLA Breaches</span>
            <h3 className="text-lg md:text-xl font-black text-rose-700 mt-1">{stats.breached_count}</h3>
          </div>
        </div>
      )}

      {/* Main filter interface */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">Dispatch Filters:</span>
          <button onClick={fetchAdminData} className="text-xs text-teal-600 hover:text-teal-700 font-bold inline-flex items-center gap-1 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* City */}
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="text-xs bg-slate-50 border rounded-xl px-3.5 py-2.5 focus:outline-none text-slate-600 font-medium">
            <option value="all">All Cities</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Chennai">Chennai</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Delhi">Delhi</option>
          </select>

          {/* Status */}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs bg-slate-50 border rounded-xl px-3.5 py-2.5 focus:outline-none text-slate-600 font-medium">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="validated">Community Validated</option>
            <option value="assigned">Dispatched / Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected / Duplicate</option>
          </select>

          {/* Severity */}
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="text-xs bg-slate-50 border rounded-xl px-3.5 py-2.5 focus:outline-none text-slate-600 font-medium">
            <option value="all">All Severities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Severity</option>
            <option value="high">High Severity</option>
            <option value="critical">Critical Emergency</option>
          </select>

          {/* Search Query */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search address or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Control table list */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-widest grid grid-cols-12 gap-4">
          <span className="col-span-5">Report Ticket</span>
          <span className="col-span-2 text-center">Severity</span>
          <span className="col-span-2 text-center">SLA Tracker</span>
          <span className="col-span-3 text-right">Actions</span>
        </div>

        <div className="divide-y divide-slate-150">
          {reports.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12">No reports matching the selected control filters.</p>
          ) : (
            reports.map((rep) => {
              const sla = getSLARemaining(rep.sla_deadline, rep.status);
              
              return (
                <div key={rep.id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-50/50">
                  {/* Info */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <img src={rep.photo_urls[0]} alt="Pic" referrerPolicy="no-referrer" className="w-10 h-10 object-cover rounded-xl shrink-0" />
                    <div className="min-w-0 text-xs">
                      <h4 className="font-bold text-slate-800 truncate">{rep.title}</h4>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">{rep.address} ({rep.city})</span>
                    </div>
                  </div>

                  {/* Severity */}
                  <div className="col-span-2 text-center">
                    <SeverityBadge severity={rep.severity} />
                  </div>

                  {/* SLA Countdown */}
                  <div className="col-span-2 text-center text-xs">
                    {sla ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${sla.color}`}>
                        {sla.text}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">No active SLA</span>
                    )}
                  </div>

                  {/* CTA Actions */}
                  <div className="col-span-3 text-right flex items-center justify-end gap-2 text-xs">
                    <button
                      onClick={() => onViewReport(rep.id)}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border text-slate-500 cursor-pointer"
                      title="Inspect Report Detail"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Dispatch authority trigger */}
                    {(rep.status === "pending" || rep.status === "validated") && (
                      <button
                        onClick={() => {
                          setSelectedReport(rep);
                          setAuthority(rep.ai_suggested_authority || "");
                          setAssignModalOpen(true);
                        }}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer"
                      >
                        Dispatch
                      </button>
                    )}

                    {/* Modify Status Trigger */}
                    {rep.status !== "pending" && rep.status !== "validated" && rep.status !== "resolved" && rep.status !== "rejected" && (
                      <button
                        onClick={() => {
                          setSelectedReport(rep);
                          setNewStatus(rep.status);
                          setStatusModalOpen(true);
                        }}
                        className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer"
                      >
                        Update State
                      </button>
                    )}

                    {rep.status === "resolved" && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 leading-none inline-flex items-center gap-1">
                        Resolved ✓
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* -------------------- */}
      {/* DISPATCH ASSIGN MODAL */}
      {/* -------------------- */}
      {assignModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-teal-600 text-white p-5">
              <h3 className="font-bold text-base">Assign Department Dispatch</h3>
              <p className="text-[11px] text-teal-100 mt-0.5">Route report and establish maximum target SLA completion time.</p>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-bold block">Assigned Issue:</span>
                <span className="text-slate-800 font-black block text-sm">{selectedReport.title}</span>
              </div>

              {/* Authority */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Municipal Authority / Agency Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Greater Chennai Corp - Electrical Team"
                  value={authority}
                  onChange={(e) => setAuthority(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 focus:outline-none font-semibold"
                />
              </div>

              {/* SLA Hours */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Resolution SLA hours:</label>
                <select
                  value={slaHours}
                  onChange={(e) => setSlaHours(Number(e.target.value))}
                  className="w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 focus:outline-none"
                >
                  <option value={24}>24 Hours (Immediate Priority)</option>
                  <option value={48}>48 Hours (Standard)</option>
                  <option value={72}>72 Hours (Intermediate)</option>
                  <option value={168}>168 Hours / 1 Week (Low priority)</option>
                </select>
              </div>

              {/* Row buttons */}
              <div className="pt-4 flex gap-3 justify-end text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAssignModalOpen(false);
                    setSelectedReport(null);
                  }}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  Dispatch Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- */}
      {/* MODIFY STATE MODAL (assigned/in-progress -> resolved) */}
      {/* -------------------- */}
      {statusModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-800 text-white p-5">
              <h3 className="font-bold text-base">Modify Operations State</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Track and update active maintenance workflows.</p>
            </div>

            <form onSubmit={handleStatusSubmit} className="p-6 space-y-4 text-xs">
              {/* Status field */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Move Ticket State To:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as IssueStatus)}
                  className="w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 focus:outline-none font-bold"
                >
                  <option value="assigned">Dispatched / Assigned</option>
                  <option value="in_progress">In Progress / Under Repair</option>
                  <option value="resolved">Resolved / Complete</option>
                  <option value="rejected">Rejected / Closed</option>
                </select>
              </div>

              {/* Notes field */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Audit Status Note:</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe active steps taken or audit remarks..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-3.5 py-2 focus:outline-none"
                />
              </div>

              {/* RESOLVED BLOCK: PHOTO & COMPLETION NOTE */}
              {newStatus === "resolved" && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-3">
                  <span className="font-bold text-emerald-800 text-[11px] block">Resolution proof attachments:</span>
                  
                  {/* Photo URL */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 block">Resolution Proof Photo URL:</label>
                    <input
                      type="text"
                      value={resolutionPhoto}
                      onChange={(e) => setResolutionPhoto(e.target.value)}
                      className="w-full bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
                    />
                  </div>

                  {/* Completion Notes */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 block">Citizen Resolution Notes:</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Detail repairs completed (e.g., pothole asphalt laid, light re-bulbed)..."
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      className="w-full bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Buttons row */}
              <div className="pt-4 flex gap-3 justify-end text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStatusModalOpen(false);
                    setSelectedReport(null);
                  }}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  Commit Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
