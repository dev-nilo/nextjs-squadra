# No demo account

Squadra has no one-click demo account. One was built and never merged (PR #55): an "Entrar como demo" button on the sign-in screen that signed any visitor into a shared demo Grupo, reset every night by a cron job, so someone could try the app without signing up or confirming an email.

In November 2026, six people who will play in the real peladas tried it on staging. They found the flow complex. Squadra is for a fixed group organized over time, a Grupo with its Elenco and its weekly Partidas, and a one-off trial doesn't show that. It isn't worth carrying in the code as the project grows.

Shipping it would also have put the service-role key in the app's production runtime, added a cron route with its own secret, and given one account its own exceptions (it couldn't change its password or email, or delete its Grupo).

To see the app without joining a Grupo, the README shows it in use, and `npm run db:start` brings up the seeded "Fut do Dev" locally.

Rejected: rebuilding it on the current main. PR #55 predates ADR 0007 and ADR 0008, so that would be a rewrite of a feature that tested badly.
