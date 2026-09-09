'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Key, Smartphone, Fingerprint, Building2, Monitor,
  History, Lock, AlertTriangle, Plus, Trash2, RefreshCw, Download,
  Check, X, Copy,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

// ── Types ──

interface TwoFactorStatus {
  enabled: boolean;
  hasBackupCodes: boolean;
  setupAt: string | null;
}

interface SecurityKeyRecord {
  id: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  name: string;
  createdAt: string;
}

interface SsoConfig {
  id: string;
  organizationId: string;
  provider: string;
  name: string;
  entityId?: string;
  ssoUrl?: string;
  certificate?: string;
  metadataUrl?: string;
  attributeMapping: Record<string, string>;
  domains: string[];
  createdAt: string;
  updatedAt: string;
}

interface SessionRecord {
  id: string;
  sessionToken: string;
  userId: string;
  expires: string;
  revokedAt: string | null;
}

interface ActiveDevice {
  device: string;
  browser: string;
  os: string;
  ipAddress: string;
  lastActivity: string;
  sessionId: string;
}

interface LoginHistoryEntry {
  id: string;
  ipAddress: string;
  userAgent: string;
  method: string;
  success: boolean;
  twoFactorUsed: boolean;
  timestamp: string;
}

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
  preventReuse: number;
  expiryDays: number;
}

interface SuspiciousActivityResult {
  suspicious: boolean;
  reasons: string[];
}

// ── Component ──

