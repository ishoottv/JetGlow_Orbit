import React, { useState } from "react";
import { ChevronDown, AlertTriangle } from "lucide-react";

export default function ServiceCountAuditPanel({ aircraft, serviceStatus = [] }) {
  const [expanded, setExpanded] = useState(false);

  // Counts from Aircraft entity (what Service Attention Summary shows)
  const storedCounts = {
    activeAttention: aircraft?.active_attention_count || 0,
    overdue: aircraft?.overdue_count || 0,
    dueSoon: aircraft?.due_soon_count || 0,
    healthy: aircraft?.healthy_count || 0,
  };

  // Recalculate from actual serviceStatus records
  const calculatedCounts = {
    activeAttention: serviceStatus.filter(s => s.service_status === "Red").length,
    overdue: serviceStatus.filter(s => s.service_overdue === true).length,
    dueSoon: serviceStatus.filter(s => s.service_status === "Amber").length,
    healthy: serviceStatus.filter(s => s.service_status === "Green").length,
  };

  const hasDiscrepancy = 
    storedCounts.activeAttention !== calculatedCounts.activeAttention ||
    storedCounts.overdue !== calculatedCounts.overdue ||
    storedCounts.dueSoon !== calculatedCounts.dueSoon ||
    storedCounts.healthy !== calculatedCounts.healthy;

  if (!hasDiscrepancy && expanded === false) return null;

  return (
    <div className={`rounded-lg p-4 space-y-3 ${hasDiscrepancy ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center justify-between w-full font-semibold text-sm ${hasDiscrepancy ? 'text-red-900' : 'text-blue-900'}`}
      >
        <div className="flex items-center gap-2">
          {hasDiscrepancy && <AlertTriangle className="w-4 h-4" />}
          <span>📊 Service Count Audit {hasDiscrepancy ? '⚠️ MISMATCH' : '✓ OK'}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="space-y-4 text-xs font-mono bg-white rounded p-3">
          {/* Stored vs Calculated comparison */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left p-2 font-bold">Metric</th>
                <th className="text-right p-2 font-bold">Stored in Aircraft</th>
                <th className="text-right p-2 font-bold">Calculated from Records</th>
                <th className="text-right p-2 font-bold">Match?</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Active Attention (Red)", key: "activeAttention" },
                { label: "Overdue", key: "overdue" },
                { label: "Due Soon (Amber)", key: "dueSoon" },
                { label: "Healthy (Green)", key: "healthy" },
              ].map(({ label, key }) => {
                const stored = storedCounts[key];
                const calculated = calculatedCounts[key];
                const matches = stored === calculated;
                return (
                  <tr key={key} className={matches ? "bg-green-50" : "bg-red-50"}>
                    <td className="p-2 border-b">{label}</td>
                    <td className="p-2 text-right border-b font-bold">{stored}</td>
                    <td className="p-2 text-right border-b font-bold">{calculated}</td>
                    <td className="p-2 text-right border-b">
                      {matches ? "✓" : `✗ (diff: ${calculated - stored})`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Service Status Breakdown */}
          <div className="border-t pt-3 space-y-2">
            <div className="font-bold">Service Status Breakdown (from records):</div>
            {["Red", "Amber", "Green", "No Interval"].map(status => {
              const count = serviceStatus.filter(s => s.service_status === status).length;
              return (
                <div key={status} className="flex justify-between">
                  <span>{status}:</span>
                  <span className="font-bold">{count} services</span>
                </div>
              );
            })}
          </div>

          {/* Services with Red status */}
          {serviceStatus.filter(s => s.service_status === "Red").length > 0 && (
            <div className="border-t pt-3 space-y-2">
              <div className="font-bold text-red-900">🔴 RED Status Services:</div>
              <div className="space-y-1 text-xs">
                {serviceStatus
                  .filter(s => s.service_status === "Red")
                  .map(s => (
                    <div key={s.id} className="bg-red-50 p-1 rounded">
                      {s.service_name} — Score: {(s.service_trigger_score || 0).toFixed(3)}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {hasDiscrepancy && (
            <div className="border-t pt-3 bg-red-100 p-2 rounded text-red-900">
              <div className="font-bold">⚠️ ACTION NEEDED:</div>
              <div>Aircraft record is stale. Service counts were not recalculated after the last service trigger update.</div>
              <div className="text-xs mt-1">This may happen if:</div>
              <ul className="text-xs list-disc pl-4 mt-1">
                <li>Service was completed but recalcOrbit() was not called</li>
                <li>calculateServiceTriggers() was skipped after a RESET</li>
                <li>A background function failed silently</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}