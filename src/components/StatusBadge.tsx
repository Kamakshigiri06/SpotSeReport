import React from "react";
import { IssueStatus, IssueSeverity } from "../types";
import { AlertTriangle, Clock, ShieldCheck, Truck, Wrench, CheckCircle, Ban } from "lucide-react";

interface StatusBadgeProps {
  status: IssueStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  let bgColor = "bg-amber-50 text-amber-700 border-amber-200";
  let Icon = Clock;
  let text = "Pending";

  switch (status) {
    case "pending":
      bgColor = "bg-amber-50 text-amber-700 border-amber-200/80";
      Icon = Clock;
      text = "Pending";
      break;
    case "validated":
      bgColor = "bg-blue-50 text-blue-700 border-blue-200/80";
      Icon = ShieldCheck;
      text = "Community Validated";
      break;
    case "assigned":
      bgColor = "bg-violet-50 text-violet-700 border-violet-200/80";
      Icon = Truck;
      text = "Dispatched / Assigned";
      break;
    case "in_progress":
      bgColor = "bg-orange-50 text-orange-700 border-orange-200/80";
      Icon = Wrench;
      text = "In Progress";
      break;
    case "resolved":
      bgColor = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      Icon = CheckCircle;
      text = "Resolved";
      break;
    case "rejected":
      bgColor = "bg-rose-50 text-rose-700 border-rose-200/80";
      Icon = Ban;
      text = "Rejected / Duplicate";
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${bgColor} ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {text}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: IssueSeverity;
  className?: string;
}

export function SeverityBadge({ severity, className = "" }: SeverityBadgeProps) {
  let bgColor = "bg-slate-50 text-slate-700 border-slate-200";
  let text = "Medium";

  switch (severity) {
    case "low":
      bgColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
      text = "Low Priority";
      break;
    case "medium":
      bgColor = "bg-amber-50 text-amber-700 border-amber-100";
      text = "Medium Severity";
      break;
    case "high":
      bgColor = "bg-orange-50 text-orange-700 border-orange-200";
      text = "High Severity";
      break;
    case "critical":
      bgColor = "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
      text = "Critical Emergency";
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded border ${bgColor} ${className}`}>
      {severity === "critical" && <AlertTriangle className="w-3 h-3 text-rose-600 animate-bounce" />}
      {text}
    </span>
  );
}
