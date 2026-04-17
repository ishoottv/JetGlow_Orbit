import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

function generatePdf(event) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("JetGlow ORBIT — Maintenance Record", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy")}`, 14, 22);

  doc.setTextColor(0, 0, 0);

  // Aircraft & Event Info
  let y = 44;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Aircraft & Service Details", 14, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y + 2, pageWidth - 14, y + 2);

  y += 10;
  doc.setFontSize(10);
  const fields = [
    ["Tail Number", event.tail_number || "—"],
    ["Service Date", event.service_date || "—"],
    ["Service Type", event.service_type || "—"],
    ["Technician", event.technician_name || "—"],
    ["Total Hours at Service", event.total_hours_at_service?.toFixed(1) ?? "—"],
    ["Total Cycles at Service", String(event.total_cycles_at_service ?? "—")],
    ["ORBIT Reset", event.reset_orbit_tracking ? "Yes" : "No"],
  ];

  for (const [label, value] of fields) {
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 80, y);
    y += 8;
  }

  // Services Performed
  if (event.services_performed?.length > 0) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Services Performed", 14, y);
    doc.line(14, y + 2, pageWidth - 14, y + 2);
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    for (const svc of event.services_performed) {
      doc.text(`• ${svc}`, 18, y);
      y += 7;
    }
  }

  // Work Performed / Notes
  if (event.work_performed) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Work Performed", 14, y);
    doc.line(14, y + 2, pageWidth - 14, y + 2);
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(event.work_performed, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 7;
  }

  if (event.notes) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Notes", 14, y);
    doc.line(14, y + 2, pageWidth - 14, y + 2);
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(event.notes, pageWidth - 28);
    doc.text(lines, 14, y);
  }

  return doc;
}

export default function MaintenancePdfModal({ open, onOpenChange, event }) {
  const iframeRef = useRef(null);
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    if (!open || !event) return;
    const doc = generatePdf(event);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [open, event]);

  const handleDownload = () => {
    if (!event) return;
    const doc = generatePdf(event);
    doc.save(`maintenance-${event.tail_number}-${event.service_date}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              Maintenance Record — {event?.tail_number} ({event?.service_date})
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2 mr-6">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </DialogHeader>
        <div className="rounded-lg overflow-hidden border border-border">
          {blobUrl && <iframe ref={iframeRef} src={blobUrl} className="w-full" style={{ height: '600px' }} title="Maintenance PDF" />}
        </div>
      </DialogContent>
    </Dialog>
  );
}