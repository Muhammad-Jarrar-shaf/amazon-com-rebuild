# ADR-0003: Seeded in-repo catalog, no database

- **Status:** Accepted (2026-09-30).
- **Context:** The deliverable is a believable, reliable shopping experience for evaluators, not a catalog platform. The live site's catalog scale (tens of thousands of results per query) is explicitly out of scope.
- **Decision:** A typed seed catalog in `data/products.ts` (about 30 products across about 6 departments; the headphones family fully populated with 3 color variants for the golden path) accessed only through pure functions in `lib/catalog` (search, suggest, filter, sort, paginate, related). Catalog data is validated by unit tests (unique ids, valid references, integer-cent prices, list price >= price). The cart and orders are browser state (Zustand + `localStorage`, versioned keys, safe-parse). Prices are never stored in the cart; they are resolved from the catalog at read time.
- **Consequences:** No database, migrations, secrets or network calls; identical behavior locally and deployed; fast, fully testable, deterministic. Trade-offs: adding products means a code change; no server-side inventory; carts/orders are per-browser.
- **Alternatives rejected:** Postgres/SQLite/KV (setup and failure modes for no visible benefit); calling a live product API or scraping Amazon (legal and reliability risk); a headless CMS (overhead).
