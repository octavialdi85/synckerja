import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import { Input } from '@/features/ui/input';
import { Alert, AlertDescription } from '@/features/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { ExternalLink, LinkIcon, Tag, Calendar, MessageSquare, Send, Pencil, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getEmbedUrl, isFolderLink, isFileLink, isYouTubeLink } from '../utils/previewUtils';
import GoogleDriveFolderCarousel from '../modal/GoogleDriveFolderCarousel';
import { AnnotationCanvas, type AnnotationData as AnnotationDataValue } from '../components/AnnotationCanvas';

interface PublicReviewContent {
  social_media_plan_id: string;
  link_url: string;
  title: string | null;
  post_date: string | null;
  google_drive_link: string | null;
  content_type_name: string | null;
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

function formatTimestamp(seconds: number | null): string {
  if (seconds == null) return '';
  const m = Math.floor(Number(seconds) / 60);
  const s = Math.floor(Number(seconds) % 60);
  return `Di ${m}:${s.toString().padStart(2, '0')}`;
}

const PublicContentReviewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [content, setContent] = useState<PublicReviewContent | null>(null);
  const [comments, setComments] = useState<PublicReviewComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [videoTimestampSeconds, setVideoTimestampSeconds] = useState<number | null>(null);
  const [annotationData, setAnnotationData] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);

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
        video_timestamp_seconds: videoTimestampSeconds ?? null,
        annotation_data: annotationData ?? null,
      });
      if (rpcError) throw rpcError;
      toast.success('Komentar terkirim');
      setCommentText('');
      setVideoTimestampSeconds(null);
      setAnnotationData(null);
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
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-600">
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

        {/* Preview - top, mobile-first */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[280px]">
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <h4 className="font-medium text-sm text-gray-900">Preview</h4>
          </div>
          <div className="flex-1 min-h-[240px] p-4 flex items-center justify-center bg-white">
            {!link ? (
              <div className="text-center text-gray-500 text-sm">Tidak ada link</div>
            ) : isFolderLink(link) ? (
              <div className="w-full h-full min-h-[240px]">
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
              <div className="w-full h-full min-h-[240px] rounded-lg overflow-hidden">
                <iframe
                  src={embedUrl}
                  className="w-full h-full min-h-[240px] border-0 rounded-lg"
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
                    {c.video_timestamp_seconds != null && (
                      <span className="text-blue-600">{formatTimestamp(c.video_timestamp_seconds)}</span>
                    )}
                  </div>
                  {c.annotation_data && (
                    <p className="text-xs text-gray-500 mb-1">Anotasi pada frame</p>
                  )}
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{c.comment_text ?? ''}</p>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-gray-200 flex-shrink-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-gray-600">Timestamp (detik, opsional):</label>
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="Contoh: 85"
                className="w-24 h-8 text-sm"
                value={videoTimestampSeconds ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setVideoTimestampSeconds(v === '' ? null : Math.max(0, Number(v)));
                }}
                disabled={submitting}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAnnotationModal(true)}
                disabled={submitting}
                className="gap-1"
              >
                <Pencil className="h-3 w-3" />
                Tandai dengan anotasi
              </Button>
              {annotationData != null && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  Anotasi ditambahkan
                  <button
                    type="button"
                    onClick={() => setAnnotationData(null)}
                    className="p-0.5 rounded hover:bg-gray-200"
                    aria-label="Hapus anotasi"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
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

      <Dialog open={showAnnotationModal} onOpenChange={setShowAnnotationModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tandai bagian (anotasi)</DialogTitle>
          </DialogHeader>
          <AnnotationCanvas
            initialData={annotationData as AnnotationDataValue | null}
            onSave={(data) => {
              setAnnotationData(data as unknown as Record<string, unknown>);
              setShowAnnotationModal(false);
            }}
            onCancel={() => setShowAnnotationModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicContentReviewPage;
