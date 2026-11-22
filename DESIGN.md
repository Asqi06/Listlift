# ListLift Design System — Editorial Commerce Ledger

## Visual World
Warm alabaster paper (`#FAF9F5`) with crisp white work surfaces (`#FFFFFF`), obsidian ink (`#111214`), warm stone hairline borders (`#E5E1D8`), and Forest Emerald (`#0B7A53`) strictly for verified proof, scores, and primary CTAs. Warm ochre (`#B45309` / `#FEF3C7`) signals keyword gaps and ungrounded claims. Dark mode uses refined obsidian (`#0D0F12` / `#14171C`).

## Typography
- Display accent: `Newsreader` (optical italic) paired with `Bricolage Grotesque` (600/700/800, `-0.03em` tracking)
- Body & UI: `DM Sans` (400/500/600)
- Measurements, SKUs, prices & scores: `IBM Plex Mono` with `font-variant-numeric: tabular-nums`

## Refusals (Enforced)
- No purple/blue gradients or radial glow blobs
- No kickers/eyebrows above headings or decorative section numbers
- No uniform icon+heading+text card grids or nested cards
- No animation on keyboard-initiated Command Palette (`Ctrl/Cmd+K`)
- Crisp 1.8px stroke SVGs instead of Unicode glyphs for UI icons

## Motion & Browser Surfaces
- Exponential ease-out (`cubic-bezier(0.19, 1, 0.22, 1)`) and tactile `:active { transform: scale(0.97) }`
- Single authored GSAP hero entrance (`gsap.matchMedia()` respecting `prefers-reduced-motion`)
- Native `@view-transition { navigation: auto; }` + pure CSS scroll-driven progress hairline
- Branded `::selection`, `caret-color`, `scrollbar-color`, and `text-underline-offset`
