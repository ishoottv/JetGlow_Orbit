import React from "react";
import { ArrowRight, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

function getDayLabel(daysRemaining, isOverdue) {
  if (isOverdue) return { text: "Overdue", urgent: true };
  if (daysRemaining === null) return { text: "Timing TBD", urgent: false };
  if (daysRemaining <= 0) return { text: "Due now", urgent: true };
  if (daysRemaining <= 3) return { text: `${daysRemaining}d`, urgent: true };
  if (daysRemaining <= 14) return { text: `${daysRemaining}d`, urgent: false };
  return { text: `~${Math.round(daysRemaining / 7)}w`, urgent: false };
}

export default function NextServiceCard({
  services = [], // array of { service_name, days_remaining, service_trigger_score, service_overdue }
  onRequestService = null,
}) {
  if (!services || services.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="w-8 h-8 flex-shrink-0 mt-1 text-green-600" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-700">All Services on Schedule</h3>
            <p className="text-sm text-slate-700 mt-2">
              All primary care items are currently in a healthy range. No immediate service action is required at this time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasUrgent = services.some(s => s.service_overdue || (s.days_remaining !== null && s.days_remaining <= 3));
  const borderColor = hasUrgent ? "border-red-200" : "border-amber-200";
  const bgColor = hasUrgent ? "bg-red-50" : "bg-amber-50";
  const headerColor = hasUrgent ? "text-red-600" : "text-amber-600";

  return (
    <div className={cn("rounded-2xl border-2 p-8 shadow-sm", bgColor, borderColor)}>
      <div className="space-y-4">
        <div>
          <p className={cn("text-xs font-bold uppercase tracking-wide", headerColor)}>
            Recommended Services
          </p>
        </div>

        <div className="space-y-2">
          {services.map((s, i) => {
            const { text, urgent } = getDayLabel(s.days_remaining, s.service_overdue);
            return (
              <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-black/10 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  {urgent
                    ? <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                    : <Clock className="w-4 h-4 flex-shrink-0 text-amber-500" />
                  }
                  <p className="text-sm font-semibold text-slate-800 truncate">{s.service_name}</p>
                </div>
                <span className={cn(
                  "text-xs font-bold flex-shrink-0 px-2 py-0.5 rounded-full",
                  urgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                )}>
                  {text}
                </span>
              </div>
            );
          })}
        </div>

        {onRequestService && (
          <button
            onClick={onRequestService}
            className={cn(
              "w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all",
              "flex items-center justify-center gap-2",
              hasUrgent ? "bg-red-600 hover:bg-red-700 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
            )}
          >
            Request Service
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}