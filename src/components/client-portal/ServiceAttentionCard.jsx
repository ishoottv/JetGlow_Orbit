import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ServiceAttentionCard({
  attentionService = null,
  onRequestService = null,
}) {
  if (!attentionService) {
    return (
      <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="w-8 h-8 flex-shrink-0 mt-1 text-green-600" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-700">All Systems Healthy</h3>
            <p className="text-sm text-slate-700 mt-2">
              All primary care items are currently within their recommended intervals. Your aircraft is well-maintained.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-8 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-8 h-8 flex-shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-amber-700">Attention Soon</h3>
            <p className="text-sm font-semibold text-amber-900 mt-2">{attentionService.serviceName}</p>
          </div>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed">
          Scheduling this service soon will help maintain appearance and ensure proper care of your aircraft. This is part of regular JetGlow ORBIT maintenance.
        </p>

        {onRequestService && (
          <button
            onClick={onRequestService}
            className="w-full mt-4 py-3 px-4 rounded-xl font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-white transition-all"
          >
            Schedule Service
          </button>
        )}
      </div>
    </div>
  );
}