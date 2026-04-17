import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { recalculateAircraftStatus, refetchAircraftQueries } from "@/lib/recalculateAircraftStatus";

export default function CsvImportModal({ open, onOpenChange }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);

    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/"/g, ""));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i]);
      return obj;
    }).filter(r => r.tail_number);

    let created = 0, skipped = 0;
    const affectedAircraftIds = new Set();
    for (const row of rows) {
      // Look up aircraft by tail number
      const aircraft = await base44.entities.Aircraft.filter({ tail_number: row.tail_number?.toUpperCase() });
      if (aircraft.length === 0) { skipped++; continue; }
      const ac = aircraft[0];

      // Check for duplicate
      if (row.flightaware_flight_id) {
        const existing = await base44.entities.Flight.filter({ flightaware_flight_id: row.flightaware_flight_id });
        if (existing.length > 0) { skipped++; continue; }
      }

      const blockHours = parseFloat(row.block_hours) || 0;
      await base44.entities.Flight.create({
        aircraft_id: ac.id,
        tail_number: row.tail_number?.toUpperCase(),
        flightaware_flight_id: row.flightaware_flight_id || "",
        flight_date: row.flight_date || "",
        departure_airport: row.departure_airport?.toUpperCase() || "",
        arrival_airport: row.arrival_airport?.toUpperCase() || "",
        block_hours: blockHours,
        flight_cycle: 1,
        flight_status: row.flight_status || "landed",
        imported_source: "csv_import",
        count_toward_orbit: true,
        wear_factor: 1.0,
      });
      affectedAircraftIds.add(ac.id);
      created++;
    }

    for (const aircraftId of affectedAircraftIds) {
      await recalculateAircraftStatus(aircraftId);
    }

    await refetchAircraftQueries(queryClient, null, {
      includeFleetFlights: true,
      includeAircraftList: true,
    });
    setResult({ created, skipped, total: rows.length });
    setLoading(false);
    toast.success(`Imported ${created} flights`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); setResult(null); setFile(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Import Flights from CSV</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground mb-2">Required CSV columns:</p>
            <p>tail_number, flight_date, departure_airport, arrival_airport, block_hours</p>
            <p>Optional: actual_departure, actual_arrival, flight_status, flightaware_flight_id</p>
            <p className="mt-2 text-amber-600 font-medium">Aircraft must already exist in the system to match flights.</p>
          </div>

          {!result ? (
            <>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">Select your CSV file</p>
                <input type="file" accept=".csv" className="hidden" id="csv-upload" onChange={e => setFile(e.target.files[0])} />
                <label htmlFor="csv-upload">
                  <Button variant="outline" className="cursor-pointer" asChild><span>{file ? file.name : "Choose File"}</span></Button>
                </label>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={!file || loading}>{loading ? "Importing..." : "Import Flights"}</Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <p className="font-bold text-lg">{result.created} flights imported</p>
              <p className="text-sm text-muted-foreground">{result.skipped} skipped (duplicate or unknown aircraft)</p>
              <Button className="mt-4" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
