import React from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { getServiceStatusLabel } from "@/lib/serviceStatusLabels";

const STATUS_COLORS = {
  Green: "bg-green-100 text-green-700 border-green-200",
  Amber: "bg-amber-100 text-amber-700 border-amber-200",
  Red: "bg-red-100 text-red-700 border-red-200",
};

const TRACKING_METHOD = {
  day_interval: "Days",
  hour_interval: "Hours",
  cycle_interval: "Cycles",
};

export default function UpcomingServices({ services = [] }) {
  if (!services || services.length === 0) {
    return null;
  }

  // Filter out services with null intervals
  const activeServices = services.filter(
    s => s.day_interval || s.hour_interval || s.cycle_interval
  );

  if (activeServices.length === 0) {
    return null;
  }

  // Determine primary tracking method and progress
  const getServiceMetrics = (service) => {
    const dayScore = service.day_interval ? service.days_since_last_service / service.day_interval : 0;
    const hourScore = service.hour_interval ? service.hours_since_last_service / service.hour_interval : 0;
    const cycleScore = service.cycle_interval ? service.cycles_since_last_service / service.cycle_interval : 0;

    const maxScore = Math.max(dayScore, hourScore, cycleScore);

    let method = "Days";
    let current = service.days_since_last_service || 0;
    let interval = service.day_interval || 0;

    if (hourScore === maxScore && service.hour_interval) {
      method = "Hours";
      current = (service.hours_since_last_service || 0).toFixed(1);
      interval = service.hour_interval.toFixed(0);
    } else if (cycleScore === maxScore && service.cycle_interval) {
      method = "Cycles";
      current = service.cycles_since_last_service || 0;
      interval = service.cycle_interval || 0;
    }

    const progress = Math.min(100, (maxScore * 100));

    return { method, current, interval, progress };
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Service Schedule</h2>
        <p className="text-sm text-muted-foreground mt-1">Current progress toward next service</p>
      </div>

      <div className="space-y-3">
        {activeServices.map(service => {
          const { method, current, interval, progress } = getServiceMetrics(service);
          const lastDate = service.last_service_date ? new Date(service.last_service_date) : null;

          return (
            <div
              key={service.id}
              className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">{service.service_name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {method}
                    </Badge>
                  </div>
                  {lastDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last completed: {format(lastDate, "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                <Badge className={`${STATUS_COLORS[service.service_status] || STATUS_COLORS.Green} border`}>
                  {getServiceStatusLabel(service.service_status || "Green")}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {current} / {interval} {method.toLowerCase()}
                  </span>
                  <span className="font-semibold">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      progress >= 100
                        ? "bg-red-500"
                        : progress >= 80
                        ? "bg-amber-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
