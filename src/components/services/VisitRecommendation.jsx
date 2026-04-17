import React from "react";
import { AlertCircle, CheckCircle2, Zap } from "lucide-react";
import { isCoreMonthlyService } from "@/lib/serviceClassification";

export default function VisitRecommendation({ services = [] }) {
  if (!services || services.length === 0) {
    return null;
  }

  // Filter recommended services: show Green visit-evaluated only if mandatory or within 10 days of next service
  const recommended = services.filter(s => {
    if (!s.recommended_this_visit) return false;
    
    // If not Green, always show
    if (s.service_status !== "Green") return true;
    
    // Core monthly services should stay visible when they're part of the standard visit cadence.
    if (isCoreMonthlyService(s)) return true;
    
    // For Green services: only show if within 10 days of next service
    const daysRemaining = (s.applicable_day_interval || 0) - (s.days_since_last_service || 0);
    return daysRemaining <= 10;
  });
  const amberRecommended = recommended.filter(s => s.service_status === "Amber").length;
  const redRecommended = recommended.filter(s => s.service_status === "Red").length;
  const anyRedService = services.filter(s => s.service_status === "Red").length;

  // Determine visit level
  let visitLevel = "No service needed yet";
  let icon = null;
  let bgColor = "bg-green-50";
  let borderColor = "border-green-200";
  let textColor = "text-green-700";

  if (anyRedService > 0) {
    visitLevel = "Schedule ORBIT Heavy visit";
    icon = AlertCircle;
    bgColor = "bg-red-50";
    borderColor = "border-red-200";
    textColor = "text-red-700";
  } else if (redRecommended > 0 || amberRecommended >= 2) {
    visitLevel = "Schedule ORBIT Maintenance visit";
    icon = Zap;
    bgColor = "bg-amber-50";
    borderColor = "border-amber-200";
    textColor = "text-amber-700";
  } else if (recommended.length > 0) {
    visitLevel = "Schedule ORBIT Light visit";
    icon = CheckCircle2;
    bgColor = "bg-blue-50";
    borderColor = "border-blue-200";
    textColor = "text-blue-700";
  }

  const Icon = icon || CheckCircle2;

  return (
    <div className={`border ${borderColor} ${bgColor} rounded-2xl p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`w-5 h-5 ${textColor}`} />
        <h3 className={`font-bold text-lg ${textColor}`}>{visitLevel}</h3>
      </div>

      {recommended.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Services Due:</p>
            <div className="space-y-1">
              {recommended.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    s.service_status === "Red" ? "bg-red-500" : "bg-amber-500"
                  }`} />
                  <span className="text-sm">
                    <span className="font-semibold">{s.service_name}</span>
                    {s.condition_override_status !== "none" && (
                      <span className="text-xs text-muted-foreground"> — {s.override_reason || s.condition_override_status}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
