import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plane, Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AddAircraftDialog from "../components/aircraft/AddAircraftDialog";
import { format } from "date-fns";

export default function Aircraft() {
  const [addOpen, setAddOpen] = useState(false);
  const [fetchingId, setFetchingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: aircraft = [], isLoading } = useQuery({
    queryKey: ["aircraft"],
    queryFn: () => base44.entities.Aircraft.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Aircraft.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aircraft"] });
      toast.success("Aircraft added");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Aircraft.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["aircraft"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Aircraft.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aircraft"] });
      toast.success("Aircraft removed");
    },
  });

  const fetchFlights = async (ac) => {
    setFetchingId(ac.id);
    const res = await base44.functions.invoke("fetchFlights", {
      tail_number: ac.tail_number,
      aircraft_id: ac.id,
    });
    setFetchingId(null);
    queryClient.invalidateQueries({ queryKey: ["flights"] });
    toast.success(`Fetched ${res.data.fetched} flights, ${res.data.created} new for ${ac.tail_number}`);
  };

  const toggleStatus = (ac) => {
    updateMutation.mutate({
      id: ac.id,
      data: { status: ac.status === "active" ? "inactive" : "active" },
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft</h1>
          <p className="text-muted-foreground mt-1">Manage tail numbers you're tracking</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Aircraft
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : aircraft.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <Plane className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No aircraft yet</h3>
          <p className="text-muted-foreground mt-1 mb-6">Start by adding a tail number to track</p>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Your First Aircraft
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {aircraft.map((ac) => (
            <div
              key={ac.id}
              className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plane className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold font-mono text-lg tracking-wider">{ac.tail_number}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {ac.aircraft_type && (
                      <span className="text-sm text-muted-foreground">{ac.aircraft_type}</span>
                    )}
                    {ac.owner && (
                      <span className="text-sm text-muted-foreground">• {ac.owner}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {ac.last_checked && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    Checked {format(new Date(ac.last_checked), "MMM d, HH:mm")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ac.status === "active" ? "default" : "secondary"}>
                  {ac.status || "active"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchFlights(ac)}
                  disabled={fetchingId === ac.id}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${fetchingId === ac.id ? "animate-spin" : ""}`} />
                  {fetchingId === ac.id ? "Fetching..." : "Fetch Flights"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleStatus(ac)}
                  title={ac.status === "active" ? "Deactivate" : "Activate"}
                >
                  {ac.status === "active" ? (
                    <ToggleRight className="w-5 h-5 text-primary" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(ac.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddAircraftDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={createMutation.mutateAsync}
        onFlightsFetched={() => queryClient.invalidateQueries({ queryKey: ["flights"] })}
      />
    </div>
  );
}