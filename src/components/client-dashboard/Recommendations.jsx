import React from "react";
import { AlertCircle, Clock, Zap, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Recommendations({ services = [] }) {
  if (!services || services.length === 0) {
    return null;
  }

  // Categorize services by urgency
  const overdue = services.filter(s => s.service_status === "Red");
  const dueSoon = services.filter(s => s.service_status === "Amber");
  const recommended = services.filter(s => s.recommended_this_visit && s.service_status !== "Green");

  if (overdue.length === 0 && dueSoon.length === 0 && recommended.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 flex items-start gap-4">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold">All Services Current</h3>
          <p className="text-sm text-muted-foreground mt-1">Your aircraft is in excellent condition with no urgent service needs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <h3 className="font-bold text-red-900">Service Attention Needed</h3>
          </div>
          <div className="space-y-2 pl-7">
            {overdue.map(service => (
              <div key={service.id} className="text-sm text-red-900">
                <p className="font-semibold">{service.service_name}</p>
                <p className="text-xs text-red-700 mt-0.5">This service is overdue and should be scheduled promptly.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Due Soon */}
      {dueSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <h3 className="font-bold text-amber-900">Services Due Soon</h3>
          </div>
          <div className="space-y-2 pl-7">
            {dueSoon.map(service => (
              <div key={service.id} className="text-sm text-amber-900">
                <p className="font-semibold">{service.service_name}</p>
                <p className="text-xs text-amber-700 mt-0.5">Plan to schedule this service within the next few weeks.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended */}
      {recommended.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h3 className="font-bold text-blue-900">Recommended Next Visit</h3>
          </div>
          <div className="space-y-2 pl-7">
            {recommended.map(service => (
              <div key={service.id} className="text-sm text-blue-900">
                <p className="font-semibold">{service.service_name}</p>
                <p className="text-xs text-blue-700 mt-0.5">Recommended to include in your next scheduled ORBIT visit.</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}