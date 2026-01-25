import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  getDeployedProjects,
  getDeployStatus,
  type DeployedProject,
  type DeployStatus,
} from "@/api/github";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Github,
  Calendar,
  Folder,
  Activity,
  Globe,
} from "lucide-react";
import DropdownMenu, { type MenuOption } from "@/components/DropdownMenu";
import AddDomainDialog from "@/components/AddDomainDialog";
import { reserveDomain } from "@/api/domain";

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DeployedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statuses, setStatuses] = useState<Record<string, DeployStatus | "Unknown">>({});
  const [isAddDomainDialogOpen, setIsAddDomainDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<DeployedProject | null>(null);

  useEffect(() => {
    getDeployedProjects()
      .then(setProjects)
      .catch(() => setError("Unable to load deployed projects"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (projects.length === 0) return;

    let isCancelled = false;
    let intervalId: number | undefined;

    const fetchStatuses = async () => {
      try {
        const entries = await Promise.all(
          projects.map(async (project) => {
            try {
              const status = await getDeployStatus(project.id);
              return [project.id, status] as const;
            } catch {
              return [project.id, "Unknown" as const];
            }
          }),
        );

        if (!isCancelled) {
          setStatuses((prev) => ({
            ...prev,
            ...Object.fromEntries(entries),
          }));
        }
      } catch {
        // ignore top-level errors for polling
      }
    };

    // initial fetch
    fetchStatuses();
    // poll every 5 seconds
    intervalId = window.setInterval(fetchStatuses, 5000);

    return () => {
      isCancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [projects]);

  const getStatusVariant = (status?: DeployStatus | "Unknown") => {
    const value = status?.toLowerCase();
    switch (value) {
      case "uploading":
      case "deploying":
        return "secondary" as const;
      case "running":
        return "default" as const;
      case "failed":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  const extractRepoOwnerAndName = (repoUrl: string) => {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return { owner: match[1], name: match[2] };
    }
    return { owner: "", name: "" };
  };

  // Define menu options - easily extensible
  const getMenuOptions = (): MenuOption<DeployedProject>[] => [
    {
      label: "Add Domain",
      icon: <Globe className="h-4 w-4" />,
      onClick: (project) => {
        setSelectedProject(project);
        setIsAddDomainDialogOpen(true);
      },
    },
    // Add more options here easily:
    // {
    //   label: "Settings",
    //   icon: <Settings className="h-4 w-4" />,
    //   onClick: (project) => {
    //     console.log("Settings clicked for project:", project.id);
    //   },
    // },
  ];

  const handleAddDomain = async (domain: string, project: DeployedProject) => {
    try {
      const result = await reserveDomain(project.id, domain);
      if (result.success) {
        console.log("Domain added successfully:", domain);
        // You can add a success toast notification here
        // Optionally refresh the projects list or update UI
      } else {
        throw new Error(result.error || "Failed to reserve domain");
      }
    } catch (error) {
      console.error("Error adding domain:", error);
      throw error; // Re-throw to let the dialog handle the error
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button onClick={() => navigate("/my-projects")}>
          My Projects
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="mt-10 text-muted-foreground">
          No deployed projects found. Start by importing a project.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {projects.map((project) => {
            const { owner, name } = extractRepoOwnerAndName(project.repoUrl);
            const deploymentUrl = `${project.id}.devdep.dpdns.org`; // Construct deployment URL

            return (
              <Card key={project.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold truncate">
                        {project.projectName}
                      </CardTitle>
                      <a
                        href={`https://${deploymentUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors block mt-1"
                      >
                        {deploymentUrl}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <DropdownMenu
                        id={project.id}
                        options={getMenuOptions()}
                        data={project}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {owner}/{name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 flex-1">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Folder className="h-4 w-4" />
                      <span>main</span>
                    </div>
                  </div>

                <div className="flex gap-2 flex-wrap items-center">
                  <Badge variant="secondary">{project.framework}</Badge>
                  {project.rootDir !== "./" && (
                    <Badge variant="outline">Root: {project.rootDir}</Badge>
                  )}
                  <Badge variant={getStatusVariant(statuses[project.id])}>
                    {statuses[project.id] ?? "Loading status..."}
                  </Badge>
                </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddDomainDialog
        open={isAddDomainDialogOpen}
        onOpenChange={setIsAddDomainDialogOpen}
        project={selectedProject}
        onAddDomain={handleAddDomain}
      />
    </div>
  );
}
