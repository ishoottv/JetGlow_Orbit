import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "../components/shared/PageHeader";
import CsvImportModal from "../components/flights/CsvImportModal";
import FlightDetailModal from "../components/flights/FlightDetailModal";
import PullToRefreshWrapper from "../components/shared/PullToRefreshWrapper";
import { recalculateAircraftStatus, refetchAircraftQueries } from "@/lib/recalculateAircraftStatus";

export default function FlightsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const queryClient = useQueryClient();

  const { data: flights = [], isLoading } = useQuery({
    queryKey: ["flights-all"],
    queryFn: () => base44.entities.Flight.list("-flight_date", 500),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Flight.update(id, data),
    onSuccess: async (_data, variables) => {
      await refetchAircraftQueries(queryClient, null, { includeFleetFlights: true });
      if (variables?.data && Object.prototype.hasOwnProperty.call(variables.data, "count_toward_orbit")) {
        const flight = flights.find((item) => item.id === variables.id);
        if (flight?.aircraft_id) {
          await recalculateAircraftStatus(flight.aircraft_id);
          await refetchAircraftQueries(queryClient, flight.aircraft_id, { includeAircraftList: true });
        }
      }
    },
  });

  const filtered = flights.filter(f => {
    const matchSearch = !search ||
      f.tail_number?.toLowerCase().includes(search.toLowerCase()) ||
      f.departure_airport?.toLowerCase().includes(search.toLowerCase()) ||
      f.arrival_airport?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = activeTab === "all" || f.flight_status === activeTab;
    return matchSearch && matchStatus;
  });

  const totalHours = filtered.reduce((s, f) => s + (f.block_hours || 0), 0);
  const totalCycles = filtered.reduce((s, f) => s + (f.flight_cycle || 0), 0);

  const handleRefresh = async () => {
    await refetchAircraftQueries(queryClient, null, { includeFleetFlights: true });
  };

  return (
    <>
      <PullToRefreshWrapper onRefresh={handleRefresh}>
      <div className="p-6 md:p-8">
        <PageHeader
        title="Flights"
        subtitle={`${flights.length} flights · ${totalHours.toFixed(1)} total hours · ${totalCycles} cycles`}
        actions={
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4" /> Import CSV
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tail, airport..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full overflow-x-auto">
            <TabsTrigger value="all" className="flex-1 min-w-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All</TabsTrigger>
            <TabsTrigger value="scheduled" className="flex-1 min-w-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Scheduled</TabsTrigger>
            <TabsTrigger value="en_route" className="flex-1 min-w-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">En Route</TabsTrigger>
            <TabsTrigger value="landed" className="flex-1 min-w-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Landed</TabsTrigger>
          </TabsList>

          {["all", "scheduled", "en_route", "landed"].map(status => (
            <TabsContent key={status} value={status} className="mt-6">
              {isLoading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-8 text-center">
                  <p className="text-muted-foreground text-sm">No flights found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(f => (
                    <div key={f.id} className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedFlight(f)}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-black font-mono text-primary text-sm">{f.tail_number}</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${f.flight_status === "landed" ? "bg-green-100 text-green-700" : f.flight_status === "en_route" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                                {f.flight_status}
                              </span>
                            </div>
                            <p className="text-sm font-semibold mb-2">{f.departure_airport} → {f.arrival_airport}</p>
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">Date</p>
                                <p className="font-semibold">{f.flight_date}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Hours</p>
                                <p className="font-semibold">{f.block_hours?.toFixed(1)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Cycle</p>
                                <p className="font-semibold">{f.flight_cycle}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Source</p>
                                <p className="font-semibold">{f.imported_source}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Counts:</span>
                              <Switch
                                checked={!!f.count_toward_orbit}
                                onCheckedChange={v => updateMutation.mutate({ id: f.id, data: { count_toward_orbit: v } })}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">{f.wear_factor}x wear</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      </div>

      </PullToRefreshWrapper>
      <CsvImportModal open={importOpen} onOpenChange={setImportOpen} />
      <FlightDetailModal
        open={!!selectedFlight}
        onOpenChange={o => { if (!o) setSelectedFlight(null); }}
        flight={selectedFlight}
      />
    </>
  );
}
