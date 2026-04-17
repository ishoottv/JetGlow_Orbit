import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function DeleteAccountDialog({ open, onOpenChange }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    setDeleting(true);
    try {
      const user = await base44.auth.me();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Delete user account via backend function
      await base44.functions.invoke("deleteUserAccount", {});
      toast.success("Account deleted. Logging out...");
      
      // Logout after deletion
      setTimeout(() => {
        base44.auth.logout();
      }, 1000);
    } catch (err) {
      toast.error("Failed to delete account: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base mt-2">
            This action cannot be undone. All your data will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive mb-4">
          <p className="font-semibold mb-1">This will:</p>
          <ul className="text-xs space-y-1 list-disc list-inside">
            <li>Delete your account permanently</li>
            <li>Remove all aircraft, flights, and maintenance records</li>
            <li>Cannot be recovered</li>
          </ul>
        </div>

        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium">
            Type <span className="font-mono font-bold">DELETE</span> to confirm:
          </label>
          <Input
            type="text"
            placeholder="Type DELETE"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            disabled={deleting}
          />
        </div>

        <div className="flex gap-3 justify-end">
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting || confirmText !== "DELETE"}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleting ? "Deleting..." : "Delete Account"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}