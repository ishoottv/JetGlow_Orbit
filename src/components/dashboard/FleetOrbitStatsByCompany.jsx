import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { getServiceStatusLabel } from "@/lib/serviceStatusLabels";

export default function FleetOrbitStatsByCompany({ aircraft = [], customers = {} }) {
  // Group aircraft by customer
  const grouped = aircraft.reduce((acc, ac) => {
    const customerId = ac.customer_id || "unassigned";
    if (!acc[customerId]) {
      acc[customerId] = [];
    }
    acc[customerId].push(ac);
    return acc;
  }, {});

  // Calculate stats per customer
  const stats = Object.entries(grouped).map(([customerId, acs]) => {
    const green = acs.filter(a => a.orbit_status === "Green").length;
    const amber = acs.filter(a => a.orbit_status === "Amber").length;
    const red = acs.filter(a => a.orbit_status === "Red").length;
    const avgScore = acs.length > 0
      ? (acs.reduce((sum, a) => sum + (a.orbit_score || 0), 0) / acs.length).toFixed(1)
      : 0;
    const customerData = customers[customerId];
    const customerName = customerData?.name || (customerId === "unassigned" ? "Unassigned" : "Unknown");
    const logoUrl = customerData?.logo_url;

    return {
      customerId,
      customerName,
      logoUrl,
      total: acs.length,
      green,
      amber,
      red,
      avgScore,
    };
  });

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-border">
        <h2 className="font-bold text-sm sm:text-base">Fleet ORBIT Stats by Company</h2>
      </div>
      
      {stats.length === 0 ? (
        <p className="px-4 sm:px-6 py-8 text-center text-muted-foreground text-xs sm:text-sm">No aircraft data</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Company", "Total", getServiceStatusLabel("Green"), getServiceStatusLabel("Amber"), getServiceStatusLabel("Red"), "Avg Score"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.map(s => (
                <tr key={s.customerId} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    {s.customerId !== "unassigned" ? (
                      <Link to={`/customers/${s.customerId}`} className="flex items-center gap-2 hover:opacity-80">
                        {s.logoUrl ? (
                          <img src={s.logoUrl} alt={s.customerName} className="h-8 w-8 object-contain rounded border border-border" />
                        ) : (
                          <div className="h-8 w-8 bg-muted rounded border border-border flex items-center justify-center">
                            <span className="text-xs font-semibold text-muted-foreground">{s.customerName.charAt(0)}</span>
                          </div>
                        )}
                        <span className="font-semibold text-xs sm:text-sm text-primary">{s.customerName}</span>
                      </Link>
                    ) : (
                      <span className="font-semibold text-xs sm:text-sm">{s.customerName}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-semibold">{s.total}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-xs font-semibold text-green-700">{s.green}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-700">{s.amber}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      <span className="text-xs font-semibold text-red-700">{s.red}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-semibold">{s.avgScore}/100</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
