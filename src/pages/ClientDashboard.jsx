import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { rankServices } from "@/lib/serviceRankingTieBreaker";
import { differenceInDays, format } from "date-fns";
import { ArrowLeft, Phone, FileText, Zap, LogOut, LogIn } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { getServiceStatusLabel } from "@/lib/serviceStatusLabels";

// ─── Config ────────────────────────────────────────────────────────────────

const standingCfg = {
  Green: { label: getServiceStatusLabel("Green"), dot: "bg-green-400", text: "text-green-400", border: "border-green-900/50", bg: "bg-green-950/40" },
  Amber: { label: "Due Soon",           dot: "bg-amber-400", text: "text-amber-400", border: "border-amber-900/50", bg: "bg-amber-950/40" },
  Red:   { label: getServiceStatusLabel("Red"), dot: "bg-red-400",   text: "text-red-400",   border: "border-red-900/50",   bg: "bg-red-950/40"   },
};

function statusColor(s) {
  if (s === "Red")   return "text-red-400";
  if (s === "Amber") return "text-amber-400";
  if (s === "Green") return "text-green-400/80";
  return "text-slate-600";
}

function dueLabel(service) {
  if (!service) return "—";
  if (service.service_overdue) return "Overdue";
  const dr = service.days_remaining;
  if (dr != null && dr <= 0) return "Due now";
  if (dr != null) return `${Math.ceil(dr)}d`;
  if (service.hours_remaining != null) return `${Math.ceil(service.hours_remaining)}h`;
  return "—";
}

function conditionVerb(score) {
  if (score >= 90) return "Excellent condition.";
  if (score >= 75) return "Good standing. Minor items approaching.";
  if (score >= 60) return "Some attention advised.";
  return "Service attention recommended.";
}

// ─── LEFT COLUMN PANELS ────────────────────────────────────────────────────

function ConditionPanel({ aircraft }) {
  const score = Math.round(aircraft?.condition_index || 100);
  const barColor = score >= 80 ? "bg-green-400/60" : score >= 60 ? "bg-amber-400/60" : "bg-red-400/60";
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
      <p className="text-sm text-text-muted uppercase tracking-[0.15em] font-semibold">Aircraft Condition</p>
      <div>
        <div className="flex items-baseline gap-1 mt-2 mb-1">
          <span className="text-[2rem] font-black text-text-primary leading-none">{score}</span>
          <span className="text-base text-text-muted">/100</span>
        </div>
        <div className="h-px bg-border rounded-full overflow-hidden my-2">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
        </div>
        <p className="text-sm text-text-muted font-light">{conditionVerb(score)}</p>
      </div>
    </div>
  );
}

function ProtectionPanel({ aircraft }) {
  const lastDate = aircraft?.last_orbit_baseline_date;
  let elapsed = 0;
  try { elapsed = lastDate ? differenceInDays(new Date(), new Date(lastDate)) : 0; } catch {}
  const daysLeft = Math.max(0, 30 - elapsed);
  const pct = Math.round((daysLeft / 30) * 100);
  const barColor = daysLeft > 15 ? "bg-green-400/60" : daysLeft > 7 ? "bg-amber-400/60" : "bg-red-400/60";
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
      <p className="text-sm text-text-muted uppercase tracking-[0.15em] font-semibold">Program Standing</p>
      <div>
        <div className="flex items-baseline gap-1 mt-2 mb-1">
          <span className="text-[2rem] font-black text-text-primary leading-none">{daysLeft}</span>
          <span className="text-base text-text-muted">days</span>
        </div>
        <div className="h-px bg-border rounded-full overflow-hidden my-2">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-text-muted font-light">
          {lastDate ? `Last service ${format(new Date(lastDate), "MMM d, yyyy")}` : "No baseline on record"}
        </p>
      </div>
    </div>
  );
}

