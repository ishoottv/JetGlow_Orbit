import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Trash2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/shared/PageHeader";
import PullToRefreshWrapper from "../components/shared/PullToRefreshWrapper";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import MaintenancePdfModal from "../components/maintenance/MaintenancePdfModal";

export default function MaintenancePage() {
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["maintenance-all"],
    queryFn: () => base44.entities.MaintenanceEvent.list("-service_date", 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-all"] });
      toast.success("Maintenance event deleted");
    },
  });

  const handleDelete = (e, id) => {
    if (!confirm("Delete this maintenance event? This cannot be undone.")) return;
    deleteMutation.mutate(id);
  };

  const filtered = events.filter(e =>
    !search ||
    e.tail_number?.toLowerCase().includes(search.toLowerCase()) ||
    e.service_type?.toLowerCase().includes(search.toLowerCase()) ||
    e.technician_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = async () => {
    await queryClient.refetchQueries({ queryKey: ["maintenance-all"] });
  };

  return (
    <PullToRefreshWrapper onRefresh={handleRefresh}>
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/"><Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Maintenance Events</h1>
          <p className="text-sm text-muted-foreground">{events.length} events logged</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tail, service type, technician..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Date", "Tail #", "Service Type", "Technician", "Hrs at Service", "Cycles at Service", "ORBIT Reset", "Work Performed", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No maintenance events found</td></tr>}
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelectedEvent(e)}>
                  <td className="px-4 py-3 text-xs">{e.service_date}</td>
                  <td className="px-4 py-3 font-mono font-bold text-primary text-xs">{e.tail_number}</td>
                  <td className="px-4 py-3 text-xs font-semibold">{e.service_type}</td>
                  <td className="px-4 py-3 text-xs">{e.technician_name || "—"}</td>
                  <td className="px-4 py-3 text-xs">{e.total_hours_at_service?.toFixed(1)}</td>
                  <td className="px-4 py-3 text-xs">{e.total_cycles_at_service}</td>
                  <td className="px-4 py-3">
                    {e.reset_orbit_tracking
                      ? <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">Yes</span>
                      : <span className="text-xs text-muted-foreground">No</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{e.work_performed || "—"}</td>
                  <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(ev) => { ev.stopPropagation(); handleDelete(ev, e.id); }} disabled={deleteMutation.isPending}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {isLoading && <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>}
        {!isLoading && filtered.length === 0 && <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">No maintenance events found</div>}
        {filtered.map(e => (
          <div key={e.id} className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedEvent(e)}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <span className="font-black font-mono text-primary text-sm">{e.tail_number}</span>
                <span className="ml-2 text-xs font-semibold text-foreground">{e.service_type}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {e.reset_orbit_tracking && <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">Reset</span>}
                <div onClick={ev => ev.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={(ev) => { ev.stopPropagation(); handleDelete(ev, e.id); }} disabled={deleteMutation.isPending}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
              <div><p className="text-muted-foreground">Date</p><p className="font-semibold">{e.service_date}</p></div>
              <div><p className="text-muted-foreground">Hours</p><p className="font-semibold">{e.total_hours_at_service?.toFixed(1) || "—"}</p></div>
              <div><p className="text-muted-foreground">Cycles</p><p className="font-semibold">{e.total_cycles_at_service || "—"}</p></div>
            </div>
            {e.technician_name && <p className="text-xs text-muted-foreground">Tech: {e.technician_name}</p>}
            {e.work_performed && <p className="text-xs text-muted-foreground mt-1 truncate">{e.work_performed}</p>}
          </div>
        ))}
      </div>
      <MaintenancePdfModal
        open={!!selectedEvent}
        onOpenChange={(o) => { if (!o) setSelectedEvent(null); }}
        event={selectedEvent}
      />
    </div>
    </PullToRefreshWrapper>
  );
}