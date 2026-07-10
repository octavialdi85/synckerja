import { supabase } from '@/integrations/supabase/client';

/**
 * Prefer dedicated bucket when present on the project.
 * Fall back to sniping-images (already on production) with a brief-visual/ path prefix
 * so paste works even if brief-visual-images was only migrated on another Supabase project.
 */
export const BRIEF_VISUAL_IMAGES_BUCKET = 'brief-visual-images';
export const BRIEF_VISUAL_IMAGES_FALLBACK_BUCKET = 'sniping-images';
export const BRIEF_VISUAL_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const BRIEF_VISUAL_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
] as const;

const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/;
const PLAIN_IMAGE_URL_RE =
  /(https?:\/\/[^\s]+\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s]*)?)/i;

export interface BriefCellImageParts {
  url: string | null;
  alt: string;
  text: string;
}

/** Extract markdown/plain image URL and remaining text from a brief table cell. */
export function extractBriefCellImage(cell: string): BriefCellImageParts {
  const raw = cell ?? '';
  const md = raw.match(MARKDOWN_IMAGE_RE);
  if (md) {
    const url = md[2];
    const alt = md[1] || 'brief-visual';
    const text = raw.replace(md[0], '').trim();
    return { url, alt, text };
  }
  const plain = raw.match(PLAIN_IMAGE_URL_RE);
  if (plain) {
    const url = plain[1];
    const text = raw.replace(plain[0], '').trim();
    return { url, alt: 'brief-visual', text };
  }
  return { url: null, alt: 'brief-visual', text: raw.trim() };
}

/** Build a single-line cell value with optional image markdown + description text. */
export function composeBriefCellWithImage(
  text: string,
  url: string,
  alt = 'brief-visual'
): string {
  const safeAlt = (alt || 'brief-visual').replace(/[\[\]]/g, '');
  const safeUrl = url.trim().replace(/[)\s|]/g, '');
  const desc = (text ?? '').replace(/\n/g, ' ').trim();
  const imagePart = `![${safeAlt}](${safeUrl})`;
  return desc ? `${imagePart} ${desc}` : imagePart;
}

/** Remove image markdown/URL from cell, keep description text. */
export function stripBriefCellImage(cell: string): string {
  return extractBriefCellImage(cell).text;
}

function extensionFromMime(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/jpeg':
    case 'image/jpg':
    default:
      return 'jpg';
  }
}

export type UploadBriefVisualImageErrorCode =
  | 'missing_ids'
  | 'type_not_supported'
  | 'too_large'
  | 'upload_failed';

export class UploadBriefVisualImageError extends Error {
  code: UploadBriefVisualImageErrorCode;
  constructor(code: UploadBriefVisualImageErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'UploadBriefVisualImageError';
  }
}

export async function uploadBriefVisualImage(params: {
  file: File;
  organizationId: string;
  planId: string;
}): Promise<string> {
  const { file, organizationId, planId } = params;
  if (!organizationId || !planId) {
    throw new UploadBriefVisualImageError('missing_ids', 'Missing organization or plan id');
  }
  if (!BRIEF_VISUAL_IMAGE_MIME_TYPES.includes(file.type as (typeof BRIEF_VISUAL_IMAGE_MIME_TYPES)[number])) {
    throw new UploadBriefVisualImageError('type_not_supported', `Unsupported type: ${file.type}`);
  }
  if (file.size > BRIEF_VISUAL_IMAGE_MAX_BYTES) {
    throw new UploadBriefVisualImageError('too_large', 'Image exceeds 5MB');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new UploadBriefVisualImageError('missing_ids', 'User not authenticated');
  }

  const ext = extensionFromMime(file.type);
  const uuid = crypto.randomUUID();
  // Dedicated bucket path (org-scoped RLS)
  const primaryPath = `${organizationId}/${planId}/${uuid}.${ext}`;
  // sniping-images insert policy expects first folder = auth.uid()
  const fallbackPath = `${user.id}/brief-visual/${organizationId}/${planId}/${uuid}.${ext}`;

  const tryUpload = async (bucket: string, filePath: string) => {
    const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) return { ok: false as const, error };
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return { ok: true as const, publicUrl: data.publicUrl };
  };

  const primary = await tryUpload(BRIEF_VISUAL_IMAGES_BUCKET, primaryPath);
  if (primary.ok) return primary.publicUrl;

  const isBucketMissing =
    primary.error.message?.toLowerCase().includes('bucket not found') ||
    (primary.error as { statusCode?: string }).statusCode === '404';

  if (isBucketMissing) {
    const fallback = await tryUpload(BRIEF_VISUAL_IMAGES_FALLBACK_BUCKET, fallbackPath);
    if (fallback.ok) return fallback.publicUrl;
    throw new UploadBriefVisualImageError('upload_failed', fallback.error.message);
  }

  throw new UploadBriefVisualImageError('upload_failed', primary.error.message);
}
