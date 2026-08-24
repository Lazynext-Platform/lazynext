import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ad Skit — Lazynext',
};

export default function AdSkitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
