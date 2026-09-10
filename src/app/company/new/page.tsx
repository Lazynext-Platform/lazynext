import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Create Company — Lazynext',
  description: 'Create your company workspace.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { CompanyService } from '@/lib/services/company';
import { Card, Button } from '@/components/ui';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NewCompanyPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl">Create Your Company</h1>
        <p className="text-sm text-fg-secondary mt-1">
          Define your company. Lazynext will help you plan, execute, and grow it autonomously.
        </p>
      </div>

      <Card className="p-6">
        <form action={async (formData: FormData) => {
          'use server';
          const session = await auth().catch(() => null);
          if (!session?.user?.id) return;
          const name = (formData.get('name') as string)?.trim();
          if (!name) return;
          const { companyId } = await CompanyService.create(session.user.id, {
            name,
            description: (formData.get('description') as string)?.trim() || undefined,
            mission: (formData.get('mission') as string)?.trim() || undefined,
            vision: (formData.get('vision') as string)?.trim() || undefined,
            industry: (formData.get('industry') as string)?.trim() || undefined,
            website: (formData.get('website') as string)?.trim() || undefined,
            targetMarket: (formData.get('targetMarket') as string)?.trim() || undefined,
          });
          redirect('/company');
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company Name *</label>
            <input
              name="name"
              type="text"
              required
              maxLength={200}
              className="w-full rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm focus:border-accent-primary focus:outline-none"
              placeholder="Acme Inc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              maxLength={2000}
              rows={3}
              className="w-full rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm focus:border-accent-primary focus:outline-none"
              placeholder="What does your company do?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mission</label>
            <textarea
              name="mission"
              maxLength={2000}
              rows={2}
              className="w-full rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm focus:border-accent-primary focus:outline-none"
              placeholder="Why does your company exist?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Vision</label>
            <textarea
              name="vision"
              maxLength={2000}
              rows={2}
              className="w-full rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm focus:border-accent-primary focus:outline-none"
              placeholder="Where is your company going?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Industry</label>
              <input
                name="industry"
                type="text"
                maxLength={100}
                className="w-full rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm focus:border-accent-primary focus:outline-none"
                placeholder="SaaS, E-commerce, ..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input
                name="website"
                type="url"
                maxLength={500}
                className="w-full rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm focus:border-accent-primary focus:outline-none"
                placeholder="https://..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target Market</label>
            <input
              name="targetMarket"
              type="text"
              maxLength={1000}
              className="w-full rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm focus:border-accent-primary focus:outline-none"
              placeholder="Who are your customers?"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit">
              <Building2 className="h-4 w-4" /> Create Company
            </Button>
            <Button href="/company" variant="secondary">Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
