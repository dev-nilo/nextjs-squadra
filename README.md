# Squadra

Aplicação Next.js para cadastrar jogadores (estilo carta) e sortear times balanceados. Pode funcionar só no navegador (localStorage) ou sincronizar com o Supabase se você estiver logado.

## Isolamento por usuário (multi-tenant)

Cada conta só vê/edita/apaga **os próprios** jogadores:

- Consultas e writes no Supabase sempre filtrados por `user_id = auth.uid()`
- Cache local (`localStorage`) separado por usuário (`fut-cards-players-v2:user:<id>`)
- Sem upload automático de dados de outro usuário/guest para a nuvem da conta atual

Rode no SQL Editor do Supabase (obrigatório em produção):

```bash
scripts/06_harden_user_isolation.sql
```

## Desenvolvimento

1. Instale as dependências:
   - `npm ci`
2. Execute em modo de desenvolvimento:
   - `npm run dev`
3. Acesse:
   - `http://localhost:3000`

## Auth Supabase (confirmação de email)

Se o link do email redirecionar com `otp_expired` / `Email link is invalid or has expired`, configure o projeto assim:

### 1. URL Configuration (Dashboard → Authentication → URL Configuration)

- **Site URL**
  - Local: `http://localhost:3000`
  - Produção: `https://SEU-DOMINIO.vercel.app`
- **Redirect URLs** (adicione todas):
  - `http://localhost:3000/**`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/confirm`
  - `https://SEU-DOMINIO.vercel.app/**`
  - `https://SEU-DOMINIO.vercel.app/auth/callback`
  - `https://SEU-DOMINIO.vercel.app/auth/confirm`

Se `redirect_to` no email for só `http://localhost:3000` (sem `/auth/callback`), o redirect enviado pelo app foi rejeitado pela allowlist.

### 2. Template de confirmação (anti-prefetch)

Scanners (Outlook Safe Links, etc.) abrem `{{ .ConfirmationURL }}` sozinhos e queimam o token.

Em **Authentication → Email Templates → Confirm sign up**, use:

```html
<h2>Confirme seu email</h2>
<p>Clique no link abaixo. Na página aberta, pressione o botão Confirmar.</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?confirmation_url={{ .ConfirmationURL }}">
    Confirmar email
  </a>
</p>
```

Alternativa com `token_hash` (também suportada pela app):

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">
  Confirmar email
</a>
```

### 3. Variável opcional em produção

No Vercel, defina `NEXT_PUBLIC_SITE_URL=https://SEU-DOMINIO.vercel.app` para os emails não apontarem para localhost.

### 4. Depois de ajustar

1. Apague o usuário pendente em Authentication → Users (se necessário).
2. Cadastre de novo **ou** use **Reenviar email de confirmação**.
3. Abra o email **mais recente** e confirme pelo botão na página `/auth/confirm`.

## Build de produção

- `npm run build`
- `npm run start`

## Visão geral da estrutura

```
app/          → páginas e APIs (rotas)
components/   → pedaços de UI reutilizáveis
hooks/        → lógica reativa (auth)
lib/          → funções utilitárias e cliente Supabase
types/        → tipos TypeScript (Player, Team, etc.)
```

### `app/` — o que o usuário acessa

| Caminho | Função |
|---------|--------|
| `layout.tsx` | Cascão do site (fonte, providers, analytics) |
| `providers.tsx` | NextUI + tema claro/escuro |
| `page.tsx` | **Tela principal** — lista jogadores, edita, seleciona e sorteia times |
| `loading.tsx` | Loading enquanto a página carrega |
| `auth/page.tsx` | Tela de login/cadastro |
| `auth/callback/` | Volta do login OAuth do Supabase |
| `api/players/...` | APIs: apagar em lote, stats |
| `globals.css` | Estilos globais (Tailwind) |

A `page.tsx` é o “cérebro” da UI: guarda a lista de jogadores, seleção, modais e decide se salva no localStorage ou no Supabase.

### `components/` — interface quebrada em pedaços

- **`auth/`** — formulário, modal de login, menu do usuário
- **`player/`** — card do jogador, modal de criar/editar, sliders de atributos, skeleton
- **`team/`** — modal de configurar o sorteio e modal que mostra os times
- **`navigation/`** / **`common/`** — header, sidebar, hero (menos centrais na tela principal)
- **`theme-provider.tsx`** — wrapper de tema (hoje o tema já é ligado em `providers.tsx`)

### `lib/` — regras e integrações

- **`supabase/`** — como falar com o banco: no browser (`client`), no servidor (`server`) e no proxy
- **`jogador.ts`** — regras puras do Jogador (normalize, OVR)
- **`player-utils.ts`** — localStorage e processImage (I/O)
- **`player-supabase.ts`** — converter jogador ↔ linha do banco
- **`sorteio.ts`** — Sorteio: balancear/sortear Times (attribute-sum)
- **`constants.ts`** / **`countries.ts`** — constantes e lista de países

### `hooks/` e `types/`

- **`hooks/use-auth.ts`** — “está logado?”, usuário atual, logout
- **`types/index.ts`** — contrato dos dados: `Player`, atributos, `Time`, posições (`GOL`, `FIX`, `ALA`, `ATA`)

## Fluxo do app

1. Usuário abre `/` → carrega jogadores (localStorage e/ou Supabase).
2. Pode criar/editar/excluir cartas.
3. Seleciona jogadores → abre config do sorteio → gera times.
4. Se logado, dados vão para o Supabase; se não, ficam no navegador.

O `proxy.ts` na raiz cuida da sessão Supabase nas requisições (cookies / rotas protegidas).

## Config (raiz)

Arquivos como `package.json`, `tailwind.config.ts`, `tsconfig.json` e `next.config.mjs` só configuram o projeto — não são a lógica do produto.

Em uma frase: **`app` define as rotas, `components` desenha a UI, `lib` + `hooks` fazem o trabalho, `types` descreve os dados.**
