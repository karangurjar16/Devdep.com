import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    getDeployedProjects,
    getDeployStatus,
    type DeployedProject,
    type DeployStatus,
} from "@/api/github";
import { getDomainsByProjectId, reserveDomain } from "@/api/domain";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    Github,
    Globe,
    Calendar,
    Folder,
    Code2,
    ExternalLink,
    Plus,
    Trash2,
    RefreshCw,
} from "lucide-react";
import AddDomainDialog from "@/components/AddDomainDialog";

export default function ProjectDetails() {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();

    const [project, setProject] = useState<DeployedProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [status, setStatus] = useState<DeployStatus | "Unknown">("Unknown");
    const [domains, setDomains] = useState<string[]>([]);
    const [isAddDomainDialogOpen, setIsAddDomainDialogOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch project details
    useEffect(() => {
        if (!projectId) return;

        getDeployedProjects()
            .then((projects) => {
                const foundProject = projects.find((p) => p.id === projectId);
                if (foundProject) {
                    setProject(foundProject);
                } else {
                    setError("Project not found");
                }
            })
            .catch(() => setError("Unable to load project details"))
            .finally(() => setLoading(false));
    }, [projectId]);

    // Fetch deployment status with polling
    useEffect(() => {
        if (!projectId) return;

        let isCancelled = false;
        let intervalId: number | undefined;

        const fetchStatus = async () => {
            try {
                const deployStatus = await getDeployStatus(projectId);
                if (!isCancelled) {
                    setStatus(deployStatus);
                }
            } catch {
                if (!isCancelled) {
                    setStatus("Unknown");
                }
            }
        };

        fetchStatus();
        intervalId = window.setInterval(fetchStatus, 5000);

        return () => {
            isCancelled = true;
            if (intervalId) {
                window.clearInterval(intervalId);
            }
        };
    }, [projectId]);

    // Fetch domains
    useEffect(() => {
        if (!projectId) return;

        const fetchDomains = async () => {
            try {
                const projectDomains = await getDomainsByProjectId(projectId);
                setDomains(projectDomains);
            } catch (error) {
                console.error("Error fetching domains:", error);
            }
        };

        fetchDomains();
    }, [projectId]);

    const handleAddDomain = async (domain: string, proj: DeployedProject) => {
        try {
            const result = await reserveDomain(proj.id, domain);
            if (result.success) {
                // Refresh domains
                const updatedDomains = await getDomainsByProjectId(proj.id);
                setDomains(updatedDomains);
            } else {
                throw new Error(result.error || "Failed to reserve domain");
            }
        } catch (error) {
            console.error("Error adding domain:", error);
            throw error;
        }
    };

    const handleRemoveDomain = async (domain: string) => {
        if (!projectId) return;

        // TODO: Implement domain deletion API
        console.log("Domain deletion not yet implemented:", domain);
        alert("Domain deletion feature coming soon!");
    };

    const handleRefreshStatus = async () => {
        if (!projectId) return;

        setRefreshing(true);
        try {
            const deployStatus = await getDeployStatus(projectId);
            setStatus(deployStatus);
        } catch {
            setStatus("Unknown");
        } finally {
            setRefreshing(false);
        }
    };

    const getStatusVariant = (status?: DeployStatus | "Unknown") => {
        if (!status) return "outline" as const;

        const value = status.toLowerCase();

        if (value.startsWith("failed")) {
            return "destructive" as const;
        }

        switch (value) {
            case "uploading":
            case "deploying":
                return "secondary" as const;
            case "deployed":
            case "running":
                return "default" as const;
            default:
                return "outline" as const;
        }
    };

    const getStatusClassName = (status?: DeployStatus | "Unknown") => {
        if (!status) return "";

        const value = status.toLowerCase();

        if (value === "deployed") {
            return "bg-green-500 text-white border-transparent hover:bg-green-600";
        }

        return "";
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const extractRepoOwnerAndName = (repoUrl: string) => {
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (match) {
            return { owner: match[1], name: match[2] };
        }
        return { owner: "", name: "" };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
                <p className="text-muted-foreground">Loading project details...</p>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
                <div className="text-center">
                    <p className="text-destructive mb-4">{error || "Project not found"}</p>
                    <Button onClick={() => navigate("/dashboard")} className="btn-glossy">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    const { owner, name } = extractRepoOwnerAndName(project.repoUrl);
    const deploymentUrl = `${project.id}.devdep.dpdns.org`;

    return (
        <div className="min-h-screen bg-gradient-subtle">
            {/* Header */}
            <div className="glass-strong border-b border-white/10 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-white">{project.projectName}</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Project Details & Configuration
                            </p>
                        </div>
                        <Button
                            onClick={() => navigate("/dashboard")}
                            variant="outline"
                            className="glass border-white/20 hover:bg-white/10"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
                {/* Status & Quick Info Card */}
                <Card className="glass-strong border-white/10">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl">Deployment Status</CardTitle>
                            <Button
                                onClick={handleRefreshStatus}
                                variant="outline"
                                size="sm"
                                disabled={refreshing}
                                className="glass border-white/20 hover:bg-white/10"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                                Refresh
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            <Badge
                                variant={getStatusVariant(status)}
                                className={`${getStatusClassName(status)} text-sm px-3 py-1`}
                            >
                                {status}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>Created</span>
                                </div>
                                <p className="text-sm font-medium">{formatDate(project.createdAt)}</p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Code2 className="h-4 w-4" />
                                    <span>Framework</span>
                                </div>
                                <Badge variant="secondary">{project.framework}</Badge>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Folder className="h-4 w-4" />
                                    <span>Root Directory</span>
                                </div>
                                <p className="text-sm font-medium">{project.rootDir}</p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Github className="h-4 w-4" />
                                    <span>Repository</span>
                                </div>
                                <a
                                    href={project.repoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                >
                                    {owner}/{name}
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Deployment URLs Card */}
                <Card className="glass-strong border-white/10">
                    <CardHeader>
                        <CardTitle className="text-xl">Deployment URLs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Default URL */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Globe className="h-4 w-4" />
                                <span>Default Deployment URL</span>
                            </div>
                            <a
                                href={`https://${deploymentUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 rounded-lg glass border border-white/10 hover:border-primary/50 transition-colors group"
                            >
                                <span className="text-sm font-medium flex-1">{deploymentUrl}</span>
                                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </a>
                        </div>

                        {/* Custom Domains */}
                        <div className="space-y-2 pt-4 border-t border-white/10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Globe className="h-4 w-4" />
                                    <span>Custom Domains</span>
                                </div>
                                <Button
                                    onClick={() => setIsAddDomainDialogOpen(true)}
                                    size="sm"
                                    className="btn-glossy"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Domain
                                </Button>
                            </div>

                            {domains.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                    No custom domains configured
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {domains.map((domain) => {
                                        const fullDomain = `${domain}.devdep.dpdns.org`;
                                        return (
                                            <div
                                                key={domain}
                                                className="flex items-center gap-2 p-3 rounded-lg glass border border-white/10"
                                            >
                                                <a
                                                    href={`https://${fullDomain}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 flex-1 group"
                                                >
                                                    <Globe className="h-4 w-4 text-primary/70" />
                                                    <span className="text-sm font-medium">{fullDomain}</span>
                                                    <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </a>
                                                <Button
                                                    onClick={() => handleRemoveDomain(domain)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="px-3 hover:bg-destructive/20 hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Environment Variables Card */}
                <Card className="glass-strong border-white/10">
                    <CardHeader>
                        <CardTitle className="text-xl">Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Code2 className="h-4 w-4" />
                                <span>Environment Variables</span>
                            </div>
                            <div className="p-4 rounded-lg glass border border-white/10">
                                <p className="text-sm text-muted-foreground">
                                    {Object.keys(project.env || {}).length} environment variable(s) configured
                                </p>
                                {project.env && Object.keys(project.env).length > 0 && (
                                    <div className="mt-3 space-y-1">
                                        {Object.keys(project.env).map((key) => (
                                            <div key={key} className="flex items-center gap-2 text-sm">
                                                <span className="font-mono text-primary">{key}</span>
                                                <span className="text-muted-foreground">•••••</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add Domain Dialog */}
            <AddDomainDialog
                open={isAddDomainDialogOpen}
                onOpenChange={setIsAddDomainDialogOpen}
                project={project}
                onAddDomain={handleAddDomain}
            />
        </div>
    );
}
