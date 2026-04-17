import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Radio, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FlightCard from "../components/flights/FlightCard";
import FlightDetailDialog from "../components/flights/FlightDetailDialog";

export default function Flights() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [centerFilter, setCenterFilter] = useState("all");
  const [selectedFlight, setSelectedFlight] = useState(null);
  const queryClient = useQueryClient();

  const { data: flights = [], isLoading } = useQuery({
    queryKey: ["flights"],
    queryFn: () => base44.entities.Flight.list("-departure_time", 200),
  });

  const { data: centers = [] } = useQuery({
    queryKey: ["centers"],
    queryFn: () => base44.entities.FlightCenter.list(),
  });

  const centersMap = Object.fromEntries(centers.map((c) => [c.id, c.name]));

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Flight.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["flights"] }),
  });

  const filtered = flights.filter((f) => {
    const matchSearch =
      !search ||
      f.tail_number?.toLowerCase().includes(search.toLowerCase()) ||
      f.origin?.toLowerCase().includes(search.toLowerCase()) ||
      f.destination?.toLowerCase().includes(search.toLowerCase()) ||
      f.flight_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    const matchCenter = centerFilter === "all" || f.flight_center_id === centerFilter;
    return matchSearch && matchStatus && matchCenter;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Flights</h1>
        <p className="text-muted-foreground mt-1">{flights.length} flights recorded</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by tail number, airport, flight..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="en_route">En Route</SelectItem>
            <SelectItem value="landed">Landed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={centerFilter} onValueChange={setCenterFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Flight Center" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Centers</SelectItem>
            {centers.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Flights list */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <Radio className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No flights found</h3>
          <p className="text-muted-foreground mt-1">
            {flights.length === 0
              ? "Fetch flight data for your tracked aircraft to see flights here"
              : "Try adjusting your search or filters"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((flight) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              centerName={centersMap[flight.flight_center_id]}
              onClick={() => setSelectedFlight(flight)}
            />
          ))}
        </div>
      )}

      {selectedFlight && (
        <FlightDetailDialog
          flight={selectedFlight}
          open={!!selectedFlight}
          onOpenChange={(open) => !open && setSelectedFlight(null)}
          centers={centers}
          onUpdate={(id, data) => updateMutation.mutateAsync({ id, data })}
        />
      )}
    </div>
  );
}