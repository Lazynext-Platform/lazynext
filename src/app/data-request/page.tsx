'use client';

import { useState } from 'react';
import { Shield, Loader2, Check } from 'lucide-react';
import { Card, Button, Input, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { LegalFooter } from '@/components/LegalPage';

type RequestType = 'access' | 'correction' | 'deletion' | 'portability' | 'restriction' | 'objection';

const REQUEST_TYPES: { value: RequestType; label: string; description: string }[] = [
  { value: 'access', label: 'Access', description: 'Get a copy of your personal data' },
  { value: 'correction', label: 'Correction', description: 'Correct inaccurate personal data' },
  { value: 'deletion', label: 'Deletion', description: 'Delete your personal data and account' },
  { value: 'portability', label: 'Portability', description: 'Export your data in a portable format' },
  { value: 'restriction', label: 'Restriction', description: 'Restrict processing of your data' },
  { value: 'objection', label: 'Objection', description: 'Object to processing of your data' },
];

export default function DataRequestPage() {
  const { toast } = useToast();
  const [type, setType] = useState<RequestType>('access');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast('error', 'Email is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/data-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          email: email.trim(),
          name: name.trim(),
          details: details.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit request');
      }
      setSubmitted(true);
      toast('success', 'Data request submitted');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen text-fg bg-app">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <Card className="p-8 text-center">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border-2"
              style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
            >
              <Check className="h-6 w-6" />
            </div>
            <h1 className="heading-display text-2xl mb-2">Request Submitted</h1>
            <p className="text-sm text-fg-secondary mb-6">
              Your data request has been submitted. We will respond within 30 days at the email address you provided.
              A confirmation has been sent to {email}.
            </p>
            <Button onClick={() => { setSubmitted(false); setEmail(''); setName(''); setDetails(''); setType('access'); }}>
              Submit Another Request
            </Button>
          </Card>
          <div className="mt-8">
            <LegalFooter />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg bg-app">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-7 w-7" />
          <h1 className="heading-display text-3xl tracking-tight sm:text-4xl">Data Subject Request</h1>
        </div>
        <p className="text-sm text-fg-secondary mb-8">
          Exercise your data protection rights under GDPR, CCPA, and other applicable regulations.
        </p>

        {/* Self-service shortcuts */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-1">Export your data</h3>
            <p className="text-xs text-fg-secondary mb-3">Download all your personal data instantly (JSON).</p>
            <Button size="sm" onClick={() => window.open('/api/settings/export', '_blank')}>
              Download now
            </Button>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-1">Delete your account</h3>
            <p className="text-xs text-fg-secondary mb-3">Permanently erase your account and all data.</p>
            <Button size="sm" variant="danger" href="/settings/security">
              Go to account deletion
            </Button>
          </Card>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="p-6 space-y-6">
            <div>
              <label className="label-mono block mb-3">Request Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {REQUEST_TYPES.map((rt) => (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => setType(rt.value)}
                    className="p-3 text-left border-2 transition-colors"
                    style={{
                      borderColor: 'var(--c-ink)',
                      backgroundColor: type === rt.value ? 'var(--c-ink)' : 'var(--c-surface)',
                      color: type === rt.value ? 'var(--c-surface)' : 'var(--c-fg)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <p className="text-sm font-semibold">{rt.label}</p>
                    <p className="text-xs opacity-80 mt-1">{rt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label-mono block mb-2">Email Address *</label>
              <Input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-fg-muted mt-1">We will send our response to this address.</p>
            </div>

            <div>
              <label className="label-mono block mb-2">Full Name</label>
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="label-mono block mb-2">Details</label>
              <Textarea
                placeholder="Provide any additional details about your request (e.g., specific data to access or correct)..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
              />
            </div>

            <div className="p-3 border-2 text-xs text-fg-secondary" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
              <p>
                We will respond to your request within 30 days. For deletion requests, your account and all associated data
                will be permanently removed. This action cannot be undone.
              </p>
            </div>

            <Button type="submit" disabled={submitting || !email.trim()} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Request'}
            </Button>
          </Card>
        </form>

        <div className="mt-8">
          <LegalFooter />
        </div>
      </div>
    </div>
  );
}
