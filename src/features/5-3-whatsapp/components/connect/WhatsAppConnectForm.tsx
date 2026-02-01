import React, { useState, useEffect } from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { useWhatsAppConfig } from '../../hooks/useWhatsAppConfig';

const META_GRAPH_API_VERSION = 'v21.0';

export function WhatsAppConnectForm() {
  const { config, isLoading, upsert, isUpserting, updateBusinessName, updateDisplayPhone } = useWhatsAppConfig();
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');

  // No autofill: start empty on mount and never pre-fill from config
  useEffect(() => {
    setBusinessAccountId('');
    setAccessToken('');
    setVerifyToken('');
    setPhoneNumberId('');
  }, []);

  const handleGenerateVerifyToken = () => {
    setVerifyToken(String(Math.floor(Math.random() * 1e16)));
  };

  // GET phone number node: returns verified_name + display_phone_number (nama & nomor langsung setelah konfigurasi)
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

  // Fallback: GET WABA phone_numbers list (Meta kadang tidak return display_phone_number di GET single phone number)
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
    if (!config && (!businessAccountId.trim() || !verifyToken.trim() || !accessToken.trim())) return;
    const tokenUsed = accessToken.trim();
    const pnId = phoneNumberId.trim();
    const wabaId = businessAccountId.trim();
    await upsert({
      whatsapp_business_account_id: wabaId,
      whatsapp_access_token: accessToken.trim(),
      verify_token: verifyToken.trim(),
      phone_number_id: pnId || null,
    });
    // Setelah konfigurasi berhasil: ambil nama & nomor dari Meta agar langsung muncul di UI
    if (tokenUsed && pnId) {
      try {
        const { verified_name, display_phone_number } = await fetchPhoneNumberProfileFromMeta(pnId, tokenUsed);
        if (verified_name) await updateBusinessName(verified_name);
        let num = display_phone_number;
        if (!num && wabaId) num = await fetchDisplayPhoneFromWabaList(wabaId, pnId, tokenUsed);
        if (num) await updateDisplayPhone(num);
      } catch {
        // Silently ignore; name/number stay as-is
      }
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
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
          placeholder={config ? 'Leave blank to keep current token' : 'Access Token'}
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          className="bg-gray-50"
          autoComplete="new-password"
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
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="verify-token">Verify Token</Label>
        <div className="flex gap-2">
          <Input
            id="verify-token"
            placeholder="Verify Token"
            value={verifyToken}
            onChange={(e) => setVerifyToken(e.target.value)}
            className="bg-gray-50 flex-1"
            autoComplete="off"
          />
          <Button type="button" variant="outline" onClick={handleGenerateVerifyToken}>
            Generate
          </Button>
        </div>
      </div>
      <Button type="submit" disabled={isUpserting || (!config && (!businessAccountId.trim() || !verifyToken.trim() || !accessToken.trim()))}>
        {isUpserting ? 'Saving...' : config ? 'Update' : 'Save & Connect'}
      </Button>
    </form>
  );
}
