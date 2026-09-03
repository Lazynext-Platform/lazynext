# Neo-Brutalist Lazynext Design System

**Version:** 1.0.0
**Status:** Active — Phase 2 Foundation
**Spec basis:** Neo-Brutalist design principles (NN/G, neubrutalism.com, alexmayhew.dev)

---

## 1. Design Philosophy

> **Explicitness over subtlety. Personality over invisibility. Memorable structure over perfect polish.**

The Lazynext Neo-Brutalist system is deliberate, not careless. It uses brutalist elements — hard shadows, thick borders, flat color blocks — with thoughtful typography, intentional color, and careful usability. This is **not** raw/ugly brutalism; it is a productized, commercially usable design grammar built for a platform operating system that ships across 280px–2560px viewports.

### Core principles

1. **Borders are structural**, not subtle separators. A `2px` ink border defines every interactive and container surface.
2. **Shadows are hard offset** — `0 blur`, never soft. Shadows convey depth and press-state, not ambient lighting.
3. **No gradients. No glassmorphism. No `backdrop-filter`.** Flat colors only. Surfaces are opaque.
4. **Typography is the hierarchy.** Heavy display weights, uppercase mono labels, and a modular scale carry structure.
5. **Accessibility is non-negotiable.** Every primitive supports keyboard, themes, localization, and reduced motion.

---

## 2. Brand Analysis

### 2.1 Logo geometry

The Lazynext wordmark is set in `Archivo Black` (the display face) with tight tracking (`letter-spacing: -0.02em`). The geometric language is **rectilinear and blocky** — no rounded logomarks, no organic curves. The brand mark uses the same `2px` ink border and hard-shadow treatment as the component library, making the logo and the UI a single visual system.

### 2.2 Brand colors

| Role | Color | Hex |
|---|---|---|
| Signal accent | Hot red | `#ff2d2d` |
| Secondary accent | Electric blue | `#0066ff` |
| Ink (primary) | Pure black | `#0a0a0a` |
| Canvas (warm paper) | Warm off-white | `#f4f1ea` |

The hot-red accent is used **sparly** — for primary actions, active states, and critical signals. It never fills large background areas.

---

## 3. Design Tokens

### 3.1 Colors — Light theme

| Token | Value | Purpose |
|---|---|---|
| `--canvas` | `#f4f1ea` | Page background (warm paper) |
| `--ink` | `#0a0a0a` | Primary text, borders (pure black ink) |
| `--surface` | `#ffffff` | Card/panel background |
| `--surface-alt` | `#f0ede5` | Secondary surface |
| `--accent` | `#ff2d2d` | Signal accent (hot red — used sparingly) |
| `--accent-secondary` | `#0066ff` | Secondary accent (electric blue) |
| `--success` | `#0a7c2e` | Success state |
| `--warning` | `#b88600` | Warning state |
| `--danger` | `#c20a0a` | Error/destructive state |
| `--muted` | `#6b6b6b` | Secondary text |

### 3.2 Colors — Dark theme

| Token | Value | Purpose |
|---|---|---|
| `--canvas` | `#0a0a0a` | Page background |
| `--ink` | `#f4f1ea` | Primary text, borders (inverted) |
| `--surface` | `#161616` | Card/panel background |
| `--surface-alt` | `#1e1e1e` | Secondary surface |
| `--accent` | `#ff2d2d` | Signal accent (same) |
| `--accent-secondary` | `#3a8eff` | Secondary accent (brighter for dark) |
| `--success` | `#22c55e` | Success state (brighter) |
| `--warning` | `#eab308` | Warning state (brighter) |
| `--danger` | `#ef4444` | Error state (brighter) |
| `--muted` | `#999999` | Secondary text |

### 3.3 Semantic colors

Semantic tokens (`--success`, `--warning`, `--danger`) are the **only** colors used for state communication. They shift between themes to maintain WCAG 2.2 AA contrast against their surface. The accent colors are **never** used to convey success/failure — only red (`--danger`) signals destruction, and `--accent` signals the primary action.

### 3.4 Surfaces

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--canvas` | `#f4f1ea` | `#0a0a0a` | Page-level background |
| `--surface` | `#ffffff` | `#161616` | Cards, dialogs, dropdowns, inputs |
| `--surface-alt` | `#f0ede5` | `#1e1e1e` | Secondary panels, skeletons, table headers |

Surfaces are always opaque. No transparency, no alpha channels on backgrounds.

### 3.5 Borders

| Token | Value | Usage |
|---|---|---|
| `--border-width` | `2px` | Standard border |
| `--border-width-thick` | `3px` | Emphasized border (focus, dialog) |
| `--border-color` | `var(--ink)` | All borders use ink color |

All borders use the `--ink` color. There is no separate "border-muted" token — borders are always full-strength structural elements.

### 3.6 Typography

| Token | Value | Usage |
|---|---|---|
| `--font-display` | `"Archivo Black", "Inter", system-ui` | Headings, hero text |
| `--font-sans` | `"Inter", system-ui, -apple-system, sans-serif` | Body text |
| `--font-mono` | `"JetBrains Mono", "Space Mono", ui-monospace, monospace` | Labels, metadata, code, technical elements |