export function SecurityCenter({
  organizationId,
  twoFactorStatus,
  securityKeys,
  ssoConfigs,
  sessions,
  devices,
  loginHistory,
  passwordPolicy,
  suspicious,
}: {
  organizationId: string;
  twoFactorStatus: TwoFactorStatus;
  securityKeys: SecurityKeyRecord[];
  ssoConfigs: SsoConfig[];
  sessions: SessionRecord[];
  devices: ActiveDevice[];
  loginHistory: LoginHistoryEntry[];
  passwordPolicy: PasswordPolicy;
  suspicious: SuspiciousActivityResult;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<{ secret: string; uri: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableCode, setDisableCode] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [testResult, setTestResult] = useState<{ valid: boolean; errors: string[]; strength: string } | null>(null);
  const [ssoProvider, setSsoProvider] = useState('saml');
  const [ssoName, setSsoName] = useState('');
  const [ssoDomains, setSsoDomains] = useState('');
  const [ssoMetadataUrl, setSsoMetadataUrl] = useState('');
  const [keyName, setKeyName] = useState('');

  // Calculate security score
  const features = [
    twoFactorStatus.enabled,
    securityKeys.length > 0,
    ssoConfigs.length > 0,
    passwordPolicy.minLength >= 12,
    sessions.length <= 5,
    !suspicious.suspicious,
  ];
  const enabledCount = features.filter(Boolean).length;
  const securityScore = Math.round((enabledCount / features.length) * 100);

  const scoreVariant = securityScore >= 80 ? 'success' : securityScore >= 50 ? 'warning' : 'danger';

  async function handle2faSetup() {
    setLoading('2fa-setup');
    try {
      const res = await fetch('/api/security/2fa/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.secret) setSetupData({ secret: data.secret, uri: data.uri });
    } finally {
      setLoading(null);
    }
  }

  async function handle2faVerify() {
    setLoading('2fa-verify');
    try {
      const res = await fetch('/api/security/2fa/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: verifyCode }) });
      const data = await res.json();
      if (data.backupCodes) {
        setBackupCodes(data.backupCodes);
        setSetupData(null);
        setVerifyCode('');
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  async function handle2faDisable() {
    setLoading('2fa-disable');
    try {
      await fetch('/api/security/2fa/disable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: disableCode || undefined }) });
      setDisableCode('');
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleRegenerateBackupCodes() {
    setLoading('backup-regen');
    try {
      const res = await fetch('/api/security/2fa/backup-codes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: verifyCode }) });
      const data = await res.json();
      if (data.codes) setBackupCodes(data.codes);
    } finally {
      setLoading(null);
    }
  }

  async function handleKeyRegister() {
    setLoading('key-register');
    try {
      const res = await fetch('/api/security/security-keys/register', { method: 'POST' });
      const challenge = await res.json();
      // In a real app, this would call navigator.credentials.create() here
      // For now, simulate a response
      const verifyRes = await fetch('/api/security/security-keys/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId: `sim_${Date.now()}`,
          publicKey: `sim_pub_${Date.now()}`,
          name: keyName || `Security Key ${securityKeys.length + 1}`,
        }),
      });
      await verifyRes.json();
      setKeyName('');
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleKeyRemove(credentialId: string) {
    setLoading(`key-remove-${credentialId}`);
    try {
      await fetch(`/api/security/security-keys/${credentialId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleKeyRename(credentialId: string, name: string) {
    await fetch(`/api/security/security-keys/${credentialId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    router.refresh();
  }

  async function handleSsoCreate() {
    setLoading('sso-create');
    try {
      await fetch('/api/security/sso/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: ssoProvider,
          name: ssoName,
          domains: ssoDomains.split(',').map((d) => d.trim()).filter(Boolean),
          metadataUrl: ssoMetadataUrl || undefined,
        }),
      });
      setSsoName('');
      setSsoDomains('');
      setSsoMetadataUrl('');
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleSsoDelete(id: string) {
    setLoading(`sso-delete-${id}`);
    try {
      await fetch(`/api/security/sso/config/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleDownloadMetadata() {
    const res = await fetch('/api/security/sso/metadata');
    const xml = await res.text();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sp-metadata.xml';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSessionRevoke(id: string) {
    setLoading(`session-revoke-${id}`);
    try {
      await fetch(`/api/security/sessions/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleRevokeAll() {
    setLoading('revoke-all');
    try {
      await fetch('/api/security/sessions/revoke-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleTestPassword() {
    setLoading('test-password');
    try {
      const res = await fetch('/api/security/password/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: testPassword }),
      });
      const data = await res.json();
      setTestResult(data);
    } finally {
      setLoading(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const strengthVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
    weak: 'danger', fair: 'warning', good: 'info', strong: 'success',
  };

  return (
    <div className="space-y-6">
      {/* Security Score */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">Security Score</div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{securityScore}</div>
            <Badge variant={scoreVariant} className="text-xs">{securityScore >= 80 ? 'Strong' : securityScore >= 50 ? 'Fair' : 'Weak'}</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">2FA</div>
          <div className="text-2xl font-bold">{twoFactorStatus.enabled ? 'On' : 'Off'}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">Security Keys</div>
          <div className="text-2xl font-bold">{securityKeys.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">Active Sessions</div>
          <div className="text-2xl font-bold">{sessions.length}</div>
        </Card>
      </div>

      {/* Suspicious Activity Alert */}
      {suspicious.suspicious && (
        <Card className="p-4 border-warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium">Suspicious Activity Detected</h3>
              <ul className="mt-1 text-xs text-fg-secondary space-y-1">
                {suspicious.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* 2FA Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Two-Factor Authentication</h2>
            {twoFactorStatus.enabled && <Badge variant="success" className="text-xs">Enabled</Badge>}
          </div>
        </div>
        <Card className="p-4">
          {!twoFactorStatus.enabled && !setupData && (
            <div>
              <p className="text-sm text-fg-secondary mb-3">Add an extra layer of security to your account with TOTP-based 2FA.</p>
              <Button variant="primary" onClick={handle2faSetup} disabled={loading === '2fa-setup'}>
                <Plus className="h-4 w-4" /> Set Up 2FA
              </Button>
            </div>
          )}
          {setupData && (
            <div className="space-y-3">
              <p className="text-sm text-fg-secondary">Scan this URI with your authenticator app (e.g. Google Authenticator, Authy):</p>
              <div className="relative">
                <code className="block bg-fg-muted/10 rounded-lg p-3 text-xs break-all">{setupData.uri}</code>
                <Button variant="ghost" onClick={() => copyToClipboard(setupData.uri)} className="absolute top-2 right-2 text-xs">
                  <Copy className="h-3 w-3" /> Copy
                </Button>
              </div>
              <div>
                <label className="text-xs text-fg-secondary block mb-1">Secret (manual entry):</label>
                <code className="block bg-fg-muted/10 rounded-lg p-2 text-xs">{setupData.secret}</code>
              </div>
              <div>
                <label className="text-xs text-fg-secondary block mb-1">Enter verification code:</label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="123456"
                  className="input w-32 text-center"
                  maxLength={6}
                />
              </div>
              <Button variant="primary" onClick={handle2faVerify} disabled={loading === '2fa-verify' || !verifyCode}>
                Verify & Enable
              </Button>
            </div>
          )}
          {twoFactorStatus.enabled && (
            <div className="space-y-3">
              <p className="text-sm text-fg-secondary">
                2FA is enabled{twoFactorStatus.setupAt ? ` since ${new Date(twoFactorStatus.setupAt).toLocaleDateString()}` : ''}.
              </p>
              {backupCodes && (
                <div>
                  <label className="text-xs text-fg-secondary block mb-1">Backup Codes (save these!):</label>
                  <div className="grid grid-cols-2 gap-1 bg-fg-muted/10 rounded-lg p-3">
                    {backupCodes.map((c, i) => <code key={i} className="text-xs">{c}</code>)}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleRegenerateBackupCodes} disabled={loading === 'backup-regen'}>
                  <RefreshCw className="h-4 w-4" /> Regenerate Backup Codes
                </Button>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    placeholder="Code (optional)"
                    className="input w-32 text-xs"
                  />
                  <Button variant="danger" onClick={handle2faDisable} disabled={loading === '2fa-disable'}>
                    <Trash2 className="h-4 w-4" /> Disable
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Security Keys Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Security Keys</h2>
            <Badge variant="default" className="text-xs">{securityKeys.length}</Badge>
          </div>
        </div>
        <Card className="p-4">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key name (optional)"
              className="input flex-1 text-sm"
            />
            <Button variant="primary" onClick={handleKeyRegister} disabled={loading === 'key-register'}>
              <Plus className="h-4 w-4" /> Register New Key
            </Button>
          </div>
          {securityKeys.length === 0 ? (
            <div className="text-sm text-fg-secondary">No security keys registered.</div>
          ) : (
            <div className="space-y-2">
              {securityKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-fg-muted" />
                    <div>
                      <div className="text-sm font-medium">{key.name}</div>
                      <div className="text-xs text-fg-secondary">Added {new Date(key.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <Button variant="ghost" className="text-xs text-danger" onClick={() => handleKeyRemove(key.credentialId)} disabled={loading === `key-remove-${key.credentialId}`}>
                    <Trash2 className="h-3 w-3" /> Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* SSO Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Single Sign-On (SSO)</h2>
            <Badge variant="default" className="text-xs">{ssoConfigs.length}</Badge>
          </div>
          <Button variant="ghost" className="text-xs" onClick={handleDownloadMetadata}>
            <Download className="h-3 w-3" /> SP Metadata
          </Button>
        </div>
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <select value={ssoProvider} onChange={(e) => setSsoProvider(e.target.value)} className="input text-sm">
              <option value="saml">SAML</option>
              <option value="oidc">OIDC</option>
              <option value="google">Google</option>
              <option value="microsoft">Microsoft</option>
              <option value="okta">Okta</option>
              <option value="auth0">Auth0</option>
            </select>
            <input type="text" value={ssoName} onChange={(e) => setSsoName(e.target.value)} placeholder="Config name" className="input text-sm" />
            <input type="text" value={ssoDomains} onChange={(e) => setSsoDomains(e.target.value)} placeholder="Domains (comma-sep)" className="input text-sm" />
          </div>
          <div className="flex gap-2 mb-3">
            <input type="text" value={ssoMetadataUrl} onChange={(e) => setSsoMetadataUrl(e.target.value)} placeholder="Metadata URL (optional)" className="input flex-1 text-sm" />
            <Button variant="primary" onClick={handleSsoCreate} disabled={loading === 'sso-create' || !ssoName}>
              <Plus className="h-4 w-4" /> Add Config
            </Button>
          </div>
          {ssoConfigs.length === 0 ? (
            <div className="text-sm text-fg-secondary">No SSO configurations yet.</div>
          ) : (
            <div className="space-y-2">
              {ssoConfigs.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="info" className="text-xs">{c.provider}</Badge>
                    <div>
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-xs text-fg-secondary">{c.domains.join(', ') || 'No domains'}</div>
                    </div>
                  </div>
                  <Button variant="ghost" className="text-xs text-danger" onClick={() => handleSsoDelete(c.id)} disabled={loading === `sso-delete-${c.id}`}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Active Sessions Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Active Sessions</h2>
            <Badge variant="default" className="text-xs">{sessions.length}</Badge>
          </div>
          <Button variant="danger" className="text-xs" onClick={handleRevokeAll} disabled={loading === 'revoke-all' || sessions.length === 0}>
            Revoke All
          </Button>
        </div>
        {sessions.length === 0 ? (
          <Card className="p-6"><div className="text-sm text-fg-secondary">No active sessions.</div></Card>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const device = devices.find((d) => d.sessionId === s.id);
              return (
                <Card key={s.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-4 w-4 text-fg-muted" />
                    <div>
                      <div className="text-sm font-medium">
                        {device ? `${device.browser} on ${device.os}` : 'Unknown device'}
                      </div>
                      <div className="text-xs text-fg-secondary">
                        {device?.ipAddress || 'Unknown IP'} — Expires {new Date(s.expires).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" className="text-xs text-danger" onClick={() => handleSessionRevoke(s.id)} disabled={loading === `session-revoke-${s.id}`}>
                    <X className="h-3 w-3" /> Revoke
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Login History Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">Login History</h2>
        </div>
        {loginHistory.length === 0 ? (
          <Card className="p-6"><div className="text-sm text-fg-secondary">No login history.</div></Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-fg-secondary">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">IP Address</th>
                  <th className="text-left p-3">Device</th>
                  <th className="text-left p-3">Method</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="p-3 text-xs">{new Date(e.timestamp).toLocaleString()}</td>
                    <td className="p-3 text-xs">{e.ipAddress}</td>
                    <td className="p-3 text-xs">{e.userAgent}</td>
                    <td className="p-3 text-xs">{e.method}{e.twoFactorUsed && ' + 2FA'}</td>
                    <td className="p-3">
                      {e.success ? (
                        <Badge variant="success" className="text-xs"><Check className="h-3 w-3 inline" /> Success</Badge>
                      ) : (
                        <Badge variant="danger" className="text-xs"><X className="h-3 w-3 inline" /> Failed</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Password Policy Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Lock className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">Password Policy</h2>
        </div>
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-fg-secondary mb-1">Min Length</div>
              <div className="text-sm font-medium">{passwordPolicy.minLength} characters</div>
            </div>
            <div>
              <div className="text-xs text-fg-secondary mb-1">Expiry</div>
              <div className="text-sm font-medium">{passwordPolicy.expiryDays} days</div>
            </div>
            <div>
              <div className="text-xs text-fg-secondary mb-1">Requirements</div>
              <div className="text-sm font-medium">
                {[
                  passwordPolicy.requireUppercase && 'Uppercase',
                  passwordPolicy.requireLowercase && 'Lowercase',
                  passwordPolicy.requireNumber && 'Number',
                  passwordPolicy.requireSpecial && 'Special',
                ].filter(Boolean).join(', ')}
              </div>
            </div>
            <div>
              <div className="text-xs text-fg-secondary mb-1">Prevent Reuse</div>
              <div className="text-sm font-medium">Last {passwordPolicy.preventReuse} passwords</div>
            </div>
          </div>
          <div className="border-t pt-4">
            <label className="text-xs text-fg-secondary block mb-1">Password Strength Tester:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                placeholder="Enter a password to test"
                className="input flex-1 text-sm"
              />
              <Button variant="secondary" onClick={handleTestPassword} disabled={loading === 'test-password' || !testPassword}>
                Test
              </Button>
            </div>
            {testResult && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={strengthVariant[testResult.strength] || 'default'} className="text-xs">
                    {testResult.strength}
                  </Badge>
                  {testResult.valid ? (
                    <span className="text-xs text-success"><Check className="h-3 w-3 inline" /> Valid</span>
                  ) : (
                    <span className="text-xs text-danger"><X className="h-3 w-3 inline" /> Invalid</span>
                  )}
                </div>
                {testResult.errors.length > 0 && (
                  <ul className="text-xs text-danger space-y-1">
                    {testResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
