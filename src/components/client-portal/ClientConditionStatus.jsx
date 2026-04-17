import React from "react";
import { format, addDays } from "date-fns";
import { getServiceStatusLabel } from "@/lib/serviceStatusLabels";

const STATUS_STYLES = {
  Green: { bar: "bg-green-500", badge: "bg-green-100 text-green-700 border-green-200" },
  Amber: { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  Red:   { bar: "bg-red-500",   badge: "bg-red-100 text-red-700 border-red-200" },
};

function getPrimaryMetric(service) {
  const dayScore = service.applicable_day_interval > 0 ? service.days_since_last_service / service.applicable_day_interval : 0;
  const hourScore = service.applicable_hour_interval > 0 ? service.hours_since_last_service / service.applicable_hour_interval : 0;
  const cycleScore = service.applicable_cycle_interval > 0 ? service.cycles_since_last_service / service.applicable_cycle_interval : 0;

  const maxScore = Math.max(dayScore, hourScore, cycleScore);

  let method = "Days";
  let current = service.days_since_last_service || 0;
  let interval = service.applicable_day_interval || 0;

  if (hourScore >= dayScore && hourScore >= cycleScore && service.applicable_hour_interval > 0) {
    method = "Hours";
    current = (service.hours_since_last_service || 0).toFixed(1);
    interval = (service.applicable_hour_interval || 0).toFixed(0);
  } else if (cycleScore >= dayScore && cycleScore >= hourScore && service.applicable_cycle_interval > 0) {
    method = "Cycles";
    current = service.cycles_since_last_service || 0;
    interval = service.applicable_cycle_interval || 0;
  }

  const progress = Math.min(100, maxScore * 100);

  // Estimate next due date from last service date + day interval
  let nextDue = null;
  if (service.last_service_date && service.applicable_day_interval > 0) {
    nextDue = addDays(new Date(service.last_service_date), Math.round(service.applicable_day_interval));
  }

  return { method, current, interval, progress, nextDue };
}

export default function ClientConditionStatus({ services = [] }) {
  const activeServices = services.filter(
    s => s.applicable_day_interval > 0 || s.applicable_hour_interval > 0 || s.applicable_cycle_interval > 0
  );

  if (activeServices.length === 0) return null;

  // Sort: Red first, then Amber, then Green
  const sorted = [...activeServices].sort((a, b) => {
    const order = { Red: 0, Amber: 1, Green: 2 };
    return (order[a.service_status] ?? 2) - (order[b.service_status] ?? 2);
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Condition Status</h2>
        <p className="text-sm text-muted-foreground mt-1">Progress tracking for all monitored services</p>
      </div>

      <div className="space-y-3">
        {sorted.map(service => {
          const { method, current, interval, progress, nextDue } = getPrimaryMetric(service);
          const style = STATUS_STYLES[service.service_status] || STATUS_STYLES.Green;

          return (
            <div key={service.id} className="bg-card border border-border rounded-2xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm leading-tight">{service.service_name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Tracked by {method}</p>
                </div>
                <span className={`text-xs font-semibold border rounded-full px-2.5 py-0.5 flex-shrink-0 ${style.badge}`}>
                  {getServiceStatusLabel(service.service_status)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{current} / {interval} {method.toLowerCase()}</span>
                  <span className="font-semibold">{Math.round(progress)}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${style.bar}`}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                {service.last_service_date && (
                  <span>Last: <span className="font-semibold text-foreground">{format(new Date(service.last_service_date), "MMM d, yyyy")}</span></span>
                )}
                {nextDue && (
                  <span>Next due: <span className="font-semibold text-foreground">{format(nextDue, "MMM d, yyyy")}</span></span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
