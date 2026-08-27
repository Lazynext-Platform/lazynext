'use client';

import { useEffect, useRef, useState } from 'react';
import { Boxes, ChevronDown, Loader2, Check } from 'lucide-react';

/**
 * Reusable dropdown that lets a user pick a saved product or avatar from their
 * asset library. Fetches from /api/assets/products or /api/assets/avatars.
 *
 * Usage:
 * <AssetPicker kind="product" onSelect={(url) => setProductAssets(...)} />
 * <AssetPicker kind="avatar" onSelect={(url) => setAvatarAsset(...)} />
 */
type AssetItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  description?: string | null;
};

export function AssetPicker({
  kind,
  onSelect,
  label,
  disabled,
}: {
  kind: 'product' | 'avatar';
  onSelect: (url: string, name: string, description?: string | null) => void;
  label: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AssetItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Calculate whether the dropdown should align right (to avoid right-edge overflow)
    // or left (to avoid left-edge clipping). The dropdown is 256px (w-64) wide.
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const dropdownWidth = 256;
      const spaceRight = window.innerWidth - rect.left;
      const spaceLeft = rect.right;
      // If opening to the right would overflow, and there's more space on the left, align right.
      setAlignRight(spaceRight < dropdownWidth && spaceLeft >= dropdownWidth);
    }
  }, [open]);

  useEffect(() => {
    if (!open || items !== null) return;
    setLoading(true);
    fetch(`/api/assets/${kind === 'product' ? 'products' : 'avatars'}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        const list = (j[kind === 'product' ? 'products' : 'avatars'] || []) as AssetItem[];
        setItems(list.filter((a) => !!a.imageUrl));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, kind, items]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hasItems = items !== null && items.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-fg-muted transition hover:bg-hover hover:text-fg-secondary disabled:opacity-30"
        title={label}
      >
        <Boxes className="h-3 w-3" />
        {label}
        <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && (
        <div role="listbox" className={`absolute ${alignRight ? 'right-0' : 'left-0'} top-full z-50 mt-1 max-h-64 w-64 max-w-[min(16rem,calc(100vw-1rem))] overflow-y-auto rounded-xl border border-line bg-popover p-1 shadow-2xl`}>
          {loading ? (
            <div className="grid place-items-center py-6"><Loader2 className="h-4 w-4 animate-spin text-fg-faint" /></div>
          ) : !hasItems ? (
            <div className="px-3 py-4 text-center text-[11px] text-fg-faint">No saved {kind === 'product' ? 'products' : 'avatars'} with images yet</div>
          ) : (
            items!.map((a) => (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => { onSelect(a.imageUrl!, a.name, a.description); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-hover"
              >
                {a.imageUrl ? (
                  <img src={a.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-8 w-8 shrink-0 rounded bg-elevated" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-fg-secondary">{a.name}</div>
                  {a.description && <div className="truncate text-[10px] text-fg-faint">{a.description}</div>}
                </div>
                <Check className="h-3 w-3 shrink-0 text-white/0" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
