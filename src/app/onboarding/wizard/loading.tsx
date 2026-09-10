export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-8">
          <span
            className="flex h-12 w-12 items-center justify-center border-2 text-xl font-black"
            style={{
              borderColor: 'var(--c-ink)',
              backgroundColor: 'var(--c-accent)',
              color: 'var(--c-accent-fg)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-hard)',
            }}
          >
            L
          </span>
          <span className="heading-display text-2xl">Lazynext</span>
        </div>
        <div className="border-[3px] bg-surface p-8" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-hard-lg)' }}>
          <div className="flex items-center justify-center gap-2 text-sm text-fg-muted">
            <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--c-accent)' }} />
            Loading onboarding wizard...
          </div>
        </div>
      </div>
    </div>
  );
}
