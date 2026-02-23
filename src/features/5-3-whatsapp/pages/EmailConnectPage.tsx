import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '@/features/5-3-dashboard/HeaderAndTab';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/features/ui/command';
import { Checkbox } from '@/features/ui/checkbox';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useEmailConnections } from '../hooks/useEmailConnections';
import { Mail, Plus, ChevronLeft, ChevronDown, Copy, CheckCircle2, Unplug, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { EmailConnection } from '../types';

const EMAIL_INBOUND_DOMAIN = (import.meta.env.VITE_EMAIL_INBOUND_DOMAIN as string)?.trim() || 'chat.example.com';
const IS_INBOUND_DOMAIN_CONFIGURED = EMAIL_INBOUND_DOMAIN !== 'chat.example.com';

/** Deterministic inbound address per (org, email) so re-adding the same connection gives the same address. */
async function generateInboundAddress(organizationId: string, emailAddress: string): Promise<string> {
  const input = `${organizationId}|${emailAddress.toLowerCase().trim()}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const id = hex.slice(0, 12);
  return `inbound-${id}@${EMAIL_INBOUND_DOMAIN}`;
}

/** Email providers (well-known only). */
const EMAIL_PROVIDERS = [
  'AOL (TLS)', 'AOL (SSL)',
  'Gmail (TLS)', 'Gmail (SSL)',
  'Outlook (TLS)', 'Outlook (SSL)',
  'Yahoo (TLS)', 'Yahoo (SSL)',
] as const;

export function EmailConnectPage() {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const { organizationId } = useCurrentOrg();
  const { connections, isLoading: connectionsLoading, insertConnection, insertConnectionMutation, deleteConnection } = useEmailConnections();
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [provider, setProvider] = useState<string>('');
  const [providerOpen, setProviderOpen] = useState(false);
  const [customProvider, setCustomProvider] = useState(false);
  const [createdInboundAddress, setCreatedInboundAddress] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleBack = () => {
    setIsAddingEmail(false);
    setCreatedInboundAddress(null);
    setEmail('');
    setPassword('');
    setProvider('');
  };
  const handleSelectProvider = (value: string) => {
    setProvider(value);
    setProviderOpen(false);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrim = email.trim();
    if (!emailTrim) {
      toast.error(t('emailConnect.emailRequired', 'Email address is required.'));
      return;
    }
    if (!organizationId) {
      toast.error(t('emailConnect.noOrganization', 'No organization selected.'));
      return;
    }
    const alreadyConnected = connections.some(
      (c) => c.email_address?.toLowerCase().trim() === emailTrim.toLowerCase()
    );
    if (alreadyConnected) {
      toast.error(t('emailConnect.alreadyConnected', 'This email is already connected.'));
      return;
    }
    try {
      const inboundAddress = await generateInboundAddress(organizationId, emailTrim);
      await insertConnection({
        organization_id: '', // filled in hook
        email_address: emailTrim,
        inbound_address: inboundAddress,
        provider: provider || null,
        status: 'pending_verification',
      });
      setCreatedInboundAddress(inboundAddress);
      toast.success(t('emailConnect.connectionCreated', 'Email connection created. Add the forwarding address in Gmail.'));
    } catch (err) {
      toast.error((err as Error)?.message ?? t('emailConnect.createFailed', 'Failed to create connection.'));
    }
  };
  const handleCopyInboundAddress = () => {
    if (!createdInboundAddress) return;
    void navigator.clipboard.writeText(createdInboundAddress).then(() => {
      setCopiedAddress(true);
      toast.success(t('emailConnect.copied', 'Address copied to clipboard.'));
      setTimeout(() => setCopiedAddress(false), 2000);
    });
  };
  const handleDoneAfterCreate = () => {
    setCreatedInboundAddress(null);
    setIsAddingEmail(false);
    setEmail('');
    setPassword('');
    setProvider('');
  };
  const handleOpenLiveChat = () => navigate('/operations/consultant/all/livechat');
  const handleRemoveConnection = async (conn: EmailConnection) => {
    if (!window.confirm(t('emailConnect.confirmRemove', 'Remove this email connection?'))) return;
    try {
      await deleteConnection(conn.id);
      toast.success(t('emailConnect.removed', 'Connection removed.'));
    } catch {
      toast.error(t('emailConnect.removeFailed', 'Failed to remove connection.'));
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
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain max-h-[calc(100vh-120px)]">
                <div className="min-h-full bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-6">
                      {/* Left sidebar: Connect Email */}
                      <Card>
                        <CardHeader className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center shrink-0">
                              <Mail className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-blue-700">
                                {t('emailConnect.leftTitle', 'Connect Email')}
                              </h2>
                              <p className="text-sm text-gray-500">
                                {t('emailConnect.description', 'Connect your email account to sync conversations and manage leads from email.')}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {!isAddingEmail ? (
                            <>
                              <Button
                                type="button"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => setIsAddingEmail(true)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                {t('emailConnect.addEmail', 'Add Email')}
                              </Button>
                            </>
                          ) : (
                            <div className="space-y-5">
                              {/* Breadcrumb */}
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <button
                                  type="button"
                                  onClick={handleBack}
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                  {t('emailConnect.back', 'Back')}
                                </button>
                                <span className="text-slate-400">/</span>
                                <span>{t('emailConnect.addEmailAccount', 'Add Email Account')}</span>
                              </div>

                              <div className="space-y-4">
                                <form onSubmit={handleSubmit} className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="email-address">
                                      {t('emailConnect.emailAddress', 'Email Address *')}
                                    </Label>
                                    <Input
                                      id="email-address"
                                      type="email"
                                      placeholder={t('emailConnect.emailPlaceholder', 'Enter email address')}
                                      value={email}
                                      onChange={(e) => setEmail(e.target.value)}
                                      className="w-full h-10 rounded-md border border-input"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="email-password">
                                      {t('emailConnect.password', 'Password (Encrypted) *')}
                                    </Label>
                                    <Input
                                      id="email-password"
                                      type="password"
                                      placeholder={t('emailConnect.passwordPlaceholder', 'Enter password')}
                                      value={password}
                                      onChange={(e) => setPassword(e.target.value)}
                                      className="w-full h-10 rounded-md border border-input"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>
                                      {t('emailConnect.provider', 'Provider *')}
                                    </Label>
                                    <Popover open={providerOpen} onOpenChange={setProviderOpen}>
                                      <PopoverTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          role="combobox"
                                          aria-expanded={providerOpen}
                                          className="w-full h-10 justify-between font-normal"
                                        >
                                          <span className={cn(!provider && 'text-muted-foreground')}>
                                            {provider || t('emailConnect.providerPlaceholder', 'Select provider')}
                                          </span>
                                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                        <Command>
                                          <CommandInput
                                            placeholder={t('emailConnect.searchProvider', 'Search provider...')}
                                            className="h-10"
                                          />
                                          <CommandList className="max-h-[300px]">
                                            <CommandEmpty>
                                              {t('emailConnect.noProviderFound', 'No provider found.')}
                                            </CommandEmpty>
                                            {EMAIL_PROVIDERS.map((name) => (
                                              <CommandItem
                                                key={name}
                                                value={name}
                                                onSelect={() => handleSelectProvider(name)}
                                              >
                                                {name}
                                              </CommandItem>
                                            ))}
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="custom-provider"
                                      checked={customProvider}
                                      onCheckedChange={(checked) => setCustomProvider(checked === true)}
                                    />
                                    <Label
                                      htmlFor="custom-provider"
                                      className="text-sm font-normal cursor-pointer"
                                    >
                                      {t('emailConnect.customProvider', 'Custom Provider Manually')}
                                    </Label>
                                  </div>
                                  <Button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    disabled={insertConnectionMutation.isPending}
                                  >
                                    {insertConnectionMutation.isPending ? t('emailConnect.submitting', 'Submitting...') : t('emailConnect.submit', 'Submit')}
                                  </Button>
                                </form>
                              </div>
                            </div>
                          )}
                          {createdInboundAddress ? (
                            <div className="space-y-4 rounded-lg border border-green-200 bg-green-50/80 p-4">
                              {!IS_INBOUND_DOMAIN_CONFIGURED ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                  {t('emailConnect.inboundDomainNotConfigured', 'Set VITE_EMAIL_INBOUND_DOMAIN in .env to your Resend inbound domain (e.g. profitloop.id) so Gmail can deliver emails to this address.')}
                                </div>
                              ) : null}
                              <div className="flex items-center gap-2 text-green-800 font-semibold">
                                <CheckCircle2 className="w-5 h-5 shrink-0" />
                                {t('emailConnect.inboundAddressTitle', 'Forwarding address')}
                              </div>
                              <p className="text-sm text-slate-700">
                                {t('emailConnect.inboundAddressInstruction', 'Add this address in Gmail → Settings → Forwarding and POP/IMAP. The confirmation code will appear in Live Chat after Gmail sends the verification email.')}
                              </p>
                              <div className="flex items-center gap-2">
                                <code className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-800 break-all">
                                  {createdInboundAddress}
                                </code>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCopyInboundAddress}
                                  className="shrink-0"
                                >
                                  {copiedAddress ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="default" size="sm" onClick={handleOpenLiveChat} className="bg-blue-600 hover:bg-blue-700">
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  {t('emailConnect.openLiveChat', 'Open Live Chat')}
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={handleDoneAfterCreate}>
                                  {t('emailConnect.done', 'Done')}
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>

                      {/* Right: Connected accounts */}
                      <Card className="flex flex-col min-h-0">
                        <CardHeader className="flex-shrink-0">
                          <CardTitle>{t('emailConnect.rightTitle', 'Connected accounts')}</CardTitle>
                          <CardDescription>{t('emailConnect.rightDescription', 'List of email accounts connected to CRM.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 p-0">
                          <div className="overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain max-h-[min(50vh,420px)] min-h-0 px-6 pb-6">
                            {connectionsLoading ? (
                              <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
                                {t('emailConnect.loading', 'Loading...')}
                              </div>
                            ) : connections.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <Mail className="w-12 h-12 text-slate-300 mb-3" />
                                <p className="text-sm text-slate-600">
                                  {t('emailConnect.noConnectedAccounts', 'No email account connected.')}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {connections.map((conn) => (
                                  <div
                                    key={conn.id}
                                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                                  >
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                          <Mail className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-medium text-slate-900 truncate">{conn.email_address}</p>
                                          <p className="text-xs text-slate-500 truncate mt-0.5" title={conn.inbound_address}>
                                            {conn.inbound_address}
                                          </p>
                                          <span
                                            className={cn(
                                              'inline-flex text-xs font-medium mt-1',
                                              (conn.status === 'verified' || conn.confirmation_code) ? 'text-green-600' : 'text-amber-600'
                                            )}
                                          >
                                            {conn.status === 'verified' || conn.confirmation_code
                                              ? t('emailConnect.statusVerified', 'Verified')
                                              : t('emailConnect.statusPending', 'Pending verification')}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={handleOpenLiveChat}
                                          className="text-blue-600 border-blue-200"
                                        >
                                          <MessageCircle className="w-4 h-4 mr-1" />
                                          {t('emailConnect.liveChat', 'Live Chat')}
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="text-red-600 border-red-200"
                                          onClick={() => handleRemoveConnection(conn)}
                                        >
                                          <Unplug className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
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
