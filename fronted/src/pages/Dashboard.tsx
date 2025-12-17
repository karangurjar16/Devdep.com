import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getDeployedProjects, type DeployedProject } from "@/api/github";
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
  MoreVertical,
  Activity,
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DeployedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDeployedProjects()
      .then(setProjects)
      .catch(() => setError("Unable to load deployed projects"))
      .finally(() => setLoading(false));
  }, []);

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
            const deploymentUrl = `${project.id}.devdep.app`; // Construct deployment URL

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
                      <MoreVertical className="h-4 w-4 text-muted-foreground cursor-pointer" />
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

                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">{project.framework}</Badge>
                    {project.rootDir !== "./" && (
                      <Badge variant="outline">Root: {project.rootDir}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
