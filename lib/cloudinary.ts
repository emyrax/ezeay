import { File } from "expo-file-system";
import { API_BASE } from "./api";

export async function uploadImage(
  fileUri: string,
  getToken: () => Promise<string | null>,
): Promise<string> {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const filename = fileUri.split("/").pop() || "upload.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = match ? `image/${match[1].toLowerCase()}` : "image/jpeg";

  const base64 = await new File(fileUri).base64();

  const res = await fetch(`${API_BASE}/api/uploads/cloudinary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ base64, mimeType }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.secure_url as string;
}