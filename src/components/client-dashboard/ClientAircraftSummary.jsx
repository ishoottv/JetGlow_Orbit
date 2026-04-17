import React from "react";
import { AlertCircle, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getServiceStatusLabel } from "@/lib/serviceStatusLabels";

/**
 * Premium aircraft condition summary for client-facing dashboard.
 * Reads aircraft-level orbit data (NOT recalculating service triggers).
 */
export default function ClientAircraftSummary({ aircraft = {}, serviceStatuses = [] }) {
  const {
    condition_index = 0,
    client_condition_label = "In Good Standing",
    client_condition_message = "",
    orbit_status = "Green",
    worst_service_name = null,
    worst_service_score = 0,
    worst_service_due_by = null,
    overdue_count = 0,
    due_soon_count = 0,
    healthy_count = 0,
    active_attention_count = 0,
  } = aircraft;

  const statusColors = {
    Green: "text-green-600",
    Amber: "text-amber-600",
    Red: "text-red-600",
  };

  const statusBgColors = {
    Green: "bg-green-50 border-green-200",
    Amber: "bg-amber-50 border-amber-200",
    Red: "bg-red-50 border-red-200",
  };

  const statusIcons = {
    Green: <CheckCircle2 className="w-6 h-6 text-green-600" />,
    Amber: <AlertCircle className="w-6 h-6 text-amber-600" />,
    Red: <XCircle className="w-6 h-6 text-red-600" />,
  };

  const getConditionColor = () => {
    if (condition_index >= 70) return "text-green-600";
    if (condition_index >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const getConditionBg = () => {
    if (condition_index >= 70) return "bg-green-50";
    if (condition_index >= 40) return "bg-amber-50";
    return "bg-red-50";
  };

  return (
    <div className="space-y-6">
      {/* Main Condition Overview */}
      <div className={cn("border rounded-2xl p-8", statusBgColors[orbit_status])}>
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {statusIcons[orbit_status]}
              <h2 className={cn("text-2xl font-bold", statusColors[orbit_status])}>
                {client_condition_label}
              </h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {client_condition_message}
            </p>
          </div>

          {/* Condition Index Display */}
          <div className={cn("rounded-2xl p-6 text-center min-w-fit", getConditionBg())}>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Condition Index
            </p>
            <p className={cn("text-4xl font-black mt-2", getConditionColor())}>
              {condition_index}
            </p>
            <p className="text-xs text-gray-600 mt-1">out of 100</p>
          </div>
        </div>
      </div>

      {/* Service Attention Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Attention */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
            Active Attention
          </p>
          <p className="text-3xl font-black mt-2 text-amber-700">
            {active_attention_count}
          </p>
          <p className="text-xs text-gray-600 mt-1">items requiring review</p>
        </div>

        {/* Overdue */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
            Overdue
          </p>
          <p className="text-3xl font-black mt-2 text-red-700">{overdue_count}</p>
          <p className="text-xs text-gray-600 mt-1">services due</p>
        </div>

        {/* Due Soon */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
            Due Soon
          </p>
          <p className="text-3xl font-black mt-2 text-amber-700">{due_soon_count}</p>
          <p className="text-xs text-gray-600 mt-1">approaching threshold</p>
        </div>

        {/* Healthy */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
            Healthy
          </p>
          <p className="text-3xl font-black mt-2 text-green-700">{healthy_count}</p>
          <p className="text-xs text-gray-600 mt-1">in good condition</p>
        </div>
      </div>

      {/* Priority Service Focus */}
      {worst_service_name && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
            <h3 className="text-lg font-bold text-blue-900">Priority Service Focus</h3>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Service Name
                </p>
                <p className="text-sm font-bold text-blue-900 mt-1">{worst_service_name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Score
                </p>
                <p className="text-sm font-bold text-blue-900 mt-1">
                  {(worst_service_score * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Measured By
                </p>
                <p className="text-sm font-bold text-blue-900 mt-1 capitalize">
                  {worst_service_due_by || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Status List */}
      {serviceStatuses.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-bold">Service Status Summary</h3>
            <p className="text-xs text-gray-600 mt-1">
              Showing all tracked services for your aircraft
            </p>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {serviceStatuses.map((service) => {
              const statusColor =
                service.orbit_service_status === "Red"
                  ? "text-red-700"
                  : service.orbit_service_status === "Amber"
                  ? "text-amber-700"
                  : service.orbit_service_status === "Green"
                  ? "text-green-700"
                  : "text-gray-500";

              const statusBg =
                service.orbit_service_status === "Red"
                  ? "bg-red-50"
                  : service.orbit_service_status === "Amber"
                  ? "bg-amber-50"
                  : service.orbit_service_status === "Green"
                  ? "bg-green-50"
                  : "bg-gray-50";

              return (
                <div key={service.id} className={`px-6 py-4 hover:${statusBg} transition-colors`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">
                        {service.service_name}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span
                          className={cn(
                            "inline-block px-2 py-1 rounded text-xs font-semibold",
                            statusBg,
                            statusColor
                          )}
                        >
                          {getServiceStatusLabel(service.orbit_service_status)}
                        </span>
                        {service.due_by && (
                          <span className="text-xs text-gray-600">
                            Measured by {service.due_by}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {(service.service_trigger_score * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">progress</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
