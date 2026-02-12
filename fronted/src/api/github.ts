import { API_URL } from "@/config/api";

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

export type DeployStatus = "Uploading" | "Deploying" | "Running" | "Failed";

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