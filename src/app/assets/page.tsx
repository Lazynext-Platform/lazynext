'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Boxes, UserCircle, Palette, Plus, Pencil, Trash2, Loader2, X, Image as ImageIcon, Link2,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';

type Product = { id: string; name: string; description: string; imageUrl: string | null; sourceUrl: string | null; createdAt: string };
type Avatar = { id: string; name: string; description: string; imageUrl: string | null; createdAt: string };
type BrandKit = { id: string; name: string; logoUrl: string | null; colors: string[] | null; fontNote: string | null; toneNote: string | null; createdAt: string };

type Tab = 'products' | 'avatars' | 'brandKits';

const TABS: { key: Tab; icon: typeof Boxes }[] = [
  { key: 'products', icon: Boxes },
  { key: 'avatars', icon: UserCircle },
  { key: 'brandKits', icon: Palette },
];

// Read a File as a data URL.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read_failed'));
    r.readAsDataURL(file);
  });
}

export default function AssetsPage() {
  const { status } = useSession();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('products');
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="pt-6 pb-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('assets.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-fg-faint">{t('assets.subtitle')}</p>
        </div>

        {status === 'loading' ? (
          <div className="grid place-items-center py-32"><Loader2 className="h-7 w-7 animate-spin text-fg-faint" /></div>
        ) : status !== 'authenticated' ? (
          <div className="grid place-items-center gap-4 py-32 text-center">
            <div className="text-5xl">🔐</div>
            <p className="text-fg-faint">{t('assets.signInPrompt')}</p>
            <button onClick={() => setAuthOpen(true)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: '#0064d9' }}>{t('common.signIn')}</button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1">
              {TABS.map((tb) => {
                const Icon = tb.icon;
                const active = tab === tb.key;
                const label = tb.key === 'products' ? t('assets.tabProducts') : tb.key === 'avatars' ? t('assets.tabAvatars') : t('assets.tabBrandKits');
                return (
                  <button
                    key={tb.key}
                    onClick={() => setTab(tb.key)}
                    className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? 'bg-elevated text-fg' : 'text-fg-faint hover:text-fg-secondary'}`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                );
              })}
            </div>

            {tab === 'products' && <ProductsPanel />}
            {tab === 'avatars' && <AvatarsPanel />}
            {tab === 'brandKits' && <BrandKitsPanel />}
          </>
        )}
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signin" />
    </div>
  );
}

// ── Shared image upload field ──
function ImageField({
  label, url, onChange, onError, t,
}: { label: string; url: string | null; onChange: (u: string | null) => void; onError: (m: string) => void; t: (k: string) => string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { onError(t('assets.uploadFailed')); return; }
    if (file.size > 8_000_000) { onError(t('assets.uploadFailed')); return; }
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const r = await fetch('/api/assets/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUrl }),
      });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error('upload_failed');
      onChange(j.url);
    } catch {
      onError(t('assets.uploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-fg-muted">{label}</label>
      <div className="flex items-center gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-black/30">
          {url ? <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" /> : <ImageIcon className="h-5 w-5 text-fg-placeholder" />}
        </div>
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-fg-secondary transition hover:bg-hover disabled:opacity-50">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {uploading ? t('assets.uploading') : url ? t('assets.edit') : t('common.new')}
          </button>
          {url && (
            <button type="button" onClick={() => onChange(null)} className="text-left text-[11px] text-fg-faint hover:text-danger transition">{t('assets.delete')}</button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
    </div>
  );
}

// ── Generic modal shell ──
function Modal({ title, onClose, children, saving, onSave, saveLabel, cancelLabel, savingLabel }: {
  title: string; onClose: () => void; children: React.ReactNode; saving: boolean; onSave: () => void; saveLabel: string; cancelLabel: string; savingLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 pt-safe" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-popover p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-fg">{title}</h2>
          <button onClick={onClose} className="text-fg-faint hover:text-fg" aria-label="close"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-fg-muted hover:text-fg transition">{cancelLabel}</button>
          <button onClick={onSave} disabled={saving} className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50" style={{ background: '#0064d9' }}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {saving ? savingLabel : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card shell ──
function Card({ children, onEdit, onDelete, t }: { children: React.ReactNode; onEdit: () => void; onDelete: () => void; t: (k: string) => string }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-line bg-black/30">
      {children}
      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
        <div className="flex gap-1">
          <button onClick={onEdit} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] text-fg-faint transition hover:bg-hover hover:text-fg" aria-label={t('assets.edit')}>
            <Pencil className="h-3.5 w-3.5" /> {t('assets.edit')}
          </button>
          <button onClick={onDelete} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] text-fg-faint transition hover:bg-danger/10 hover:text-danger" aria-label={t('assets.delete')}>
            <Trash2 className="h-3.5 w-3.5" /> {t('assets.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, hint, cta, onCta }: { icon: React.ReactNode; title: string; hint: string; cta: string; onCta: () => void }) {
  return (
    <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-line bg-hover px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface text-fg-faint">{icon}</div>
      <p className="max-w-sm text-sm font-medium text-fg-secondary">{title}</p>
      <p className="max-w-sm text-xs text-fg-faint">{hint}</p>
      <button onClick={onCta} className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: '#0064d9' }}>
        <Plus className="h-4 w-4" /> {cta}
      </button>
    </div>
  );
}

// ── Products panel ──
function ProductsPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState<Product[] | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setItems(null);
    try {
      const r = await fetch('/api/assets/products', { cache: 'no-store' });
      const j = await r.json();
      setItems(r.ok ? (j.products || []) : []);
    } catch { setItems([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function del(id: string) {
    if (!confirm(t('assets.deleteConfirm'))) return;
    setItems((p) => p?.filter((x) => x.id !== id) ?? null);
    try { await fetch(`/api/assets/products/${id}`, { method: 'DELETE' }); }
    catch { void load(); }
  }

  return (
    <PanelShell
      items={items}
      onAdd={() => setCreating(true)}
      addLabel={t('assets.addProduct')}
      empty={<EmptyState icon={<Boxes className="h-6 w-6" />} title={t('assets.productsEmpty')} hint={t('assets.productsEmptyHint')} cta={t('assets.addProduct')} onCta={() => setCreating(true)} />}
      renderCard={(p) => (
        <Card key={p.id} t={t} onEdit={() => setEditing(p)} onDelete={() => del(p.id)}>
          <div className="relative aspect-video w-full bg-black/40">
            {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" /> : <div className="grid h-full w-full place-items-center"><ImageIcon className="h-6 w-6 text-fg-placeholder" /></div>}
          </div>
          <div className="p-3">
            <div className="truncate text-sm font-semibold">{p.name}</div>
            <p className="mt-0.5 line-clamp-2 text-xs text-fg-faint">{p.description}</p>
            {p.sourceUrl && <div className="mt-1 flex items-center gap-1 text-[10px] text-fg-placeholder"><Link2 className="h-2.5 w-2.5" />{p.sourceUrl.replace(/^https?:\/\//, '').slice(0, 40)}</div>}
          </div>
        </Card>
      )}
    >
      {creating && <ProductForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); void load(); }} />}
      {editing && <ProductForm product={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
      {err && <div role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-danger/90 px-4 py-2 text-xs text-white">{err}</div>}
    </PanelShell>
  );
}

function ProductForm({ product, onClose, onSaved }: { product?: Product; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [imageUrl, setImageUrl] = useState<string | null>(product?.imageUrl || null);
  const [sourceUrl, setSourceUrl] = useState(product?.sourceUrl || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    if (!name.trim() || !description.trim()) { setErr(t('assets.saveFailed')); return; }
    setSaving(true); setErr('');
    try {
      const r = await fetch(product ? `/api/assets/products/${product.id}` : '/api/assets/products', {
        method: product ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, imageUrl, sourceUrl: sourceUrl || null }),
      });
      if (!r.ok) throw new Error();
      onSaved();
    } catch { setErr(t('assets.saveFailed')); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={product ? t('assets.editProduct') : t('assets.addProduct')} onClose={onClose} saving={saving} onSave={save} saveLabel={t('assets.save')} cancelLabel={t('assets.cancel')} savingLabel={t('assets.saving')}>
      <Field label={t('assets.productName')} value={name} onChange={setName} placeholder={t('assets.productNamePh')} />
      <TextareaField label={t('assets.productDesc')} value={description} onChange={setDescription} placeholder={t('assets.productDescPh')} />
      <ImageField label={t('assets.productImage')} url={imageUrl} onChange={setImageUrl} onError={setErr} t={t} />
      <Field label={t('assets.productSourceUrl')} value={sourceUrl} onChange={setSourceUrl} placeholder={t('assets.productSourceUrlPh')} />
      {err && <p role="alert" className="text-xs text-danger">{err}</p>}
    </Modal>
  );
}

// ── Avatars panel ──
function AvatarsPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState<Avatar[] | null>(null);
  const [editing, setEditing] = useState<Avatar | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setItems(null);
    try { const r = await fetch('/api/assets/avatars', { cache: 'no-store' }); const j = await r.json(); setItems(r.ok ? (j.avatars || []) : []); }
    catch { setItems([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function del(id: string) {
    if (!confirm(t('assets.deleteConfirm'))) return;
    setItems((p) => p?.filter((x) => x.id !== id) ?? null);
    try { await fetch(`/api/assets/avatars/${id}`, { method: 'DELETE' }); } catch { void load(); }
  }

  return (
    <PanelShell
      items={items}
      onAdd={() => setCreating(true)}
      addLabel={t('assets.addAvatar')}
      empty={<EmptyState icon={<UserCircle className="h-6 w-6" />} title={t('assets.avatarsEmpty')} hint={t('assets.avatarsEmptyHint')} cta={t('assets.addAvatar')} onCta={() => setCreating(true)} />}
      renderCard={(a) => (
        <Card key={a.id} t={t} onEdit={() => setEditing(a)} onDelete={() => del(a.id)}>
          <div className="relative aspect-square w-full bg-black/40">
            {a.imageUrl ? <img src={a.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" /> : <div className="grid h-full w-full place-items-center"><UserCircle className="h-7 w-7 text-fg-placeholder" /></div>}
          </div>
          <div className="p-3">
            <div className="truncate text-sm font-semibold">{a.name}</div>
            <p className="mt-0.5 line-clamp-2 text-xs text-fg-faint">{a.description}</p>
          </div>
        </Card>
      )}
    >
      {creating && <AvatarForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); void load(); }} />}
      {editing && <AvatarForm avatar={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
    </PanelShell>
  );
}

function AvatarForm({ avatar, onClose, onSaved }: { avatar?: Avatar; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(avatar?.name || '');
  const [description, setDescription] = useState(avatar?.description || '');
  const [imageUrl, setImageUrl] = useState<string | null>(avatar?.imageUrl || null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    if (!name.trim() || !description.trim()) { setErr(t('assets.saveFailed')); return; }
    setSaving(true); setErr('');
    try {
      const r = await fetch(avatar ? `/api/assets/avatars/${avatar.id}` : '/api/assets/avatars', {
        method: avatar ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, imageUrl }),
      });
      if (!r.ok) throw new Error();
      onSaved();
    } catch { setErr(t('assets.saveFailed')); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={avatar ? t('assets.editAvatar') : t('assets.addAvatar')} onClose={onClose} saving={saving} onSave={save} saveLabel={t('assets.save')} cancelLabel={t('assets.cancel')} savingLabel={t('assets.saving')}>
      <Field label={t('assets.avatarName')} value={name} onChange={setName} placeholder={t('assets.avatarNamePh')} />
      <TextareaField label={t('assets.avatarDesc')} value={description} onChange={setDescription} placeholder={t('assets.avatarDescPh')} />
      <ImageField label={t('assets.avatarImage')} url={imageUrl} onChange={setImageUrl} onError={setErr} t={t} />
      {err && <p role="alert" className="text-xs text-danger">{err}</p>}
    </Modal>
  );
}

// ── Brand kits panel ──
function BrandKitsPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState<BrandKit[] | null>(null);
  const [editing, setEditing] = useState<BrandKit | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setItems(null);
    try { const r = await fetch('/api/assets/brand-kits', { cache: 'no-store' }); const j = await r.json(); setItems(r.ok ? (j.brandKits || []) : []); }
    catch { setItems([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function del(id: string) {
    if (!confirm(t('assets.deleteConfirm'))) return;
    setItems((p) => p?.filter((x) => x.id !== id) ?? null);
    try { await fetch(`/api/assets/brand-kits/${id}`, { method: 'DELETE' }); } catch { void load(); }
  }

  return (
    <PanelShell
      items={items}
      onAdd={() => setCreating(true)}
      addLabel={t('assets.addBrandKit')}
      empty={<EmptyState icon={<Palette className="h-6 w-6" />} title={t('assets.brandKitsEmpty')} hint={t('assets.brandKitsEmptyHint')} cta={t('assets.addBrandKit')} onCta={() => setCreating(true)} />}
      renderCard={(b) => (
        <Card key={b.id} t={t} onEdit={() => setEditing(b)} onDelete={() => del(b.id)}>
          <div className="p-3">
            <div className="flex items-center gap-2">
              {b.logoUrl ? <img src={b.logoUrl} alt="" className="h-8 w-8 rounded object-contain" referrerPolicy="no-referrer" /> : <div className="grid h-8 w-8 place-items-center rounded bg-hover"><Palette className="h-4 w-4 text-fg-placeholder" /></div>}
              <div className="truncate text-sm font-semibold">{b.name}</div>
            </div>
            {b.colors && b.colors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {b.colors.map((c) => <span key={c} className="h-4 w-4 rounded border border-line" style={{ background: c }} title={c} />)}
              </div>
            )}
            {b.toneNote && <p className="mt-2 line-clamp-2 text-xs text-fg-faint">{b.toneNote}</p>}
            {b.fontNote && <p className="mt-1 line-clamp-1 text-[11px] text-fg-placeholder">{b.fontNote}</p>}
          </div>
        </Card>
      )}
    >
      {creating && <BrandKitForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); void load(); }} />}
      {editing && <BrandKitForm brandKit={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
    </PanelShell>
  );
}

function BrandKitForm({ brandKit, onClose, onSaved }: { brandKit?: BrandKit; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(brandKit?.name || '');
  const [logoUrl, setLogoUrl] = useState<string | null>(brandKit?.logoUrl || null);
  const [colors, setColors] = useState<string[]>(brandKit?.colors || []);
  const [colorInput, setColorInput] = useState('#00b2fc');
  const [fontNote, setFontNote] = useState(brandKit?.fontNote || '');
  const [toneNote, setToneNote] = useState(brandKit?.toneNote || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function addColor() {
    if (colors.includes(colorInput)) return;
    setColors((c) => [...c, colorInput].slice(0, 12));
  }

  async function save() {
    if (!name.trim()) { setErr(t('assets.saveFailed')); return; }
    setSaving(true); setErr('');
    try {
      const r = await fetch(brandKit ? `/api/assets/brand-kits/${brandKit.id}` : '/api/assets/brand-kits', {
        method: brandKit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, logoUrl, colors, fontNote: fontNote || null, toneNote: toneNote || null }),
      });
      if (!r.ok) throw new Error();
      onSaved();
    } catch { setErr(t('assets.saveFailed')); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={brandKit ? t('assets.editBrandKit') : t('assets.addBrandKit')} onClose={onClose} saving={saving} onSave={save} saveLabel={t('assets.save')} cancelLabel={t('assets.cancel')} savingLabel={t('assets.saving')}>
      <Field label={t('assets.brandKitName')} value={name} onChange={setName} placeholder={t('assets.brandKitNamePh')} />
      <ImageField label={t('assets.brandLogo')} url={logoUrl} onChange={setLogoUrl} onError={setErr} t={t} />
      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">{t('assets.brandColors')}</label>
        <div className="flex items-center gap-2">
          <input type="color" value={colorInput} onChange={(e) => setColorInput(e.target.value)} className="h-8 w-10 shrink-0 rounded border border-line bg-transparent" />
          <button type="button" onClick={addColor} className="rounded-lg border border-line px-3 py-1.5 text-xs text-fg-secondary hover:bg-hover">{t('assets.brandColorAdd')}</button>
        </div>
        {colors.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {colors.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-1 text-[11px] text-fg-secondary">
                <span className="h-3.5 w-3.5 rounded" style={{ background: c }} /> {c}
                <button type="button" onClick={() => setColors((p) => p.filter((x) => x !== c))} aria-label="remove color" className="p-0.5 text-fg-placeholder hover:text-danger"><X className="h-3.5 w-3.5" /></button>
              </span>
            ))}
          </div>
        )}
      </div>
      <Field label={t('assets.brandFont')} value={fontNote} onChange={setFontNote} placeholder={t('assets.brandFontPh')} />
      <TextareaField label={t('assets.brandTone')} value={toneNote} onChange={setToneNote} placeholder={t('assets.brandTonePh')} />
      {err && <p role="alert" className="text-xs text-danger">{err}</p>}
    </Modal>
  );
}

// ── Shared small field components ──
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-fg-muted">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus:border-[#00b2fc]/50 focus:outline-none" />
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-fg-muted">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
        className="w-full resize-y rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus:border-[#00b2fc]/50 focus:outline-none" />
    </div>
  );
}

// ── Grid shell with header + add button + loading/empty states ──
function PanelShell<T>({ items, onAdd, addLabel, empty, renderCard, children }: {
  items: T[] | null; onAdd: () => void; addLabel: string; empty: React.ReactNode; renderCard: (item: T) => React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-fg-faint">{items ? items.length : '…'}</span>
        <button onClick={onAdd} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-white transition hover:brightness-110" style={{ background: '#0064d9' }}>
          <Plus className="h-4 w-4" /> {addLabel}
        </button>
      </div>
      {items === null ? (
        <div className="grid place-items-center py-24"><Loader2 className="h-7 w-7 animate-spin text-fg-faint" /></div>
      ) : items.length === 0 ? (
        empty
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(renderCard)}
        </div>
      )}
      {children}
    </div>
  );
}
