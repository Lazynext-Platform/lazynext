'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/i18n/provider';

interface PlatformConnection {
  id: string;
  platform: string;
  platformUsername: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
}

const PLATFORMS: Array<{ id: string; label: string; icon: string }> = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'youtube', label: 'YouTube', icon: '▶️' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'facebook', label: 'Facebook', icon: '👍' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
];

export function PlatformConnectionsSection() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/publish/connections');
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Handle OAuth redirect query params
  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth_success');
    const oauthError = searchParams.get('oauth_error');
    if (oauthSuccess) {
      const platform = PLATFORMS.find((p) => p.id === oauthSuccess);
      setSuccessMsg(platform ? `${platform.label} connected successfully.` : 'Platform connected successfully.');
      setError('');
      // Reload connections to show the new one
      load();
    } else if (oauthError) {
      const errorMap: Record<string, string> = {
        missing_code: 'Authorization code was missing.',
        invalid_state: 'Invalid state parameter. Please try connecting again.',
        invalid_platform: 'Unsupported platform.',
        not_configured: 'Platform OAuth is not configured on the server.',
        token_exchange_failed: 'Token exchange failed. Please try again.',
        invalid_grant: 'Authorization code expired or was already used. Please try connecting again.',
        invalid_client: 'Server OAuth credentials are invalid. Contact support.',
        redirect_uri_mismatch: 'Redirect URI does not match the platform app configuration. Contact support.',
        access_denied: 'You denied access to the platform. Please try again if this was a mistake.',
        exception: 'An unexpected error occurred during OAuth. Please try again.',
      };
      setError(errorMap[oauthError] || 'OAuth connection failed.');
      setSuccessMsg('');
    }
  }, [searchParams, load]);

  const handleConnect = (platformId: string) => {
    // Full-page redirect to the OAuth initiation endpoint — this is an
    // external redirect (the API returns a 302 to the platform's auth page),
    // so client-side router.push() would not work.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/publish/oauth/${platformId}`;
  };

  const handleDisconnect = async (platformId: string) => {
    setDisconnecting(platformId);
    try {
      const res = await fetch(`/api/publish/connections?platform=${platformId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConnections((prev) => prev.filter((c) => c.platform !== platformId));
        setSuccessMsg('Platform disconnected.');
        setError('');
      } else {
        setError('Failed to disconnect platform.');
      }
    } catch {
      setError('Failed to disconnect platform.');
    } finally {
      setDisconnecting(null);
    }
  };

  const isConnected = (platformId: string) =>
    connections.some((c) => c.platform === platformId);

  const getConnection = (platformId: string) =>
    connections.find((c) => c.platform === platformId);

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="mb-1 font-semibold text-fg">Publishing Platforms</h2>
      <p className="mb-4 text-sm text-fg-faint">
        Connect your social media accounts to publish and schedule posts directly from LazyNext.
      </p>

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      {successMsg && (
        <div role="status" className="mb-4 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          {successMsg}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-fg-faint">Loading connections…</p>
      ) : (
        <div className="space-y-3">
          {PLATFORMS.map((platform) => {
            const connected = isConnected(platform.id);
            const conn = getConnection(platform.id);
            const isExpired = conn?.tokenExpiresAt
              ? new Date(conn.tokenExpiresAt) < new Date()
              : false;
            return (
              <div
                key={platform.id}
                className="flex items-center justify-between rounded-xl border border-line bg-app px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl" aria-hidden="true">{platform.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-fg">{platform.label}</p>
                    {connected && (
                      <p className="text-xs text-fg-faint">
                        {conn?.platformUsername ? `@${conn.platformUsername}` : 'Connected'}
                        {isExpired && <span className="ml-2 text-warning">Token expired</span>}
                      </p>
                    )}
                  </div>
                </div>
                {connected ? (
                  <button
                    onClick={() => handleDisconnect(platform.id)}
                    disabled={disconnecting === platform.id}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-fg-secondary transition hover:bg-surface disabled:opacity-50"
                  >
                    {disconnecting === platform.id ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(platform.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
                    style={{ background: '#0064d9' }}
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
