import React from "react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors = {
  Green: { bg: "bg-green-50", border: "border-green-200", dot: "bg-green-500", text: "text-green-700" },
  Amber: { bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", text: "text-amber-700" },
  Red: { bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", text: "text-red-700" },
};

const statusIcons = {
  Green: CheckCircle2,
  Amber: Clock,
  Red: AlertCircle,
};

export default function ServiceStatusTable({ services = [] }) {
  if (!services || services.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <p className="text-muted-foreground text-sm">No service status records found</p>
      </div>
    );
  }

  // Two-level sort: first by status group, then by service_trigger_score descending
  const statusOrder = { "Red": 0, "Amber": 1, "Green": 2, "No Interval": 3 };
  const sortedServices = [...services].sort((a, b) => {
    const statusA = statusOrder[a.service_status] !== undefined ? statusOrder[a.service_status] : 4;
    const statusB = statusOrder[b.service_status] !== undefined ? statusOrder[b.service_status] : 4;
    
    if (statusA !== statusB) {
      return statusA - statusB;
    }
    // Within same status group, sort by service_trigger_score descending
    return (b.service_trigger_score || 0) - (a.service_trigger_score || 0);
  });

  // Group by status for display
  const grouped = sortedServices.reduce((acc, service) => {
    const status = service.service_status || "No Interval";
    if (!acc[status]) acc[status] = [];
    acc[status].push(service);
    return acc;
  }, {});

  const statusOrder_display = ["Red", "Amber", "Green", "No Interval"];

  return (
    <div className="space-y-6">
      {statusOrder_display.map(statusGroup => {
        if (!grouped[statusGroup] || grouped[statusGroup].length === 0) return null;
        
        const groupServices = grouped[statusGroup];
        const groupColors = statusColors[statusGroup] || { bg: "bg-gray-50", border: "border-gray-200", dot: "bg-gray-500", text: "text-gray-700" };
        const GroupIcon = statusIcons[statusGroup];

        return (
          <div key={statusGroup} className="space-y-3">
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-semibold", groupColors.bg, groupColors.border, groupColors.text)}>
              {GroupIcon && <GroupIcon className="w-4 h-4" />}
              {statusGroup}
            </div>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {["Service", "Score", "Driver", "Details"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groupServices.map(service => {
                    const colors = statusColors[service.service_status] || statusColors.Green;
                    const Icon = statusIcons[service.service_status];
                    const driverText = service.due_by || service.trigger_source || "—";
                    
                    return (
                      <tr key={service.id} className={cn("hover:bg-muted/30 transition-colors", colors.bg)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{service.service_name}</p>
                              <p className="text-xs text-muted-foreground">{service.service_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-base">
                          {Math.round((service.service_trigger_score || 0) * 100)}%
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold capitalize">
                          {driverText}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {service.last_service_date 
                            ? `${Math.ceil(service.days_since_last_service || 0)} days ago`
                            : "No service"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}