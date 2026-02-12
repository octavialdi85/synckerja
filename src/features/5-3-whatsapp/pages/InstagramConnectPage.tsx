import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '@/features/5-3-dashboard/HeaderAndTab';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useWhatsAppConfig } from '../hooks/useWhatsAppConfig';
import { useInstagramAccounts, type InstagramAccountFromApi } from '../hooks/useInstagramAccounts';
import { WebhookInfoDisplay } from '../components/connect/WebhookInfoDisplay';
import { Instagram, CheckCircle2, Unplug, Loader2, Facebook } from 'lucide-react';
import { toast } from 'sonner';

const META_OAUTH_SCOPE = 'pages_show_list,pages_read_engagement,instagram_manage_messages,instagram_basic,business_management';
const META_OAUTH_VERSION = 'v21.0';

export function InstagramConnectPage() {
  const { t } = useAppTranslation();
  const { config, isLoading: configLoading, refetch: refetchConfig } = useWhatsAppConfig();
  const { accounts: connectedAccounts, isLoading: accountsLoading, refetch: refetchAccounts, connectAccount, disconnectAccount, isConnecting, isDisconnecting } = useInstagramAccounts();
  const [oauthLoading, setOauthLoading] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState<InstagramAccountFromApi[]>([]);
  const oauthStateRef = useRef<string>('');

  const metaAppId = (import.meta.env.VITE_META_APP_ID as string)?.trim() || '';
  const metaOAuthConfigId = (import.meta.env.VITE_META_OAUTH_CONFIG_ID as string)?.trim() || '';
  const hasOAuth = !!metaAppId;
  const hasMetaConfig = !!config?.meta_access_token?.trim();
  const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/auth/meta/callback` : '';

  // Facebook Login for Business only: redirect_uri must match Valid OAuth Redirect URIs in Meta Developer → Facebook Login for Business → Configurations
  const openOAuthPopup = useCallback(
    async () => {
      if (!hasOAuth || !redirectUri) {
        toast.error(t('instagramConnect.oauthNotConfigured', 'VITE_META_APP_ID not set.'));
        return;
      }
      const state = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      oauthStateRef.current = state;
      const params = new URLSearchParams({
        client_id: metaAppId,
        redirect_uri: redirectUri,
        scope: META_OAUTH_SCOPE,
        state,
      });
      params.set('display', 'page');
      params.set('response_type', 'token');
      const url = `https://www.facebook.com/${META_OAUTH_VERSION}/dialog/oauth?${params.toString()}`;
      // Mark Meta OAuth popup open so AuthContext can avoid signing out on spurious SIGNED_OUT (e.g. refresh failure in background)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          sessionStorage.setItem('metaOAuthPopupOpen', Date.now().toString());
          sessionStorage.setItem('metaOAuthPopupSession', JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }));
        }
      } catch (_) {}
      const w = window.open(url, 'meta-oauth', 'width=600,height=700,scrollbars=yes');
      if (!w) {
        sessionStorage.removeItem('metaOAuthPopupOpen');
        sessionStorage.removeItem('metaOAuthPopupSession');
        toast.error(t('instagramConnect.popupBlocked', 'Popup blocked. Allow popups for this site.'));
      }
    },
    [hasOAuth, metaAppId, redirectUri, t]
  );

  useEffect(() => {
    const clearMetaOAuthPopupFlag = () => {
      sessionStorage.removeItem('metaOAuthPopupOpen');
      sessionStorage.removeItem('metaOAuthPopupSession');
    };
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'meta-oauth') return;
      const data = event.data as {
        code?: string;
        state?: string;
        redirect_uri?: string;
        long_lived_token?: string;
        access_token?: string;
        error?: string;
        error_description?: string;
      };
      if (data.error) {
        clearMetaOAuthPopupFlag();
        setOauthLoading(false);
        toast.error(data.error_description || data.error || t('instagramConnect.oauthDenied', 'Login cancelled or denied.'));
        return;
      }
      const token = data.long_lived_token || data.access_token;
      const code = data.code;
      if (token) {
        if (data.state !== oauthStateRef.current) {
          clearMetaOAuthPopupFlag();
          setOauthLoading(false);
          return;
        }
        setOauthLoading(true);
        (async () => {
          try {
            // Restore may run after SIGNED_OUT; retry getSession so we don't fail on race
            let session: { access_token?: string } | null = (await supabase.auth.getSession()).data.session;
            if (!session?.access_token) {
              await new Promise((r) => setTimeout(r, 600));
              session = (await supabase.auth.getSession()).data.session;
            }
            if (!session?.access_token) {
              clearMetaOAuthPopupFlag();
              toast.error(t('instagramConnect.notAuthenticated', 'Please sign in again.'));
              setOauthLoading(false);
              return;
            }
            const res = await fetch(`${SUPABASE_URL}/functions/v1/meta-oauth-exchange`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ token }),
            });
            const resData = await res.json().catch(() => ({}));
            if (!res.ok) {
              toast.error(resData?.error || t('instagramConnect.oauthExchangeFailed', 'Failed to save token.'));
              setOauthLoading(false);
              return;
            }
            await refetchAccounts();
            setAvailableAccounts([]);
            toast.success(t('instagramConnect.oauthSuccess', 'Token saved. Connect Instagram accounts below.'));
          } catch {
            toast.error(t('instagramConnect.oauthExchangeFailed', 'Failed to save token.'));
          } finally {
            clearMetaOAuthPopupFlag();
            setOauthLoading(false);
          }
        })();
        return;
      }
      if (code && data.state === oauthStateRef.current) {
        setOauthLoading(true);
        (async () => {
          try {
            let session = (await supabase.auth.getSession()).data.session;
            if (!session?.access_token) {
              await new Promise((r) => setTimeout(r, 600));
              session = (await supabase.auth.getSession()).data.session;
            }
            if (!session?.access_token) {
              clearMetaOAuthPopupFlag();
              toast.error(t('instagramConnect.notAuthenticated', 'Please sign in again.'));
              setOauthLoading(false);
              return;
            }
            const exchangeRedirectUri = (typeof data.redirect_uri === 'string' && data.redirect_uri.trim()) ? data.redirect_uri.trim() : redirectUri;
            const res = await fetch(`${SUPABASE_URL}/functions/v1/meta-oauth-exchange`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ code, redirect_uri: exchangeRedirectUri }),
            });
            const resData = await res.json().catch(() => ({}));
            if (!res.ok) {
              clearMetaOAuthPopupFlag();
              toast.error(resData?.error || t('instagramConnect.oauthExchangeFailed', 'Failed to save token.'));
              setOauthLoading(false);
              return;
            }
            await refetchAccounts();
            setAvailableAccounts([]);
            toast.success(t('instagramConnect.oauthSuccess', 'Token saved. Connect Instagram accounts below.'));
          } catch {
            toast.error(t('instagramConnect.oauthExchangeFailed', 'Failed to save token.'));
          } finally {
            clearMetaOAuthPopupFlag();
            setOauthLoading(false);
          }
        })();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [refetchAccounts, redirectUri, t]);

  const handleConnect = async (account: InstagramAccountFromApi) => {
    try {
      await connectAccount(account);
      setAvailableAccounts((prev) => prev.filter((a) => a.id !== account.id));
      await refetchAccounts();
      toast.success(t('instagramConnect.oauthSuccess', 'Connected.'));
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Failed to connect');
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      await disconnectAccount(accountId);
      await refetchAccounts();
      toast.success(t('instagramConnect.disconnect', 'Disconnected'));
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Failed to disconnect');
    }
  };

  const connectedIds = new Set(connectedAccounts.map((a) => a.instagram_business_account_id));
  const availableToConnect = availableAccounts.filter((a) => !connectedIds.has(a.id));

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
                      <Card>
                        <CardHeader className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center shrink-0">
                              <Instagram className="w-8 h-8 text-[#E4405F]" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-[#E4405F]">{t('instagramConnect.leftTitle', 'Connect Instagram')}</h2>
                              <p className="text-sm text-gray-500">{t('instagramConnect.leftDescription', 'Use Connect with Facebook only to authorize, or use token from Connect WhatsApp.')}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {!hasMetaConfig ? (
                            <div className="space-y-3">
                              {hasOAuth && (
                                <>
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      setOauthLoading(true);
                                      openOAuthPopup();
                                    }}
                                    disabled={oauthLoading}
                                    className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
                                  >
                                    {oauthLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Facebook className="w-4 h-4 mr-2" />}
                                    {oauthLoading ? t('instagramConnect.oauthConnecting', 'Connecting…') : t('instagramConnect.connectWithFacebookOnly', 'Connect with Facebook only')}
                                  </Button>
                                  <p className="text-xs text-gray-500">{t('instagramConnect.connectFacebookOnlyHint', 'Login only on Facebook, no Instagram step. Use if you get "Invalid redirect URI" on instagram.com.')}</p>
                                  {redirectUri && (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-2">
                                      <p className="font-medium mb-1">{t('instagramConnect.redirectUriLabel', 'Redirect URI (add in Meta Developer):')}</p>
                                      <p className="font-mono text-[11px] break-all select-all bg-white px-1 py-0.5 rounded">{redirectUri}</p>
                                      {metaOAuthConfigId ? (
                                        <p className="text-green-700">{t('instagramConnect.configIdInUse', 'Using Configuration ID:')} <span className="font-mono">{metaOAuthConfigId}</span></p>
                                      ) : (
                                        <p className="text-amber-700">{t('instagramConnect.configIdRequired', 'Set VITE_META_OAUTH_CONFIG_ID to your Configuration ID (e.g. 757396134100532) so Meta uses the correct redirect URI.')}</p>
                                      )}
                                      <div className="rounded border border-amber-200 bg-amber-50/60 p-2 text-amber-800 space-y-2">
                                        <p className="font-medium mb-1">{t('instagramConnect.invalidRedirectTitle', 'If you see "Invalid redirect URI" on instagram.com:')}</p>
                                        <ul className="list-disc list-inside space-y-0.5">
                                          <li>{t('instagramConnect.invalidRedirectStep1', 'Open the Instagram app (e.g. Vialdi ID-IG), not the Facebook app.')}</li>
                                          <li>{t('instagramConnect.invalidRedirectStep2', 'Go to: Instagram → API setup with Instagram business login → Business login settings.')}</li>
                                          <li>{t('instagramConnect.invalidRedirectStep3', 'In OAuth redirect URIs add exactly the URL above (no space, no trailing slash). Save.')}</li>
                                          <li>{t('instagramConnect.invalidRedirectStep4', 'Also add the same URL in the Facebook app: Use cases → Facebook Login for Business → Client OAuth → Valid OAuth Redirect URIs.')}</li>
                                          <li>{t('instagramConnect.invalidRedirectStep5', 'In the Facebook app: Business login → Configurations → Edit your configuration (e.g. Vialdi ID) → if there is a Redirect URI / OAuth redirect URIs field, add the same URL there and Save.')}</li>
                                        </ul>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
                                {hasOAuth
                                  ? t('instagramConnect.noMetaConfigOrOAuth', 'Or open Connect WhatsApp first to use a manual token.')
                                  : t('instagramConnect.noMetaConfig', 'Open Connect WhatsApp first so the Meta token is available, or set VITE_META_APP_ID for OAuth.')}
                              </div>
                            </div>
                          ) : (
                            hasOAuth && (
                              <div className="space-y-2">
                                <Button
                                  type="button"
                                  onClick={() => {
                                    setOauthLoading(true);
                                    openOAuthPopup();
                                  }}
                                  disabled={oauthLoading}
                                  className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
                                >
                                  {oauthLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Facebook className="w-4 h-4 mr-2" />}
                                  {oauthLoading ? t('instagramConnect.oauthConnecting', 'Connecting…') : t('instagramConnect.connectWithFacebookOnly', 'Connect with Facebook only')}
                                </Button>
                                <p className="text-xs text-slate-500">{t('instagramConnect.connectFacebookOnlyHint', 'Login only on Facebook, no Instagram step. Use if you get "Invalid redirect URI" on instagram.com.')}</p>
                              </div>
                            )
                          )}
                          <div className="border-t border-slate-200 pt-4 mt-4">
                            <WebhookInfoDisplay embedded variant="instagram" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>{t('instagramConnect.rightTitle', 'Connected accounts')}</CardTitle>
                          <CardDescription>{t('instagramConnect.rightDescription', 'List of connected Instagram Business accounts.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {configLoading || accountsLoading ? (
                            <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
                              <Loader2 className="w-6 h-6 animate-spin mr-2" />
                              {t('instagramConnect.loadingAccounts', 'Loading...')}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {connectedAccounts.length === 0 && availableToConnect.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                  <Instagram className="w-12 h-12 text-slate-300 mb-3" />
                                  <p className="text-sm text-slate-600">
                                    {t('instagramConnect.noConnectedAccounts', 'No Instagram account connected. Use Connect with Facebook only to authorize.')}
                                  </p>
                                </div>
                              )}
                              {connectedAccounts.map((acc) => (
                                <div key={acc.id} className="rounded-xl border border-purple-200/70 bg-purple-50/60 p-5 shadow-sm">
                                  <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-11 h-11 rounded-xl bg-[#E4405F]/15 flex items-center justify-center shrink-0">
                                        <Instagram className="w-6 h-6 text-[#E4405F]" />
                                      </div>
                                      <div className="min-w-0">
                                        <h3 className="font-semibold text-slate-900 truncate">
                                          {acc.instagram_username ? `@${acc.instagram_username}` : acc.instagram_name || acc.instagram_business_account_id}
                                        </h3>
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
                                      onClick={() => handleDisconnect(acc.id)}
                                      disabled={isDisconnecting}
                                    >
                                      <Unplug className="w-4 h-4 mr-2" />
                                      {t('instagramConnect.disconnect', 'Disconnect')}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              {availableToConnect.length > 0 && (
                                <div className="pt-4 border-t border-slate-200">
                                  <p className="text-sm font-medium text-slate-700 mb-2">Available to connect</p>
                                  {availableToConnect.map((acc) => (
                                    <div key={acc.id} className="flex items-center justify-between gap-3 py-2">
                                      <span className="text-sm text-slate-600">
                                        {acc.username ? `@${acc.username}` : acc.name || acc.id}
                                      </span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleConnect(acc)}
                                        disabled={isConnecting}
                                      >
                                        Connect
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
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
