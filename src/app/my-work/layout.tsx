import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Work — Lazynext',
};

export default function MyWorkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
