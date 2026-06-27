import React, { useEffect, useState } from "react";
import { Notification } from "../types";
import { Bell, ShieldAlert, CheckCircle, Clock, Zap, ThumbsUp, HelpCircle } from "lucide-react";

interface NotificationListProps {
  currentUserId: string;
  onNotificationClick: (reportId: string) => void;
  refreshTrigger?: number;
}

export default function NotificationList({ currentUserId, onNotificationClick, refreshTrigger = 0 }: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentUserId, refreshTrigger]);

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read", { method: "POST" });
      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemClick = async (notif: Notification) => {
    // Navigate immediately
    onNotificationClick(notif.report_id);
    setOpen(false);

    // Call server to mark single read if needed
    try {
      await fetch(`/api/notifications/${notif.id}/read`, { method: "POST" });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "status_change":
        return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
      case "validation_target":
        return <ThumbsUp className="w-4 h-4 text-blue-500 shrink-0" />;
      case "xp_earned":
        return <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />;
      case "sla_warning":
        return <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  return (
    <div className="relative font-sans">
      
      {/* Bell Trigger */}
      <button
        id="btn-notification-bell"
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition focus:outline-none cursor-pointer flex items-center justify-center"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span 
            id="notification-badge-dot" 
            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)] flex items-center justify-center text-[8px] font-black text-white"
            title={`${unreadCount} unread alerts`}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Modal */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden text-xs animate-in fade-in slide-in-from-top-3 duration-150">
            
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h4 className="font-bold">Civic Alerts Feed</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Real-time update stream</p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-teal-400 hover:text-teal-300 underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10 font-medium">No alerts available at the moment.</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`p-3.5 flex gap-3 items-start transition cursor-pointer ${
                      notif.is_read ? "bg-white hover:bg-slate-50/50" : "bg-teal-50/20 hover:bg-teal-50/35 border-l-2 border-teal-500"
                    }`}
                  >
                    {getNotifIcon(notif.type)}
                    <div className="flex-1 space-y-1">
                      <p className={`leading-normal ${notif.is_read ? "text-slate-600" : "text-slate-800 font-bold"}`}>
                        {notif.message}
                      </p>
                      <span className="text-[9px] text-slate-400 block font-semibold">{new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </>
      )}

    </div>
  );
}
