import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Status — Lazynext',
  description: 'Real-time platform health and service availability.',
  robots: { index: false, follow: false },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
