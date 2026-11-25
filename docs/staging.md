# Environments: staging and production

| | Local / CI | Staging | Production |
| --- | --- | --- | --- |
| Supabase | `npm run db:start` (Docker), thrown away | `squadra-staging` (free project) | the current project |
| App | `npm run dev` / CI runner | Vercel **Preview**, one per PR (Vercel's Git integration) | Vercel **Production**, deployed by CI (`deploy-production`) |
| Data | `supabase/seed.sql` | `supabase/seed.sql`, fake only | real users |
| Who changes the schema | `supabase start` / `db reset` | CI, on a PR that adds migrations (`migrate-staging`) | CI, after merge to `main` (`migrate-production`) |

Nobody runs SQL by hand against staging or production. A schema change is a file in `supabase/migrations`, and CI pushes it.

Until `STAGING_DB_URL` exists, the staging jobs log a notice and skip, so CI stays green. The production jobs fail instead: `migrate-production` without `PROD_DB_URL`, since the deploy waits on it and would otherwise go live without its migrations, and `deploy-production` without `VERCEL_TOKEN`, since nothing else deploys production.

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

### 2. Copy each database's URL

For staging and for production: Supabase → the project → **Connect** → **Session pooler** → copy the URI. It looks like `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-<n>-<region>.pooler.supabase.com:5432/postgres`. Put the database password in place of `[YOUR-PASSWORD]` (Project Settings → Database, where you can also reset it). A password of letters and digits needs no encoding. Any other character has to be URL-encoded: `python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=""))' '<password>'`. The app doesn't use this password, but CI does: resetting it breaks the migration jobs until the secret is updated.

Use the **session** pooler. The direct connection is IPv6 only, and GitHub's runners have no IPv6. The transaction pooler (port 6543) doesn't suit migrations.

If Supabase bans a runner's IP after failed logins (a wrong password, for example), lift the ban in the dashboard (Project Settings → Database → Network bans): without a token, the CLI can't.

The CLI takes this URL with `--remote=<url>` and needs no Supabase access token. That's on purpose: an access token reaches every project of the account, so a token any branch could read would reach production too.

### 3. Add the GitHub secrets

Repo → Settings:

| Where | Secret | Value |
| --- | --- | --- |
| Secrets and variables → **Actions** (repository) | `STAGING_DB_URL` | staging's URL from step 2 |
| Environments → `supabase-production` | `PROD_DB_URL` | production's URL from step 2 |
| Environments → `vercel-production` | `VERCEL_TOKEN` | a Vercel token scoped to the `ayanno-team` team (Vercel → Account Settings → Tokens). Production deploys only through it |

Create `vercel-production` with deployment branches **protected branches only** and no reviewer: the approval stays on `supabase-production`, and `deploy-production` waits for it. An environment secret is only read by a job in that environment, on a branch its policy allows. So production's credentials can only be used from `main`, and `main` only changes through a pull request. Staging's URL stays a repository secret, because `migrate-staging` runs on pull requests. Each URL only reaches the steps that call the CLI, so dependency install scripts never see it.

What's left: anything holding the owner's GitHub credential still reaches production. That includes the `gh` login on the owner's machine, which the coding agents use. It can merge a pull request (no approval is required), approve the `supabase-production` deployment (self-review is allowed) and overwrite the environment secrets. The Vercel token is scoped to the team, so it reads every project's Production variables there: treat it as a production credential.

Then the two gates (set on 2026-11-24):

- Settings → Environments → `supabase-production`: you as **required reviewer**, "Allow administrators to bypass" off, deployment branches **protected branches only**. Every run on `main` then waits for your approval (Actions → the run → Review deployments) before it migrates production; the deploy waits on that job, so it waits too. Self-review stays allowed: merges come from your own account.
- Settings → Branches → `main`: require a pull request (0 approvals, since GitHub won't let you approve your own PR), require the `Lint, test, build, typecheck` and `Database, RLS and E2E` checks from GitHub Actions, include administrators, no force-push or deletion. Not "up to date before merging": CI runs again on `main` after the merge, and production only moves once that run passes. If a merge never started that run (an Actions outage can lose the push), run CI by hand on `main`: Actions → CI → Run workflow, with "Use workflow from" left on `main` (or `gh workflow run ci.yml --ref main`). It goes through the same checks and the same approval.

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

## Error monitoring (Sentry)

Without a DSN the SDK stays off, so local dev and CI need none of this.

| Variable | Where | What for |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel (Production and Preview) | Sends browser and server errors |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Vercel (build) | Uploads source maps |

Events are tagged `production` (production deploy) or `staging` (previews). The SDK collects no user, cookies, headers or request bodies ([`lib/sentry-options.ts`](../lib/sentry-options.ts)).
