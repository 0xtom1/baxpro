import { type Alert, type InsertAlert } from "@shared/schema";

export async function getAlerts(): Promise<Alert[]> {
  const response = await fetch("/api/alerts");
  if (!response.ok) {
    throw new Error("Failed to fetch alerts");
  }
  return response.json();
}

export async function createAlert(data: Omit<InsertAlert, "userId">): Promise<Alert> {
  const response = await fetch("/api/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error("Failed to create alert");
  }
  return response.json();
}

export async function updateAlert(id: string, data: Partial<Omit<InsertAlert, "userId">>): Promise<Alert> {
  const response = await fetch(`/api/alerts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error("Failed to update alert");
  }
  return response.json();
}

export async function deleteAlert(id: string): Promise<void> {
  const response = await fetch(`/api/alerts/${id}`, {
    method: "DELETE",
  });
  
  if (!response.ok) {
    throw new Error("Failed to delete alert");
  }
}
