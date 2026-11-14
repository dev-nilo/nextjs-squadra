# Supabase Auth: URLs and the emails

Set this up on every hosted project (staging and production). If a confirmation or recovery link lands on `otp_expired` or "Email link is invalid or has expired", something here is off.

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

`next` carries the sign-up's destination. Someone who signs up from an invite returns to `/convite/<token>` after confirming, even on another device. `/auth/confirm` only follows paths on the same site (`caminhoSeguro` in `lib/sessao.ts`). This needs `https://<your-domain>/**` in the Redirect URLs. Without it, Supabase swaps the destination for the Site URL and the person lands on `/`. The app then still sends them to the invite it remembered in the browser.

## 3. The password recovery template

"Esqueci minha senha" on the sign-in screen sends a recovery email. It works like the confirmation: the link goes to `/auth/confirm`, the token is only used when the person taps **Continuar**, and the tap always ends on `/auth/nova-senha`, where they set the new password.

The template is versioned in [`supabase/templates/recovery.html`](../supabase/templates/recovery.html), and the local Supabase already uses it. On hosted projects, go to Authentication → Emails → Reset password and set:

- Subject: `Crie uma senha nova no Squadra`
- Body: the file's contents

The link is `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`.

Until the template is set, Supabase sends its default recovery email. Its link goes through Supabase and back to `/auth/callback?next=/auth/nova-senha` with a PKCE code, which only works in the browser where the person asked for the link.

## 4. Email delivery

Supabase's built-in mailer only sends to the project's team members, a few emails an hour. Production uses custom SMTP (Authentication → Emails → SMTP Settings).

## 5. After changing any of this

1. Delete the pending user in Authentication → Users, if there is one.
2. Sign up again, or use **Reenviar email de confirmação**.
3. Open the **most recent** email and confirm with the button on `/auth/confirm`.

For the recovery template, use **Esqueci minha senha** with an account you can sign in to, open the most recent email, tap **Continuar**, and set a new password.
