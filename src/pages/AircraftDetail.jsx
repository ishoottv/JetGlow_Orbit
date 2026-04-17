import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Wrench, Pencil, FileText } from "lucide-react";
import { parseLocalDate } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import PremiumExecutiveDashboard from "../components/client-portal/PremiumExecutiveDashboard";
import PremiumClientPortal from "../components/client-portal/PremiumClientPortal";
import ClientConditionOverview from "../components/client-dashboard/ClientConditionOverview";
import ClientServiceAttention from "../components/client-dashboard/ClientServiceAttention";
import ClientPriorityService from "../components/client-dashboard/ClientPriorityService";
import AddFlightModal from "../components/flights/AddFlightModal";
import AddMaintenanceModal from "../components/maintenance/AddMaintenanceModal";
import EditMaintenanceModal from "../components/maintenance/EditMaintenanceModal";
import EditAircraftModal from "../components/aircraft/EditAircraftModal";
import JobScopeModal from "../components/job-scope/JobScopeModal";
import ServiceStatusTable from "../components/services/ServiceStatusTable";
import VisitRecommendation from "../components/services/VisitRecommendation";
import ServiceTriggerOverridesPanel from "../components/aircraft/ServiceTriggerOverridesPanel";

import ServiceDebugPanel from "../components/services/ServiceDebugPanel";
import ServiceCountAuditPanel from "../components/services/ServiceCountAuditPanel";
import ServiceTriggerStatusPanel from "../components/services/ServiceTriggerStatusPanel";
import { toast } from "sonner";
import { daysSinceOrbit } from "../lib/dateUtils";
import useOrbitScore from "../hooks/useOrbitScore";
import useConditionIndex from "../hooks/useConditionIndex";
import ResponsiveTable from "../components/shared/ResponsiveTable";
import { recalculateAircraftStatus, refetchAircraftQueries } from "@/lib/recalculateAircraftStatus";

