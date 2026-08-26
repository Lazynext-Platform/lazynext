import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin — Lazynext',
  referrer: 'no-referrer',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