function NextServicePanel({ service }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
      <p className="text-sm text-text-muted uppercase tracking-[0.15em] font-semibold">Next Service Focus</p>
      {service ? (
        <div className="mt-2 space-y-2">
          <p className="text-base font-bold text-text-primary leading-snug">{service.service_name}</p>
          <div className="flex items-center justify-between border-t border-border/60 pt-2">
            <span className="text-sm text-text-muted uppercase tracking-widest">Due</span>
            <span className={`text-base font-bold ${statusColor(service.service_status)}`}>
              {dueLabel(service)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted font-light mt-2">All services current.</p>
      )}
    </div>
  );
}

// ─── SERVICE CARD ──────────────────────────────────────────────────────────

function ServiceCard({ service }) {
  const dotColor = service.service_status === "Red" ? "bg-red-400" : service.service_status === "Amber" ? "bg-amber-400" : "bg-green-400/60";
  const borderColor = service.service_status === "Red" ? "border-red-900/40" : service.service_status === "Amber" ? "border-amber-900/40" : "border-slate-800";
  const scoreWidth = Math.min((service.service_trigger_score || 0) * 100, 100);
  const barFill = service.service_status === "Red" ? "bg-red-400/50" : service.service_status === "Amber" ? "bg-amber-400/50" : "bg-green-400/40";
  return (
    <div className={`bg-slate-950 border ${borderColor} rounded-lg p-4 flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-semibold text-slate-200 leading-snug">{service.service_name}</p>
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${dotColor}`} />
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barFill}`} style={{ width: `${scoreWidth}%` }} />
      </div>
      <p className={`text-base font-bold tabular-nums ${statusColor(service.service_status)}`}>
        {dueLabel(service)}
      </p>
    </div>
  );
}

// ─── RIGHT COLUMN: PHOTO ───────────────────────────────────────────────────

function AircraftPhotoPanel({ aircraft }) {
  return (
    <div className="relative rounded-xl overflow-hidden border border-border bg-card h-full">
      {aircraft.photo_url ? (
        <>
          <img
            src={aircraft.photo_url}
            alt={aircraft.tail_number}
            className="w-full h-full object-cover"
            style={{ minHeight: "100%" }}
          />
          {/* Bottom overlay with identity */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-4 py-3">
            <p className="text-[1.1rem] font-black font-mono tracking-[0.15em] text-text-primary leading-none">{aircraft.tail_number}</p>
            <p className="text-xs text-text-muted font-light mt-0.5">
              {[aircraft.make, aircraft.model].filter(Boolean).join(" ")}
              {aircraft.base_airport ? ` · ${aircraft.base_airport}` : ""}
            </p>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6">
          <div className="text-[2.5rem] font-black font-mono tracking-[0.2em] text-muted select-none">
            {aircraft.tail_number}
          </div>
          <p className="text-[0.65rem] text-text-muted tracking-widest uppercase font-light">
            {[aircraft.make, aircraft.model].filter(Boolean).join(" ") || "No photo on file"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── RIGHT COLUMN: DONUT CHART ─────────────────────────────────────────────

function ServiceDonutChart({ red, amber, green }) {
  const total = red + amber + green;
  const data = total > 0
    ? [
        { name: "Good",      value: green, color: "#4ade80" },
        { name: "Due Soon",  value: amber, color: "#fbbf24" },
        { name: "Attention", value: red,   color: "#f87171" },
      ].filter(d => d.value > 0)
    : [{ name: "No Data", value: 1, color: "hsl(var(--border))" }];

  const primaryStatus = red > 0 ? getServiceStatusLabel("Red") : amber > 0 ? getServiceStatusLabel("Amber") : getServiceStatusLabel("Green");
  const primaryColor  = red > 0 ? "text-red-400" : amber > 0 ? "text-amber-400" : "text-green-400/80";

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col" style={{ minHeight: 0 }}>
      <p className="text-sm text-text-muted uppercase tracking-[0.15em] font-semibold mb-2">Service Distribution</p>
      <div className="flex items-center gap-4 flex-1 min-h-0">
        {/* Donut */}
        <div className="w-20 h-20 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="90%"
                dataKey="value"
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} opacity={0.75} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex-1 space-y-2">
          {total > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400/75 flex-shrink-0" /><span className="text-sm text-text-muted">{getServiceStatusLabel("Green")}</span></div>
                <span className="text-base font-bold text-text-secondary tabular-nums">{green}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400/75 flex-shrink-0" /><span className="text-sm text-text-muted">Due Soon</span></div>
                <span className="text-base font-bold text-text-secondary tabular-nums">{amber}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400/75 flex-shrink-0" /><span className="text-sm text-text-muted">{getServiceStatusLabel("Red")}</span></div>
                <span className="text-base font-bold text-text-secondary tabular-nums">{red}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-text-muted font-light">No service data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BOTTOM: SERVICE HORIZON BARS ─────────────────────────────────────────

function ServiceHorizonBars({ services }) {
  const items = services.slice(0, 4);
  if (items.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between" style={{ minHeight: 0 }}>
      <p className="text-sm text-text-muted uppercase tracking-[0.15em] font-semibold mb-4">Service Horizon</p>
      <div className="flex-1 flex flex-col justify-around gap-4">
        {items.map((s) => {
          const score = Math.min(s.service_trigger_score || 0, 1.2);
          const pct = Math.min((score / 1.2) * 100, 100);
          const fill = s.service_status === "Red" ? "bg-red-400/60" : s.service_status === "Amber" ? "bg-amber-400/55" : "bg-green-400/45";
          const label = dueLabel(s);
          return (
            <div key={s.id} className="flex items-center gap-3">
              <p className="text-base text-text-secondary font-medium w-40 truncate flex-shrink-0">{s.service_name}</p>
              <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${fill}`} style={{ width: `${pct}%` }} />
              </div>
              <p className={`text-base font-bold w-12 text-right flex-shrink-0 tabular-nums ${statusColor(s.service_status)}`}>{label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = React.useState(undefined);

  React.useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => setCurrentUser(null));
  }, []);

  const { data: aircraft, isLoading } = useQuery({
    queryKey: ["aircraft", id],
    queryFn: () => base44.entities.Aircraft.get(id),
  });

  const { data: rawStatuses = [] } = useQuery({
    queryKey: ["serviceStatus", id],
    queryFn: () => base44.entities.AircraftServiceStatus.filter({ aircraft_id: id }),
  });

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user && user.role !== "client") navigate(`/aircraft/${id}`);
    });
  }, [id, navigate]);

  const serviceStatuses = Array.isArray(rawStatuses) ? rawStatuses : [];
  let ranked = [];
  try { ranked = rankServices(serviceStatuses); } catch {}

  const relevant      = ranked.filter(s => s.service_status !== "No Interval");
  const displayRows   = relevant;
  const horizonItems  = relevant.slice(0, 4);
  const cfg           = standingCfg[aircraft?.orbit_status] || standingCfg.Green;
  const nextService   = relevant[0] || null;
  const redCount      = ranked.filter(s => s.service_status === "Red").length;
  const amberCount    = ranked.filter(s => s.service_status === "Amber").length;
  const greenCount    = ranked.filter(s => s.service_status === "Green").length;

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-amber-500/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!aircraft) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-text-muted text-sm font-light">Aircraft not found.</p>
        <button onClick={() => navigate("/client")} className="text-[0.7rem] text-text-muted hover:text-text-secondary transition-colors tracking-widest uppercase">
          ← Return to Fleet
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent flex-shrink-0" />

      {/* ── HEADER ── */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <button
              onClick={() => navigate("/client")}
              className="flex items-center gap-2 text-sm sm:text-base text-text-primary hover:text-text-primary/80 transition-colors font-bold tracking-widest uppercase bg-muted hover:bg-muted/80 px-3 sm:px-4 py-2 rounded-lg"
            >
              <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
              Fleet
            </button>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-[1.5rem] font-black font-mono tracking-[0.18em] text-text-primary leading-none truncate">{aircraft.tail_number}</h1>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5 font-light tracking-wide truncate">
                {[aircraft.make, aircraft.model].filter(Boolean).join(" ") || "Aircraft"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs sm:text-sm font-semibold tracking-[0.12em] uppercase border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
              <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>
            <p className="text-xs sm:text-sm text-text-primary font-light tracking-[0.14em] uppercase hidden md:block">Managed under JetGlow ORBIT</p>
            {currentUser ? (
              <button
                onClick={() => base44.auth.logout()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary hover:bg-muted border border-border transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            ) : currentUser === null ? (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary hover:bg-muted border border-border transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Login</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── BODY ── 2-column executive layout */}
      <div className="flex-1 overflow-y-auto max-w-6xl mx-auto w-full px-4 sm:px-8 py-4 pb-24 flex flex-col gap-4">

        {/* Aircraft photo at top */}
        <div style={{ height: "280px" }}>
          <AircraftPhotoPanel aircraft={aircraft} />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col gap-3">

            {/* 3 summary panels */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ConditionPanel aircraft={aircraft} />
              <ProtectionPanel aircraft={aircraft} />
              <NextServicePanel service={nextService} />
            </div>

          {/* Service grid */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-border">
            <p className="text-sm text-slate-500 uppercase tracking-[0.15em] font-semibold">Service Status</p>
              <div className="flex items-center gap-3 text-sm">
                {redCount   > 0 && <span className="text-red-500/70">{redCount} attention</span>}
                {amberCount > 0 && <span className="text-amber-500/50">{amberCount} due soon</span>}
                {greenCount > 0 && <span className="text-slate-700">{greenCount} good</span>}
              </div>
            </div>
            <div className="p-3">
              {displayRows.length === 0 ? (
                <div className="flex items-center justify-center">
                  <p className="text-base text-slate-500 font-light">All services within standard intervals.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {displayRows.map(s => <ServiceCard key={s.id} service={s} />)}
                </div>
              )}
            </div>
          </div>

          {/* Service horizon bars */}
          <div>
            <ServiceHorizonBars services={horizonItems} />
          </div>

          {/* Action strip */}
          <div className="flex flex-col sm:flex-row gap-2">
           <button
             onClick={() => window.open("https://clienthub.getjobber.com/hubs/a1848770-6f4d-4802-989e-4d460caab7cb/public/requests/2488005/new", "_blank")}
             className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 border border-primary text-sm font-semibold rounded-xl py-2 transition-all duration-200 tracking-wide"
           >
             <Zap className="w-3 h-3" />
             Request Service
           </button>
           <button
             onClick={() => window.location.href = "tel:1-920-203-2888"}
             className="flex-1 flex items-center justify-center gap-1.5 bg-transparent hover:bg-muted border border-border hover:border-border/70 text-text-secondary hover:text-text-primary text-sm font-medium rounded-xl py-2 transition-all duration-200 tracking-wide"
           >
             <Phone className="w-3 h-3" />
             Contact JetGlow
           </button>
           <button
             onClick={() => toast.info("Service history coming soon.")}
             className="flex-1 flex items-center justify-center gap-1.5 bg-transparent hover:bg-muted/50 border border-border hover:border-border/70 text-text-secondary hover:text-text-primary text-sm font-medium rounded-xl py-2 transition-all duration-200 tracking-wide"
           >
             <FileText className="w-3 h-3" />
             Service History
           </button>
          </div>
        </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="flex flex-col gap-3">
            {/* Donut chart */}
            <div>
              <ServiceDonutChart red={redCount} amber={amberCount} green={greenCount} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
