'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import type { CreditPack } from '@/config/pricing';
import { CURRENCIES, displayPrice } from '@/config/pricing';
import { useI18n } from '@/i18n/provider';
import { formatNumber } from '@/lib/i18n-format';
import { Check, Coins, Loader2, Gift, DollarSign } from 'lucide-react';

export default function PricingClient({
  packs,
  mode,
}: {
  packs: CreditPack[];
  mode: 'checkout' | 'redeem';
}) {
  const { data: session } = useSession();
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // ── Currency switcher: read from cookie (set by geo-detection layer) ──
  const [currency, setCurrency] = useState<string>('USD');
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)currency=([^;]+)/);
    if (match) setCurrency(decodeURIComponent(match[1]));
  }, []);
  function changeCurrency(c: string) {
    setCurrency(c);
    document.cookie = `currency=${c}; path=/; max-age=31536000; samesite=lax`;
  }

  async function buy(packId: string) {
    if (!session) return signIn('google');
    setMsg(null);
    setBusy(packId);
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.url) {
        window.location.href = j.url;
        return;
      }
      console.error('[pricing] checkout failed:', j);
      setMsg({
        text: t('pricing.checkoutFailed', { error: `${j.error || 'unknown'}${j.detail ? ' — ' + String(j.detail).slice(0, 200) : ''}` }),
        ok: false,
      });
    } catch (e) {
      setMsg({ text: t('pricing.networkError', { error: String(e) }), ok: false });
    } finally {
      setBusy(null);
    }
  }

  async function redeem() {
    if (!session) return signIn('google');
    setMsg(null);
    setBusy('redeem');
    try {
      const r = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        setMsg({ text: t('pricing.added', { n: j.amount }), ok: true });
        setCode('');
        window.dispatchEvent(new Event('lazynext:credits'));
      } else {
        setMsg({ text: t('pricing.redeemFailed', { error: j.error || 'invalid code' }), ok: false });
      }
    } catch (e) {
      setMsg({ text: t('pricing.networkError', { error: String(e) }), ok: false });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen text-[#f7f7f8]" style={{ backgroundColor: '#131416', colorScheme: 'dark' }}>
      {/* Top bar: only left-side logo + back, right side reserved for Shell's fixed area (balance/language/user/deploy), to avoid overlap */}
      <div className="px-6 sm:px-8 py-5">
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lazynext-mark.png" alt="Lazynext" className="h-7 w-7 rounded-lg" />
            <b className="text-sm tracking-tight">Lazynext</b>
          </a>
          <a href="/" className="text-xs text-white/60 hover:text-white transition">{t('pricing.allApps')}</a>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-24 space-y-8">
        <div className="text-center pt-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('pricing.title')}</h1>
          <p className="mt-3 text-white/50">{t('pricing.subtitle')}</p>

          {/* ── Currency switcher ── */}
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <DollarSign className="h-4 w-4 text-white/50" />
            <select
              aria-label="Currency"
              value={currency}
              onChange={(e) => changeCurrency(e.target.value)}
              className="cursor-pointer appearance-none bg-transparent text-sm font-medium text-white outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-neutral-900 text-white">
                  {c.symbol} {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {msg && (
          <p className={`text-center text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>
        )}

        <div className="grid gap-6 sm:grid-cols-3">
          {packs.map((p) => {
            const dp = displayPrice(p.priceUsd, currency);
            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border p-7 ${p.highlight ? 'border-[#00b2fc] ring-2 ring-[#00b2fc]/40 bg-white/[0.04]' : 'border-white/[0.08] bg-white/[0.03]'}`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-lg" style={{ background: '#00b2fc' }}>
                    {t('pricing.popular')}
                  </span>
                )}
                <div className="text-sm font-medium text-white/50">{p.name}</div>
                <div className="mt-2 text-4xl font-bold">
                  {dp.symbol}{dp.formatted}
                </div>
                <div className="mt-1 text-xs text-white/40">
                  {currency === 'USD' ? '' : `≈ $${p.priceUsd} USD`}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-sm font-medium" style={{ color: '#22d3ee' }}>
                  <Coins className="h-4 w-4" />
                  {formatNumber(p.credits, locale)} {t('pricing.credits')}
                </div>
                <ul className="mt-5 space-y-2 text-sm text-white/60">
                  <li className="flex gap-2"><Check className="h-4 w-4 shrink-0" style={{ color: '#00b2fc' }} />~{formatNumber(Math.floor(p.credits / 5), locale)}{t('pricing.featGen')}</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 shrink-0" style={{ color: '#00b2fc' }} />{t('pricing.featApps')}</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 shrink-0" style={{ color: '#00b2fc' }} />{t('pricing.featExpire')}</li>
                </ul>
                {mode === 'checkout' && (
                  <button
                    onClick={() => buy(p.id)}
                    disabled={busy === p.id}
                    className="mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                    style={{ background: p.highlight ? '#00b2fc' : 'rgba(255,255,255,0.08)' }}
                  >
                    {busy === p.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t('pricing.buy')}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {mode === 'redeem' && (
          <div className="mx-auto max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'rgba(0,178,252,0.15)' }}>
              <Gift className="h-5 w-5" style={{ color: '#00b2fc' }} />
            </span>
            <h2 className="mt-3 font-semibold">{t('pricing.redeemTitle')}</h2>
            <p className="mb-4 mt-1 text-sm text-white/50">{t('pricing.redeemDesc')}</p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ATLAS-XXXX-XXXX"
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#00b2fc] focus:ring-1 focus:ring-[#00b2fc]"
              />
              <button onClick={redeem} disabled={busy === 'redeem' || !code} className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50" style={{ background: '#00b2fc' }}>
                {busy === 'redeem' ? <Loader2 className="h-4 w-4 animate-spin" /> : t('pricing.redeem')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
