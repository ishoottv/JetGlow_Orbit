import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { generateJobScope } from "@/lib/jobScopeFormatter";

export default function JobScopeModal({ open, onOpenChange, aircraft, serviceStatuses = [] }) {
  const [scope, setScope] = useState("");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: rules = [] } = useQuery({
    queryKey: ["service-rules"],
    queryFn: () => base44.entities.ServiceTriggerRule.filter({ is_active: true }),
    enabled: open,
  });

  const handleGenerate = () => {
    const generated = generateJobScope(aircraft, serviceStatuses, rules);
    setScope(generated);
    setEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(scope);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  const handleClose = () => {
    setScope("");
    setEditing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Build Job Scope — {aircraft?.tail_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!scope ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Generate a clean, copy-ready ORBIT job scope based on current service recommendations.
              </p>
              <Button onClick={handleGenerate} className="w-full">
                Generate Job Scope
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Scope Output */}
              <div className="bg-muted/30 border border-border rounded-lg p-4 font-mono text-xs whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                {editing ? (
                  <textarea
                    value={scope}
                    onChange={e => setScope(e.target.value)}
                    className="w-full h-full bg-transparent border-0 focus:outline-none resize-none font-mono text-xs"
                  />
                ) : (
                  scope
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(!editing)}
                  className="gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  {editing ? "Done Editing" : "Edit"}
                </Button>
                <Button
                  onClick={handleCopy}
                  size="sm"
                  className="gap-2"
                  disabled={copied}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScope("")}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Generate New
                </Button>
              </div>

              <p className="text-xs text-muted-foreground italic">
                Ready to paste into Jobber job description
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}