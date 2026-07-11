# Squadra

Aplicação Next.js para cadastrar jogadores (estilo carta) e sortear times balanceados. Pode funcionar só no navegador (localStorage) ou sincronizar com o Supabase se você estiver logado.

## Desenvolvimento

1. Instale as dependências:
   - `npm ci`
2. Execute em modo de desenvolvimento:
   - `npm run dev`
3. Acesse:
   - `http://localhost:3000`

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
| `api/teams/balance/` | API que calcula times balanceados |
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
- **`player-utils.ts`** — normalizar/calcular rating, helpers de jogador
- **`player-supabase.ts`** — converter jogador ↔ linha do banco
- **`team-utils.ts`** — lógica de balancear/sortear times
- **`constants.ts`** / **`countries.ts`** — constantes e lista de países

### `hooks/` e `types/`

- **`hooks/use-auth.ts`** — “está logado?”, usuário atual, logout
- **`types/index.ts`** — contrato dos dados: `Player`, atributos, `TeamData`, posições (`GOL`, `FIX`, `ALA`, `ATA`)

## Fluxo do app

1. Usuário abre `/` → carrega jogadores (localStorage e/ou Supabase).
2. Pode criar/editar/excluir cartas.
3. Seleciona jogadores → abre config do sorteio → gera times.
4. Se logado, dados vão para o Supabase; se não, ficam no navegador.

O `proxy.ts` na raiz cuida da sessão Supabase nas requisições (cookies / rotas protegidas).

## Config (raiz)

Arquivos como `package.json`, `tailwind.config.ts`, `tsconfig.json` e `next.config.mjs` só configuram o projeto — não são a lógica do produto.

Em uma frase: **`app` define as rotas, `components` desenha a UI, `lib` + `hooks` fazem o trabalho, `types` descreve os dados.**
