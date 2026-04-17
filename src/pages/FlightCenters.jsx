import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Trash2, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AddCenterDialog from "../components/centers/AddCenterDialog";

export default function FlightCenters() {
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: centers = [], isLoading } = useQuery({
    queryKey: ["centers"],
    queryFn: () => base44.entities.FlightCenter.list("-created_date"),
  });

  const { data: flights = [] } = useQuery({
    queryKey: ["flights"],
    queryFn: () => base44.entities.Flight.list("-departure_time", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FlightCenter.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      toast.success("Flight center added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FlightCenter.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      toast.success("Flight center removed");
    },
  });

  const getFlightCount = (centerId) => flights.filter((f) => f.flight_center_id === centerId).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flight Centers</h1>
          <p className="text-muted-foreground mt-1">Organize flights into operational categories</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Center
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : centers.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No flight centers yet</h3>
          <p className="text-muted-foreground mt-1 mb-6">
            Create centers to organize and categorize your flights
          </p>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Center
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {centers.map((center) => {
            const count = getFlightCount(center.id);
            return (
              <div
                key={center.id}
                className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow group relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 w-full h-1"
                  style={{ backgroundColor: center.color || "#3b82f6" }}
                />
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: (center.color || "#3b82f6") + "20" }}
                    >
                      <MapPin className="w-5 h-5" style={{ color: center.color || "#3b82f6" }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{center.name}</h3>
                      {center.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {center.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(center.id)}
                    className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Plane className="w-4 h-4" />
                  <span>{count} flight{count !== 1 ? "s" : ""} assigned</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddCenterDialog open={addOpen} onOpenChange={setAddOpen} onAdd={createMutation.mutateAsync} />
    </div>
  );
}