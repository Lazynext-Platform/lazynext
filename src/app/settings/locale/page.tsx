import { Globe } from 'lucide-react';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { LocaleSettings } from '@/components/settings/LocaleSettings';

export const dynamic = 'force-dynamic';

export default async function LocaleSettingsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><a href="/login" className="btn-primary">Sign in</a></div>;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { locale: true, country: true, currency: true },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-8">
        <Globe className="h-6 w-6" />
        <h1 className="heading-display text-2xl">Language & Region</h1>
      </div>
      <LocaleSettings
        userLocale={user?.locale || 'en'}
        userCountry={user?.country || ''}
      />
    </div>
  );
}
