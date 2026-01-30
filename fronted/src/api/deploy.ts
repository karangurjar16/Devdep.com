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
){
  const res = await fetch(`${API_URL}/upload/deploy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });


  return;
}
