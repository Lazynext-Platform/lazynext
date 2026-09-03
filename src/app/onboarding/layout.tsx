import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Onboarding — Lazynext',
  description: 'Set up your workspace and get started with Lazynext.',
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
