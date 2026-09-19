import { File } from "expo-file-system";

export async function deleteFileNoThrow(uri: string | null | undefined): Promise<void> {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) {
      await file.delete();
    }
  } catch {
    // ignore — file may already be gone
  }
}

export async function deleteFilesNoThrow(uris: Array<string | null | undefined>): Promise<void> {
  await Promise.all(uris.map((uri) => deleteFileNoThrow(uri)));
}