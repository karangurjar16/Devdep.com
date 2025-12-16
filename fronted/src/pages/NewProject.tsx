import { useParams } from "react-router-dom";
import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Github } from "lucide-react";

export default function NewProject() {
  const { owner, repo } = useParams();

  const [team, setTeam] = useState("karangurjar16’s projects");
  const [projectName, setProjectName] = useState(repo || "");
  const [framework, setFramework] = useState("Other");
  const [rootDir, setRootDir] = useState("./");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">New Project</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Github className="h-4 w-4" />
              <span>
                Importing from GitHub · {owner}/{repo}
              </span>
            </div>
          </div>

          {/* Team + Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm">Vercel Team</label>
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="karangurjar16’s projects">
                    karangurjar16’s projects (Hobby)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm">Project Name</label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
          </div>

          {/* Framework */}
          <div className="space-y-1">
            <label className="text-sm">Framework Preset</label>
            <Select value={framework} onValueChange={setFramework}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Other">Other</SelectItem>
                <SelectItem value="Next.js">Next.js</SelectItem>
                <SelectItem value="React">React</SelectItem>
                <SelectItem value="Node">Node</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Root Directory */}
          <div className="space-y-1">
            <label className="text-sm">Root Directory</label>
            <Input
              value={rootDir}
              onChange={(e) => setRootDir(e.target.value)}
            />
          </div>

          {/* Deploy */}
          <Button className="w-full mt-4">Deploy</Button>

          {/* Debug (optional, remove later) */}
          <pre className="text-xs text-muted-foreground">
            {JSON.stringify(
              { owner, repo, team, projectName, framework, rootDir },
              null,
              2
            )}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
