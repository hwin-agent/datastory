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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getReport(sessionId: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_URL}/api/report/${sessionId}`);
      if (res.ok) {
        return res.json();
      }
      // Report not ready yet (404) — retry after delay
      if (res.status === 404 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw new Error(`Report fetch failed (${res.status})`);
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Report fetch failed after retries");
}

export function chartImageUrl(sessionId: string, chartId: string): string {
  return `${API_URL}/api/charts/${sessionId}/${chartId}`;
}
