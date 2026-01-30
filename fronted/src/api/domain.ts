import { API_URL } from "@/config/api";

export async function checkDomainAvailability(name: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/domain/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new Error("Failed to check domain availability");
  }

  const data: { available: boolean } = await res.json();
  return data.available;
}

export async function reserveDomain(
  id: string,
  name: string,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_URL}/domain/reserve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ id, name }),
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error || "Failed to reserve domain" };
  }

  return { success: true };
}

export async function getDomainsByProjectId(
  id: string,
): Promise<string[]> {
  const res = await fetch(`${API_URL}/domain/${id}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch domains");
  }

  const data: { domains: string[] } = await res.json();
  return data.domains;
}
