import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { DeployedProject } from "@/api/github";
import { checkDomainAvailability } from "@/api/domain";

type AddDomainDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: DeployedProject | null;
  onAddDomain: (domain: string, project: DeployedProject) => Promise<void>;
};

// Domain validation regex: lowercase letters, numbers, and hyphens, 3-30 characters
const DOMAIN_REGEX = /^[a-z0-9-]{3,30}$/;

export default function AddDomainDialog({
  open,
  onOpenChange,
  project,
  onAddDomain,
}: AddDomainDialogProps) {
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate domain format
  const validateDomain = (value: string): boolean => {
    return DOMAIN_REGEX.test(value);
  };

  // Check domain availability
  useEffect(() => {
    const checkAvailability = async () => {
      const trimmedDomain = domain.trim().toLowerCase();
      
      if (!trimmedDomain) {
        setError("");
        setIsAvailable(null);
        return;
      }

      // First check format
      if (!validateDomain(trimmedDomain)) {
        setError("Domain must be 3-30 characters and contain only lowercase letters, numbers, and hyphens");
        setIsAvailable(false);
        return;
      }

      setError("");
      setIsChecking(true);
      
      try {
        const available = await checkDomainAvailability(trimmedDomain);
        setIsAvailable(available);
        if (!available) {
          setError("This domain is already taken");
        }
      } catch (err) {
        setError("Failed to check domain availability. Please try again.");
        setIsAvailable(false);
      } finally {
        setIsChecking(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [domain]);

  const handleSubmit = async () => {
    const trimmedDomain = domain.trim().toLowerCase();
    
    if (!trimmedDomain || !project) return;
    
    if (!validateDomain(trimmedDomain)) {
      setError("Domain must be 3-30 characters and contain only lowercase letters, numbers, and hyphens");
      return;
    }

    if (isAvailable === false) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddDomain(trimmedDomain, project);
      setDomain("");
      setError("");
      setIsAvailable(null);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDomain("");
      setError("");
      setIsAvailable(null);
      setIsChecking(false);
    }
    onOpenChange(newOpen);
  };

  const canSubmit = 
    domain.trim() && 
    validateDomain(domain.trim().toLowerCase()) && 
    isAvailable === true && 
    !isSubmitting &&
    !isChecking;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Domain</DialogTitle>
          <DialogDescription>
            Enter a custom domain for {project?.projectName || "this project"}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Input
            type="text"
            placeholder="example"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) {
                handleSubmit();
              }
            }}
            autoFocus
            className={error ? "border-destructive" : ""}
            aria-invalid={!!error}
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {!error && domain.trim() && isChecking && (
            <p className="text-sm text-muted-foreground">Checking availability...</p>
          )}
          {!error && domain.trim() && !isChecking && isAvailable === true && (
            <p className="text-sm text-green-600">Domain is available!</p>
          )}
        </div>
        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit}
          >
            {isSubmitting ? "Adding..." : "Add Domain"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
