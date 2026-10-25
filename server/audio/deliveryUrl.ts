export function lessonAudioDeliveryUrl(url: string): string {
  if (
    !url.includes("/video/upload/") ||
    url.includes("/video/upload/f_mp3/")
  ) {
    return url;
  }
  return url
    .replace("/video/upload/", "/video/upload/f_mp3/")
    .replace(/\.wav(\?.*)?$/i, ".mp3$1");
}
