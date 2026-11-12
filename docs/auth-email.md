# Supabase Auth: URLs and the confirmation email

Set this up on every hosted project (staging and production). If a confirmation link lands on `otp_expired` or "Email link is invalid or has expired", something here is off.

## 1. URL configuration

Dashboard → Authentication → URL Configuration:

- **Site URL**: the app that talks to this database, with no trailing slash. Production: `https://squadra-eight.vercel.app`. Staging: `http://localhost:3000`, or a preview URL while testing sign-up there.
- **Redirect URLs**: `http://localhost:3000/**` and `https://<your-domain>/**`. Staging also takes the previews' wildcard.

Optionally, set `NEXT_PUBLIC_SITE_URL=https://<your-domain>` on Vercel.

## 2. The confirmation template (anti-prefetch)

Mail scanners such as Outlook Safe Links open links on their own, and that burns the one-time token. So the email links to `/auth/confirm`, and the account is only confirmed when the person taps **Confirmar minha conta**.

The template is versioned in [`supabase/templates/confirm-signup.html`](../supabase/templates/confirm-signup.html), and the local Supabase already uses it (`supabase/config.toml`). On hosted projects, go to Authentication → Emails → Confirm sign up and set:

- Subject: `Confirme seu email no Squadra`
- Body: the file's contents

The link is `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next={{ .RedirectTo }}`, so the project's Site URL must be the app that talks to that database.

`next` carries the sign-up's destination. Someone who signs up from an invite returns to `/convite/<token>` after confirming, even on another device. `/auth/confirm` only follows paths on the same site (`caminhoSeguro` in `lib/convite.ts`). This needs `https://<your-domain>/**` in the Redirect URLs. Without it, Supabase swaps the destination for the Site URL and the person lands on `/`. The app then still sends them to the invite it remembered in the browser.

## 3. Email delivery

Supabase's built-in mailer only sends to the project's team members, a few emails an hour. Production uses custom SMTP (Authentication → Emails → SMTP Settings).

## 4. After changing any of this

1. Delete the pending user in Authentication → Users, if there is one.
2. Sign up again, or use **Reenviar email de confirmação**.
3. Open the **most recent** email and confirm with the button on `/auth/confirm`.