**Type scale (modular, 1.25 ratio):**

| Token | Size | Weight | Line height | Usage |
|---|---|---|---|---|
| `--text-xs` | 12px | 400 | 1.4 | Mono labels, metadata |
| `--text-sm` | 14px | 400 | 1.5 | Body small, captions |
| `--text-base` | 16px | 400 | 1.6 | Body |
| `--text-lg` | 18px | 600 | 1.5 | Subheadings |
| `--text-xl` | 20px | 700 | 1.4 | Section headings |
| `--text-2xl` | 24px | 700 | 1.3 | Page headings |
| `--text-3xl` | 30px | 800 | 1.2 | Hero heading |
| `--text-4xl` | 36px | 800 | 1.1 | Display heading |
| `--text-5xl` | 48px | 900 | 1.05 | Marketing display |

**Rules:**
- Headings: uppercase, tight tracking (`letter-spacing: -0.02em`), heavy weights.
- Mono labels: uppercase, `letter-spacing: 0.05em`, `--text-xs`.
- Body: clean sans-serif, comfortable line height.
- No gradients on text. No gradient text fills.

### 3.7 Spacing

4px base grid:

| Token | Value |
|---|---|
| `--space-0` | 0 |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |

### 3.8 Radii

| Token | Value | Usage |
|---|---|---|
| `--radius-none` | `0` | Default — square corners |
| `--radius-sm` | `2px` | Subtle rounding (inputs) |
| `--radius-md` | `4px` | Buttons, small cards |
| `--radius-pill` | `9999px` | Pills, badges, tags |

**Rule:** Default to square corners. Use `--radius-md` sparingly for interactive elements. Never use large radii (no `16px`+ rounding).

### 3.9 Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-hard` | `4px 4px 0 0 var(--ink)` | Standard hard offset shadow |
| `--shadow-hard-lg` | `6px 6px 0 0 var(--ink)` | Large hard shadow (hover/active) |
| `--shadow-hard-sm` | `2px 2px 0 0 var(--ink)` | Small hard shadow |
| `--shadow-none` | `none` | No shadow |

**No blur on shadows.** Shadows are hard offset (`0 blur`). No `box-shadow` with blur radius. No soft shadows.

### 3.10 Focus rings

Focus state = `--border-width-thick` (`3px`) + accent border color. No glow, no `box-shadow` ring, no `outline` halo. The focus is structural — the border itself thickens and changes color. This keeps focus visible without breaking the brutalist visual grammar.

### 3.11 Z-index

| Token | Value | Usage |
|---|---|---|
| `--z-base` | `0` | Normal flow |
| `--z-dropdown` | `100` | Menus, dropdowns |
| `--z-sticky` | `200` | Sticky headers, nav |
| `--z-overlay` | `300` | Dialog backdrop |
| `--z-dialog` | `400` | Dialog content |
| `--z-toast` | `500` | Toast stack |
| `--z-command` | `600` | Command palette |

### 3.12 Motion

| Token | Value | Usage |
|---|---|---|
| `--duration-fast` | `100ms` | Hover, focus |
| `--duration-normal` | `200ms` | Dialog open, tab switch |
| `--easing` | `cubic-bezier(0, 0, 0.2, 1)` | Standard |

**Rules:**
- Motion is restrained and functional.
- Button press: `transform: translate(2px, 2px)` + shadow removal, `--duration-fast`.
- Dialog: fade + slight translate, `--duration-normal`.
- No parallax. No float. No shimmer (unless reduced-motion is not requested).
- **`prefers-reduced-motion: reduce`** → all transitions set to `0ms`; no transforms.

### 3.13 Breakpoints

| Token | Value | Usage |
|---|---|---|
| `--breakpoint-xs` | `400px` | Small phones |
| `--breakpoint-sm` | `640px` | Large phones / small tablets |
| `--breakpoint-md` | `768px` | Tablets |
| `--breakpoint-lg` | `1024px` | Small laptops |
| `--breakpoint-xl` | `1280px` | Desktops |
| `--breakpoint-2xl` | `1536px` | Large desktops |

Max content width: `1200px` for app surfaces, `800px` for marketing prose. 12-column grid on desktop, fluid down to single column on mobile.

---

## 4. Theme Architecture

### 4.1 Light / Dark / System

The default theme is **system** — it detects the OS preference via `prefers-color-scheme`. Users can override to `light` or `dark` in Settings → Appearance. The preference is stored on the `User.theme` field (`light | dark | system`).

### 4.2 No-flash hydration

An inline pre-hydration script sets `data-theme` on `<html>` before React renders, reading the stored preference from the cookie. This prevents the flash-of-wrong-theme that occurs when theme is resolved post-hydration. The script is synchronous and runs in `<head>` before any visible content.

