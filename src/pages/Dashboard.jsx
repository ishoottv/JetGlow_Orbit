import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plane, AlertTriangle, CheckCircle, Clock, Zap, TrendingUp, RefreshCw, Bell, Wrench, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/lib/SettingsContext";
import OrbitStatusBadge from "../components/shared/OrbitStatusBadge";
import OrbitScoreBar from "../components/shared/OrbitScoreBar";
import FleetOrbitStatsByCompany from "../components/dashboard/FleetOrbitStatsByCompany";
import AircraftScoreBox from "../components/dashboard/AircraftScoreBox";
import { format } from "date-fns";
import PullToRefreshWrapper from "../components/shared/PullToRefreshWrapper";
import { recalculateAircraftStatus, refetchAircraftQueries } from "@/lib/recalculateAircraftStatus";
import { getServiceStatusLabel } from "@/lib/serviceStatusLabels";

function StatCard({ label, value, icon: Icon, color = "text-primary", sub, href }) {
  const content = (
    <div className="bg-card border border-border rounded-2xl p-3 sm:p-6 flex flex-col sm:flex-row items-start sm:items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">{label}</p>
        <p className={`text-2xl sm:text-4xl font-black mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
      </div>
    </div>
  );
  
  return href ? <Link to={href}>{content}</Link> : content;
}

export default function Dashboard() {
  const { settings } = useSettings();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const { data: aircraft = [] } = useQuery({ queryKey: ["aircraft"], queryFn: () => base44.entities.Aircraft.list() });
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts"], queryFn: () => base44.entities.Alert.list() });
  const { data: flights = [], refetch: refetchFlights } = useQuery({ queryKey: ["flights"], queryFn: () => base44.entities.Flight.list("-flight_date", 50) });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list() });
  const { data: allServiceStatuses = [] } = useQuery({ queryKey: ["allServiceStatuses"], queryFn: () => base44.entities.AircraftServiceStatus.list() });

  const handleSync = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke("syncAllFlights", {});
      await recalculateAircraftStatus();
      await refetchFlights();
      await refetchAircraftQueries(queryClient, null, {
        includeAircraftList: true,
        includeAllServiceStatuses: true,
        includeFleetServiceStatus: true,
      });
      toast.success("Flight data synced from FlightAware");
    } catch (error) {
      toast.error("Sync failed: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const recentFlights = flights.filter(f => f.flight_date <= todayStr);
  const upcomingFlights = flights.filter(f => f.flight_date > todayStr);
  const scheduledFlights = flights.filter(f => f.flight_status === "scheduled").sort((a, b) => a.flight_date?.localeCompare(b.flight_date));
  const { data: serviceStatuses = [] } = useQuery({ queryKey: ["serviceStatus"], queryFn: () => base44.entities.AircraftServiceStatus.filter({ service_status: { $in: ["Amber", "Red"] } }, "-service_trigger_score", 30) });
  const { data: maintenanceAlerts = [], refetch: refetchAlerts } = useQuery({ queryKey: ["maintenanceAlerts"], queryFn: () => base44.entities.Alert.filter({ alert_type: "Days Threshold", alert_status: "active" }) });
  const [generatingAlerts, setGeneratingAlerts] = useState(false);

  const handleGenerateAlerts = async () => {
    setGeneratingAlerts(true);
    try {
      await base44.functions.invoke("generateMaintenanceIntervalAlerts", {});
      await refetchAlerts();
      toast.success("Maintenance alerts refreshed");
    } catch (err) {
      toast.error("Failed to refresh alerts: " + err.message);
    } finally {
      setGeneratingAlerts(false);
    }
  };
  
  // Build a map of aircraft ID -> their service statuses for real-time scoring
  const aircraftServiceMap = allServiceStatuses.reduce((acc, status) => {
    if (!acc[status.aircraft_id]) acc[status.aircraft_id] = [];
    acc[status.aircraft_id].push(status);
    return acc;
  }, {});

  const customerMap = customers.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});

  const green = aircraft.filter(a => a.orbit_status === "Green").length;
  const amber = aircraft.filter(a => a.orbit_status === "Amber").length;
  const red = aircraft.filter(a => a.orbit_status === "Red").length;
  const activeAlerts = alerts.filter(a => a.alert_status === "active");

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  const dueThisWeek = aircraft.filter(a => {
    if (a.orbit_status === "Red") return true;
    if (a.orbit_status === "Amber") return true;
    return false;
  }).length;

  const sorted = [...aircraft].sort((a, b) => (b.orbit_score || 0) - (a.orbit_score || 0));

  return (
    <div className="p-6 md:p-8 space-y-8 pt-8 md:pt-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400 flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: "hsl(0 0% 30%)" }}>
            {settings?.logo_url
              ? <img src={settings.logo_url} alt="logo" className="w-full h-full object-contain" />
              : <Zap className="w-5 h-5 text-primary" />
            }
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text-primary">JetGlow ORBIT Dashboard</h1>
            <p className="text-sm text-text-muted">Fleet maintenance tracking — {format(new Date(), "MMMM d, yyyy")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateAlerts}
            disabled={generatingAlerts}
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg font-semibold text-sm hover:bg-amber-200 disabled:opacity-50 transition-all"
          >
            <Bell className={`w-4 h-4 ${generatingAlerts ? "animate-pulse" : ""}`} />
            {generatingAlerts ? "Checking..." : "Check Alerts"}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync FlightAware"}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        <StatCard label="Total Aircraft" value={aircraft.length} icon={Plane} color="text-foreground" />
        <StatCard label={getServiceStatusLabel("Green")} value={green} icon={CheckCircle} color="text-green-600" href="/aircraft?status=Green" />
        <StatCard label={getServiceStatusLabel("Amber")} value={amber} icon={Clock} color="text-amber-600" href="/aircraft?status=Amber" />
        <StatCard label="Due This Week" value={dueThisWeek} icon={TrendingUp} color="text-primary" href="/aircraft?dueThisWeek=true" />
        <StatCard label={getServiceStatusLabel("Red")} value={red} icon={AlertTriangle} color="text-red-600" href="/aircraft?status=Red" />
        <StatCard label="Active Alerts" value={activeAlerts.length} icon={AlertTriangle} color="text-amber-600" href="/alerts" />
      </div>

      {/* Maintenance Interval Alerts */}
      {maintenanceAlerts.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h2 className="font-bold text-sm sm:text-base">Maintenance Interval Alerts</h2>
              <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">{maintenanceAlerts.length}</span>
            </div>
            <Link to="/alerts" className="text-xs text-primary font-semibold hover:underline">View All →</Link>
          </div>
          <div className="divide-y divide-border">
            {maintenanceAlerts.slice(0, 8).map(alert => {
              const isOverdue = alert.alert_message?.includes("OVERDUE") || alert.alert_message?.includes("No JetGlow");
              const isOrbit = alert.alert_message?.includes("ORBIT");
              return (
                <Link key={alert.id} to={`/aircraft/${alert.aircraft_id}`} className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-muted/20 transition-colors">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOverdue ? "bg-red-500" : "bg-amber-500"}`} />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isOrbit ? <Calendar className="w-3.5 h-3.5 text-blue-400" /> : <Wrench className="w-3.5 h-3.5 text-slate-400" />}
                    <span className="font-black font-mono text-xs text-primary">{alert.tail_number}</span>
                  </div>
                  <p className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{alert.alert_message}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {isOverdue ? "Overdue" : "Due Soon"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Fleet ORBIT Status - Grouped by Status */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-base sm:text-lg">Fleet ORBIT Status</h2>
          <Link to="/aircraft" className="text-xs text-primary font-semibold hover:underline">View All →</Link>
        </div>
        
        {sorted.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm">No aircraft yet. <Link to="/aircraft" className="text-primary underline">Add aircraft</Link></p>
          </div>
        ) : (
          <div className="space-y-8">
            {["Red", "Amber", "Green"].map(status => {
              const statusAircraft = sorted.filter(ac => (ac.orbit_status || "Green") === status);
              if (statusAircraft.length === 0) return null;
              return (
                <div key={status}>
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <OrbitStatusBadge status={status} size="sm" />
                    {statusAircraft.length} Aircraft
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {statusAircraft.map(ac => (
                      <Link key={ac.id} to={`/aircraft/${ac.id}`} className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
                        <div className="space-y-3">
                          {/* Photo */}
                          {ac.photo_url ? (
                            <img src={ac.photo_url} alt={ac.tail_number} className="w-full h-32 object-cover rounded-lg border border-border" />
                          ) : (
                            <div className="w-full h-32 rounded-lg bg-muted border border-border flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">No photo</span>
                            </div>
                          )}
                          
                          {/* Tail and ORBIT Score */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-black font-mono text-foreground text-sm">{ac.tail_number}</p>
                              <p className="text-xs text-muted-foreground">{customerMap[ac.customer_id]?.name || "—"}</p>
                            </div>
                            <AircraftScoreBox aircraft={ac} serviceStatuses={aircraftServiceMap[ac.id] || []} />
                          </div>

                          {/* Make/Model */}
                          <p className="text-xs text-muted-foreground">{ac.make} {ac.model}</p>

                          {/* Details */}
                          <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-border text-xs">
                            <div>
                              <p className="text-muted-foreground">Hours</p>
                              <p className="font-semibold">{(ac.hours_since_orbit || 0).toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Days</p>
                              <p className="font-semibold">{ac.days_since_orbit || 0}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Score</p>
                              <p className="font-semibold text-xs">{ac.orbit_score || 0}/100</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scheduled Flights */}
      <div className="bg-card border border-border rounded-2xl">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <Plane className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <h2 className="font-bold text-sm sm:text-base">Scheduled Flights</h2>
            {scheduledFlights.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{scheduledFlights.length}</span>
            )}
          </div>
          <Link to="/flights?status=scheduled" className="text-xs text-primary font-semibold hover:underline">View All →</Link>
        </div>
        {scheduledFlights.length === 0 ? (
          <p className="px-4 sm:px-6 py-8 text-center text-muted-foreground text-xs sm:text-sm">No scheduled flights</p>
        ) : (
          <div className="space-y-0">
            {scheduledFlights.slice(0, 8).map((f, idx) => (
              <div key={f.id} className={`flex items-center justify-between px-4 sm:px-6 py-2.5 text-xs sm:text-sm hover:bg-muted/20 transition-colors ${idx !== scheduledFlights.slice(0, 8).length - 1 ? "border-b border-border" : ""}`}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="font-semibold flex-shrink-0">{f.flight_date}</span>
                  <span className="font-mono font-bold text-primary flex-shrink-0">{f.tail_number}</span>
                  <span className="font-mono font-semibold text-xs flex-shrink-0">{f.departure_airport} → {f.arrival_airport}</span>
                  <span className="text-xs flex-shrink-0">{f.block_hours?.toFixed(1) ?? "—"}h</span>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">Scheduled</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flights + Alerts */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Flights column: upcoming + recent stacked */}
        <div className="space-y-4 sm:space-y-6">
          {/* Upcoming Flights */}
          <div className="bg-card border border-border rounded-2xl">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex items-center justify-between gap-2">
              <h2 className="font-bold text-sm sm:text-base">Upcoming Flights</h2>
              <Link to="/flights" className="text-xs text-primary font-semibold hover:underline">View All →</Link>
            </div>
            <div className="space-y-0">
              {upcomingFlights.slice(0, 5).map((f, idx) => (
                <div key={f.id} className={`px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 hover:bg-muted/20 transition-colors ${idx !== upcomingFlights.slice(0, 5).length - 1 ? "border-b border-border" : ""}`}>
                  <div className="min-w-0">
                    <span className="font-bold font-mono text-xs sm:text-sm block">{f.tail_number}</span>
                    <span className="text-muted-foreground text-xs">{f.departure_airport} → {f.arrival_airport}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold">{f.block_hours?.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">{f.flight_date}</p>
                  </div>
                </div>
              ))}
              {upcomingFlights.length === 0 && <p className="px-4 sm:px-6 py-6 text-center text-muted-foreground text-xs sm:text-sm">No upcoming flights</p>}
            </div>
          </div>

          {/* Recent Flights */}
          <div className="bg-card border border-border rounded-2xl">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex items-center justify-between gap-2">
              <h2 className="font-bold text-sm sm:text-base">Recent Flights</h2>
              <Link to="/flights" className="text-xs text-primary font-semibold hover:underline">View All →</Link>
            </div>
            <div className="space-y-0">
              {recentFlights.slice(0, 5).map((f, idx) => (
                <div key={f.id} className={`px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 hover:bg-muted/20 transition-colors ${idx !== recentFlights.slice(0, 5).length - 1 ? "border-b border-border" : ""}`}>
                  <div className="min-w-0">
                    <span className="font-bold font-mono text-xs sm:text-sm block">{f.tail_number}</span>
                    <span className="text-muted-foreground text-xs">{f.departure_airport} → {f.arrival_airport}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold">{f.block_hours?.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">{f.flight_date}</p>
                  </div>
                </div>
              ))}
              {recentFlights.length === 0 && <p className="px-4 sm:px-6 py-6 text-center text-muted-foreground text-xs sm:text-sm">No recent flights</p>}
            </div>
          </div>
        </div>

      {/* Service alerts */}
        <div className="bg-card border border-border rounded-2xl">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex items-center justify-between gap-2">
            <h2 className="font-bold text-sm sm:text-base">Service Trigger Alerts</h2>
            <Link to="/aircraft" className="text-xs text-primary font-semibold hover:underline">View All →</Link>
          </div>
          <div className="space-y-0">
            {serviceStatuses.slice(0, 6).map((status, idx) => (
              <div key={status.id} className={`px-4 sm:px-6 py-2 sm:py-3 flex items-start gap-2 sm:gap-3 hover:bg-muted/20 transition-colors ${idx !== serviceStatuses.slice(0, 6).length - 1 ? "border-b border-border" : ""}`}>
                <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full mt-1 flex-shrink-0 ${status.service_status === "Red" ? "bg-red-500" : "bg-amber-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                    <Link to={`/aircraft/${status.aircraft_id}`}>{status.service_name}</Link>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Score: {status.service_trigger_score?.toFixed(2)} | {status.service_status}</p>
                </div>
              </div>
            ))}
            {serviceStatuses.length === 0 && <p className="px-4 sm:px-6 py-8 text-center text-muted-foreground text-xs sm:text-sm">No service alerts</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
