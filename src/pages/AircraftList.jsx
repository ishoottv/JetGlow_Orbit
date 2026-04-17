import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Archive, RefreshCw, RotateCw } from "lucide-react";
import PullToRefreshWrapper from "../components/shared/PullToRefreshWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/shared/PageHeader";
import EditAircraftModal from "../components/aircraft/EditAircraftModal";
import { toast } from "sonner";
import { recalculateAircraftStatus, refetchAircraftQueries } from "@/lib/recalculateAircraftStatus";
import { getServiceStatusLabel } from "@/lib/serviceStatusLabels";

export default function AircraftList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  const dueThisWeek = searchParams.get("dueThisWeek") === "true";

  useEffect(() => {
    if (searchParams.get("status")) {
      setStatusFilter(searchParams.get("status"));
    }
  }, [searchParams]);

  const { data: aircraft = [], isLoading } = useQuery({
    queryKey: ["aircraft"],
    queryFn: () => base44.entities.Aircraft.filter({ status: { $ne: "archived" } }, "-orbit_score"),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const customerMap = customers.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Aircraft.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aircraft"] });
      toast.success("Aircraft added");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => base44.entities.Aircraft.update(id, { status: "archived" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aircraft"] });
      toast.success("Aircraft archived");
    },
  });

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncAllFlights", {});
      const results = res.data?.results || [];
      const total = results.reduce((sum, r) => sum + (r.created || r.new_flights || 0), 0);
      
      // Fetch aircraft details for all aircraft to get make/model
      for (const ac of aircraft) {
        try {
          await base44.functions.invoke("fetchAircraftDetails", {
            tail_number: ac.tail_number,
            aircraft_id: ac.id,
          });
        } catch (err) {
          console.error(`Failed to fetch details for ${ac.tail_number}:`, err);
        }
      }

      await recalculateAircraftStatus();
      
      toast.success(`Sync complete — ${total} new flight(s) imported`);
      await refetchAircraftQueries(queryClient, null, { includeAircraftList: true });
    } catch (err) {
      toast.error("Sync failed: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = (ac) => {
    if (confirm(`Archive ${ac.tail_number}? It will be moved to the archive and hidden from main screens.`)) {
      archiveMutation.mutate(ac.id);
    }
  };

  const filtered = aircraft.filter(ac => {
    const customer = customerMap[ac.customer_id];
    const customerName = customer?.name || "";
    const matchSearch = !search ||
      ac.tail_number?.toLowerCase().includes(search.toLowerCase()) ||
      customerName.toLowerCase().includes(search.toLowerCase()) ||
      ac.make?.toLowerCase().includes(search.toLowerCase()) ||
      ac.model?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || ac.orbit_status === statusFilter;
    const matchCat = categoryFilter === "all" || ac.aircraft_category === categoryFilter;
    const matchDueThisWeek = !dueThisWeek || ac.orbit_status === "Red" || ac.orbit_status === "Amber";
    return matchSearch && matchStatus && matchCat && matchDueThisWeek;
  });

  const categories = [...new Set(aircraft.map(a => a.aircraft_category).filter(Boolean))];

  // Group filtered aircraft by customer
  const grouped = filtered.reduce((acc, ac) => {
    const customerId = ac.customer_id || "unassigned";
    if (!acc[customerId]) {
      acc[customerId] = [];
    }
    acc[customerId].push(ac);
    return acc;
  }, {});

  const sortedGroups = Object.entries(grouped).sort((a, b) => {
    const nameA = customerMap[a[0]]?.name || "Unassigned";
    const nameB = customerMap[b[0]]?.name || "Unassigned";
    return nameA.localeCompare(nameB);
  });

  const handleRefresh = async () => {
    await queryClient.refetchQueries({ queryKey: ["aircraft"] });
  };

  return (
    <>
      <PullToRefreshWrapper onRefresh={handleRefresh}>
      <div className="p-6 md:p-8">
        <PageHeader
        title="Aircraft"
        subtitle={`${aircraft.length} aircraft tracked`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/aircraft/archived" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">View Archive</Link>
            <Button variant="outline" onClick={handleSyncAll} disabled={syncing} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync FlightAware"}
            </Button>
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add Aircraft
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tail, owner, make, model..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="ORBIT Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Green">{getServiceStatusLabel("Green")}</SelectItem>
            <SelectItem value="Amber">{getServiceStatusLabel("Amber")}</SelectItem>
            <SelectItem value="Red">{getServiceStatusLabel("Red")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grouped Aircraft Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No aircraft found</div>
      ) : (
        <div className="space-y-8">
          {sortedGroups.map(([customerId, customerAircraft]) => {
            const customer = customerMap[customerId];
            const customerName = customer?.name || "Unassigned";
            return (
              <div key={customerId}>
                <h2 className="text-lg font-bold mb-4">{customerName}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customerAircraft.map(ac => {
                    const status = ac.orbit_status || "Green";
                    const borderColor = status === "Red" ? "border-red-400" : status === "Amber" ? "border-amber-400" : "border-border";
                    const barColor = status === "Red" ? "bg-red-500" : status === "Amber" ? "bg-amber-400" : "bg-green-500";
                    const badgeBg = status === "Red" ? "bg-red-100 text-red-700" : status === "Amber" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
                    const badgeLabel = getServiceStatusLabel(status);

                    return (
                    <Link key={ac.id} to={`/aircraft/${ac.id}`} className={`bg-card border-2 ${borderColor} rounded-2xl overflow-hidden hover:shadow-md transition-shadow`}>
                      {/* Status bar */}
                      <div className={`h-1.5 w-full ${barColor}`} />
                      <div className="p-4 space-y-3">
                        {/* Photo */}
                        <div className="relative">
                          {ac.photo_url ? (
                            <img src={ac.photo_url} alt={ac.tail_number} className="w-full h-40 object-cover rounded-lg border border-border" />
                          ) : (
                            <div className="w-full h-40 rounded-lg bg-muted border border-border flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">No photo</span>
                            </div>
                          )}
                          {/* Status badge overlay */}
                          <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${badgeBg}`}>
                            {badgeLabel}
                          </span>
                        </div>

                        {/* Tail Number + worst service */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-black font-mono text-foreground text-lg">{ac.tail_number}</p>
                            <p className="text-xs text-muted-foreground">{ac.make} {ac.model}</p>
                          </div>
                        </div>

                        {/* Worst service callout for Amber/Red */}
                        {(status === "Red" || status === "Amber") && ac.worst_service_name && (
                          <div className={`text-xs rounded-lg px-3 py-2 ${status === "Red" ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                            <span className="font-semibold">Focus: </span>{ac.worst_service_name}
                          </div>
                        )}

                        {/* Details Grid */}
                        <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground">Hours Since</p>
                            <p className="font-semibold text-sm">{(ac.hours_since_orbit || 0).toFixed(1)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Cycles</p>
                            <p className="font-semibold text-sm">{ac.cycles_since_orbit || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Days</p>
                            <p className="font-semibold text-sm">{ac.days_since_orbit || 0}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      </div>

      </PullToRefreshWrapper>
      <EditAircraftModal 
        open={addOpen} 
        onOpenChange={setAddOpen} 
        aircraft={null} 
        onSave={async (data) => {
          const result = await createMutation.mutateAsync(data);
          setAddOpen(false);
          return result;
        }} 
      />
    </>
  );
}
