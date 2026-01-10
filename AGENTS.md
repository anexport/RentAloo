# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds application code: `components/` (UI primitives in `ui/`, domain widgets under folders like `rental/`, `messaging/`, `payment/`), `features/` for end-to-end flows, `pages/` for routed screens, `contexts/` for providers, `hooks/`, `lib/` utilities, `config/`, and `i18n/` with locale assets. `@/` resolves to `src/`.
- Styling lives in `src/index.css` and `src/App.css`; Tailwind CSS variables there define the design tokens used across components.
- `public/` contains static assets served as-is. Built assets land in `dist/` (do not edit manually).
- Backend artifacts live in `supabase/` (`migrations/`, seeds, and edge functions in `functions/`) and should be kept in sync with app changes.

## Build, Test, and Development Commands
- Install with `npm install` (Node 22.x). Start local dev on port 5173 via `npm run dev`.
- Production bundle: `npm run build`; preview the build locally with `npm run preview -- --host` if testing across devices.
- Tests use Vitest with jsdom: `npm test`. Add `--coverage` when you need coverage data.
- Linting config is in `eslint.config.js`; run `npm exec eslint "src/**/*.{ts,tsx}"` before sending a PR if you touch TypeScript/React code.

## Coding Style & Naming Conventions
- TypeScript is strict; prefer typed props/handlers and early returns. Use functional React components with PascalCase filenames (e.g., `BookingCard.tsx`) and camelCase for hooks/utilities (e.g., `useBookingState.ts`).
- Keep imports ordered third-party → `@/` aliases → relative paths. Use the `@/` alias instead of long relative chains.
- Favor Tailwind utility classes; when adjusting tokens, change them centrally in `src/index.css` rather than scattering new colors/radii.
- Keep feature logic close to its domain folder (`features/` and matching `components/` subfolders) to minimize cross-coupling.

## Testing Guidelines
- Vitest is configured for React via `vitest.config.ts` with `jsdom`; add a `src/test/setup.ts` that registers `@testing-library/jest-dom` when you start adding tests.
- Co-locate tests with code using `*.test.tsx`/`*.test.ts` or a local `__tests__/` folder. Test rendered behavior with Testing Library rather than implementation details.
- Prefer integration-style tests for complex flows (React Query providers, Auth/Theme context) and add focused unit tests for utilities in `lib/`.
- Run `npm test -- --coverage` before merging significant UI or logic changes.

## Commit & Pull Request Guidelines
- Use concise, present-tense commit messages that describe intent, e.g., `feat: add rental availability calendar` or `fix: guard missing supabase session`. Avoid vague one-liners.
- PRs should include: a short summary, screenshots or GIFs for UI changes, a test plan (commands run, results), and notes on env/migration impacts.
- If you modify Supabase migrations or edge functions, call it out explicitly and include replay steps (`supabase db push`/seed notes).

## Environment & Security
- Required env vars in `.env`/`.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`. Keep secrets out of git; use local overrides.
- Database migrations live in `supabase/migrations/`; seed files (`seed.sql`, `seed_categories.sql`, `seed_example_data.sql`) help bootstrap dev data. Edge functions reside in `supabase/functions/`.
- When sharing logs or screenshots, redact tokens, user data, and payment details.
