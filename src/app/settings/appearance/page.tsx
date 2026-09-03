import { Palette } from 'lucide-react';
import { auth } from '@/../auth';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';

export const dynamic = 'force-dynamic';

export default async function AppearanceSettingsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><a href="/login" className="btn-primary">Sign in</a></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-8">
        <Palette className="h-6 w-6" />
        <h1 className="heading-display text-2xl">Appearance</h1>
      </div>
      <AppearanceSettings />
    </div>
  );
}
