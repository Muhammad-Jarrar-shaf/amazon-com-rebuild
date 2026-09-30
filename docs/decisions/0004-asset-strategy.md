# ADR-0004: Asset strategy

- **Status:** Accepted (2026-09-30). Replaces the earlier "about 40 product photographs" idea.
- **Context:** Visual quality matters, but sourcing dozens of photographs is a time sink and every asset must be legally usable. Amazon's own images and logos must not be used.
- **Decision:**
  - **Tier A (demo journey, about 8-10 products):** real photographs licensed for reuse (Unsplash/Pexels license) covering the products the walkthrough touches, with 2-3 images (variant colors) for the hero product. Pre-sized to <=1200px WebP and stored in `public/products/`.
  - **Tier B (supporting catalog, about 20 products):** no downloads. A single `ProductImage` component renders a coherent generated illustration (category glyph on a brand-tinted gradient), so the catalog looks deliberate. The same component is the fallback when a photo fails to load (FR-ERR-3).
  - **Wordmark and icons:** our own text/SVG; no Amazon-hosted or Amazon-derived assets, no hotlinking, no external image hosts at runtime.
  - **Provenance:** each downloaded file gets a row in `public/products/CREDITS.md` (source URL, license, date) at download time. If a license cannot be confirmed, the asset is not used.
  - **Time cap:** 45 minutes total for sourcing and preparing all photographs, inside slice S2.
- **Consequences:** Small, reviewable asset set; no dependency on runtime image optimization (static files) or third-party image hosts; some catalog items are illustrated rather than photographic, by design.
- **Alternatives rejected:** ~40 photographs (time); hotlinking stock sites (availability and license drift); AI-generated photos without provenance (license ambiguity); Amazon images (legal risk, NFR-SEC-2).
