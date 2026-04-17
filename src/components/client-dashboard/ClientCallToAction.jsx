import React from "react";
import { Button } from "@/components/ui/button";
import { Phone, Calendar } from "lucide-react";

const ctaMap = {
  "On Schedule": {
    text: "No immediate action required. Your aircraft is being maintained within JetGlow ORBIT standards.",
    showButton: false,
    buttonText: null,
    buttonVariant: "default",
    buttonIcon: null,
  },
  "Due Soon": {
    text: "We recommend scheduling upcoming service to maintain optimal aircraft condition.",
    showButton: true,
    buttonText: "Schedule Service",
    buttonVariant: "default",
    buttonIcon: Calendar,
  },
  "Due Now / Overdue": {
    text: "Service is now due or overdue. We recommend scheduling service as soon as possible.",
    showButton: true,
    buttonText: "Request Priority Service",
    buttonVariant: "default",
    buttonIcon: Phone,
  },
};

export default function ClientCallToAction({ label = "On Schedule", onAction = null }) {
  const config = ctaMap[label] || ctaMap["On Schedule"];
  const IconComponent = config.buttonIcon;

  const bgColor =
    label === "Due Now / Overdue"
      ? "from-red-900/20 to-red-800/10 border-red-500/30"
      : label === "Due Soon"
      ? "from-amber-900/20 to-amber-800/10 border-amber-500/30"
      : "from-green-900/20 to-green-800/10 border-green-500/30";

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${bgColor} p-8 backdrop-blur-sm`}
    >
      <p className="text-gray-200 text-base leading-relaxed">{config.text}</p>

      {config.showButton && (
        <Button
          onClick={onAction}
          className="mt-6 bg-yellow-600 hover:bg-yellow-700 text-black font-semibold gap-2 rounded-xl px-6 py-3 h-auto"
        >
          {IconComponent && <IconComponent className="w-4 h-4" />}
          {config.buttonText}
        </Button>
      )}
    </div>
  );
}
