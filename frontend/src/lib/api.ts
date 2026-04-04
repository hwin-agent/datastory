const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export { API_URL };

export async function uploadCSV(file: File): Promise<{ session_id: string; rows: number; columns: number; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.statusText}`);
  }

  return res.json();
}

export async function uploadDemo(): Promise<{ session_id: string; rows: number; columns: number; filename: string }> {
  const res = await fetch(`${API_URL}/api/upload-demo`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`Demo upload failed: ${res.statusText}`);
  }

  return res.json();
}

export async function getReport(sessionId: string) {
  const res = await fetch(`${API_URL}/api/report/${sessionId}`);
  if (!res.ok) {
    throw new Error(`Report fetch failed: ${res.statusText}`);
  }
  return res.json();
}

export function chartImageUrl(sessionId: string, chartId: string): string {
  return `${API_URL}/api/charts/${sessionId}/${chartId}`;
}