```html
<script>
  (function() {
    var t = document.cookie.match(/theme=([^;]+)/);
    var theme = t ? t[1] : 'system';
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

### 4.3 Token resolution

All design tokens are CSS custom properties scoped to `[data-theme="light"]` and `[data-theme="dark"]` selectors on `:root`. Components reference tokens via `var(--token)`, never hardcoded values. This makes theme switching a single attribute change with no JS recalculation.

---

## 5. Responsive System

### 5.1 Viewport range

All pages are tested across **280px–2560px** with no horizontal overflow. The 280px lower bound covers the narrowest foldable-phone inner screens; 2560px covers ultra-wide desktops.

### 5.2 Safe-area utilities

| Utility | Purpose |
|---|---|
| `pt-safe` | Padding-top with `env(safe-area-inset-top)` |
| `pb-safe` | Padding-bottom with `env(safe-area-inset-bottom)` |
| `safe-top` | `env(safe-area-inset-top)` |
| `safe-bottom` | `env(safe-area-inset-bottom)` |
| `safe-area` | Combined safe-area padding |

### 5.3 Touch and pointer

- Touch targets enlarged for coarse-pointer devices (minimum 44×44px).
- `touch-action: manipulation` on interactive elements to eliminate 300ms tap delay.
- Admin tables use `overflow-x-auto` containers for horizontal scrolling on narrow screens.

### 5.4 RTL support

RTL is supported via `dir="rtl"` and `lang="ar"`. Locale switching is cookie-based. All spacing and layout use logical properties (`padding-inline`, `margin-inline`) where supported, with fallbacks for the physical-property legacy code.

---

## 6. Accessibility Targets

### 6.1 WCAG 2.2 AA

All pages target **WCAG 2.2 AA** compliance. Accessibility is verified via axe-core in the Playwright E2E suite (see Testing Strategy in ARCHITECTURE.md).

| Criterion | Implementation |
|---|---|
| 1.4.3 Contrast (Minimum) | All text/surface pairs verified at 4.5:1 (normal) / 3:1 (large) |
| 1.4.11 Non-text Contrast | Borders and focus indicators at 3:1 minimum against adjacent colors |
| 2.1.1 Keyboard | Every interactive primitive is keyboard operable; focus traps in dialogs |
| 2.1.2 No Keyboard Trap | ESC closes dialogs/menus; focus returns to trigger |
| 2.4.7 Focus Visible | `3px` accent border focus state on all focusable elements |
| 2.5.8 Target Size (Minimum) | 44×44px minimum touch targets on coarse-pointer devices |
| 3.2.1 On Focus | No context change on focus alone |
| 4.1.2 Name, Role, Value | All primitives use semantic HTML + ARIA where needed |

### 6.2 Reduced motion

`prefers-reduced-motion: reduce` → all transitions set to `0ms`, no transforms, no shimmer. Skeleton loaders use static `--surface-alt` background with no animation.

---

## 7. Component Library Inventory

Each primitive supports: keyboard, themes, localization, accessibility, responsive.

| Primitive | Spec |
|---|---|
| **Button** | `--radius-md`, `2px` border, hard shadow on hover (`--shadow-hard` → `--shadow-hard-lg`), pressed state (shadow → `--shadow-none` + translate 2px), 3 variants (primary=accent bg, secondary=surface, danger=danger bg), disabled state (muted, no shadow) |
| **Input** | `2px` border, `--radius-sm`, transparent bg, focus state = `--border-width-thick` + accent border, no glow |
| **Card** | `--surface` bg, `2px` border, `--shadow-hard`, `--radius-md` |
| **Dialog** | Overlay = solid `--ink` at 80% opacity (no blur), dialog = `--surface` bg, `3px` border, `--shadow-hard-lg`, `--radius-md`, focus trap, ESC to close |
| **Toast** | `--surface` bg, `2px` border, `--shadow-hard`, `--radius-md`, top-right stack |
| **Badge/Pill** | `--radius-pill`, `2px` border, flat bg, mono uppercase label |
| **Table** | `2px` border between rows, no zebra striping, mono headers uppercase |
| **Nav** | Boxed items with `2px` border, active item = accent bg + ink text |
| **Tooltip** | `--ink` bg, `--canvas` text, `--radius-sm`, `2px` border, no shadow |
| **Tabs** | Boxed tabs with `2px` border, active = accent underline (3px) |
| **Switch** | Square toggle, `2px` border, on = accent bg, off = surface |
| **Checkbox** | Square, `2px` border, checked = accent bg + ink checkmark |
| **Menu/Dropdown** | `--surface` bg, `2px` border, `--shadow-hard`, `--radius-md` |
| **Command palette** | Dialog-style, mono search input, keyboard navigable results |
| **Skeleton** | `--surface-alt` bg, no shimmer animation (respect reduced motion) |
| **Empty state** | Large mono uppercase label, ink illustration (geometric), action button |

---

## 8. Grid & Layout

- 12-column grid on desktop, fluid down to single column on mobile.
- Standard breakpoints: `xs: 400px`, `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`.
- Max content width: `1200px` for app, `800px` for marketing prose.
- Visible structure: borders define sections, not whitespace alone.

---

*End of Design System specification.*
