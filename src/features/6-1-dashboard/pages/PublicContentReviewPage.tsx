import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import { Alert, AlertDescription } from '@/features/ui/alert';
import { ExternalLink, LinkIcon, Tag, Calendar, MessageSquare, Send, Briefcase, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getEmbedUrl, isFolderLink, isFileLink, isYouTubeLink } from '../utils/previewUtils';
import GoogleDriveFolderCarousel from '../modal/GoogleDriveFolderCarousel';

interface PublicReviewContent {
  social_media_plan_id: string;
  link_url: string;
  title: string | null;
  post_date: string | null;
  google_drive_link: string | null;
  content_type_name: string | null;
  service_name: string | null;
  sub_service_name: string | null;
}

interface PublicReviewComment {
  id: string;
  comment_text: string | null;
  created_at: string | null;
  created_by: string | null;
  creator_display_name: string;
  video_timestamp_seconds: number | null;
  annotation_data: Record<string, unknown> | null;
}

/** Portrait-oriented content types (Reel, Story, Shorts, etc.) use 9/16 aspect ratio */
function isPortraitContent(contentTypeName: string | null): boolean {
  if (!contentTypeName) return false;
  const n = contentTypeName.toLowerCase();
  return n.includes('reel') || n.includes('story') || n.includes('shorts') || n.includes('tiktok') || n.includes('vertical');
}

const PublicContentReviewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [content, setContent] = useState<PublicReviewContent | null>(null);
  const [comments, setComments] = useState<PublicReviewComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadContent = useCallback(async () => {
    if (!token) return;
    const { data, error: rpcError } = await supabase.rpc('get_public_review_content_by_token', {
      token_param: token,
    });
    if (rpcError) {
      setError('Gagal memuat konten');
      setContent(null);
      return;
    }
    if (data) {
      setContent(data as PublicReviewContent);
      setError(null);
    } else {
      setError('Link tidak valid atau kedaluwarsa');
      setContent(null);
    }
  }, [token]);

  const loadComments = useCallback(async () => {
    if (!token) return;
    const { data, error: rpcError } = await supabase.rpc('get_public_review_comments', {
      token_param: token,
    });
    if (rpcError) {
      return;
    }
    setComments(Array.isArray(data) ? (data as PublicReviewComment[]) : []);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError('Token tidak ada');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadContent();
      if (cancelled) return;
      await loadComments();
      if (cancelled) return;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, loadContent, loadComments]);

  // Set document title and og/twitter meta for link preview when content is loaded
  useEffect(() => {
    if (!content) return;
    const title = (content.title && content.title.trim()) ? content.title.trim() : 'Review konten';
    const description =
      [content.content_type_name, content.service_name, content.post_date ? format(new Date(content.post_date), 'dd MMM yyyy') : null]
        .filter(Boolean)
        .join(' · ') || 'Review dan beri masukan untuk konten ini.';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const imageUrl = origin ? `${origin}/favicon.svg` : '/favicon.svg';
    const pageUrl = origin && typeof window !== 'undefined' ? window.location.href : '';

    document.title = title;

    const setMeta = (attr: string, value: string, isProperty = true) => {
      const key = isProperty ? 'property' : 'name';
      let el = document.querySelector(`meta[${key}="${attr}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(key, attr);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:image', imageUrl);
    setMeta('og:url', pageUrl);
    setMeta('og:type', 'website');
    setMeta('twitter:card', 'summary_large_image', false);
    setMeta('twitter:title', title, false);
    setMeta('twitter:description', description, false);
    setMeta('twitter:image', imageUrl, false);

    return () => {
      document.title = 'Profitloop';
    };
  }, [content]);

  const handleSubmitComment = async () => {
    const text = commentText?.trim();
    if (!text || !token) {
      toast.error('Tulis komentar terlebih dahulu');
      return;
    }
    setSubmitting(true);
    try {
      const { error: rpcError } = await supabase.rpc('insert_public_review_comment', {
        token_param: token,
        comment_text: text,
        video_timestamp_seconds: null,
        annotation_data: null,
      });
      if (rpcError) throw rpcError;
      toast.success('Komentar terkirim');
      setCommentText('');
      await loadComments();
    } catch (e) {
      toast.error('Gagal mengirim komentar');
    } finally {
      setSubmitting(false);
    }
  };

  const link = content?.google_drive_link ?? content?.link_url ?? '';
  const embedUrl = getEmbedUrl(link);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-600">Memuat...</p>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error ?? 'Link tidak valid'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const formatDisplayDate = (date: string | null) => {
    if (!date) return '';
    return format(new Date(date), 'dd MMM yyyy');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 max-w-2xl w-full mx-auto p-4 flex flex-col gap-6">
        {/* Header / metadata */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h1 className="font-semibold text-gray-900 truncate pr-2">
            {content.title || 'Tanpa judul'}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-gray-600">
            {content.service_name != null && content.service_name !== '' && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {content.service_name}
              </span>
            )}
            {content.sub_service_name != null && content.sub_service_name !== '' && (
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {content.sub_service_name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {content.content_type_name || '—'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDisplayDate(content.post_date)}
            </span>
          </div>
        </div>

        {/* Preview - orientasi mengikuti konten: portrait (Reel/Story) atau landscape */}
        {(() => {
          const portrait = isPortraitContent(content.content_type_name);
          const aspectClass = portrait
            ? 'aspect-[9/16] max-w-[min(100%,320px)] mx-auto w-full'
            : 'aspect-video w-full';
          return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                <h4 className="font-medium text-sm text-gray-900">Preview</h4>
              </div>
              <div className={`flex-1 p-4 flex items-center justify-center bg-white ${portrait ? 'flex' : ''}`}>
                {!link ? (
                  <div className="text-center text-gray-500 text-sm">Tidak ada link</div>
                ) : isFolderLink(link) ? (
                  <div className="w-full min-h-[200px] rounded-lg overflow-hidden">
                    <GoogleDriveFolderCarousel folderUrl={link} />
                  </div>
                ) : isYouTubeLink(link) ? (
                  <div className="text-center">
                    <p className="text-sm text-gray-700 mb-4">Preview YouTube tidak tersedia di sini.</p>
                    <Button variant="outline" size="sm" onClick={() => window.open(link, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Buka di YouTube
                    </Button>
                  </div>
                ) : isFileLink(link) && embedUrl ? (
                  <div className={`rounded-lg overflow-hidden bg-black ${aspectClass}`}>
                    <iframe
                      src={embedUrl}
                      className="w-full h-full border-0 rounded-lg"
                      title="Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <LinkIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-700 mb-4">Preview tidak tersedia</p>
                    <Button variant="outline" size="sm" onClick={() => window.open(link, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Buka link
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Comments - below */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col flex-1 min-h-0">
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex-shrink-0 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gray-600" />
            <h4 className="font-medium text-sm text-gray-900">Komentar</h4>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4 min-h-[200px]">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada komentar. Jadilah yang pertama.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                    <span className="font-medium text-gray-800">{c.creator_display_name}</span>
                    <span>{c.created_at ? format(new Date(c.created_at), 'dd MMM yyyy, HH:mm') : ''}</span>
                  </div>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{c.comment_text ?? ''}</p>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-gray-200 flex-shrink-0 space-y-3">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Tulis komentar quality control..."
              className="min-h-[100px] text-sm resize-none"
              disabled={submitting}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Mengirim...' : 'Tambah Komentar'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicContentReviewPage;
