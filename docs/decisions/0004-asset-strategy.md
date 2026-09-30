# ADR-0004: Asset strategy

- **Status:** Accepted (2026-09-30). Replaces the earlier "about 40 product photographs" idea. **Implemented in S2 (2026-09-30)**; the as-built details, including where they differ from the original plan, are below.
- **Context:** Visual quality matters, but sourcing dozens of photographs is a time sink and every asset must be legally usable. Amazon's own images and logos must not be used.
- **Decision:**
  - **Tier A (demo journey, about 8-10 products):** real photographs licensed for reuse, covering the products the walkthrough touches, with several images for the hero product.
  - **Tier B (supporting catalog, about 20 products):** no downloads. A generated illustration (department glyph on a gradient tinted with the variant color), so the catalog looks deliberate. The same component is the fallback when a photo fails to load (FR-ERR-3).
  - **Wordmark and icons:** our own text/SVG; no Amazon-hosted or Amazon-derived assets, no hotlinking, no external image hosts at runtime.
  - **Provenance:** every downloaded file is credited (source URL, photographer, license, date). If a license cannot be confirmed, or a photo shows a visible third-party brand mark, the asset is not used.
  - **Time cap:** 45 minutes for sourcing and preparing all photographs, inside slice S2.
- **As built (S2):**
  - **13 photographs cover 9 Tier A products**, all from Unsplash (Pexels was not needed): the headphone hero (Midnight Black with a 3-image gallery, Space Silver, Sunset Rose), earbuds, laptop, keyboard, kettle, French press, book, wooden blocks and serum. The other 21 products use the generated illustration (`components/pdp/fallback-illustration.tsx`, rendered by `ProductImage`).
  - **Location:** files in `public/assets/products/*.webp` (1200 px, 23-419 KB, 1.4 MB total); credits in **`public/assets/CREDITS.md`** (the plan said `public/products/CREDITS.md`; the path was changed at the owner's request). A unit test (`lib/catalog/data.test.ts`) fails if a used file is uncredited, a file is unused, a path is not local, or any product data contains an external URL.
  - **License:** the Unsplash License page was read on 2026-09-30 (free use, commercial and non-commercial, no permission needed; not permitted: selling unmodified images or compiling images to replicate a competing service, neither of which applies). Each photo page was opened to confirm the "Free Photo" label (not Unsplash+) and the photographer.
  - **How obtained:** Unsplash blocks scripted access (its license page and search API returned an empty body and HTTP 429), so the search and photo pages were read in a browser session and each file was downloaded once from Unsplash's image CDN with `w=1200&q=80&fm=webp&fit=max` (resized and re-encoded by the CDN, no other modification).
  - **Rejected on inspection:** photos with a visible third-party brand mark, since the catalog's brands are fictional (a "SONY" logo on headphones and on a speaker strap tag, a "B&O" logo, a JBL logo, a "BRAUN" logo). The catalog's brands and products are fictional and are not the ones in the photos.
  - **Time:** done in one focused pass, well inside the 45-minute cap.
- **Consequences:** Small, reviewable asset set; no dependency on runtime image optimization (static files, `images.unoptimized`) or third-party image hosts; some catalog items are illustrated rather than photographic, by design. Variants that share a photograph (laptop configurations, keyboard switches, sizes) show the same image.
- **Alternatives rejected:** ~40 photographs (time); hotlinking stock sites (availability and license drift); AI-generated photos without provenance (license ambiguity); Amazon images (legal risk, NFR-SEC-2).
