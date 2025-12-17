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