export function getEmbedUrl(url: string): string {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const fileId = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) return '';
  return url;
}

/** Direct stream URL for HTML5 video (one-click play). Uses usercontent endpoint to avoid virus-scan redirect; fallback to iframe on error. */
export function getDirectVideoUrl(url: string): string {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const fileId = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    if (fileId) return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
  }
  return '';
}

export function isFolderLink(url: string): boolean {
  return url.includes('drive.google.com/drive/folders/');
}

export function isFileLink(url: string): boolean {
  return url.includes('drive.google.com/file/d/');
}

export function isYouTubeLink(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}
