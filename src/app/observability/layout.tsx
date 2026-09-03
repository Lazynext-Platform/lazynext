import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Observability — Lazynext',
  description: 'Platform metrics, logs, and operational telemetry.',
  robots: { index: false, follow: false },
};

export default function ObservabilityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
