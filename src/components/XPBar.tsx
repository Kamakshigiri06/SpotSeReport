import React from "react";
import { Award, Zap } from "lucide-react";

export const BADGE_LEVELS = {
  Newcomer: { min: 0, max: 100, icon: "🌱", color: "text-emerald-500 bg-emerald-50 border-emerald-100" },
  Reporter: { min: 100, max: 500, icon: "📋", color: "text-blue-500 bg-blue-50 border-blue-100" },
  Validator: { min: 500, max: 1500, icon: "✅", color: "text-amber-500 bg-amber-50 border-amber-100" },
  Champion: { min: 1500, max: 5000, icon: "🏆", color: "text-indigo-500 bg-indigo-50 border-indigo-100" },
  Legend: { min: 5000, max: 1000000, icon: "⭐", color: "text-rose-500 bg-rose-50 border-rose-100" }
};

export function getBadgeDetails(xp: number) {
  if (xp >= 5000) {
    return {
      current: "Legend" as const,
      next: "Apex Civic Lord" as const, // Ultimate level
      min: 5000,
      max: 10000,
      icon: "⭐",
      progress: Math.min(100, ((xp - 5000) / 5000) * 100),
      color: "from-rose-500 to-amber-500 text-rose-600 bg-rose-50 border-rose-200"
    };
  } else if (xp >= 1500) {
    return {
      current: "Champion" as const,
      next: "Legend" as const,
      min: 1500,
      max: 5000,
      icon: "🏆",
      progress: ((xp - 1500) / (5000 - 1500)) * 100,
      color: "from-indigo-500 to-purple-600 text-indigo-600 bg-indigo-50 border-indigo-200"
    };
  } else if (xp >= 500) {
    return {
      current: "Validator" as const,
      next: "Champion" as const,
      min: 500,
      max: 1500,
      icon: "✅",
      progress: ((xp - 500) / (1500 - 500)) * 100,
      color: "from-amber-500 to-orange-500 text-amber-600 bg-amber-50 border-amber-200"
    };
  } else if (xp >= 100) {
    return {
      current: "Reporter" as const,
      next: "Validator" as const,
      min: 100,
      max: 500,
      icon: "📋",
      progress: ((xp - 100) / (500 - 100)) * 100,
      color: "from-blue-500 to-teal-500 text-blue-600 bg-blue-50 border-blue-200"
    };
  } else {
    return {
      current: "Newcomer" as const,
      next: "Reporter" as const,
      min: 0,
      max: 100,
      icon: "🌱",
      progress: (xp / 100) * 100,
      color: "from-emerald-500 to-teal-500 text-emerald-600 bg-emerald-50 border-emerald-200"
    };
  }
}

interface XPBarProps {
  xp: number;
  showLabels?: boolean;
}

export default function XPBar({ xp, showLabels = true }: XPBarProps) {
  const details = getBadgeDetails(xp);
  const remaining = details.max - xp;

  return (
    <div className="w-full font-sans">
      {showLabels && (
        <div className="flex justify-between items-end mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">{details.icon}</span>
            <div>
              <span className="text-sm font-bold text-slate-800">{details.current}</span>
              <span className="text-[10px] text-slate-400 block -mt-1">Active Rank Tier</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-800 flex items-center justify-end gap-0.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              {xp} <span className="text-slate-400 font-normal">XP</span>
            </span>
            {xp < 5000 ? (
              <span className="text-[10px] text-slate-500">
                {remaining} XP to <span className="font-semibold">{details.next}</span>
              </span>
            ) : (
              <span className="text-[10px] text-rose-500 font-semibold animate-pulse">Apex Legend Level</span>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar Container */}
      <div className="relative w-full h-3.5 bg-slate-100 rounded-full border border-slate-200/50 shadow-inner overflow-hidden">
        {/* Fill */}
        <div
          className={`h-full bg-gradient-to-r ${details.color.startsWith("from-") ? details.color.split(" ")[0] + " " + details.color.split(" ")[1] : "from-teal-500 to-emerald-500"} transition-all duration-500 ease-out`}
          style={{ width: `${details.progress}%` }}
        />
      </div>
    </div>
  );
}

interface BadgeDisplayProps {
  badgeLevel: keyof typeof BADGE_LEVELS;
  size?: "sm" | "md" | "lg";
}

export function BadgeDisplay({ badgeLevel, size = "md" }: BadgeDisplayProps) {
  const details = BADGE_LEVELS[badgeLevel] || BADGE_LEVELS.Newcomer;

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[9px] gap-0.5 border rounded",
    md: "px-2 py-0.5 text-xs gap-1 border-2 rounded-full",
    lg: "px-3.5 py-1 text-sm gap-1.5 border-2 rounded-xl"
  };

  return (
    <span className={`inline-flex items-center font-bold tracking-wide font-sans shadow-sm border ${details.color} ${sizeClasses[size]}`}>
      <span>{details.icon}</span>
      <span>{badgeLevel}</span>
    </span>
  );
}
