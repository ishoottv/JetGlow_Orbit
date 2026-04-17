import React from "react";
import { rankServices } from "@/lib/serviceRankingTieBreaker";
import { format, differenceInDays } from "date-fns";
import { ArrowLeft, AlertCircle, CheckCircle2, Clock, Phone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getServiceStatusLabel } from "@/lib/serviceStatusLabels";

const statusConfig = {
  green: { label: getServiceStatusLabel("Green"), color: "text-green-400", bgColor: "bg-green-950/40", borderColor: "border-green-900/40" },
  amber: { label: getServiceStatusLabel("Amber"), color: "text-amber-400", bgColor: "bg-amber-950/40", borderColor: "border-amber-900/40" },
  red: { label: getServiceStatusLabel("Red"), color: "text-red-400", bgColor: "bg-red-950/40", borderColor: "border-red-900/40" },
};

export default function PremiumExecutiveDashboard({
  aircraft = {},
  serviceStatuses = [],
  onRequestService = null,
}) {
  const navigate = useNavigate();
  
  // Defensive guard: ensure serviceStatuses is an array
  const safeServiceStatuses = Array.isArray(serviceStatuses) ? serviceStatuses : [];
  
  let rankedServices = [];
  try {
    rankedServices = rankServices(safeServiceStatuses);
    console.log("✅ PremiumExecutiveDashboard: rankServices succeeded, count:", rankedServices.length);
  } catch (err) {
    console.error("❌ PremiumExecutiveDashboard: rankServices failed:", err);
    rankedServices = [];
  }
  
  // Status mapping with defensive fallbacks
  const status = (aircraft?.orbit_status === "Red") ? "red" : (aircraft?.orbit_status === "Amber") ? "amber" : "green";
  const statusInfo = statusConfig[status] || statusConfig.green;
  
  // Calculate protection window with defensive checks
  const lastServiceDate = aircraft?.last_orbit_baseline_date;
  let daysElapsed = 0;
  try {
    daysElapsed = lastServiceDate ? differenceInDays(new Date(), new Date(lastServiceDate)) : 0;
  } catch (err) {
    console.warn("Error calculating days elapsed:", err);
    daysElapsed = 0;
  }
  const daysRemaining = Math.max(0, 30 - daysElapsed);
  const inProtectionWindow = daysRemaining > 0;
  
  // Get next service
  const nextService = rankedServices.find(s => s.service_status !== "No Interval") || null;
  
  // Service summary counts
  const attentionCount = rankedServices.filter(s => s.service_status === "Red").length;
  const overdueCount = rankedServices.filter(s => s.service_overdue).length;
  const dueSoonCount = rankedServices.filter(s => s.service_status === "Amber").length;
  const healthyCount = rankedServices.filter(s => s.service_status === "Green").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header Bar */}
      <div className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 flex items-start justify-between gap-8">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigate("/client")}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Fleet
            </button>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-foreground font-mono">{aircraft?.tail_number || "Aircraft"}</h1>
              <p className="text-sm text-muted-foreground mt-2 font-light">{aircraft?.make || ""} {aircraft?.model || ""}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide ${statusInfo.bgColor} ${statusInfo.borderColor} border transition-all`}>
              <div className={`w-2 h-2 rounded-full ${status === "green" ? "bg-green-400" : status === "amber" ? "bg-amber-400" : "bg-red-400"}`} />
              {statusInfo.label}
            </div>
            <p className="text-xs text-muted-foreground mt-3 font-light">ORBIT Managed</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-6 md:space-y-10">
        {/* Executive Summary Row - 3 Cards */}
        <div className="grid lg:grid-cols-3 gap-4 md:gap-5">
          {/* Condition Card */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 hover:border-muted-foreground/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Condition Index</p>
              <div className={`w-2 h-2 rounded-full ${
                (aircraft?.condition_index || 100) >= 80 ? "bg-green-400" : (aircraft?.condition_index || 100) >= 60 ? "bg-amber-400" : "bg-red-400"
              }`} />
            </div>
            <div className="space-y-5">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-foreground">{Math.round(aircraft?.condition_index || 100)}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (aircraft?.condition_index || 100) >= 80 ? "bg-green-500/80" : (aircraft?.condition_index || 100) >= 60 ? "bg-amber-500/80" : "bg-red-500/80"
                  }`}
                  style={{ width: `${aircraft?.condition_index || 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-light">Aircraft in excellent standing</p>
            </div>
          </div>

          {/* Protection Window Card */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 hover:border-muted-foreground/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Protection Window</p>
              <div className={`w-2 h-2 rounded-full ${daysRemaining > 15 ? "bg-green-400" : "bg-amber-400"}`} />
            </div>
            <div className="space-y-5">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-foreground">{daysRemaining}</span>
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${daysRemaining > 15 ? "bg-green-500/80" : "bg-amber-500/80"}`}
                  style={{ width: `${(daysRemaining / 30) * 100}%` }}
                />
              </div>
              {lastServiceDate && (
                <p className="text-xs text-muted-foreground font-light">
                  Last service {format(new Date(lastServiceDate), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>

          {/* Next Service Card */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 hover:border-muted-foreground/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Next Service</p>
            </div>
            <div className="space-y-4">
              {nextService ? (
                <>
                  <h3 className="text-lg font-bold text-foreground leading-tight">{nextService.service_name}</h3>
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-light">Driver</span>
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{nextService.trigger_source || "—"}</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-light">
                      {nextService.service_overdue
                        ? "Overdue — schedule at your earliest convenience"
                        : nextService.days_remaining !== null
                        ? `Next in ${Math.ceil(nextService.days_remaining)} days`
                        : "Within standard intervals"}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground font-light">All services within standard intervals</p>
              )}
            </div>
          </div>
        </div>

        {/* KPI Summary Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 md:p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Attention</p>
            <p className="text-4xl font-black text-red-400/90 mt-3">{attentionCount}</p>
            <p className="text-xs text-muted-foreground mt-2 font-light">Items requiring focus</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 md:p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Overdue</p>
            <p className="text-4xl font-black text-red-500/90 mt-3">{overdueCount}</p>
            <p className="text-xs text-muted-foreground mt-2 font-light">Past recommended</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 md:p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Due Soon</p>
            <p className="text-4xl font-black text-amber-400/90 mt-3">{dueSoonCount}</p>
            <p className="text-xs text-muted-foreground mt-2 font-light">Next 30 days</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 md:p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">On Schedule</p>
            <p className="text-4xl font-black text-green-400/90 mt-3">{healthyCount}</p>
            <p className="text-xs text-muted-foreground mt-2 font-light">Within intervals</p>
          </div>
        </div>

        {/* Aircraft Service Overview */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 md:px-8 py-5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Service Status Overview</h2>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {rankedServices.length === 0 ? (
              <div className="px-8 py-8 text-center text-muted-foreground font-light">No service records</div>
            ) : (
              rankedServices.map((service) => {
                const statusColor =
                  service.service_status === "Red" ? "text-red-400" :
                  service.service_status === "Amber" ? "text-amber-400" :
                  service.service_status === "Green" ? "text-green-400" : "text-muted-foreground";
                return (
                  <div key={service.id} className="px-4 md:px-8 py-4 md:py-5 hover:bg-muted/20 transition-colors duration-200">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 items-center">
                      <div className="col-span-1">
                        <p className="font-semibold text-foreground text-sm">{service.service_name}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-light">{service.service_code}</p>
                      </div>
                      <div className="hidden lg:block">
                        <span className={`text-xs font-semibold ${statusColor} uppercase tracking-wide`}>{getServiceStatusLabel(service.service_status)}</span>
                      </div>
                      <div className="hidden lg:block">
                        <p className="text-xs text-muted-foreground">Driver: <span className="text-foreground font-semibold uppercase">{service.trigger_source || "—"}</span></p>
                      </div>
                      <div className="hidden lg:block">
                        <div className="h-0.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              service.service_status === "Red" ? "bg-red-500/70" :
                              service.service_status === "Amber" ? "bg-amber-500/70" :
                              "bg-green-500/70"
                            }`}
                            style={{ width: `${Math.min((service.service_trigger_score || 0) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-light">{(service.service_trigger_score || 0).toFixed(2)}/1.00</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground font-light">
                          {service.days_remaining !== null ? `${Math.max(0, Math.ceil(service.days_remaining))} days` : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-2 pb-8 flex flex-col sm:flex-row gap-3">
          <Button onClick={onRequestService || (() => {})} className="flex-1 font-semibold py-3 rounded-xl text-sm">
            Request Service
          </Button>
          <Button variant="outline" className="flex-1 font-semibold py-3 rounded-xl text-sm">
            <Phone className="w-4 h-4 mr-2" />
            Contact JetGlow
          </Button>
          <Button variant="outline" className="flex-1 font-medium py-3 rounded-xl text-sm">
            <FileText className="w-4 h-4 mr-2" />
            Service History
          </Button>
        </div>
      </div>
    </div>
  );
}
