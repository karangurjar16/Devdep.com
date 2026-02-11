import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { DeployedProject } from "@/api/github";

interface DeleteProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project: DeployedProject | null;
    onDelete: (project: DeployedProject) => Promise<void>;
}

export default function DeleteProjectDialog({
    open,
    onOpenChange,
    project,
    onDelete,
}: DeleteProjectDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState("");

    const handleDelete = async () => {
        if (!project) return;

        setIsDeleting(true);
        setError("");

        try {
            await onDelete(project);
            onOpenChange(false);
        } catch (err: any) {
            setError(err.message || "Failed to delete project");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Delete Project
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete{" "}
                        <span className="font-semibold">{project?.projectName}</span>?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    <div className="rounded-lg bg-destructive/10 p-4 text-sm">
                        <p className="font-semibold text-destructive mb-2">
                            This action cannot be undone. This will permanently delete:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li>Database records</li>
                            {project?.framework === "React" && (
                                <li>All files from S3 bucket</li>
                            )}
                            {project?.framework === "Node" && (
                                <li>PM2 process and running application</li>
                            )}
                            <li>All custom domain mappings</li>
                        </ul>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? "Deleting..." : "Delete Project"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
