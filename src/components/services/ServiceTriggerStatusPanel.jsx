import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { rankServices } from "@/lib/serviceRankingTieBreaker";
import { Badge } from "@/components/ui/badge";
import { getEffectiveSchedule, getScheduleSummary } from "@/lib/serviceScheduleDisplay";
import { getServiceStatusLabel } from "@/lib/serviceStatusLabels";

const statusColors = {
  Red: "text-red-600 bg-red-100 border-red-200",
  Amber: "text-amber-600 bg-amber-100 border-amber-200",
  Green: "text-green-600 bg-green-100 border-green-200",
};

export default function ServiceTriggerStatusPanel({ serviceStatus = [] }) {
  // Sort services with deterministic tie-breaking logic
  const sortedServices = useMemo(() => {
    return rankServices(serviceStatus);
  }, [serviceStatus]);

  // Group services by work_class
  const grouped = useMemo(() => {
    const groups = {
      monthly: [],
      quarterly: [],
      semiannual: [],
      yearly: [],
    };
    sortedServices.forEach(s => {
      const wc = (s.work_class || "monthly").toLowerCase();
      if (groups[wc]) groups[wc].push(s);
    });
    return groups;
  }, [sortedServices]);

  if (!serviceStatus || serviceStatus.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <p className="text-muted-foreground text-sm">No service status records found</p>
      </div>
    );
  }

  const renderServiceItem = (service) => {
    const schedule = getEffectiveSchedule(service);
    const overrideApplied = service.tracking_source === "service_override";

    return (
      <div
        key={service.id}
        onClick={() => {}} // Placeholder for future modal interaction
        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{service.service_name}</p>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{service.service_code}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">{getScheduleSummary(service)}</Badge>
            <Badge variant="secondary" className="text-xs">{schedule.label}</Badge>
            {overrideApplied && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Override Applied</Badge>
            )}
          </div>
        </div>
        <Badge className={cn("text-xs flex-shrink-0", statusColors[service.service_status])}>
          {getServiceStatusLabel(service.service_status)}
        </Badge>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-bold text-lg">Service Status</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Current tracking status for all services.
        </p>
      </div>

      {grouped.monthly.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-primary">Core Monthly Services</h4>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Every Visit</Badge>
          </div>
          <div className="grid lg:grid-cols-3 gap-2">
            {grouped.monthly.map(renderServiceItem)}
          </div>
        </div>
      )}

      {grouped.quarterly.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Quarterly Condition Maintenance</h4>
            <Badge className="bg-slate-200 text-slate-700 border-slate-300 text-xs">Quarterly</Badge>
          </div>
          <div className="grid lg:grid-cols-3 gap-2">
            {grouped.quarterly.map(renderServiceItem)}
          </div>
        </div>
      )}

      {grouped.semiannual.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-teal-700">Semiannual Condition Maintenance</h4>
            <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-xs">Semiannual</Badge>
          </div>
          <div className="grid lg:grid-cols-3 gap-2">
            {grouped.semiannual.map(renderServiceItem)}
          </div>
        </div>
      )}

      {grouped.yearly.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-purple-700">Yearly Condition Maintenance</h4>
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">Annual</Badge>
          </div>
          <div className="grid lg:grid-cols-3 gap-2">
            {grouped.yearly.map(renderServiceItem)}
          </div>
        </div>
      )}

      {sortedServices.length === 0 && (
        <p className="text-xs text-muted-foreground py-8 text-center">No service data available</p>
      )}
    </div>
  );
}
