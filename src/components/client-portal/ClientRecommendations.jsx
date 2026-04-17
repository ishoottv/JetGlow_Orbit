import React from "react";
import { AlertCircle, Clock, CheckCircle2, Zap } from "lucide-react";

export default function ClientRecommendations({ services = [] }) {
  if (!services || services.length === 0) return null;

  const overdue = services.filter(s => s.service_status === "Red");
  const dueSoon = services.filter(s => s.service_status === "Amber");
  const recommended = services.filter(s => s.recommended_this_visit && s.service_status === "Green");

  const allClear = overdue.length === 0 && dueSoon.length === 0 && recommended.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Recommendations</h2>
        <p className="text-sm text-muted-foreground mt-1">What your aircraft needs now and next</p>
      </div>

      {allClear ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-green-900">All Services Current</h3>
            <p className="text-sm text-green-800 mt-1">
              Your aircraft is in excellent condition. No services are overdue or approaching their due interval.
              Your ORBIT program is working as intended.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {overdue.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <h3 className="font-bold text-red-900">Service Required Now</h3>
              </div>
              <div className="space-y-2 pl-7">
                {overdue.map(s => (
                  <div key={s.id}>
                    <p className="font-semibold text-sm text-red-900">{s.service_name}</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      This service is overdue. Please contact JetGlow Aviation to schedule your ORBIT visit as soon as possible.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dueSoon.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <h3 className="font-bold text-amber-900">Due Soon — Schedule Within 2–4 Weeks</h3>
              </div>
              <div className="space-y-2 pl-7">
                {dueSoon.map(s => (
                  <div key={s.id}>
                    <p className="font-semibold text-sm text-amber-900">{s.service_name}</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Approaching its service interval. Plan to schedule this in the near future to stay on track.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommended.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <h3 className="font-bold text-blue-900">Recommended for Next Visit</h3>
              </div>
              <div className="space-y-2 pl-7">
                {recommended.map(s => (
                  <div key={s.id}>
                    <p className="font-semibold text-sm text-blue-900">{s.service_name}</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Recommended to include at your next scheduled ORBIT visit.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}