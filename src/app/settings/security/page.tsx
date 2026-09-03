import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { Lock } from 'lucide-react';
import { SecuritySettings } from '@/components/settings/SecuritySettings';

export const dynamic = 'force-dynamic';

export default async function SecuritySettingsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><a href="/login" className="btn-primary">Sign in</a></div>;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true, mfaEnabled: true },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-8">
        <Lock className="h-6 w-6" />
        <h1 className="heading-display text-2xl">Security</h1>
      </div>
      <SecuritySettings hasPassword={!!user?.password} mfaEnabled={!!user?.mfaEnabled} />
    </div>
  );
}
