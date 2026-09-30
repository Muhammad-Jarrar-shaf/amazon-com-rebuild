# CLAUDE.md: amazon-com-rebuild

Operational rules for the rest of the 8x assignment: a rebuild of amazon.com's customer shopping experience in a hard 20-hour window (planning checkpoint 2026-09-30T11:11Z). The docs are the source of truth; read them before changing behavior:
[product-recon](docs/product-recon.md) · [requirements](docs/requirements.md) · [ux-spec](docs/ux-spec.md) · [architecture](docs/architecture.md) · [testing-strategy](docs/testing-strategy.md) · [delivery-plan](docs/delivery-plan.md) · [ADRs](docs/decisions/).

## Priorities
1. **Golden path first:** Home -> Search -> Results -> PDP -> Variant/Quantity -> Add to Cart -> Cart -> Guest Checkout -> Confirmation. Anything that threatens it is stretch. Do not optimize for feature count.
2. Reliability and polish of that path beat breadth. The gate is **G1** ([delivery-plan](docs/delivery-plan.md)); nothing after G1 starts before it passes on the deployed build.

## Engineering principles
- Simplest thing that works; **no speculative infrastructure** and **no unnecessary dependencies**. A new dependency needs a one-line justification in the commit message (or an ADR if architectural).
- Stack is fixed by [ADR-0001](docs/decisions/0001-next-16-3-7-pinned.md): Next.js `16.3.7` exact pin, App Router, TypeScript strict, Tailwind 4, Zustand for the cart only. Never widen to a version range; never install 16.3.0-16.3.2.
- Server Components by default; `"use client"` only for interactivity ([architecture](docs/architecture.md#3-server--client-boundary)). No `next/og`, Server Actions, Route Handlers, middleware or runtime image optimization without an ADR.
- Money is **integer cents** via `lib/pricing` only; time comes from `lib/clock`; cart lines store ids and quantities, never prices.
- Small pure functions in `lib/*` for logic so it is unit-testable; UI stays thin.

## Workflow
- Work in **small vertical slices** S0-S10 exactly as in the [delivery plan](docs/delivery-plan.md). One slice = build + tests + deploy.
- **Use Plan Mode before:** any change to architecture, scope, the checkout rules, or anything that touches more than one slice; and before starting each new slice unless it is already fully specified in the delivery plan. Small fixes and in-slice work do not need a plan.
- **Test while implementing:** write the slice's unit tests with the code; the E2E harness (row T) precedes G1. Bugs get a failing test first when practical.
- **Verify before claiming completion:** never say "done/fixed/passing" without having run the relevant command in this session and read its output: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, plus `pnpm e2e` for journey-affecting work. Report failures plainly with the output.
- **Docs stay true:** update the relevant doc in the same commit whenever behavior, scope, architecture, time budget, or a decision changes ([requirements](docs/requirements.md) IDs are referenced by tests, so keep them stable; add, don't renumber). Keep [product-recon](docs/product-recon.md) honest: observed vs inferred vs decided.
- Do not present designed behavior (checkout, delivery, payment, order numbers) as Amazon behavior anywhere: UI copy, docs or demo.
- **Shell links to unbuilt routes are inert, never 404s.** When a slice implements a route, add it to `AVAILABLE_ROUTES` in `lib/nav.ts` in the same commit (and adjust `lib/nav.test.ts` / the shell E2E expectations that assert inertness). Link through `NavLink` (`components/ui/nav-link.tsx`).

## Quality bars
- **Accessibility:** axe zero critical/serious on Home, Results, PDP, Cart, Checkout, Confirmation; keyboard-operable primary controls; visible focus; semantic landmarks; labeled inputs; errors announced; >=44px tap targets on mobile. Lighthouse is a diagnostic, not a gate.
- **Responsive:** design and check 375 / 768 / 1440; **no horizontal overflow at 375px**.
- **States:** every surface has loading/empty/error/success handling per the [ux-spec](docs/ux-spec.md) catalog.
- **Determinism:** tests pin the clock; no time-dependent or random behavior in user-visible logic.

## Security and assets
- **No secrets** in the repo, logs, docs, or commit messages. `.env.example` documents variables; real values never committed. Run a secret scan on every staged diff before committing.
- **Never store full card numbers or CVC** anywhere (state after validation, storage, logs). Payment is a test-mode mock only.
- **No Amazon-hosted assets** (images, scripts, fonts, logos) and no hotlinking. Follow [ADR-0004](docs/decisions/0004-asset-strategy.md); record every downloaded asset in `public/products/CREDITS.md`, and skip any asset whose license is unclear.
- Do not attempt real purchases, real accounts, or real payment providers.

## Git discipline
- Conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`), one atomic concern per commit, interleaved with the work (commit after each verified slice or meaningful step).
- Stage explicit paths (avoid `git add -A` when unrelated or auto-captured files are modified). Do not push unless the owner says so.
- **`.agent-logs/` is a submission artifact:** it is written automatically by the hook in `.claude/`. Never edit, delete, reorder, or rewrite it; never add it to `.gitignore`; never rewrite history that contains it. Commit it as `docs: checkpoint agent capture logs` between feature commits. The hook config and script are `.claude/settings.json` and `.claude/hooks/capture.py`; do not change them unless a concrete verification failure exists.
- Git identity is repo-local: `Muhammad Jarrar Shaf`; commit trailer per the harness attribution instructions.

## Commands (available after S0; update this list when scripts change)
`pnpm dev` · `pnpm build` · `pnpm start` · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm e2e` · `pnpm audit`

## Definition of done (any slice)
Requirements for the slice met and traceable to IDs; tests written and green; typecheck/lint/build green; axe clean on touched pages; checked at 375 and 1440; docs updated; deployed and smoke-checked; committed.
