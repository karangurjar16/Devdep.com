import { useParams, useNavigate } from "react-router-dom";
import { useState, useRef } from "react";

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
import { Github, Plus, Trash2 } from "lucide-react";
import { deployProject } from "@/api/deploy";

export default function NewProject() {
  const { owner, repo } = useParams();
  const navigate = useNavigate();

  const [team, setTeam] = useState("karangurjar16's projects");
  const [projectName, setProjectName] = useState(repo || "");
  const [framework, setFramework] = useState("Other");
  const [rootDir, setRootDir] = useState("./");
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(1);

  const [envVars, setEnvVars] = useState(
    [{ id: idRef.current, key: "", value: "" }]
  );

  function nextId() {
    idRef.current += 1;
    return idRef.current;
  }

  function parseEnv(text: string) {
    const lines = text.split(/\r?\n/);
    const result: { id: number; key: string; value: string }[] = [];
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      if (line.startsWith("#")) continue;
      line = line.replace(/^export\s+/, "");
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      let key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      result.push({ id: nextId(), key, value });
    }
    return result;
  }

  async function handleDeploy() {
    if (!owner || !repo) {
      setError("Owner and repository are required");
      return;
    }

    const envObject: Record<string, string> = {};
    for (const e of envVars) {
      if (e.key.trim() === "") continue;
      envObject[e.key] = e.value;
    }

    const payload = {
      owner,
      repo,
      team,
      projectName,
      framework,
      rootDir,
      env: envObject,
    };

    setIsDeploying(true);
    setError(null);

    try {
      await deployProject(payload);
      
      // Navigate to dashboard after successful deployment
      navigate("/dashboard");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to deploy project";
      setError(errorMessage);
      console.error("Deployment error:", err);
    } finally {
      setIsDeploying(false);
    }
  }

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
                    karangurjar17’s projects (Hobby)
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

          {/* Environment Variables */}
          <div className="space-y-1">
            <label className="text-sm">Environment Variables (.env)</label>
            <textarea
              onPaste={(e) => {
                try {
                  const pasted = e.clipboardData.getData("text");
                  const parsed = parseEnv(pasted);
                  if (parsed.length > 0) {
                    setEnvVars(parsed.map((p) => ({ ...p })));
                  }
                } catch (err) {
                  // ignore
                }
              }}
              placeholder={"Paste .env content here to auto-populate"}
              className="w-full rounded border p-2 text-sm min-h-[56px]"
            />

            <div className="space-y-2">
              {envVars.map((env) => (
                <div key={env.id} className="flex gap-2">
                  <Input
                    placeholder="KEY"
                    value={env.key}
                    onChange={(e) =>
                      setEnvVars((s) =>
                        s.map((it) => (it.id === env.id ? { ...it, key: e.target.value } : it))
                      )
                    }
                  />
                  <Input
                    placeholder="Value"
                    value={env.value}
                    onChange={(e) =>
                      setEnvVars((s) =>
                        s.map((it) => (it.id === env.id ? { ...it, value: e.target.value } : it))
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setEnvVars((s) => s.filter((it) => it.id !== env.id))
                    }
                    aria-label="Remove variable"
                    className="px-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                onClick={() =>
                  setEnvVars((s) => [...s, { id: nextId(), key: "", value: "" }])
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add variable
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Deploy */}
          <Button
            className="w-full mt-4"
            onClick={handleDeploy}
            disabled={isDeploying}
          >
            {isDeploying ? "Deploying..." : "Deploy"}
          </Button>

          {/* Debug (optional, remove later) */}
          <pre className="text-xs text-muted-foreground">
            {JSON.stringify(
              {
                owner,
                repo,
                team,
                projectName,
                framework,
                rootDir,
                env: envVars.reduce((acc, e) => {
                  if (!e.key) return acc;
                  acc[e.key] = e.value;
                  return acc;
                }, {} as Record<string, string>),
              },
              null,
              2
            )}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
