import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { Alert, AlertDescription } from '@/features/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { cn } from '@/lib/utils';
import { ExternalLink, LinkIcon, Tag, Calendar, MessageSquare, Send, Briefcase, Layers, Pencil, Trash2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { defaultTranslations, applyVariables } from '@/features/share/i18n/translations';
import { devLog } from '@/config/logger';
import { getEmbedUrl, getDirectVideoUrl, isFolderLink, isFileLink, isYouTubeLink } from '../utils/previewUtils';
import GoogleDriveFolderCarousel from '../modal/GoogleDriveFolderCarousel';

const REVIEW_COMMENTER_STORAGE_KEY = 'review_commenter_';

interface PublicReviewContent {
  social_media_plan_id: string;
  link_url: string;
  title: string | null;
  post_date: string | null;
  google_drive_link: string | null;
  content_type_name: string | null;
  service_name: string | null;
  sub_service_name: string | null;
  pic_production_name: string | null;
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

/** Public review page always uses English (shared link may be opened without app/Settings). */
function usePublicReviewT() {
  return useCallback(
    (key: string, fallback: string, variables?: Record<string, string | number>) => {
      const localized = defaultTranslations.en?.[key] ?? fallback;
      return applyVariables(localized, variables);
    },
    [],
  );
}

const PublicContentReviewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const t = usePublicReviewT();
  const [content, setContent] = useState<PublicReviewContent | null>(null);
  const [comments, setComments] = useState<PublicReviewComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commenterDisplayName, setCommenterDisplayName] = useState('');
  const [showCommenterPopup, setShowCommenterPopup] = useState(false);
  const [popupNameInput, setPopupNameInput] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [videoUseIframe, setVideoUseIframe] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const loadContent = useCallback(async () => {
    if (!token) return;
    const { data, error: rpcError } = await supabase.rpc('get_public_review_content_by_token', {
      token_param: token,
    });
    if (rpcError) {
      setError(t('publicReview.error.loadFailed', 'Failed to load content'));
      setContent(null);
      return;
    }
    if (data) {
      setContent(data as PublicReviewContent);
      setError(null);
    } else {
      setError(t('publicReview.error.invalidLink', 'Link is invalid or expired'));
      setContent(null);
    }
  }, [token, t]);

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
      setError(t('publicReview.error.noToken', 'No token'));
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

  // Load commenter name from localStorage per token (popup won't show again for this token once set)
  useEffect(() => {
    if (!token) return;
    try {
      const raw = localStorage.getItem(REVIEW_COMMENTER_STORAGE_KEY + token);
      if (raw) {
        const parsed = JSON.parse(raw) as { displayName?: string };
        if (parsed?.displayName?.trim()) {
          setCommenterDisplayName(parsed.displayName.trim());
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }, [token]);

  // Reset video state when link changes
  useEffect(() => {
    setVideoUseIframe(false);
    setVideoPlaying(false);
  }, [content?.google_drive_link, content?.link_url]);

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
      toast.error(t('publicReview.toast.writeFirst', 'Please write a comment first'));
      return;
    }
    if (!commenterDisplayName.trim()) {
      setShowCommenterPopup(true);
      setPopupNameInput('');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        token_param: token,
        comment_text: text,
        commenter_display_name: commenterDisplayName.trim(),
      };
      const { error: rpcError } = await supabase.rpc('insert_public_review_comment', payload);
      if (rpcError) throw rpcError;
      toast.success(t('publicReview.toast.success', 'Comment sent'));
      setCommentText('');
      await loadComments();
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : null;
      toast.error(msg || t('publicReview.toast.error', 'Failed to send comment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCommenterName = async () => {
    const name = popupNameInput?.trim();
    if (!name || !token) return;
    setCommenterDisplayName(name);
    try {
      localStorage.setItem(REVIEW_COMMENTER_STORAGE_KEY + token, JSON.stringify({ displayName: name }));
    } catch {
      // ignore quota etc.
    }
    setShowCommenterPopup(false);
    setPopupNameInput('');
    // If user had already typed a comment, submit it immediately
    const pendingText = commentText?.trim();
    if (pendingText) {
      setSubmitting(true);
      try {
        const payload: Record<string, unknown> = {
          token_param: token,
          comment_text: pendingText,
          commenter_display_name: name,
        };
        const { error: rpcError } = await supabase.rpc('insert_public_review_comment', payload);
        if (rpcError) throw rpcError;
        toast.success(t('publicReview.toast.success', 'Comment sent'));
        setCommentText('');
        await loadComments();
      } catch (e) {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : null;
        toast.error(msg || t('publicReview.toast.error', 'Failed to send comment'));
      } finally {
        setSubmitting(false);
      }
    }
  };

  const isOwnComment = (c: PublicReviewComment) =>
    !!commenterDisplayName.trim() && c.creator_display_name.trim().toLowerCase() === commenterDisplayName.trim().toLowerCase();

  const handleStartEdit = (c: PublicReviewComment) => {
    setEditingCommentId(c.id);
    setEditingText(c.comment_text ?? '');
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleSaveEdit = async () => {
    if (!token || !editingCommentId || !commenterDisplayName.trim()) return;
    const text = editingText?.trim();
    if (!text) return;
    setActionLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc('update_public_review_comment', {
        comment_id: editingCommentId,
        token_param: token,
        commenter_display_name: commenterDisplayName.trim(),
        new_comment_text: text,
      });
      if (rpcError) throw rpcError;
      toast.success(t('publicReview.toast.success', 'Comment sent'));
      setEditingCommentId(null);
      setEditingText('');
      await loadComments();
    } catch (e) {
      devLog.warn('Update comment error', e);
      toast.error(t('publicReview.toast.updateError', 'Failed to update comment'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteComment = async (c: PublicReviewComment) => {
    if (!token || !commenterDisplayName.trim()) return;
    if (!window.confirm(t('publicReview.comments.deleteConfirm', 'Delete this comment?'))) return;
    setActionLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc('delete_public_review_comment', {
        comment_id: c.id,
        token_param: token,
        commenter_display_name: commenterDisplayName.trim(),
      });
      if (rpcError) throw rpcError;
      toast.success(t('publicReview.toast.deleted', 'Comment deleted'));
      await loadComments();
    } catch (e) {
      devLog.warn('Delete comment error', e);
      toast.error(t('publicReview.toast.deleteError', 'Failed to delete comment'));
    } finally {
      setActionLoading(false);
    }
  };

  const link = content?.google_drive_link ?? content?.link_url ?? '';
  const embedUrl = getEmbedUrl(link);
  const directVideoUrl = isFileLink(link) ? getDirectVideoUrl(link) : '';

  const handleVideoPlay = useCallback(() => {
    videoRef.current?.play();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-600">{t('publicReview.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error ?? t('publicReview.error.invalidLinkShort', 'Invalid link')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const formatDisplayDate = (date: string | null) => {
    if (!date) return '';
    return format(new Date(date), 'dd MMM yyyy');
  };

  return (
    <div className="min-h-screen h-screen max-h-screen bg-gray-50 flex flex-col overflow-y-auto overflow-x-hidden overscroll-behavior-y-contain">
      <Dialog open={showCommenterPopup} onOpenChange={setShowCommenterPopup}>
        <DialogContent
          overlayClassName="bg-black/50"
          className={cn(
            'max-w-[360px] w-[calc(100%-2rem)] border border-gray-200 bg-white shadow-xl rounded-xl p-6 text-left',
            'max-h-[min(85dvh,420px)] overflow-y-auto',
            'fixed left-[50%] -translate-x-1/2',
            'sm:top-[50%] sm:-translate-y-1/2',
            'max-sm:top-auto max-sm:bottom-4 max-sm:translate-y-0',
            '[&>button]:text-gray-600 [&>button]:hover:text-gray-900 [&>button]:hover:bg-gray-100',
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Let others know who you are
            </DialogTitle>
            <DialogDescription className="sr-only">
              Enter your name so it appears next to your comments. Saved per review link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <label htmlFor="commenter-name" className="text-sm font-medium text-gray-700">
                Your name
              </label>
              <Input
                id="commenter-name"
                type="text"
                placeholder="Your name"
                value={popupNameInput}
                onChange={(e) => setPopupNameInput(e.target.value)}
                className="w-full bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              />
            </div>
            <Button
              onClick={handleSaveCommenterName}
              disabled={!popupNameInput.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-lg font-medium"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex-1 max-w-2xl w-full mx-auto p-4 flex flex-col gap-2">
        {/* Preview with header (title + metadata) in the section header, no separate "Preview" label */}
        {(() => {
          const portrait = isPortraitContent(content.content_type_name);
          const aspectClass = portrait
            ? 'aspect-[9/16] max-w-[min(100%,320px)] mx-auto w-full'
            : 'aspect-video w-full';
          return (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col touch-pan-y">
              <div className="p-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                <h1 className="font-semibold text-gray-900 truncate pr-2 text-base">
                  {content.title || t('publicReview.content.noTitle', 'Untitled')}
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
                  {content.pic_production_name != null && content.pic_production_name.trim() !== '' && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      PIC Production: {content.pic_production_name}
                    </span>
                  )}
                </div>
              </div>
              <div className={`flex-1 p-4 flex items-center justify-center bg-white touch-pan-y ${portrait ? 'flex' : ''}`}>
                {!link ? (
                  <div className="text-center text-gray-500 text-sm">{t('publicReview.preview.noLink', 'No link')}</div>
                ) : isFolderLink(link) ? (
                  <div className="w-full min-h-[200px] rounded-lg overflow-hidden touch-pan-y">
                    <GoogleDriveFolderCarousel folderUrl={link} />
                  </div>
                ) : isYouTubeLink(link) ? (
                  <div className="text-center">
                    <p className="text-sm text-gray-700 mb-4">{t('publicReview.preview.youtubeUnavailable', 'YouTube preview is not available here.')}</p>
                    <Button variant="outline" size="sm" onClick={() => window.open(link, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t('publicReview.preview.openYouTube', 'Open in YouTube')}
                    </Button>
                  </div>
                ) : isFileLink(link) && embedUrl ? (
                  (() => {
                    const useIframe = videoUseIframe || !directVideoUrl;
                    if (useIframe) {
                      return (
                        <div className={`rounded-lg overflow-hidden bg-black touch-pan-y ${aspectClass}`}>
                          <iframe
                            src={embedUrl}
                            className="w-full h-full border-0 rounded-lg touch-pan-y"
                            title="Preview"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            loading="lazy"
                          />
                        </div>
                      );
                    }
                    return (
                      <div
                        className={`rounded-lg overflow-hidden bg-black touch-pan-y ${aspectClass} ${!videoPlaying ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (!videoPlaying) handleVideoPlay();
                        }}
                        role={!videoPlaying ? 'button' : undefined}
                        tabIndex={!videoPlaying ? 0 : undefined}
                        onKeyDown={!videoPlaying ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleVideoPlay();
                          }
                        } : undefined}
                        aria-label={!videoPlaying ? t('publicReview.preview.play', 'Play video') : undefined}
                      >
                        <video
                          ref={videoRef}
                          src={directVideoUrl}
                          className={cn('w-full h-full object-contain object-left', !videoPlaying && 'pointer-events-none')}
                          controls
                          playsInline
                          onError={() => setVideoUseIframe(true)}
                          onPlay={() => setVideoPlaying(true)}
                          onPause={() => setVideoPlaying(false)}
                          onEnded={() => setVideoPlaying(false)}
                        />
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center">
                    <LinkIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-700 mb-4">{t('publicReview.preview.unavailable', 'Preview not available')}</p>
                    <Button variant="outline" size="sm" onClick={() => window.open(link, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t('publicReview.preview.openLink', 'Open link')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Comments - below */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col flex-1 min-h-0">
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex-shrink-0 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gray-600" />
            <h4 className="font-medium text-sm text-gray-900">{t('publicReview.comments.title', 'Comments')}</h4>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2 min-h-[200px]">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-500">{t('publicReview.comments.empty', 'No comments yet. Be the first.')}</p>
            ) : (
              comments.map((c) => {
                const own = isOwnComment(c);
                const isEditing = editingCommentId === c.id;
                return (
                  <div key={c.id} className="w-full">
                    <div className="rounded-lg bg-gray-100 border border-gray-200/80 px-3 py-2 w-full">
                      <div className="flex items-center justify-between gap-2 text-xs text-gray-600 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-gray-800">{c.creator_display_name}</span>
                          <span className="text-gray-500 shrink-0">{c.created_at ? format(new Date(c.created_at), 'dd MMM yyyy, HH:mm') : ''}</span>
                        </div>
                        {own && !isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(c)}
                              disabled={actionLoading}
                              className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                              aria-label={t('publicReview.comments.edit', 'Edit')}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(c)}
                              disabled={actionLoading}
                              className="p-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50"
                              aria-label={t('publicReview.comments.delete', 'Delete')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="min-h-[80px] text-sm resize-none"
                            disabled={actionLoading}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={actionLoading}>
                              {t('publicReview.comments.cancel', 'Cancel')}
                            </Button>
                            <Button size="sm" onClick={handleSaveEdit} disabled={actionLoading || !editingText.trim()}>
                              {t('publicReview.comments.saveEdit', 'Save')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{c.comment_text ?? ''}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-4 border-t border-gray-200 flex-shrink-0 space-y-3">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('publicReview.comments.placeholder', 'Write a comment...')}
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
                {submitting ? t('publicReview.comments.sending', 'Sending...') : t('publicReview.comments.add', 'Add Comment')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicContentReviewPage;
