import { API_URL } from "@/config/api";

export interface DeployRequest {
  owner: string;
  repo: string;
  team: string;
  projectName: string;
  framework: string;
  rootDir: string;
  env: Record<string, string>;
}

export interface DeployResponse {
  id: string;
}

export async function deployProject(
  payload: DeployRequest,
) {
  await fetch(`${API_URL}/upload/deploy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });


  return;
}


export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/upload/deploy/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete project");
  }
}
