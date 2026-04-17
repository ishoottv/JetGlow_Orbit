import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "../components/shared/PageHeader";
import AddMaintenanceModal from "../components/maintenance/AddMaintenanceModal";
import EditMaintenanceModal from "../components/maintenance/EditMaintenanceModal";
import { recalculateAircraftStatus, refetchAircraftQueries } from "@/lib/recalculateAircraftStatus";

export default function AircraftMaintenance() {
  const { id } = useParams();
  const [search, setSearch] = useState("");
  const [maintOpen, setMaintOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const queryClient = useQueryClient();

  const { data: ac } = useQuery({
    queryKey: ["aircraft", id],
    queryFn: () => base44.entities.Aircraft.get(id),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["maintenance", id],
    queryFn: () => base44.entities.MaintenanceEvent.filter({ aircraft_id: id }),
  });

  const updateMaintMutation = useMutation({
    mutationFn: async ({ eventId, data }) => {
      const event = await base44.entities.MaintenanceEvent.update(eventId, data);
      await base44.functions.invoke("processMaintenanceEvent", { maintenance_event_id: eventId });
      return event;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance", id] });
      queryClient.invalidateQueries({ queryKey: ["aircraft", id] });
      try {
        await recalculateAircraftStatus(id);
        await refetchAircraftQueries(queryClient, id, { includeMaintenance: true });
      } catch (err) {
        console.error("Background recalc failed:", err);
      }
    },
  });

  const deleteMaintMutation = useMutation({
    mutationFn: async (eventId) => {
      await base44.functions.invoke("deleteMaintenanceEvent", { maintenance_event_id: eventId });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance", id] });
      try {
        await recalculateAircraftStatus(id);
        await refetchAircraftQueries(queryClient, id, { includeMaintenance: true });
      } catch (err) {
        console.error("Background recalc failed:", err);
      }
    },
  });

  const filtered = [...events]
    .sort((a, b) => new Date(b.service_date) - new Date(a.service_date))
    .filter(e =>
      !search ||
      e.service_type?.toLowerCase().includes(search.toLowerCase()) ||
      e.technician_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.work_performed?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link to={`/aircraft/${id}`}>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <PageHeader
            title={`${ac?.tail_number} - Maintenance History`}
            subtitle={`${events.length} maintenance events`}
            actions={
              <Button onClick={() => setMaintOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Log Maintenance
              </Button>
            }
          />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search service type, technician, work..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <p className="text-muted-foreground">No maintenance events found</p>
            </div>
          ) : (
            filtered.map(e => (
              <div key={e.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setEditingEvent(e)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-sm">{e.service_type}</span>
                      {e.reset_orbit_tracking && <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">ORBIT Reset</span>}
                    </div>
                    {e.work_performed && <p className="text-xs text-muted-foreground mb-1">{e.work_performed}</p>}
                    {e.notes && <p className="text-xs text-muted-foreground italic">{e.notes}</p>}
                    <div className="flex gap-4 text-xs text-muted-foreground mt-3">
                      <span>Date: {e.service_date}</span>
                      {e.total_hours_at_service != null && <span>Hours: {e.total_hours_at_service?.toFixed(1)}</span>}
                      {e.total_cycles_at_service != null && <span>Cycles: {e.total_cycles_at_service}</span>}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                    <p className="font-semibold">{e.technician_name || "—"}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AddMaintenanceModal open={maintOpen} onOpenChange={setMaintOpen} aircraft={ac} onSave={async (data) => { await base44.entities.MaintenanceEvent.create(data); queryClient.invalidateQueries({ queryKey: ["maintenance", id] }); setMaintOpen(false); }} />
      <EditMaintenanceModal
        open={!!editingEvent}
        onOpenChange={(o) => { if (!o) setEditingEvent(null); }}
        event={editingEvent}
        onSave={(data) => updateMaintMutation.mutateAsync({ eventId: data.id, data })}
        onDelete={(eventId) => deleteMaintMutation.mutateAsync(eventId)}
      />
    </>
  );
}
