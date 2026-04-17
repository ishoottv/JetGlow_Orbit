import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";

const standingConfig = {
  Green: {
    label: "Excellent Standing",
    dot: "bg-green-400",
    text: "text-green-400",
    border: "border-green-900/50",
    bg: "bg-green-950/40",
  },
  Amber: {
    label: "Due Soon",
    dot: "bg-amber-400",
    text: "text-amber-400",
    border: "border-amber-900/50",
    bg: "bg-amber-950/40",
  },
  Red: {
    label: "Attention Required",
    dot: "bg-red-400",
    text: "text-red-400",
    border: "border-red-900/50",
    bg: "bg-red-950/40",
  },
};

function AircraftCard({ aircraft, onClick }) {
  const cfg = standingConfig[aircraft.orbit_status] || standingConfig.Green;
  const score = Math.round(aircraft.condition_index || 100);
  const nextService = aircraft.worst_service_name || null;
  const barColor = score >= 80 ? "bg-green-400/50" : score >= 60 ? "bg-amber-400/50" : "bg-red-400/50";

  return (
    <div
      onClick={onClick}
      className="group relative bg-card border border-border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-border/70 hover:bg-card/80 hover:shadow-2xl hover:shadow-black/40"
    >
      {/* Aircraft photo */}
      {aircraft.photo_url ? (
        <div className="relative h-44 w-full overflow-hidden">
          <img
            src={aircraft.photo_url}
            alt={aircraft.tail_number}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card" />
          {/* Badge overlaid on photo */}
          <div className={`absolute top-4 right-4 flex items-center gap-2 px-2.5 py-1 rounded-md text-[0.65rem] font-semibold tracking-widest uppercase border backdrop-blur-sm ${cfg.bg} ${cfg.border} ${cfg.text}`}>
            <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        </div>
      ) : (
        <div className="relative h-32 w-full bg-surface flex items-center justify-center">
          <div className="text-text-muted text-3xl font-black font-mono tracking-widest opacity-30">{aircraft.tail_number}</div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />
          <div className={`absolute top-4 right-4 flex items-center gap-2 px-2.5 py-1 rounded-md text-[0.65rem] font-semibold tracking-widest uppercase border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
            <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        </div>
      )}

      {/* Card body */}
      <div className="px-7 pt-4 pb-6">
        {/* Identity */}
        <div className="mb-5">
          <h2 className="text-[2rem] font-black font-mono tracking-[0.15em] text-text-primary leading-none">
            {aircraft.tail_number}
          </h2>
          <p className="text-[0.78rem] text-text-muted font-light tracking-wide mt-1">
            {[aircraft.make, aircraft.model].filter(Boolean).join(" ")}
            {aircraft.base_airport ? <span className="text-text-muted/60"> · {aircraft.base_airport}</span> : null}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-border mb-5" />

        {/* Data row */}
        <div className="grid grid-cols-2 gap-6 mb-5">
          <div>
            <p className="text-[0.65rem] text-text-muted uppercase tracking-[0.12em] font-semibold mb-2">Condition Index</p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-[1.6rem] font-black text-text-primary leading-none">{score}</span>
              <span className="text-[0.7rem] text-text-muted ml-0.5">/100</span>
            </div>
            <div className="h-px bg-border rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${score}%` }} />
            </div>
          </div>
          <div>
            <p className="text-[0.65rem] text-text-muted uppercase tracking-[0.12em] font-semibold mb-2">Next Focus</p>
            <p className="text-[0.85rem] text-text-secondary font-medium leading-snug">
              {nextService || <span className="text-text-muted font-light">All services current</span>}
            </p>
          </div>
        </div>

        {/* View cue */}
        <div className="flex items-center justify-end">
          <span className="text-[0.7rem] text-text-muted group-hover:text-amber-500/60 transition-colors duration-300 font-medium tracking-widest uppercase">
            View Aircraft →
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ClientPortal() {
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
    enabled: !!currentUser,
  });

  const myCustomer = customers.find(c => c.email === currentUser?.email);

  const { data: allAircraft = [], isLoading } = useQuery({
    queryKey: ["aircraft-list"],
    queryFn: () => base44.entities.Aircraft.filter({ status: "active" }),
    enabled: !!currentUser,
  });

  const aircraft =
    currentUser?.role === "client" && myCustomer
      ? allAircraft.filter(ac => ac.customer_id === myCustomer.id)
      : currentUser?.role === "client"
      ? []
      : allAircraft;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-amber-500/70 rounded-full animate-spin" />
      </div>
    );
  }

  const gridClass = "grid-cols-1 sm:grid-cols-2 max-w-3xl";

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

      {/* Header */}
      <div className="border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-10 pt-8 sm:pt-14 pb-8 sm:pb-10">
          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="text-[0.85rem] sm:text-[0.65rem] text-amber-500/50 font-bold sm:font-semibold tracking-[0.2em] uppercase">
              JetGlow ORBIT · Private Aviation Care
            </p>
            {currentUser ? (
              <Button 
                onClick={() => base44.auth.logout()}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            ) : (
              <Button 
                onClick={() => base44.auth.redirectToLogin()}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </Button>
            )}
          </div>
          <h1 className="text-xl sm:text-[2.2rem] font-black text-text-primary tracking-tight leading-none mb-2 sm:mb-3">
            {currentUser?.full_name
              ? `Welcome back, ${currentUser.full_name.split(" ")[0]}.`
              : "Your Fleet"}
          </h1>
          <p className="text-[0.75rem] sm:text-[0.85rem] text-text-muted font-light leading-relaxed">
            Select an aircraft below to view its current ORBIT standing and service status.
          </p>
          <div className="flex items-center justify-between mt-8">
            <div className="h-px flex-1 bg-border" />
            <p className="text-[0.65rem] text-text-muted font-light px-4 tracking-widest">
              {format(new Date(), "MMMM d, yyyy").toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-10 py-6 sm:py-12">
        {aircraft.length === 0 ? (
          <div className="border border-border rounded-2xl p-20 text-center">
            <p className="text-text-muted text-sm font-light tracking-wide">
              No aircraft on record. Please contact JetGlow Aviation.
            </p>
          </div>
        ) : (
          <div className={`grid gap-4 ${gridClass}`}>
            {aircraft.map(ac => (
              <AircraftCard
                key={ac.id}
                aircraft={ac}
                onClick={() => navigate(`/aircraft/${ac.id}/overview`)}
              />
            ))}
          </div>
        )}

        {/* Footer line */}
        <p className="text-center text-[0.55rem] sm:text-[0.65rem] text-text-muted tracking-widest uppercase mt-8 sm:mt-12">
          JetGlow Aviation · Confidential Fleet Data
        </p>
      </div>
    </div>
  );
}