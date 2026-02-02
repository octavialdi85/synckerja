import React, { useState, useEffect } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '@/features/5-3-dashboard/HeaderAndTab';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Label } from '@/features/ui/label';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/features/ui/alert-dialog';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { WhatsAppConnectForm } from '../components/connect/WhatsAppConnectForm';
import { WebhookInfoDisplay } from '../components/connect/WebhookInfoDisplay';
import { useWhatsAppConfig } from '../hooks/useWhatsAppConfig';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CheckCircle2, CircleOff, Unplug, MessageCircle, Phone, Hash, Calendar, ShieldCheck, RefreshCw, FileText } from 'lucide-react';

/** Ikon logo WhatsApp (akun WhatsApp). */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/** Badge verified Meta/WhatsApp (ikon asli: lingkaran bergerigi biru + centang putih). */
function MetaVerifiedBadge({ className, title, 'aria-label': ariaLabel }: { className?: string; title?: string; 'aria-label'?: string }) {
  // Lingkaran bergerigi (serrated) seperti badge Meta: gigi jelas, radius luar/dalam bergantian
  const teeth = 16;
  const R = 12;   // radius luar (ujung gigi)
  const r = 8.5;  // radius dalam (lembah) — beda jelas agar gerigi terlihat
  const cx = 12;
  const cy = 12;
  const points: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const radius = i % 2 === 0 ? R : r;
    const angle = (i * 360) / (teeth * 2) - 90; // 32 titik merata 360°
    const rad = (angle * Math.PI) / 180;
    points.push(`${(cx + radius * Math.cos(rad)).toFixed(2)},${(cy + radius * Math.sin(rad)).toFixed(2)}`);
  }
  const serratedCircle = `M ${points.join(' L ')} Z`;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" title={title} aria-label={ariaLabel}>
      <path d={serratedCircle} fill="#1877F2" />
      <path d="M7 12l3 3 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function WhatsAppConnectPage() {
  const { t } = useAppTranslation();
  const { config, isLoading, disconnect, isDisconnecting, refetch } = useWhatsAppConfig();
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isConnected = !!config?.is_active && !!config?.phone_number_id;

  // Sync WhatsApp data (name, status, phone) from Meta when page loads with connected account
  useEffect(() => {
    if (!isConnected || !config) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-whatsapp-business-name`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) await refetch();
      } catch {
        // Ignore; data stays as-is
      }
    })();
  }, [isConnected, config?.id, refetch]);
  const accountName = config?.whatsapp_business_name?.trim() || config?.display_phone_number?.trim() || config?.phone_number_id || 'WhatsApp Account';
  const displayNumber = config?.display_phone_number?.trim() || '—';
  const statusUpper = config?.name_status?.trim()?.toUpperCase();
  const statusLabel = statusUpper === 'APPROVED'
    ? t('whatsappConnect.statusApproved', 'Approved')
    : statusUpper === 'DECLINED'
      ? t('whatsappConnect.statusDeclined', 'Declined')
      : (config?.name_status?.trim() || t('whatsappConnect.statusPending', 'Pending'));
  const updatedAtLabel = config?.updated_at
    ? format(new Date(config.updated_at), 'd MMM yy HH:mm')
    : '—';

  const handleDisconnectConfirm = async () => {
    await disconnect();
    setDisconnectOpen(false);
  };

  const handleRefreshFromMeta = async () => {
    if (!isConnected || isSyncing) return;
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error(t('whatsappConnect.refreshError', 'Sesi habis. Silakan login lagi.'));
        return;
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-whatsapp-business-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || t('whatsappConnect.refreshError', 'Gagal menyinkronkan dari Meta.'));
        return;
      }
      await refetch();
      toast.success(t('whatsappConnect.refreshSuccess', 'Data diperbarui dari Meta.'));
    } catch {
      toast.error(t('whatsappConnect.refreshError', 'Gagal menyinkronkan dari Meta.'));
    } finally {
      setIsSyncing(false);
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
                    <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Disconnect WhatsApp?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Semua data konfigurasi akan dihapus. Untuk menyambung lagi Anda harus mengisi ulang Business Account ID, Access Token, Phone Number ID, dan data lainnya.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDisconnecting}>Cancel</AlertDialogCancel>
                          <Button
                            variant="destructive"
                            onClick={handleDisconnectConfirm}
                            disabled={isDisconnecting}
                          >
                            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-6">
                      {/* Left: Akun Configuration (WhatsApp – nanti bisa ditambah Instagram, dll.) */}
                      <Card>
                        <CardHeader className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-[#25D366]/10 flex items-center justify-center shrink-0">
                              <svg className="w-8 h-8 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-[#25D366]">WhatsApp</h2>
                              <p className="text-sm text-gray-500">Alternative account connection</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div>
                            <WhatsAppConnectForm />
                          </div>
                          <div className="border-t border-slate-200 pt-6">
                            <WebhookInfoDisplay embedded />
                          </div>
                          <div className="border-t border-slate-200 pt-6">
                            <div className="flex items-center gap-2 mb-4">
                              <FileText className="w-4 h-4 text-slate-600 shrink-0" aria-hidden />
                              <div>
                                <h3 className="text-sm font-semibold text-slate-800">Policy URLs</h3>
                                <p className="text-xs text-slate-500">Required for Meta WhatsApp configuration</p>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                                <Label className="text-slate-700 text-xs font-medium uppercase tracking-wide">Privacy Policy URL</Label>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <a
                                    href={`${window.location.origin}/policy/privacy`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline break-all flex-1 min-w-0"
                                  >
                                    {window.location.origin}/policy/privacy
                                  </a>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0"
                                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/policy/privacy`)}
                                  >
                                    Copy
                                  </Button>
                                </div>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                                <Label className="text-slate-700 text-xs font-medium uppercase tracking-wide">Terms of Service URL</Label>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <a
                                    href={`${window.location.origin}/policy/terms`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline break-all flex-1 min-w-0"
                                  >
                                    {window.location.origin}/policy/terms
                                  </a>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0"
                                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/policy/terms`)}
                                  >
                                    Copy
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      {/* Right: Akun yang terhubung */}
                      <Card>
                        <CardHeader>
                          <CardTitle>{t('whatsappConnect.sectionConnectedAccounts', 'Akun yang terhubung')}</CardTitle>
                          <CardDescription>{t('whatsappConnect.sectionConnectedAccountsDescription', 'Daftar akun WhatsApp yang sudah terhubung dengan nama lengkap')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {isLoading ? (
                            <div className="flex items-center justify-center py-12 text-slate-500 text-sm">Loading...</div>
                          ) : !isConnected ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                              <MessageCircle className="w-12 h-12 text-slate-300 mb-3" />
                              <p className="text-sm text-slate-600">{t('whatsappConnect.noConnectedAccounts', 'Belum ada akun terhubung. Selesaikan konfigurasi di sebelah kiri untuk menghubungkan akun.')}</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Per-account wrapper dengan soft color */}
                              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-5 shadow-sm">
                                <div className="space-y-5">
                                  {/* Header: Account name + status badge */}
                                  <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-11 h-11 rounded-xl bg-[#25D366]/15 flex items-center justify-center shrink-0">
                                        <WhatsAppIcon className="w-6 h-6 text-[#25D366]" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h3 className="font-semibold text-slate-900 truncate">{accountName}</h3>
                                          {statusUpper === 'APPROVED' && (
                                            <MetaVerifiedBadge className="w-5 h-5 shrink-0" title={t('whatsappConnect.statusApproved', 'Approved by Meta')} aria-label={t('whatsappConnect.statusApproved', 'Approved')} />
                                          )}
                                        </div>
                                        <span className="inline-flex items-center gap-1.5 text-green-600 text-sm font-medium mt-0.5">
                                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                                          Connected
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  {/* 2x2 info grid */}
                                  <div className="grid grid-cols-4 gap-3 min-w-0">
                                    <div className="rounded-lg border border-slate-200 bg-white/80 p-3 min-w-0">
                                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                                        <Phone className="w-3.5 h-3.5 shrink-0" />
                                        {t('whatsappConnect.labelNumber', 'Number')}
                                      </div>
                                      <p className="text-sm font-medium text-slate-800 truncate">{displayNumber}</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-white/80 p-3 min-w-0">
                                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                        {t('whatsappConnect.labelStatus', 'Status')}
                                      </div>
                                      <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                                        {statusUpper === 'APPROVED' && (
                                          <MetaVerifiedBadge className="w-4 h-4 shrink-0" title={t('whatsappConnect.statusApproved', 'Approved by Meta')} aria-label={t('whatsappConnect.statusApproved', 'Approved')} />
                                        )}
                                        {statusLabel}
                                      </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-white/80 p-3 min-w-0">
                                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                                        <Hash className="w-3.5 h-3.5 shrink-0" />
                                        {t('whatsappConnect.labelNumberId', 'Phone Number ID')}
                                      </div>
                                      <p className="text-sm font-medium text-slate-800 truncate font-mono">{config?.phone_number_id ?? '—'}</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-white/80 p-3 min-w-0">
                                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                                        {t('whatsappConnect.labelUpdated', 'Updated')}
                                      </div>
                                      <p className="text-sm font-medium text-slate-800">{updatedAtLabel}</p>
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full sm:w-auto"
                                      onClick={handleRefreshFromMeta}
                                      disabled={isSyncing}
                                    >
                                      <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                                      {isSyncing ? t('whatsappConnect.syncing', 'Menyinkronkan...') : t('whatsappConnect.refreshFromMeta', 'Refresh dari Meta')}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                      onClick={() => setDisconnectOpen(true)}
                                      disabled={isDisconnecting}
                                    >
                                      <Unplug className="w-4 h-4 mr-2" />
                                      Disconnect
                                    </Button>
                                  </div>
                                </div>
                              </div>
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
