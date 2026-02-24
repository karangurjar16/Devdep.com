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
import { Github, Plus, Trash2, ArrowLeft, Rocket } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="glass-strong border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Configure & Deploy</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Github className="h-4 w-4" />
                <span>{owner}/{repo}</span>
              </div>
            </div>
            <Button
              onClick={() => navigate("/my-projects")}
              variant="outline"
              className="glass border-white/20 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="glass-strong border-white/10">
          <CardContent className="p-8 space-y-6">
            {/* Team + Name */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Team</label>
                <Select value={team} onValueChange={setTeam}>
                  <SelectTrigger className="glass border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="karangurjar16's projects">
                      karangurjar16's projects (Hobby)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="glass border-white/20"
                />
              </div>
            </div>

            {/* Framework */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Framework Preset</label>
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger className="glass border-white/20">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Root Directory</label>
              <Input
                value={rootDir}
                onChange={(e) => setRootDir(e.target.value)}
                className="glass border-white/20"
                placeholder="./"
              />
            </div>

            {/* Environment Variables */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Environment Variables</label>
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
                placeholder="Paste .env content here to auto-populate"
                className="w-full rounded-lg glass border-white/20 p-3 text-sm min-h-[80px] focus:ring-2 focus:ring-primary/50 transition-all"
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
                      className="glass border-white/20"
                    />
                    <Input
                      placeholder="Value"
                      value={env.value}
                      onChange={(e) =>
                        setEnvVars((s) =>
                          s.map((it) => (it.id === env.id ? { ...it, value: e.target.value } : it))
                        )
                      }
                      className="glass border-white/20"
                    />
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setEnvVars((s) => s.filter((it) => it.id !== env.id))
                      }
                      aria-label="Remove variable"
                      className="px-3 hover:bg-destructive/20 hover:text-destructive"
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
                  className="glass border-white/20 hover:bg-white/10"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add variable
                </Button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                {error}
              </div>
            )}

            {/* Deploy Button */}
            <Button
              className="w-full btn-glossy py-6 text-base font-semibold"
              onClick={handleDeploy}
              disabled={isDeploying}
            >
              <Rocket className="mr-2 h-5 w-5" />
              {isDeploying ? "Deploying..." : "Deploy Project"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
