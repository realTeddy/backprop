# Backprop

An adaptive AI tutor that takes you from linear algebra to building a small GPT
from scratch. Curriculum follows Karpathy's Zero-to-Hero arc; the tutor
diagnoses your current level and adapts depth and pacing per topic.

## Status

**Phase A** — scaffold, Google auth via Supabase, Drizzle schema with
row-level security, CI. The app shell is live; later phases add the curriculum
graph (B), the BYOK tutor (C), encrypted conversation persistence (D), the
Pyodide / Colab code execution layer (E), and the owner-only Copilot
adapter (F).

See [`/root/.claude/plans/ai-ml-learning-companion-atomic-thunder.md`](https://claude.ai/code) for the full plan.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth + RLS), Google OAuth only
- Drizzle ORM with hand-authored SQL migrations
- Vercel AI SDK 5 with OpenAI / Anthropic / Google adapters (Phase C)
- Pyodide for in-browser Python; Colab deep-link for full-fledged training (Phase E)

## Local setup

1. **Install Node 22 and pnpm 10**, then:
   ```sh
   pnpm install
   ```

2. **Create a Supabase project** at https://supabase.com.
   - In *Authentication → Providers*, enable **Google** and paste the OAuth
     credentials from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
   - Add the redirect URL `http://localhost:3000/auth/callback` (and the
     deployed URL once you have one).

3. **Copy env vars:**
   ```sh
   cp .env.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` from your Supabase project
   settings.

4. **Apply the schema:**
   ```sh
   psql "$DATABASE_URL" -f lib/db/migrations/0000_init.sql
   ```
   (Drizzle-kit can also push, but the initial migration includes
   `auth.users` foreign keys and RLS policies that are easier to read in raw
   SQL.)

5. **Run the app:**
   ```sh
   pnpm dev
   ```

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the Next.js dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit suite |
| `pnpm test:e2e` | Playwright e2e suite |
| `pnpm db:generate` | Drizzle: generate a migration from schema diff |
| `pnpm db:migrate` | Drizzle: apply pending migrations |

## Privacy

API keys (Phase C) are stored in browser `localStorage` only — never persisted
on the server. Conversation history (Phase D) is encrypted at rest with
XChaCha20-Poly1305 using a server-held key. A one-click delete in
`/settings/data` removes all user rows and the Supabase auth user. Full
policy lives at [`docs/PRIVACY.md`](docs/PRIVACY.md) once Phase D ships.

## License

Personal project — no license declared yet.
