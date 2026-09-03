'use client';

import { useState } from 'react';
import { Lock, Key, Shield, AlertCircle, Loader2, Check } from 'lucide-react';
import { Card, Button, Input, Badge } from '@/components/ui';

export function SecuritySettings({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

      {/* Two-factor auth (placeholder) */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="heading-display text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" /> Two-factor authentication
            </h2>
            <p className="text-sm text-fg-secondary mt-1">Add an extra layer of security to your account.</p>
          </div>
          <Badge>Coming soon</Badge>
        </div>
      </Card>

      {/* Active sessions (placeholder) */}
      <Card className="p-6">
        <h2 className="heading-display text-lg mb-2 flex items-center gap-2">
          <Lock className="h-5 w-5" /> Active sessions
        </h2>
        <p className="text-sm text-fg-secondary">Manage devices currently signed in to your account.</p>
        <div className="mt-4 flex items-center gap-3 p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
          <div className="flex-1">
            <p className="text-sm font-semibold">Current session</p>
            <p className="text-xs text-fg-muted">This device</p>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
      </Card>
    </div>
  );
}
