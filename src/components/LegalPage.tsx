import Link from 'next/link';
import type { Metadata } from 'next';

export interface LegalSection {
  title: string;
  body?: string;
  list?: string[];
}

export interface LegalPageProps {
  title: string;
  description: string;
  lastUpdated?: string;
  sections: LegalSection[];
  legalNav?: boolean;
}

export function LegalPage({ title, description, lastUpdated, sections, legalNav = true }: LegalPageProps) {
  return (
    <div className="min-h-screen text-fg bg-app">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="heading-display text-3xl tracking-tight sm:text-4xl">{title}</h1>
        {lastUpdated && <p className="mt-2 text-sm text-fg-faint">{lastUpdated}</p>}
        <p className="mt-4 text-sm text-fg-secondary">{description}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-fg-secondary">
          {sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-fg">{section.title}</h2>
              {section.body && <p className="mt-3">{section.body}</p>}
              {section.list && (
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {section.list.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        {legalNav && <LegalFooter />}
      </div>
    </div>
  );
}

export function LegalFooter() {
  const links = [
    { href: '/terms', label: 'Terms' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/cookies', label: 'Cookies' },
    { href: '/acceptable-use', label: 'Acceptable Use' },
    { href: '/ai-policy', label: 'AI Policy' },
    { href: '/api-terms', label: 'API Terms' },
    { href: '/dpa', label: 'DPA' },
    { href: '/subprocessors', label: 'Subprocessors' },
    { href: '/security', label: 'Security' },
    { href: '/data-request', label: 'Data Request' },
  ];

  return (
    <div className="mt-16 pt-8 border-t-2" style={{ borderColor: 'var(--c-ink)' }}>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-xs text-fg-faint hover:text-fg transition">
            {link.label}
          </Link>
        ))}
      </div>
      <div className="mt-4">
        <Link href="/" className="text-sm text-fg-faint hover:text-fg transition">← Back to Lazynext</Link>
      </div>
    </div>
  );
}

export function makeMetadata(title: string, description: string): Metadata {
  return { title, description, referrer: 'no-referrer' };
}
