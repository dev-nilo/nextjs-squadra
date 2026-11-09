# Environments: staging and production

| | Local / CI | Staging | Production |
| --- | --- | --- | --- |
| Supabase | `npm run db:start` (Docker), thrown away | `squadra-staging` (free project) | the current project |
| App | `npm run dev` / CI runner | Vercel **Preview**, one per PR | Vercel **Production** |
| Data | `supabase/seed.sql` | `supabase/seed.sql`, fake only | real users |
| Who changes the schema | `supabase start` / `db reset` | CI, on every PR (`migrate-staging`) | CI, after merge to `main` (`migrate-production`) |

Nobody runs SQL by hand against staging or production. A schema change is a file in `supabase/migrations`, and CI pushes it.

Until the secrets below exist, the staging and production jobs log a notice and skip, so CI stays green.

## One-time setup

These steps need the owner's Supabase, GitHub and Vercel accounts.

### 1. Create the staging project

1. In Supabase, create a **free** project named `squadra-staging`, in the same region as production.
2. Copy its **project ref**: the `xxxx` in `https://xxxx.supabase.co`.
3. **Authentication → URL Configuration**:
   - Site URL: `https://squadra-eight.vercel.app`
   - Redirect URLs: `https://*-ayanno-team.vercel.app/**`, `http://localhost:3000/**`
4. **Authentication → Providers → Email**: leave "Confirm email" **on**, as in production.
5. **Authentication → Email Templates → Confirm sign up**: use the same template as production (see the README, "Auth Supabase").

### 2. Create an access token

Supabase → Account → **Access Tokens** → generate one named `github-actions-squadra`. Both projects use this one token.

### 3. Add the GitHub secrets

Repo → Settings → Secrets and variables → **Actions**:

| Secret | Value |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | the token from step 2 |
| `STAGING_PROJECT_REF` | the staging ref from step 1 |
| `PROD_PROJECT_REF` | `rellxqqnjlehwonedyvz` |

Optional: Settings → Environments → `supabase-production` → add yourself as a **required reviewer**, so every production migration waits for one click.

### 4. Fill staging

Actions → **Staging** → Run workflow → tick **reset**. It builds the schema from every migration and loads `supabase/seed.sql`: `dev@squadra.test` and `amigo@squadra.test`, password `squadra-dev-123`.

### 5. Point Vercel previews at staging

Vercel → Project → Settings → **Environment Variables**. For the **Preview** environment only:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://<staging ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = staging's anon key (Project Settings → API)

Keep the Production values as they are. Then Settings → **Deployment Protection** → turn off Vercel Authentication for previews, so the pelada can open a preview link.

### 6. Adopt the baseline in production

Production's schema was built from the old hand-run `scripts/`. The first migration, `20261109000000_baseline.sql`, describes that schema, so production must record it as **already applied** instead of running it.

1. Actions → **Production baseline** → Run workflow → `check`. It diffs production against the baseline. The notice should say there are no schema differences. If it reports differences, stop and fix the baseline first.
2. Run it again with `repair`. That records the baseline as applied.

Until this is done, `migrate-production` refuses to run: its dry run would include the baseline, and the job stops there.

## Day to day

- **Open a PR**: once lint, tests and E2E pass, `migrate-staging` pushes the PR's new migrations to staging, and the Vercel preview runs against them.
- **Merge to `main`**: `migrate-production` pushes the same migrations to production, then Vercel deploys.
- **Staging drifted** (an abandoned PR left a migration behind, or test data piled up): Actions → Staging → Run workflow → **reset**.
- **Keep-alive**: the Staging workflow touches the database every Monday so the free project doesn't pause.

Staging is shared by every open PR. Two PRs adding migrations at once both land there. That's fine for a solo project; reset staging if it gets confusing.
