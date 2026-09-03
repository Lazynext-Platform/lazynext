import { auth } from '@/../auth';
import { Card } from '@/components/ui';
import { User } from 'lucide-react';
import { ProfileSettings } from '@/components/settings/ProfileSettings';

export const dynamic = 'force-dynamic';

export default async function ProfileSettingsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><a href="/login" className="btn-primary">Sign in</a></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-8">
        <User className="h-6 w-6" />
        <h1 className="heading-display text-2xl">Profile</h1>
      </div>
      <ProfileSettings
        initialName={session.user.name || ''}
        initialImage={session.user.image || null}
        email={session.user.email || ''}
      />
    </div>
  );
}
