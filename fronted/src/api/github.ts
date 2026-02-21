import { API_URL } from "@/config/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

export interface DeployedProject {
  id: string;
  email: string;
  repoUrl: string;
  projectName: string;
  framework: string;
  rootDir: string;
  createdAt: string;
  env?: Record<string, string>;
}

export type DeployStatus = "Queued" | "Cloning" | "Dependencies Download" | "Building" | "Deploying" | "Deployed" | "Failed";

export async function getMe(): Promise<GitHubUser | null> {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      credentials: "include",
    });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}


export async function getUserRepos() {
  const res = await fetch(`${API_URL}/github/repos`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch repositories");
  }
  return res.json();
}


export async function getDeployedProjects(): Promise<DeployedProject[]> {
  const res = await fetch(`${API_URL}/github/deploy`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch deployed projects");
  }

  return res.json();
}

export async function getDeployStatus(
  projectId: string,
): Promise<DeployStatus> {
  const res = await fetch(`${API_URL}/upload/deploy/status/${projectId}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch deploy status");
  }

  const data: { status: DeployStatus } = await res.json();
  return data.status;
}

export interface LogEntry {
  stage: string;
  log: string;
  timestamp: string;
}

export async function getDeploymentLogs(projectId: string): Promise<LogEntry[]> {
  const res = await fetch(`${API_URL}/upload/deploy/logs/${projectId}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch deployment logs");
  }

  const data: { logs: LogEntry[] } = await res.json();
  return data.logs;
}