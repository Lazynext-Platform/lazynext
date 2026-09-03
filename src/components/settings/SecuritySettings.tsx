'use client';

import { useState } from 'react';
import { Lock, Key, Shield, AlertCircle, Loader2, Check, Trash2, AlertTriangle, Download } from 'lucide-react';
import { Card, Button, Input, Badge } from '@/components/ui';

export function SecuritySettings({ hasPassword, mfaEnabled }: { hasPassword: boolean; mfaEnabled: boolean }) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // MFA state
  const [mfaEnabledState, setMfaEnabledState] = useState(mfaEnabled);
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState('');
  const [mfaDisableCode, setMfaDisableCode] = useState('');
  const [mfaDisabling, setMfaDisabling] = useState(false);

  // Session revocation state
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [sessionRevoked, setSessionRevoked] = useState(false);

  async function setupMFA() {
    setMfaLoading(true);
    setMfaError('');
    setMfaSuccess('');
    try {
      const res = await fetch('/api/mfa/setup', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to setup MFA');
      }
      const data = await res.json();
      setMfaSetupData(data);
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'Failed to setup MFA');
    } finally {
      setMfaLoading(false);
    }
  }

  async function verifyMFA(e: React.FormEvent) {
    e.preventDefault();
    setMfaLoading(true);
    setMfaError('');
    setMfaSuccess('');
    try {
      const res = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid code');
      }
      setMfaEnabledState(true);
      setMfaSetupData(null);
      setMfaCode('');
      setMfaSuccess('Two-factor authentication enabled successfully.');
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setMfaLoading(false);
    }
  }

  async function disableMFA(e: React.FormEvent) {
    e.preventDefault();
    setMfaDisabling(true);
    setMfaError('');
    setMfaSuccess('');
    try {
      const res = await fetch('/api/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaDisableCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid code');
      }
      setMfaEnabledState(false);
      setMfaDisableCode('');
      setMfaSuccess('Two-factor authentication disabled.');
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setMfaDisabling(false);
    }
  }

  async function revokeAllSessions() {
    setRevokingSessions(true);
    try {
      const res = await fetch('/api/session/revoke-all', { method: 'POST' });
      if (res.ok) {
        setSessionRevoked(true);
        setMfaSuccess('All sessions revoked. You will be signed out on other devices.');
      }
    } catch {
      setMfaError('Failed to revoke sessions.');
    } finally {
      setRevokingSessions(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPass.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPass !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to change password');
      }
      setSuccess('Password changed successfully.');
      setCurrent('');
      setNewPass('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Password section */}
      <Card className="p-6">
        <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
          <Key className="h-5 w-5" /> Password
        </h2>
        {hasPassword ? (
          <form onSubmit={changePassword} className="flex flex-col gap-4">
            <div>
              <label className="label-mono block mb-1">Current password</label>
              <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
            </div>
            <div>
              <label className="label-mono block mb-1">New password</label>
              <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required autoComplete="new-password" placeholder="At least 8 characters" />
            </div>
            <div>
              <label className="label-mono block mb-1">Confirm new password</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
            </div>
            {error && <p className="text-sm text-danger flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {error}</p>}
            {success && <p className="text-sm text-success flex items-center gap-1"><Check className="h-3 w-3" /> {success}</p>}
            <Button type="submit" disabled={saving || !current || !newPass || !confirm}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Change password'}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-fg-secondary">
            Your account uses Google sign-in. No password is set.
          </p>
        )}
      </Card>

      {/* Two-factor authentication */}
      <Card className="p-6">
        <h2 className="heading-display text-lg mb-2 flex items-center gap-2">
          <Shield className="h-5 w-5" /> Two-factor authentication
        </h2>
        <p className="text-sm text-fg-secondary mb-4">
          Add an extra layer of security with an authenticator app (Google Authenticator, Authy, 1Password, etc.).
        </p>
        {mfaError && <p className="text-sm text-danger flex items-center gap-1 mb-3"><AlertCircle className="h-3 w-3" /> {mfaError}</p>}
        {mfaSuccess && <p className="text-sm text-success flex items-center gap-1 mb-3"><Check className="h-3 w-3" /> {mfaSuccess}</p>}
        {mfaEnabledState ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="success">Enabled</Badge>
              <span className="text-sm text-fg-secondary">Your account is protected with TOTP.</span>
            </div>
            <form onSubmit={disableMFA} className="flex flex-col gap-3">
              <div>
                <label className="label-mono block mb-1">Enter code to disable</label>
                <Input
                  type="text"
                  value={mfaDisableCode}
                  onChange={(e) => setMfaDisableCode(e.target.value)}
                  placeholder="123456"
                  required
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>
              <Button type="submit" variant="danger" disabled={mfaDisabling || !mfaDisableCode}>
                {mfaDisabling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disable 2FA'}
              </Button>
            </form>
          </div>
        ) : mfaSetupData ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm">Scan this QR code with your authenticator app, then enter the 6-digit code.</p>
            <div className="p-4 border-2 rounded-sm" style={{ borderColor: 'var(--c-ink)' }}>
              <p className="text-xs text-fg-muted mb-2">Secret (enter manually if QR scanning is unavailable):</p>
              <code className="block text-xs bg-bg-secondary p-2 rounded break-all">{mfaSetupData.secret}</code>
            </div>
            <form onSubmit={verifyMFA} className="flex flex-col gap-3">
              <div>
                <label className="label-mono block mb-1">Verification code</label>
                <Input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="123456"
                  required
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={mfaLoading || !mfaCode || mfaCode.length !== 6}>
                {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify and enable'}
              </Button>
            </form>
          </div>
        ) : (
          <Button onClick={setupMFA} disabled={mfaLoading}>
            {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Enable 2FA
          </Button>
        )}
      </Card>

      {/* Active sessions */}
      <Card className="p-6">
        <h2 className="heading-display text-lg mb-2 flex items-center gap-2">
          <Lock className="h-5 w-5" /> Active sessions
        </h2>
        <p className="text-sm text-fg-secondary mb-4">
          Revoke all active sessions across all devices. You will need to sign in again on every device.
        </p>
        {sessionRevoked && (
          <p className="text-sm text-success flex items-center gap-1 mb-3"><Check className="h-3 w-3" /> All sessions revoked successfully.</p>
        )}
        <div className="flex items-center gap-3 p-3 border-2 mb-4" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
          <div className="flex-1">
            <p className="text-sm font-semibold">Current session</p>
            <p className="text-xs text-fg-muted">This device</p>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
        <Button variant="danger" onClick={revokeAllSessions} disabled={revokingSessions}>
          {revokingSessions ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Revoke all other sessions'}
        </Button>
      </Card>

      {/* Data export (GDPR right to portability) */}
      <Card className="p-6">
        <h2 className="heading-display text-lg mb-2 flex items-center gap-2">
          <Download className="h-5 w-5" /> Export your data
        </h2>
        <p className="text-sm text-fg-secondary mb-4">
          Download a copy of all your personal data including projects, tasks, documents,
          creative work, and account information (JSON format).
        </p>
        <Button
          onClick={() => { window.open('/api/settings/export', '_blank'); }}
        >
          <Download className="h-4 w-4" /> Download data export
        </Button>
      </Card>

      {/* Delete account (GDPR right to erasure) */}
      <Card className="p-6" style={{ borderColor: 'var(--c-danger)' }}>
        <h2 className="heading-display text-lg mb-2 flex items-center gap-2" style={{ color: 'var(--c-danger)' }}>
          <Trash2 className="h-5 w-5" /> Delete account
        </h2>
        <p className="text-sm text-fg-secondary mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        {!deleteConfirm ? (
          <Button variant="danger" onClick={() => setDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4" /> Delete my account
          </Button>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2 p-3 border-2" style={{ borderColor: 'var(--c-danger)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--c-danger-soft, transparent)' }}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--c-danger)' }} />
              <p className="text-sm">
                This will permanently delete all your projects, tasks, documents, conversations,
                creative work, and account data. This cannot be undone.
              </p>
            </div>
            {hasPassword && (
              <div>
                <label className="label-mono block mb-1">Enter your password to confirm</label>
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Your password"
                />
              </div>
            )}
            {deleteError && <p className="text-sm text-danger flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {deleteError}</p>}
            <div className="flex items-center gap-3">
              <Button
                variant="danger"
                onClick={async () => {
                  setDeleting(true);
                  setDeleteError('');
                  try {
                    const res = await fetch('/api/settings/account', {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ password: deletePassword || undefined }),
                    });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      throw new Error(data.error || 'Failed to delete account');
                    }
                    // Full page reload after account deletion — the session
                    // cookie is gone and all client state must be cleared.
                    // router.push() would keep stale session in memory.
                    window.location.replace('/');
                  } catch (err) {
                    setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting || (hasPassword && !deletePassword)}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm permanent deletion'}
              </Button>
              <Button variant="ghost" onClick={() => { setDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
