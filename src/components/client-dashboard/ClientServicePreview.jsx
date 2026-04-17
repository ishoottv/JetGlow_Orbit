import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { getServiceStatusLabel } from "@/lib/serviceStatusLabels";

const statusMap = {
  Green: getServiceStatusLabel("Green"),
  Amber: getServiceStatusLabel("Amber"),
  Red: getServiceStatusLabel("Red"),
  "No Interval": "Not Monitored",
};

const statusColors = {
  Green: "bg-green-500/10 text-green-300 border-green-500/30",
  Amber: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  Red: "bg-red-500/10 text-red-300 border-red-500/30",
  "No Interval": "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

const driverMap = {
  days: "Driven by Time",
  hours: "Driven by Flight Hours",
  cycles: "Driven by Cycles",
};

export default function ClientServicePreview({ services = [], aircraftId = null }) {
  const preview = services.slice(0, 5);

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-800/30 p-8 backdrop-blur-sm">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-100">Service Status</h2>
        <p className="text-sm text-gray-400 mt-2">
          Individual service categories and their current condition within the JetGlow ORBIT
          program.
        </p>
      </div>

      <div className="space-y-3">
        {preview.length > 0 ? (
          preview.map((service, idx) => (
            <div
              key={service.id || idx}
              className="rounded-lg border border-gray-700/30 bg-gray-900/40 p-4 hover:bg-gray-900/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-100 text-sm">{service.service_name}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span
                      className={`inline-block px-2 py-1 rounded-md text-xs font-semibold border ${
                        statusColors[service.orbit_service_status]
                      }`}
                    >
                      {statusMap[service.orbit_service_status] || service.orbit_service_status}
                    </span>
                    {service.due_by && (
                      <span className="text-xs text-gray-500">
                        {driverMap[service.due_by] || service.due_by}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-300">
                    {Math.round((service.service_trigger_score || 0) * 100)}%
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm py-4">No services tracked.</p>
        )}
      </div>

      {services.length > 5 && aircraftId && (
        <Link
          to={`/aircraft/${aircraftId}`}
          className="mt-6 inline-flex items-center gap-2 text-yellow-500 hover:text-yellow-400 transition-colors font-semibold text-sm"
        >
          View All Services
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
