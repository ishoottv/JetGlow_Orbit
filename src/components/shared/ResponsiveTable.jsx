import React from "react";
import { cn } from "@/lib/utils";

export default function ResponsiveTable({ 
  headers, 
  rows, 
  rowKey = "id",
  renderRow,
  renderCard,
  emptyState = "No data available"
}) {
  if (!rows || rows.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <p className="text-muted-foreground text-sm">{emptyState}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {headers.map(header => (
                  <th 
                    key={header}
                    className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, idx) => (
                <tr key={row[rowKey] || idx} className="hover:bg-muted/20 transition-colors">
                  {renderRow(row)}
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      {/* Mobile card grid */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {rows.map((row, idx) => (
          <div 
            key={row[rowKey] || idx}
            className="bg-card border border-border rounded-xl p-4"
          >
            {renderCard(row)}
          </div>
        ))}
      </div>
    </>
  );
}