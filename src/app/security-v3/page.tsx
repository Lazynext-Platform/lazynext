import type { Metadata } from 'next';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security Center — Lazynext',
  description: 'Two-factor authentication, SSO, security keys, sessions, and password policy.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TwoFactorService } from '@/lib/services/two-factor-service';
import { SecurityKeyService } from '@/lib/services/security-key-service';
import { SsoService } from '@/lib/services/sso-service';
import { SessionManagementService } from '@/lib/services/session-management-service';
import { PasswordPolicyService } from '@/lib/services/password-policy-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { SecurityCenter } from './SecurityCenter';

export const dynamic = 'force-dynamic';

export default async function SecurityCenterPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const userId = session.user.id;
  const workspaces = await WorkspaceService.listForUser(userId);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Security Center</h1>
          <p className="text-sm text-fg-secondary mt-1">2FA, SSO, security keys, sessions, and password policy.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Shield}
            title="No workspace yet"
            description="Create a company first to access the security center."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [
    twoFactorStatus,
    securityKeys,
    ssoConfigs,
    sessions,
    devices,
    loginHistory,
    passwordPolicy,
    suspicious,
  ] = await Promise.all([
    TwoFactorService.getStatus(userId),
    SecurityKeyService.listKeys(userId),
    SsoService.listConfigs(organizationId),
    SessionManagementService.listSessions(userId),
    SessionManagementService.getActiveDevices(userId),
    SessionManagementService.getLoginHistory(userId, { limit: 20 }),
    PasswordPolicyService.getPolicyForOrg(organizationId),
    SessionManagementService.detectSuspiciousActivity(userId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Security Center</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">2FA, SSO, security keys, sessions, and password policy.</p>
      </div>

      <SecurityCenter
        organizationId={organizationId}
        twoFactorStatus={twoFactorStatus}
        securityKeys={securityKeys}
        ssoConfigs={ssoConfigs}
        sessions={sessions}
        devices={devices}
        loginHistory={loginHistory}
        passwordPolicy={passwordPolicy}
        suspicious={suspicious}
      />
    </div>
  );
}
