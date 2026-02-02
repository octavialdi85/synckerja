import React, { useEffect } from 'react';

/**
 * OAuth callback page for Meta (Facebook) Login.
 * Loaded in a popup after user authorizes. Reads ?code= & ?state= (or ?error=),
 * sends to opener via postMessage, then closes.
 */
export function MetaOAuthCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorReason = params.get('error_reason') ?? undefined;
    const errorDescription = params.get('error_description') ?? undefined;

    const payload =
      error != null
        ? { type: 'meta-oauth' as const, error: error || 'unknown', error_reason: errorReason, error_description: errorDescription }
        : { type: 'meta-oauth' as const, code: code ?? '', state: state ?? '' };

    if (window.opener) {
      window.opener.postMessage(payload, window.location.origin);
      // Beri waktu agar parent sempat menerima postMessage sebelum popup ditutup
      setTimeout(() => window.close(), 150);
    } else {
      window.close();
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <p className="text-sm text-gray-600">Closing window…</p>
    </div>
  );
}
