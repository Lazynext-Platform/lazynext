'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X, ArrowRight, ArrowLeft, Sparkles, Clapperboard, Gift, Scissors,
  BarChart3, Megaphone, Target, Check, Rocket,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

const ONBOARDED_KEY = 'lazynext-onboarded';

export function OnboardingModal() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<string>('');

  useEffect(() => {
    try {
      const done = localStorage.getItem(ONBOARDED_KEY);
      if (!done) setOpen(true);
    } catch { /* ignore */ }
  }, []);

  const close = () => {
    try { localStorage.setItem(ONBOARDED_KEY, '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  if (!open) return null;

  const goals = [
    { id: 'ugc', icon: Clapperboard, label: t('onboarding.goalUgc'), desc: t('onboarding.goalUgcDesc'), href: '/lazynext-studio' },
    { id: 'concepts', icon: Sparkles, label: t('onboarding.goalConcepts'), desc: t('onboarding.goalConceptsDesc'), href: '/brand-concepts' },
    { id: 'creators', icon: Gift, label: t('onboarding.goalCreators'), desc: t('onboarding.goalCreatorsDesc'), href: '/creator-kits' },
    { id: 'edit', icon: Scissors, label: t('onboarding.goalEdit'), desc: t('onboarding.goalEditDesc'), href: '/clip-editor' },
    { id: 'analytics', icon: BarChart3, label: t('onboarding.goalAnalytics'), desc: t('onboarding.goalAnalyticsDesc'), href: '/performance' },
    { id: 'publish', icon: Megaphone, label: t('onboarding.goalPublish'), desc: t('onboarding.goalPublishDesc'), href: '/publish' },
  ];

  const selectedGoal = goals.find((g) => g.id === goal);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('onboarding.title')}
      onClick={close}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          className="absolute right-4 top-4 text-fg-muted hover:text-fg"
          aria-label={t('onboarding.skip')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'rgba(0,178,252,0.15)', color: 'var(--color-brand-accent)' }}>
                <Rocket className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-lg font-bold">{t('onboarding.welcome')}</h2>
                <p className="text-xs text-fg-muted">{t('onboarding.welcomeSub')}</p>
              </div>
            </div>
            <p className="text-sm text-fg-muted">{t('onboarding.intro')}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border bg-bg-secondary p-3">
                <Target className="w-4 h-4 text-brand-accent mb-1" />
                <p className="font-medium">{t('onboarding.feature1Title')}</p>
                <p className="text-fg-faint mt-0.5">{t('onboarding.feature1Desc')}</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-secondary p-3">
                <Sparkles className="w-4 h-4 text-brand-accent mb-1" />
                <p className="font-medium">{t('onboarding.feature2Title')}</p>
                <p className="text-fg-faint mt-0.5">{t('onboarding.feature2Desc')}</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-secondary p-3">
                <BarChart3 className="w-4 h-4 text-brand-accent mb-1" />
                <p className="font-medium">{t('onboarding.feature3Title')}</p>
                <p className="text-fg-faint mt-0.5">{t('onboarding.feature3Desc')}</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-secondary p-3">
                <Megaphone className="w-4 h-4 text-brand-accent mb-1" />
                <p className="font-medium">{t('onboarding.feature4Title')}</p>
                <p className="text-fg-faint mt-0.5">{t('onboarding.feature4Desc')}</p>
              </div>
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full rounded-lg bg-brand-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 flex items-center justify-center gap-2"
            >
              {t('onboarding.getStarted')} <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={close}
              className="w-full text-xs text-fg-muted hover:text-fg"
            >
              {t('onboarding.exploreOnOwn')}
            </button>
          </div>
        )}

        {/* Step 1: Goal selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold">{t('onboarding.question')}</h2>
              <p className="text-xs text-fg-muted mt-1">{t('onboarding.questionSub')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {goals.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                    goal === g.id
                      ? 'border-brand-accent bg-brand-accent/5'
                      : 'border-border bg-bg-secondary hover:border-brand-accent/40'
                  }`}
                >
                  <g.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${goal === g.id ? 'text-brand-accent' : 'text-fg-muted'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{g.label}</p>
                    <p className="text-xs text-fg-faint mt-0.5">{g.desc}</p>
                  </div>
                  {goal === g.id && <Check className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(0)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-hover flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> {t('onboarding.back')}
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!goal}
                className="flex-1 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {t('onboarding.next')} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Recommendation */}
        {step === 2 && selectedGoal && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'rgba(0,178,252,0.15)', color: 'var(--color-brand-accent)' }}>
                <selectedGoal.icon className="h-8 w-8" />
              </span>
              <h2 className="text-lg font-bold">{t('onboarding.recommendation')}</h2>
              <p className="text-sm text-fg-muted">{t('onboarding.recommendationSub')}</p>
            </div>
            <Link
              href={selectedGoal.href}
              onClick={close}
              className="block w-full rounded-lg bg-brand-accent px-4 py-3 text-sm font-medium text-white hover:opacity-90 text-center"
            >
              {selectedGoal.label} <ArrowRight className="inline w-4 h-4 ml-1" />
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/dashboard"
                onClick={close}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-center hover:bg-hover"
              >
                {t('onboarding.goDashboard')}
              </Link>
              <Link
                href="/pricing"
                onClick={close}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-center hover:bg-hover"
              >
                {t('onboarding.viewPricing')}
              </Link>
            </div>
            <button
              onClick={close}
              className="w-full text-xs text-fg-muted hover:text-fg"
            >
              {t('onboarding.done')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
