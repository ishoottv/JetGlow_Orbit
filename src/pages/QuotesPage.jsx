import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw, FileText, CheckCircle, Clock, Send, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "../components/shared/PageHeader";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const statusConfig = {
  draft:    { label: "Draft",    bg: "bg-muted",            text: "text-muted-foreground", icon: Clock },
  sent:     { label: "Sent",     bg: "bg-blue-100",         text: "text-blue-700",         icon: Send },
  approved: { label: "Approved", bg: "bg-green-100",        text: "text-green-700",        icon: CheckCircle },
  declined: { label: "Declined", bg: "bg-red-100",          text: "text-red-700",          icon: FileText },
};

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function QuotesPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["external-quotes"],
    queryFn: async () => {
      const res = await base44.functions.invoke("fetchExternalAircraft", {});
      return res.data?.quotes || [];
    },
  });

  const quotes = data || [];

  const filtered = quotes.filter(q => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.tail_number?.toLowerCase().includes(s) ||
      q.client_name?.toLowerCase().includes(s) ||
      q.client_company?.toLowerCase().includes(s) ||
      q.aircraft_type?.toLowerCase().includes(s)
    );
  });

  const totalValue = filtered.reduce((sum, q) => sum + (q.total || 0), 0);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">JetGlow Quotes</h1>
            <p className="text-sm text-muted-foreground">Detailing quotes from the JetGlow quoting app</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 flex-shrink-0">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Quotes", value: quotes.length },
          { label: "Shown", value: filtered.length },
          { label: "Sent", value: quotes.filter(q => q.status === "sent").length },
          { label: "Total Value", value: `$${totalValue.toLocaleString()}` },
        ].map(item => (
          <div key={item.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-2xl font-black mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by tail #, client, company, or aircraft type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-8 text-center">
          <p className="font-semibold text-destructive">Failed to load quotes</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {["Tail #", "Client", "Company", "Aircraft Type", "Services", "Total", "Date", "Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No quotes found</td></tr>
                  ) : (
                    filtered.map(q => (
                      <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3"><span className="font-black font-mono text-primary text-sm">{q.tail_number || "—"}</span></td>
                        <td className="px-4 py-3"><p className="font-medium text-xs">{q.client_name || "—"}</p><p className="text-xs text-muted-foreground">{q.client_email}</p></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{q.client_company || "—"}</td>
                        <td className="px-4 py-3 text-xs">{q.aircraft_type || "—"}</td>
                        <td className="px-4 py-3"><div className="flex flex-col gap-0.5">{(q.services || []).map((s, i) => <span key={i} className="text-xs text-muted-foreground">{s.name}</span>)}</div></td>
                        <td className="px-4 py-3 font-bold text-sm">${(q.total || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{q.quote_date ? format(new Date(q.quote_date), "MMM d, yyyy") : "—"}</td>
                        <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">No quotes found</div>
            ) : (
              filtered.map(q => (
                <div key={q.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="font-black font-mono text-primary text-sm">{q.tail_number || "—"}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{q.aircraft_type || "—"}</p>
                    </div>
                    <StatusBadge status={q.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div><p className="text-muted-foreground">Client</p><p className="font-semibold">{q.client_name || "—"}</p></div>
                    <div><p className="text-muted-foreground">Company</p><p className="font-semibold">{q.client_company || "—"}</p></div>
                    <div><p className="text-muted-foreground">Total</p><p className="font-bold text-sm">${(q.total || 0).toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Date</p><p className="font-semibold">{q.quote_date ? format(new Date(q.quote_date), "MMM d, yyyy") : "—"}</p></div>
                  </div>
                  {(q.services || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {q.services.map((s, i) => <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{s.name}</span>)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}