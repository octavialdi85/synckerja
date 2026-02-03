import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '@/features/5-3-dashboard/HeaderAndTab';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useWhatsAppConfig } from '../hooks/useWhatsAppConfig';
import { WebhookInfoDisplay } from '../components/connect/WebhookInfoDisplay';
import { Instagram, CheckCircle2, Unplug, Loader2, Facebook } from 'lucide-react';
import { toast } from 'sonner';

const META_OAUTH_SCOPE = 'pages_show_list,pages_read_engagement,instagram_manage_messages,instagram_basic,business_management';
const META_OAUTH_VERSION = 'v18.0';

export function InstagramConnectPage() {
  const { t } = useAppTranslation();
  const { config, isLoading, refetch, updateInstagram, isUpdatingInstagram } = useWhatsAppConfig();
  const [oauthLoading, setOauthLoading] = useState(false);
  const oauthStateRef = useRef<string>('');

  const metaAppId = (import.meta.env.VITE_META_APP_ID as string)?.trim() || '';
  const hasOAuth = !!metaAppId;

  const hasMetaConfig = !!config?.meta_access_token?.trim();
  const connectedId = config?.instagram_business_account_id?.trim() || null;
  const isConnected = !!connectedId;
  const instagramDisplayName =
    config?.instagram_username?.trim() ||
    config?.instagram_name?.trim() ||
    connectedId;

  const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/auth/meta/callback` : '';

  const openOAuthPopup = useCallback(() => {
    if (!hasOAuth || !redirectUri) {
      toast.error(t('instagramConnect.oauthNotConfigured', 'VITE_META_APP_ID not set.'));
      return;
    }
    const state = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    oauthStateRef.current = state;
    const url = `https://www.facebook.com/${META_OAUTH_VERSION}/dialog/oauth?client_id=${encodeURIComponent(metaAppId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(META_OAUTH_SCOPE)}&state=${encodeURIComponent(state)}&response_type=code`;
    const w = window.open(url, 'meta-oauth', 'width=600,height=700,scrollbars=yes');
    if (!w) toast.error(t('instagramConnect.popupBlocked', 'Popup blocked. Allow popups for this site.'));
  }, [hasOAuth, metaAppId, redirectUri, t]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'meta-oauth') return;
      const { code, state, error: err, error_description } = event.data as { code?: string; state?: string; error?: string; error_description?: string };
      if (err) {
        setOauthLoading(false);
        toast.error(error_description || err || t('instagramConnect.oauthDenied', 'Login cancelled or denied.'));
        return;
      }
      if (!code || state !== oauthStateRef.current) {
        setOauthLoading(false);
        return;
      }
      setOauthLoading(true);
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            toast.error(t('instagramConnect.notAuthenticated', 'Please sign in again.'));
            setOauthLoading(false);
            return;
          }
          const res = await fetch(`${SUPABASE_URL}/functions/v1/meta-oauth-exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ code, redirect_uri: redirectUri }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            toast.error(data?.error || t('instagramConnect.oauthExchangeFailed', 'Failed to save token.'));
            setOauthLoading(false);
            return;
          }
          await refetch();
          // Setelah token tersimpan, ambil daftar akun Instagram dan auto-connect yang pertama (jika ada)
          try {
            const listRes = await fetch(`${SUPABASE_URL}/functions/v1/list-instagram-accounts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            });
            const listData = await listRes.json().catch(() => ({}));
            const accounts = Array.isArray(listData?.accounts) ? listData.accounts : [];
            if (accounts.length >= 1) {
              const first = accounts[0];
              await updateInstagram({
                id: first.id,
                username: first.username ?? null,
                name: first.name ?? null,
                page_id: first.page_id ?? null,
              });
              await refetch();
              toast.success(t('instagramConnect.oauthSuccess', 'Connected. Instagram account linked.'));
            } else {
              toast.success(t('instagramConnect.oauthSuccessNoAccount', 'Token saved. No Instagram Business account found—link a Page to Instagram in Meta Business Suite.'));
            }
          } catch {
            toast.success(t('instagramConnect.oauthSuccess', 'Connected. You can now load Instagram accounts.'));
          }
        } catch {
          toast.error(t('instagramConnect.oauthExchangeFailed', 'Failed to save token.'));
        } finally {
          setOauthLoading(false);
        }
      })();
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [refetch, redirectUri, t]);

  const handleDisconnect = async () => {
    try {
      await updateInstagram({ id: null });
      await refetch();
      toast.success('Disconnected');
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Failed to disconnect');
    }
  };

  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col">
              <div className="flex-shrink-0">
                <HeaderAndTab />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll max-h-[calc(100vh-120px)]">
                <div className="min-h-full bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-6">
                      {/* Left sidebar: Connect button + list of available accounts */}
                      <Card>
                        <CardHeader className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center shrink-0">
                              <Instagram className="w-8 h-8 text-[#E4405F]" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-[#E4405F]">{t('instagramConnect.leftTitle', 'Connect Instagram')}</h2>
                              <p className="text-sm text-gray-500">{t('instagramConnect.leftDescription', 'Connect with Facebook to authorize, or use token from Connect WhatsApp.')}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {!hasMetaConfig ? (
                            <div className="space-y-3">
                              {hasOAuth && (
                                <Button
                                  type="button"
                                  onClick={() => { setOauthLoading(true); openOAuthPopup(); }}
                                  disabled={oauthLoading}
                                  className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
                                >
                                  {oauthLoading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Facebook className="w-4 h-4 mr-2" />
                                  )}
                                  {oauthLoading
                                    ? t('instagramConnect.oauthConnecting', 'Connecting…')
                                    : t('instagramConnect.connectWithFacebook', 'Connect with Facebook')}
                                </Button>
                              )}
                              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
                                {hasOAuth
                                  ? t('instagramConnect.noMetaConfigOrOAuth', 'Or open Connect WhatsApp first to use a manual token.')
                                  : t('instagramConnect.noMetaConfig', 'Open Connect WhatsApp first so the Meta token is available, or set VITE_META_APP_ID for OAuth.')}
                              </div>
                            </div>
                          ) : (
                            hasOAuth && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => { setOauthLoading(true); openOAuthPopup(); }}
                                disabled={oauthLoading}
                                className="w-full border-[#1877F2] text-[#1877F2] hover:bg-[#1877F2]/10"
                              >
                                {oauthLoading ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Facebook className="w-4 h-4 mr-2" />
                                )}
                                {oauthLoading
                                  ? t('instagramConnect.oauthConnecting', 'Connecting…')
                                  : t('instagramConnect.connectWithFacebook', 'Connect with Facebook')}
                              </Button>
                            )
                          )}
                          <div className="border-t border-slate-200 pt-4 mt-4">
                            <WebhookInfoDisplay embedded />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Right sidebar: List of connected accounts */}
                      <Card>
                        <CardHeader>
                          <CardTitle>{t('instagramConnect.rightTitle', 'Connected accounts')}</CardTitle>
                          <CardDescription>{t('instagramConnect.rightDescription', 'List of connected Instagram Business accounts.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {isLoading ? (
                            <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
                              <Loader2 className="w-6 h-6 animate-spin mr-2" />
                              {t('instagramConnect.loadingAccounts', 'Loading...')}
                            </div>
                          ) : !isConnected ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                              <Instagram className="w-12 h-12 text-slate-300 mb-3" />
                              <p className="text-sm text-slate-600">
                                {t('instagramConnect.noConnectedAccounts', 'No Instagram account connected. Use Connect with Facebook to authorize.')}
                              </p>
                            </div>
                          ) : (
                            <>
                            <div className="space-y-4">
                              <div className="rounded-xl border border-purple-200/70 bg-purple-50/60 p-5 shadow-sm">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-11 h-11 rounded-xl bg-[#E4405F]/15 flex items-center justify-center shrink-0">
                                      <Instagram className="w-6 h-6 text-[#E4405F]" />
                                    </div>
                                    <div className="min-w-0">
                                      <h3 className="font-semibold text-slate-900 truncate">
                                        {instagramDisplayName}
                                      </h3>
                                      {config?.instagram_username && (
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                          @{config.instagram_username}
                                        </p>
                                      )}
                                      <span className="inline-flex items-center gap-1.5 text-purple-600 text-sm font-medium mt-0.5">
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        {t('instagramConnect.connected', 'Connected')}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                    onClick={handleDisconnect}
                                    disabled={isUpdatingInstagram}
                                  >
                                    <Unplug className="w-4 h-4 mr-2" />
                                    {t('instagramConnect.disconnect', 'Disconnect')}
                                  </Button>
                                </div>
                              </div>
                            </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
}
