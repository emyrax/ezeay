import { File, Paths } from "expo-file-system";
import * as LegacyFS from "expo-file-system/legacy";

function toLocalPath(uri: string): string {
  return decodeURIComponent(
    uri.replace(/^file:\/\//, "").replace(/^file:\/+/, "/"),
  );
}

function isInsideAppStorage(uri: string): boolean {
  const path = toLocalPath(uri).toLowerCase();
  const roots = [
    toLocalPath(Paths.cache.uri).toLowerCase(),
    toLocalPath(Paths.document.uri).toLowerCase(),
  ];
  return roots.some((root) => path.startsWith(root));
}

export async function readFileAsBase64(uri: string): Promise<string> {
  if (uri.startsWith("content://")) {
    try {
      return await LegacyFS.readAsStringAsync(uri, { encoding: "base64" });
    } catch {
      throw new Error(
        "Couldn't read the selected file. Allow photo/storage access in Settings, then try again.",
      );
    }
  }

  if (!isInsideAppStorage(uri)) {
    const destination = `${Paths.cache.uri}/upload-${Date.now()}`;
    try {
      await LegacyFS.copyAsync({ from: uri, to: destination });
    } catch {
      throw new Error(
        "Couldn't access the selected file. Grant photo/storage access in Settings, then try again.",
      );
    }
    return new File(destination).base64();
  }

  return new File(uri).base64();
}