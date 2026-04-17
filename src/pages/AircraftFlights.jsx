import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from "../components/shared/PageHeader";
import ResponsiveTable from "../components/shared/ResponsiveTable";
import AddFlightModal from "../components/flights/AddFlightModal";
import { recalculateAircraftStatus, refetchAircraftQueries } from "@/lib/recalculateAircraftStatus";

export default function AircraftFlights() {
  const { id } = useParams();
  const [search, setSearch] = useState("");
  const [flightOpen, setFlightOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: ac } = useQuery({
    queryKey: ["aircraft", id],
    queryFn: () => base44.entities.Aircraft.get(id),
  });

  const { data: flights = [] } = useQuery({
    queryKey: ["flights", id],
    queryFn: () => base44.entities.Flight.filter({ aircraft_id: id }),
  });

  const updateFlightMutation = useMutation({
    mutationFn: ({ flightId, data }) => base44.entities.Flight.update(flightId, data),
    onSuccess: async () => {
      await recalculateAircraftStatus(id);
      await refetchAircraftQueries(queryClient, id, { includeFlights: true });
    },
  });

  const filtered = flights.filter(f =>
    !search ||
    f.flight_date?.includes(search) ||
    f.departure_airport?.toLowerCase().includes(search.toLowerCase()) ||
    f.arrival_airport?.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => new Date(b.flight_date) - new Date(a.flight_date));

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
            title={`${ac?.tail_number} - Flight Records`}
            subtitle={`${flights.length} flights · ${flights.reduce((s, f) => s + (f.block_hours || 0), 0).toFixed(1)} total hours`}
            actions={
              <Button onClick={() => setFlightOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add Flight
              </Button>
            }
          />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search date, airport..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <ResponsiveTable
          headers={["Date", "From", "To", "Block Hrs", "Cycle", "Counts", "Wear"]}
          rows={sorted}
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

      <AddFlightModal open={flightOpen} onOpenChange={setFlightOpen} aircraftId={id} tailNumber={ac?.tail_number} onSave={async (data) => {
        await base44.entities.Flight.create(data);
        await recalculateAircraftStatus(id);
        await refetchAircraftQueries(queryClient, id, { includeFlights: true });
        setFlightOpen(false);
      }} />
    </>
  );
}
