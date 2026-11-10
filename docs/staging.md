# Environments: staging and production

| | Local / CI | Staging | Production |
| --- | --- | --- | --- |
| Supabase | `npm run db:start` (Docker), thrown away | `squadra-staging` (free project) | the current project |
| App | `npm run dev` / CI runner | Vercel **Preview**, one per PR (Vercel's Git integration) | Vercel **Production**, deployed by CI (`deploy-production`) |
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
   - Site URL: `http://localhost:3000`. The confirmation email links to `{{ .SiteURL }}`, so it must be an app that talks to staging, never production. To test sign-up on a Vercel preview, set it to that preview's URL for the test.
   - Redirect URLs: `https://*-ayanno-team.vercel.app/**`, `http://localhost:3000/**`
4. **Authentication → Providers → Email**: leave "Confirm email" **on**, as in production.
5. **Authentication → Emails → Confirm sign up**: subject `Confirme seu email no Squadra`, body = [`supabase/templates/confirm-signup.html`](../supabase/templates/confirm-signup.html). Same as production.

### 2. Create an access token

Supabase → Account → **Access Tokens** → generate one named `github-actions-squadra`. Both projects use this one token.

### 3. Add the GitHub secrets

Repo → Settings → Secrets and variables → **Actions**:

| Secret | Value |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | the token from step 2 |
| `STAGING_PROJECT_REF` | the staging ref from step 1 |
| `PROD_PROJECT_REF` | `rellxqqnjlehwonedyvz` |
| `VERCEL_TOKEN` | a Vercel token scoped to the `ayanno-team` team (Vercel → Account Settings → Tokens). Production deploys only through it |

Optional: Settings → Environments → `supabase-production` → add yourself as a **required reviewer**, so every production migration waits for one click.

### 4. Fill staging

Actions → **Staging** → Run workflow → tick **reset**. It builds the schema from every migration and loads `supabase/seed.sql`: `dev@squadra.test`, `amigo@squadra.test` and `novato@squadra.test` (no Grupo yet), password `squadra-dev-123`.

### 5. Point Vercel previews at staging

Do this **after** step 4. Until staging has the schema, a preview pointed at it has no tables to read.

Vercel → Project → Settings → **Environment Variables**. For the **Preview** environment only:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://<staging ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = staging's **publishable** key, `sb_publishable_…` (Project Settings → API Keys). supabase-js 2.95 accepts it in place of the legacy anon JWT

Keep the Production values as they are. Then Settings → **Deployment Protection** → turn off Vercel Authentication for previews, so the pelada can open a preview link.

### 6. Adopt the baseline in production

Production's schema was built from the old hand-run `scripts/`. The first migration, `20261109000000_baseline.sql`, describes that schema, so production must record it as **already applied** instead of running it.

1. Actions → **Production baseline** → Run workflow → `check`. It diffs production against the baseline. The notice should say there are no schema differences. If it reports differences, stop and fix the baseline first.
2. Run it again with `repair`. That records the baseline as applied.

Until this is done, `migrate-production` refuses to run: its dry run would include the baseline, and the job stops there.

## Day to day

- **Open a PR**: once lint, tests and E2E pass, `migrate-staging` pushes the PR's new migrations to staging, and the Vercel preview runs against them. A PR without migrations skips this step, so it never trips over another open PR's migration already on staging.
- **Merge to `main`**: `migrate-production` pushes the same migrations to production, then `deploy-production` deploys the app. Vercel's own Git deploy is off for `main` (`vercel.json`), so the new code never goes live before the schema it needs. If a migration fails, production keeps running the previous deploy.
- **Staging drifted** (an abandoned PR left a migration behind, or test data piled up): Actions → Staging → Run workflow → **reset**.
- **Keep-alive**: the Staging workflow touches the database every Monday so the free project doesn't pause.

Staging is shared by every open PR. Two PRs adding migrations at once both land there. That's fine for a solo project; reset staging if it gets confusing.