export default function AircraftDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [flightOpen, setFlightOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [jobScopeOpen, setJobScopeOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUser(u));
  }, []);

  const handleViewServices = () => {
    const element = document.getElementById("service-trigger-status");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const { data: ac, isLoading } = useQuery({
    queryKey: ["aircraft", id],
    queryFn: () => base44.entities.Aircraft.get(id),
  });

  const { data: flights = [] } = useQuery({
    queryKey: ["flights", id],
    queryFn: () => base44.entities.Flight.filter({ aircraft_id: id }),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["maintenance", id],
    queryFn: () => base44.entities.MaintenanceEvent.filter({ aircraft_id: id }),
  });

  const lastReset = events
    .filter(e => e.service_type === "RESET")
    .sort((a, b) => parseLocalDate(b.service_date) - parseLocalDate(a.service_date))[0] || null;

  const validOrbitFlights = useMemo(
    () => flights.filter((f) => f.count_toward_orbit && f.flight_status !== "cancelled"),
    [flights]
  );

  const hoursSinceReset = useMemo(() => {
    if (!lastReset?.service_date) return 0;
    const resetDate = parseLocalDate(lastReset.service_date);
    return validOrbitFlights
      .filter((f) => f.flight_date && new Date(f.flight_date) > resetDate)
      .reduce((sum, f) => sum + (f.block_hours || 0), 0);
  }, [lastReset, validOrbitFlights]);

  const flightsSignature = useMemo(() => (
    JSON.stringify(
      validOrbitFlights
        .map((f) => [f.id, f.flight_date, f.block_hours || 0, f.flight_cycle || 0, f.flight_status, !!f.count_toward_orbit])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    )
  ), [validOrbitFlights]);

  const lastRecalcSignatureRef = useRef(null);

  const { data: serviceStatus = [] } = useQuery({
    queryKey: ["serviceStatus", id],
    queryFn: () => base44.entities.AircraftServiceStatus.filter({ aircraft_id: id }),
  });

  useEffect(() => {
    if (!id || !flightsSignature) return;
    if (lastRecalcSignatureRef.current === flightsSignature) return;

    lastRecalcSignatureRef.current = flightsSignature;

    recalculateAircraftStatus(id)
      .then(async () => {
        await refetchAircraftQueries(queryClient, id);
      })
      .catch((err) => {
        console.error("Aircraft detail recalc failed:", err);
      });
  }, [id, flightsSignature, queryClient]);

  // Calculate real-time ORBIT score from service statuses (must be at top level)
  const orbitScore = useOrbitScore(ac, serviceStatus);

  // Calculate JetGlow Condition Index from weighted average of all services
  const conditionIndex = useConditionIndex(serviceStatus);

  const { data: customer } = useQuery({
    queryKey: ["customer", ac?.customer_id],
    queryFn: () => ac?.customer_id ? base44.entities.Customer.get(ac.customer_id) : null,
    enabled: !!ac?.customer_id,
  });

  const addFlightMutation = useMutation({
    mutationFn: (data) => base44.entities.Flight.create(data),
    onSuccess: async () => {
      await recalculateAircraftStatus(id);
      await refetchAircraftQueries(queryClient, id, { includeFlights: true });
      toast.success("Flight added and ORBIT status updated");
    },
  });

  const updateAircraftMutation = useMutation({
    mutationFn: (data) => base44.entities.Aircraft.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aircraft", id] });
      queryClient.invalidateQueries({ queryKey: ["aircraft"] });
      toast.success("Aircraft updated");
    },
  });

  const addMaintMutation = useMutation({
    mutationFn: async (data) => {
      const event = await base44.entities.MaintenanceEvent.create(data);
      // Process the maintenance event (create service logs + reset statuses)
      await base44.functions.invoke("processMaintenanceEvent", { maintenance_event_id: event.id });
      return event;
    },
    onSuccess: async (event) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance", id] });
      queryClient.invalidateQueries({ queryKey: ["aircraft", id] });
      queryClient.invalidateQueries({ queryKey: ["serviceStatus", id] });
      toast.success("Maintenance logged — recalculating...");
      try {
        await recalculateAircraftStatus(id, { skipServiceTriggers: event.service_type === "RESET" });
        await refetchAircraftQueries(queryClient, id, { includeMaintenance: true });
        toast.success("Service status updated");
      } catch (err) {
        console.error("Background recalc failed:", err);
      }
    },
  });

  const updateMaintMutation = useMutation({
    mutationFn: async ({ eventId, data }) => {
      const event = await base44.entities.MaintenanceEvent.update(eventId, data);
      // Process the maintenance event (re-sync logs and baselines)
      await base44.functions.invoke("processMaintenanceEvent", { maintenance_event_id: eventId });
      return event;
    },
    onSuccess: async (event) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance", id] });
      queryClient.invalidateQueries({ queryKey: ["aircraft", id] });
      queryClient.invalidateQueries({ queryKey: ["serviceStatus", id] });
      toast.success("Maintenance updated — recalculating...");
      try {
        await recalculateAircraftStatus(id, { skipServiceTriggers: event.service_type === "RESET" });
        await refetchAircraftQueries(queryClient, id, { includeMaintenance: true });
        toast.success("Service status updated");
      } catch (err) {
        console.error("Background recalc failed:", err);
      }
    },
  });

  const deleteMaintMutation = useMutation({
    mutationFn: async (eventId) => {
      // Delete service logs first, then the event
      await base44.functions.invoke("deleteMaintenanceEvent", { maintenance_event_id: eventId });
      return eventId;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance", id] });
      toast.success("Maintenance event deleted — recalculating...");
      try {
        await recalculateAircraftStatus(id);
        await refetchAircraftQueries(queryClient, id, { includeMaintenance: true });
        toast.success("ORBIT health updated");
      } catch (err) {
        console.error("Background recalc failed:", err);
      }
    },
  });

  const updateFlightMutation = useMutation({
    mutationFn: ({ flightId, data }) => base44.entities.Flight.update(flightId, data),
    onSuccess: async () => {
      await recalculateAircraftStatus(id);
      await refetchAircraftQueries(queryClient, id, { includeFlights: true });
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  if (!ac) return <div className="p-8 text-center text-muted-foreground">Aircraft not found</div>;

  // If client user, show premium dashboard only
  if (user?.role === "client") {
    return (
      <PremiumExecutiveDashboard
        aircraft={ac}
        serviceStatuses={Array.isArray(serviceStatus) ? serviceStatus : []}
        onRequestService={() => window.open("https://clienthub.getjobber.com/hubs/a1848770-6f4d-4802-989e-4d460caab7cb/public/requests/2488005/new", "_blank")}
      />
    );
  }

  const infoRow = (label, value) => (
    <div key={label}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm mt-0.5">{value || "—"}</p>
    </div>
  );

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/aircraft"><Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-black font-mono tracking-wider text-foreground">{ac.tail_number}</h1>
            <p className="text-sm text-muted-foreground">{ac.make} {ac.model} — {ac.owner_name}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}><Pencil className="w-4 h-4" />Edit Aircraft</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setFlightOpen(true)}><Plus className="w-4 h-4" />Add Flight</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setMaintOpen(true)}><Wrench className="w-4 h-4" />Log Maintenance</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setJobScopeOpen(true)}><FileText className="w-4 h-4" />Build Job Scope</Button>
        </div>
      </div>

      {/* Last ORBIT Service banner */}
      {ac.last_orbit_baseline_date && (
        <div className="rounded-lg border border-blue-800 bg-blue-950/60 p-6 shadow-md flex items-center gap-6">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-900/60 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-blue-300" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Last ORBIT Service</p>
            <p className="font-semibold text-white mt-1">
              {format(new Date(ac.last_orbit_baseline_date), "MMMM d, yyyy")}
            </p>
            <p className="text-xs text-blue-300 mt-1">
              {(ac.last_orbit_total_hours || 0).toFixed(1)} hrs / {ac.last_orbit_total_cycles || 0} cycles at service
            </p>
          </div>
          <div className="flex gap-8 text-right flex-shrink-0">
            <div>
              <p className="text-xs text-blue-400 uppercase tracking-widest font-semibold">Hours Since Last Orbit</p>
              <p className="text-2xl font-bold text-white mt-1">{(ac.hours_since_orbit ?? ((ac.current_total_hours || 0) - (ac.last_orbit_total_hours || 0))).toFixed(1)}</p>
              <p className="text-xs text-blue-300">hrs</p>
            </div>
            <div>
              <p className="text-xs text-blue-400 uppercase tracking-widest font-semibold">Days Since</p>
              <p className="text-2xl font-bold text-white mt-1">{daysSinceOrbit(ac.last_orbit_baseline_date)}</p>
              <p className="text-xs text-blue-300">days</p>
            </div>
          </div>
        </div>
      )}

      {/* Aircraft Photo */}
      {ac.photo_url && (
        <div className="rounded-2xl overflow-hidden border border-border h-56 w-full">
          <img src={ac.photo_url} alt={ac.tail_number} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Last RESET banner */}
      {lastReset ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-md flex items-center gap-6">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-slate-300" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Last JetGlow Reset</p>
            <p className="font-semibold text-white mt-1">
              {format(new Date(lastReset.service_date), "MMMM d, yyyy")}
              {lastReset.technician_name && <span className="font-normal text-slate-300"> — {lastReset.technician_name}</span>}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {lastReset.total_hours_at_service?.toFixed(1)} hrs / {lastReset.total_cycles_at_service} cycles at service
            </p>
          </div>
          <div className="flex gap-8 text-right flex-shrink-0">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Hours Since Reset</p>
              <p className="text-2xl font-bold text-white mt-1">{hoursSinceReset.toFixed(1)}</p>
              <p className="text-xs text-slate-400">hrs</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Days Since Reset</p>
              <p className="text-2xl font-bold text-white mt-1">{daysSinceOrbit(lastReset.service_date)}</p>
              <p className="text-xs text-slate-400">days</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-4 shadow-md flex items-center gap-3">
          <Wrench className="w-4 h-4 text-slate-500" />
          <p className="text-sm text-slate-400">No RESET on record for this aircraft.</p>
        </div>
      )}

      {/* Aircraft Photo + Info */}
      <div className="space-y-4">
        {/* Aircraft info */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold mb-4">Aircraft Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {infoRow("Category", ac.aircraft_category)}
            {infoRow("Severity Profile", ac.severity_profile)}
            {infoRow("Base Airport", ac.base_airport)}
            {infoRow("Customer", customer ? (
              <Link to={`/customers/${customer.id}`} className="text-primary hover:underline">{customer.name}</Link>
            ) : "—")}
            {infoRow("ORBIT Plan", ac.orbit_plan)}
            {infoRow("Total Hours", (ac.current_total_hours || 0).toFixed(1))}
            {infoRow("Total Cycles", ac.current_total_cycles || 0)}
            {infoRow("Status", ac.status)}
          </div>
        </div>
      </div>

      {/* Premium Client Portal Section */}
      <div className="border-t border-border pt-8 mt-8">
        <PremiumClientPortal
          aircraft={ac}
          serviceStatuses={serviceStatus}
          showRequestService={false}
          onRequestService={() => {
            window.open("https://clienthub.getjobber.com/hubs/a1848770-6f4d-4802-989e-4d460caab7cb/public/requests/2488005/new", "_blank");
          }}
        />
      </div>

      {/* Manager Health Dashboard */}
      <div className="grid lg:grid-cols-3 gap-4">
        <ClientConditionOverview
          conditionIndex={ac.condition_index}
          label={ac.client_condition_label}
          message={ac.client_condition_message}
          baselineDate={ac.last_orbit_baseline_date}
          orbitStatus={ac.orbit_status}
        />
        <ClientServiceAttention
          activeAttentionCount={ac.active_attention_count}
          overdueCount={ac.overdue_count}
          dueSoonCount={ac.due_soon_count}
          healthyCount={ac.healthy_count}
        />
        <ClientPriorityService
          serviceName={(() => {
            const actionable = serviceStatus
              .filter(s => s.recommended_action && s.recommended_action !== "none")
              .sort((a, b) => (b.service_trigger_score || 0) - (a.service_trigger_score || 0));
            return actionable[0]?.service_name || null;
          })()}
          dueBy={(() => {
            const actionable = serviceStatus
              .filter(s => s.recommended_action && s.recommended_action !== "none")
              .sort((a, b) => (b.service_trigger_score || 0) - (a.service_trigger_score || 0));
            return actionable[0]?.due_by || null;
          })()}
          triggerSource={(() => {
            const actionable = serviceStatus
              .filter(s => s.recommended_action && s.recommended_action !== "none")
              .sort((a, b) => (b.service_trigger_score || 0) - (a.service_trigger_score || 0));
            return actionable[0]?.trigger_source || null;
          })()}
        />
      </div>



      {/* Scheduled & Upcoming Flights */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Scheduled Flights */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-border">
            <h3 className="font-bold text-sm sm:text-base">Scheduled Flights</h3>
          </div>
          <div className="divide-y divide-border">
            {(() => {
              const scheduled = [...flights]
                .filter(f => f.flight_status === "scheduled")
                .sort((a, b) => new Date(a.scheduled_departure) - new Date(b.scheduled_departure))
                .slice(0, 5);
              
              return scheduled.length > 0 ? (
                scheduled.map(f => (
                  <div key={f.id} className="px-4 sm:px-6 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-primary">
                          {f.departure_airport} → {f.arrival_airport}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {f.scheduled_departure ? format(new Date(f.scheduled_departure), "MMM d, HH:mm") : "—"}
                        </p>
                      </div>
                      {f.block_hours && <p className="text-xs sm:text-sm font-semibold whitespace-nowrap">{f.block_hours.toFixed(1)} hrs</p>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-4 sm:px-6 py-6 text-center text-xs sm:text-sm text-muted-foreground">No scheduled flights</p>
              );
            })()}
          </div>
        </div>

        {/* Upcoming Flights (next 7 days) */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-border">
            <h3 className="font-bold text-sm sm:text-base">Upcoming Flights (7 days)</h3>
          </div>
          <div className="divide-y divide-border">
            {(() => {
              const now = new Date();
              const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              
              const upcoming = [...flights]
                .filter(f => {
                  const flightDate = new Date(f.flight_date);
                  return flightDate >= now && flightDate <= sevenDaysFromNow;
                })
                .sort((a, b) => new Date(a.flight_date) - new Date(b.flight_date))
                .slice(0, 5);
              
              return upcoming.length > 0 ? (
                upcoming.map(f => (
                  <div key={f.id} className="px-4 sm:px-6 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-primary">
                          {f.departure_airport} → {f.arrival_airport}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {f.flight_date ? format(new Date(f.flight_date), "MMM d, yyyy") : "—"}
                        </p>
                      </div>
                      {f.block_hours && <p className="text-xs sm:text-sm font-semibold whitespace-nowrap">{f.block_hours.toFixed(1)} hrs</p>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-4 sm:px-6 py-6 text-center text-xs sm:text-sm text-muted-foreground">No upcoming flights</p>
              );
            })()}
          </div>
        </div>
      </div>



      {/* Recent flights preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Recent Flights ({flights.length})</h3>
          {flights.length > 20 && <Link to={`/aircraft/${id}/flights`} className="text-xs text-primary font-semibold hover:underline">View Complete Record →</Link>}
        </div>
        <ResponsiveTable
          headers={["Date", "From", "To", "Block Hrs", "Cycle", "Counts", "Wear"]}
          rows={[...flights].sort((a, b) => new Date(b.flight_date) - new Date(a.flight_date)).slice(0, 10)}
          rowKey="id"
          renderRow={(f) => (
            <>
              <td className="px-4 py-2 text-xs">{f.flight_date}</td>
              <td className="px-4 py-2 font-mono font-semibold text-xs">{f.departure_airport}</td>
              <td className="px-4 py-2 font-mono font-semibold text-xs">{f.arrival_airport}</td>
              <td className="px-4 py-2 font-semibold">{f.block_hours?.toFixed(1)}</td>
              <td className="px-4 py-2">{f.flight_cycle}</td>
              <td className="px-4 py-2">
                <div
                  onClick={() => updateFlightMutation.mutate({ flightId: f.id, data: { count_toward_orbit: !f.count_toward_orbit } })}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-70"
                >
                  <Checkbox checked={f.count_toward_orbit} disabled={updateFlightMutation.isPending} />
                  <span className="text-xs font-semibold">{f.count_toward_orbit ? "Yes" : "No"}</span>
                </div>
              </td>
              <td className="px-4 py-2 text-xs">{f.wear_factor}x</td>
            </>
          )}
          renderCard={(f) => (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{f.flight_date}</span>
                <span className="text-xs text-muted-foreground">{f.wear_factor}x wear</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm">{f.departure_airport} → {f.arrival_airport}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Block Hours</p>
                  <p className="font-semibold">{f.block_hours?.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cycle</p>
                  <p className="font-semibold">{f.flight_cycle}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Counts</p>
                  <div
                    onClick={() => updateFlightMutation.mutate({ flightId: f.id, data: { count_toward_orbit: !f.count_toward_orbit } })}
                    className="flex items-center gap-1 cursor-pointer hover:opacity-70"
                  >
                    <Checkbox checked={f.count_toward_orbit} disabled={updateFlightMutation.isPending} />
                    <span className="font-semibold">{f.count_toward_orbit ? "Yes" : "No"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          emptyState="No flights logged"
        />
      </div>



      {/* Service Trigger Status */}
      <ServiceTriggerStatusPanel serviceStatus={serviceStatus} aircraft={ac} />

      {/* Service Trigger Overrides */}
      <ServiceTriggerOverridesPanel aircraft={ac} />

      {/* Maintenance history preview */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold">Maintenance History ({events.length})</h3>
          {events.length > 20 && <Link to={`/aircraft/${id}/maintenance`} className="text-xs text-primary font-semibold hover:underline">View Complete Record →</Link>}
        </div>
        <div className="divide-y divide-border">
          {[...events].sort((a, b) => new Date(b.service_date) - new Date(a.service_date)).slice(0, 20).map(e => (
            <div key={e.id} className="px-6 py-4 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => setEditingEvent(e)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{e.service_type}</span>
                    {e.reset_orbit_tracking && <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">ORBIT Reset</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{e.work_performed}</p>
                  {e.notes && <p className="text-xs text-muted-foreground mt-1 italic">{e.notes}</p>}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{e.service_date}</p>
                  <p>{e.technician_name}</p>
                </div>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="px-6 py-8 text-center text-muted-foreground text-sm">No maintenance events logged</p>}
        </div>
      </div>

      <EditMaintenanceModal
        open={!!editingEvent}
        onOpenChange={(o) => { if (!o) setEditingEvent(null); }}
        event={editingEvent}
        onSave={(data) => updateMaintMutation.mutateAsync({ eventId: data.id, data })}
        onDelete={(eventId) => deleteMaintMutation.mutateAsync(eventId)}
      />
      <AddFlightModal open={flightOpen} onOpenChange={setFlightOpen} aircraftId={id} tailNumber={ac.tail_number} onSave={addFlightMutation.mutateAsync} />
      <AddMaintenanceModal open={maintOpen} onOpenChange={setMaintOpen} aircraft={ac} onSave={addMaintMutation.mutateAsync} />
      <EditAircraftModal 
        open={editOpen} 
        onOpenChange={setEditOpen} 
        aircraft={ac} 
        onSave={updateAircraftMutation.mutateAsync}
        onDelete={() => {
          queryClient.invalidateQueries({ queryKey: ["aircraft"] });
          setEditOpen(false);
        }}
      />
      <JobScopeModal
        open={jobScopeOpen}
        onOpenChange={setJobScopeOpen}
        aircraft={ac}
        serviceStatuses={serviceStatus}
      />
    </div>
  );
}
