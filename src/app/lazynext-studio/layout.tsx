import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UGC Product Ad Studio — Lazynext',
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
