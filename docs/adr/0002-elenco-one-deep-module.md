# Elenco persistence is one deep module, not dual adapters yet

**Superseded** by [ADR 0006](0006-elenco-reads-on-the-server.md): the Elenco is now read on the server and written through Server Actions, and the module described here is gone.

Player load/save/delete/sync live behind one deep Elenco module with injected dependencies (Supabase client, storage) for tests. A second full adapter (e.g. in-memory ports-and-adapters) is deferred until a second real production backend appears — one adapter would be a hypothetical seam. Guest/unauthenticated Elenco stays out of scope; the interface always requires an authenticated user id.
