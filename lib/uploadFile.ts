import { API_BASE } from "./api";
import { readFileAsBase64 } from "./fileAccess";

export async function uploadFile(
  fileUri: string,
  filename: string,
  mimeType: string,
  getToken: () => Promise<string | null>,
): Promise<string> {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const base64 = await readFileAsBase64(fileUri);

  const res = await fetch(`${API_BASE}/api/study/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ base64, filename, mimeType }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return `${API_BASE}${data.url}`;
}
