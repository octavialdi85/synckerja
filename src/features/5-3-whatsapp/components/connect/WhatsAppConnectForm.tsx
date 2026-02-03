import React, { useState, useEffect } from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { useWhatsAppConfig } from '../../hooks/useWhatsAppConfig';
import { useWhatsAppAccounts } from '../../hooks/useWhatsAppAccounts';
import type { WhatsAppAccount } from '../../types';

const META_GRAPH_API_VERSION = 'v21.0';

export interface WhatsAppConnectFormProps {
  /** When set, form is in edit mode for this account. */
  editingAccount?: WhatsAppAccount | null;
  /** Called when user cancels edit or after successful submit. */
  onClearEdit?: () => void;
  /** Called after save so parent can sync from Meta API (e.g. fetch real name_status). */
  onAfterSave?: (account: WhatsAppAccount) => void | Promise<void>;
}

export function WhatsAppConnectForm({ editingAccount = null, onClearEdit, onAfterSave }: WhatsAppConnectFormProps) {
  const { config: orgConfig, isLoading: orgConfigLoading, ensureOrgMetaConfig } = useWhatsAppConfig();
  const { accounts, upsert, isUpserting, updateName, maxAccounts } = useWhatsAppAccounts();
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [metaBusinessManagerId, setMetaBusinessManagerId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');

  const sharedToken = orgConfig?.meta_access_token?.trim() ?? null;
  const canAddMore = accounts.length < maxAccounts;

  useEffect(() => {
    if (editingAccount) {
      setBusinessAccountId(editingAccount.whatsapp_business_account_id);
      setPhoneNumberId(editingAccount.phone_number_id);
      setAccessToken(editingAccount.meta_access_token ?? '');
      setMetaBusinessManagerId(orgConfig?.meta_business_manager_id ?? '');
    } else {
      setBusinessAccountId('');
      setPhoneNumberId('');
      setAccessToken('');
      setMetaBusinessManagerId(orgConfig?.meta_business_manager_id ?? '');
    }
  }, [editingAccount, orgConfig?.meta_business_manager_id]);

  const handleCancelEdit = () => {
    onClearEdit?.();
    setBusinessAccountId('');
    setPhoneNumberId('');
    setAccessToken('');
    setMetaBusinessManagerId(orgConfig?.meta_business_manager_id ?? '');
  };

  const fetchPhoneNumberProfileFromMeta = async (
    pnId: string,
    token: string
  ): Promise<{ verified_name: string | null; display_phone_number: string | null }> => {
    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(pnId)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = (await res.json()) as {
      verified_name?: string;
      display_phone_number?: string | number;
      error?: { message?: string };
    };
    if (!res.ok) return { verified_name: null, display_phone_number: null };
    const name = typeof data.verified_name === 'string' ? data.verified_name.trim() : null;
    let num: string | null = null;
    if (data.display_phone_number != null) {
      const raw = data.display_phone_number;
      num = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : null;
      if (num && /^\d+$/.test(num)) num = `+${num}`;
    }
    return { verified_name: name || null, display_phone_number: num };
  };

  const fetchDisplayPhoneFromWabaList = async (
    wabaId: string,
    pnId: string,
    token: string
  ): Promise<string | null> => {
    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(wabaId)}/phone_numbers`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = (await res.json()) as { data?: Array<{ id?: string; display_phone_number?: string }> };
    if (!res.ok || !Array.isArray(data?.data)) return null;
    const match = data.data.find((p) => p.id === pnId);
    const raw = match?.display_phone_number;
    if (raw == null) return null;
    let num = typeof raw === 'string' ? raw.trim() : String(raw);
    if (num && /^\d+$/.test(num)) num = `+${num}`;
    return num || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const wabaId = businessAccountId.trim();
    const pnId = phoneNumberId.trim();
    const tokenInput = accessToken.trim();
    const tokenToUse = tokenInput || sharedToken;
    if (!wabaId || !pnId) return;
    if (!tokenToUse) {
      return; // validation will show
    }
    if (!editingAccount && !canAddMore) return;

    if (!orgConfig?.verify_token?.trim()) {
      await ensureOrgMetaConfig({
        verify_token: null,
        meta_business_manager_id: metaBusinessManagerId.trim() || null,
        meta_access_token: tokenToUse,
      });
    }

    const saved = await upsert({
      accountId: editingAccount?.id ?? null,
      payload: {
        whatsapp_business_account_id: wabaId,
        phone_number_id: pnId,
        meta_access_token: editingAccount ? (tokenInput || (editingAccount.meta_access_token ?? null)) : tokenToUse,
        display_phone_number: null,
        whatsapp_business_name: null,
      },
      sharedToken,
    });

    if (tokenToUse && pnId && saved) {
      try {
        const { verified_name, display_phone_number } = await fetchPhoneNumberProfileFromMeta(pnId, tokenToUse);
        let num = display_phone_number;
        if (!num && wabaId) num = await fetchDisplayPhoneFromWabaList(wabaId, pnId, tokenToUse);
        await updateName({
          accountId: saved.id,
          whatsapp_business_name: verified_name ?? null,
          display_phone_number: num ?? null,
        });
      } catch {
        // ignore
      }
      // Sync from Meta API so name_status (Display name verification) reflects reality
      try {
        await onAfterSave?.(saved);
      } catch {
        // ignore; user can use "Refresh dari Meta" manually
      }
    }

    onClearEdit?.();
    setBusinessAccountId('');
    setPhoneNumberId('');
    setAccessToken('');
  };

  if (orgConfigLoading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  const isEdit = !!editingAccount;
  const canSubmit =
    businessAccountId.trim() &&
    phoneNumberId.trim() &&
    (isEdit ? true : (accessToken.trim() || sharedToken));

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      {editingAccount && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Mengedit akun: {editingAccount.whatsapp_business_name || editingAccount.display_phone_number || editingAccount.phone_number_id}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="business-account-id">WhatsApp Business Account ID</Label>
        <Input
          id="business-account-id"
          placeholder="WhatsApp Business Account ID"
          value={businessAccountId}
          onChange={(e) => setBusinessAccountId(e.target.value)}
          className="bg-gray-50"
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="access-token">Access Token</Label>
        <Input
          id="access-token"
          type="password"
          placeholder={sharedToken ? 'Kosongkan untuk pakai token bersama' : 'Access Token'}
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          className="bg-gray-50"
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="meta-business-manager-id">Meta Business Manager ID</Label>
        <Input
          id="meta-business-manager-id"
          placeholder="Contoh: 123456789012345"
          value={metaBusinessManagerId}
          onChange={(e) => setMetaBusinessManagerId(e.target.value)}
          className="bg-gray-50"
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone-number-id">Phone Number ID</Label>
        <Input
          id="phone-number-id"
          placeholder="From Meta WhatsApp API Setup (required for inbox)"
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
          className="bg-gray-50"
          autoComplete="off"
          readOnly={!!editingAccount}
        />
        {editingAccount && <p className="text-xs text-gray-500">Phone Number ID tidak dapat diubah. Disconnect dan tambah akun baru jika perlu.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isUpserting || !canSubmit || (!isEdit && !canAddMore)}>
          {isUpserting ? 'Menyimpan...' : isEdit ? 'Update' : 'Tambah akun'}
        </Button>
        {isEdit && (
          <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isUpserting}>
            Batal
          </Button>
        )}
      </div>
      {!canAddMore && !isEdit && (
        <p className="text-sm text-amber-700">Maksimal {maxAccounts} akun WhatsApp. Disconnect salah satu untuk menambah akun baru.</p>
      )}
    </form>
  );
}
