import React from "react";
import { rankServices, getWorstService } from "@/lib/serviceRankingTieBreaker";
import PremiumConditionCard from "./PremiumConditionCard";
import NextServiceCard from "./NextServiceCard";
import ServiceAttentionCard from "./ServiceAttentionCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { getServiceStatusLabel } from "@/lib/serviceStatusLabels";

export default function PremiumClientPortal({
  aircraft = {},
  serviceStatuses = [],
  onRequestService = null,
  showRequestService = true,
}) {
  // Rank services deterministically
  const rankedServices = rankServices(serviceStatuses);

  // Get all actionable services
  const actionableServices = rankedServices.filter(
    s => s.service_status !== "No Interval" && s.recommended_action && s.recommended_action !== "none"
  );

  // Get attention service (first Red or Amber that isn't too far out)
  const attentionService = rankedServices.find(
    s => (s.service_status === "Red" || s.service_status === "Amber") && 
        (s.service_overdue || (s.days_remaining !== null && s.days_remaining <= 7))
  ) || null;

  // Get last completed service date
  const lastEventDate = aircraft.last_orbit_baseline_date || null;

  const handleRequestService = () => {
    if (onRequestService) {
      onRequestService();
    } else {
      // Fallback: scroll to request section or show modal
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Three Top Status Boxes */}
      <div className="grid lg:grid-cols-3 gap-6">
        <PremiumConditionCard
          orbitStatus={aircraft.orbit_status || "Green"}
          lastServiceDate={lastEventDate}
          aircraftName={aircraft.tail_number}
        />
        <NextServiceCard
          services={actionableServices}
          onRequestService={showRequestService ? handleRequestService : null}
        />

        <ServiceAttentionCard
          attentionService={attentionService ? { serviceName: attentionService.service_name } : null}
          onRequestService={showRequestService ? handleRequestService : null}
        />
      </div>

      {/* Service Window Status */}
      {rankedServices.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Service Window Status</h3>
              <p className="text-sm text-slate-600 mt-1">
                Overview of your aircraft's current care status across all maintenance items.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {rankedServices.filter(s => s.service_status === "Green").length}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-1 uppercase tracking-wide">{getServiceStatusLabel("Green")}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-600">
                  {rankedServices.filter(s => s.service_status === "Amber").length}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-1 uppercase tracking-wide">{getServiceStatusLabel("Amber")}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {rankedServices.filter(s => s.service_status === "Red").length}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-1 uppercase tracking-wide">{getServiceStatusLabel("Red")}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-400">
                  {rankedServices.filter(s => s.service_status === "No Interval").length}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-1 uppercase tracking-wide">No Interval</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
