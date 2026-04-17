import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function ServiceDebugPanel({ serviceStatus = [], aircraftId }) {
  const [expanded, setExpanded] = useState(false);

  // Find Full Brightwork Polish
  const brightwork = serviceStatus.find(s => s.service_name === "Full Brightwork Polish");

  if (!brightwork) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          Full Brightwork Polish service not found in status records.
        </p>
      </div>
    );
  }

  const triggerScores = {
    day: brightwork.due_by_days || 0,
    hour: brightwork.due_by_hours || 0,
    cycle: brightwork.due_by_cycles || 0,
  };

  const maxTrigger = Math.max(...Object.values(triggerScores));
  const drivingFactor = Object.keys(triggerScores).find(key => triggerScores[key] === maxTrigger);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full font-semibold text-sm text-blue-900"
      >
        <span>🔍 Service Debug: Full Brightwork Polish</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="space-y-3 text-xs font-mono bg-white rounded p-3 overflow-x-auto">
          <div className="space-y-2 border-b pb-2">
            <div>
              <span className="font-bold">last_service_date:</span>
              <br />
              {brightwork.last_service_date || "null"}
            </div>
            <div>
              <span className="font-bold">days_since_last_service:</span>
              <br />
              {brightwork.days_since_last_service || 0}
            </div>
            <div>
              <span className="font-bold">applicable_day_interval:</span>
              <br />
              {brightwork.applicable_day_interval || 0}
            </div>
          </div>

          <div className="space-y-2 border-b pb-2">
            <div>
              <span className="font-bold">hours_since_last_service:</span>
              <br />
              {brightwork.hours_since_last_service || 0}
            </div>
            <div>
              <span className="font-bold">applicable_hour_interval:</span>
              <br />
              {brightwork.applicable_hour_interval || 0}
            </div>
            <div>
              <span className="font-bold">due_by_hours:</span>
              <br />
              {brightwork.due_by_hours || 0}
            </div>
          </div>

          <div className="space-y-2 border-b pb-2">
            <div>
              <span className="font-bold">cycles_since_last_service:</span>
              <br />
              {brightwork.cycles_since_last_service || 0}
            </div>
            <div>
              <span className="font-bold">applicable_cycle_interval:</span>
              <br />
              {brightwork.applicable_cycle_interval || 0}
            </div>
            <div>
              <span className="font-bold">due_by_cycles:</span>
              <br />
              {brightwork.due_by_cycles || 0}
            </div>
          </div>

          <div className="space-y-2 border-b pb-2">
            <div>
              <span className="font-bold">due_by_days:</span>
              <br />
              {brightwork.due_by_days || 0}
            </div>
          </div>

          <div className="space-y-2 border-b pb-2 bg-red-50 p-2 rounded">
            <div>
              <span className="font-bold text-red-900">service_trigger_score:</span>
              <br />
              <span className="text-red-900 text-sm">
                {brightwork.service_trigger_score || 0}
              </span>
            </div>
            <div>
              <span className="font-bold text-red-900">service_status:</span>
              <br />
              <span className="text-red-900 text-sm">
                {brightwork.service_status || "Unknown"}
              </span>
            </div>
          </div>

          <div className="space-y-2 border-b pb-2">
            <div>
              <span className="font-bold">Trigger Score Breakdown:</span>
              <br />
              days: {triggerScores.day} | hours: {triggerScores.hour} | cycles:
              {triggerScores.cycle}
            </div>
            <div>
              <span className="font-bold">Max Trigger (driving factor):</span>
              <br />
              <span className="bg-yellow-100 px-2 py-1 rounded">
                {drivingFactor.toUpperCase()} = {maxTrigger}
              </span>
            </div>
          </div>

          <div className="space-y-2 bg-orange-50 p-2 rounded border border-orange-200">
            <div>
              <span className="font-bold text-orange-900">⚠️ Formula Used:</span>
              <br />
              <span className="text-orange-900 text-xs">
                MAX(due_by_days, due_by_hours, due_by_cycles)
                <br />
                = MAX({triggerScores.day}, {triggerScores.hour}, {triggerScores.cycle})
                <br />
                = {maxTrigger}
              </span>
            </div>
            <div>
              <span className="font-bold text-orange-900">Why selected as worst:</span>
              <br />
              <span className="text-orange-900 text-xs">
                This service has the highest trigger score among all services, making
                it the driving factor in aircraft condition assessment.
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-600 italic">
            Aircraft ID: {aircraftId}
            <br />
            Last calculated: {brightwork.last_calculated_at || "unknown"}
          </div>
        </div>
      )}
    </div>
  );
}