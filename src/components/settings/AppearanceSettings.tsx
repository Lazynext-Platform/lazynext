'use client';

import { Sun, Moon, Monitor, Palette, Check } from 'lucide-react';
import { Card } from '@/components/ui';
import { useTheme } from '@/lib/theme';

export function AppearanceSettings() {
  const { resolved, setTheme, selected } = useTheme();

  const themes = [
    { id: 'light' as const, label: 'Light', desc: 'Bright background with dark text', icon: Sun },
    { id: 'dark' as const, label: 'Dark', desc: 'Dark background with light text', icon: Moon },
    { id: 'system' as const, label: 'System', desc: 'Follow your device preference', icon: Monitor },
  ];

  const accents = [
    { id: 'default', label: 'Default', color: 'var(--c-accent)' },
    { id: 'blue', label: 'Blue', color: '#3b82f6' },
    { id: 'green', label: 'Green', color: '#22c55e' },
    { id: 'purple', label: 'Purple', color: '#a855f7' },
    { id: 'orange', label: 'Orange', color: '#f97316' },
    { id: 'pink', label: 'Pink', color: '#ec4899' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Theme selection */}
      <Card className="p-6">
        <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5" /> Theme
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => {
            const isActive = selected === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="p-4 border-2 text-center transition"
                style={{
                  borderColor: isActive ? 'var(--c-accent)' : 'var(--c-ink)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'var(--c-active)' : 'var(--c-surface)',
                  borderWidth: isActive ? 3 : 2,
                }}
              >
                <t.icon className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="text-xs text-fg-muted mt-1">{t.desc}</p>
                {isActive && (
                  <div className="mt-2 flex items-center justify-center">
                    <Check className="h-4 w-4" style={{ color: 'var(--c-accent)' }} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Accent color (display only — the theme system uses CSS vars) */}
      <Card className="p-6">
        <h2 className="heading-display text-lg mb-4">Accent color</h2>
        <div className="grid grid-cols-6 gap-3">
          {accents.map((a) => (
            <button
              key={a.id}
              className="flex flex-col items-center gap-2 p-2"
              onClick={() => {
                // In a full implementation, this would update the CSS variable
                document.documentElement.style.setProperty('--c-accent', a.color);
                localStorage.setItem('accent-color', a.id);
              }}
            >
              <div
                className="h-10 w-10 border-2 rounded-[var(--radius-sm)]"
                style={{ borderColor: 'var(--c-ink)', backgroundColor: a.color }}
              />
              <span className="text-xs">{a.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-fg-muted mt-3">Accent color is saved locally per device.</p>
      </Card>

      {/* Current theme info */}
      <Card className="p-6">
        <h2 className="heading-display text-lg mb-4">Preview</h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
            <div className="flex h-8 w-8 items-center justify-center border-2" style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-accent)', borderRadius: 'var(--radius-sm)' }}>
              <span className="text-xs font-bold" style={{ color: 'var(--c-accent-fg)' }}>L</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Lazynext</p>
              <p className="text-xs text-fg-muted">Current theme: {resolved}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 text-xs border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--c-accent)', color: 'var(--c-accent-fg)' }}>Primary button</span>
            <span className="px-3 py-1 text-xs border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--c-surface)' }}>Secondary</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
