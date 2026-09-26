# yper fronts

Monorepo dos fronts **yper**, **movix** e **helake** (Vue 3 + Vite), todos consumindo a `yper-api`.

## Estrutura

- `apps/helake` — front da confeitaria (produtos, receitas, pedidos, dashboard).
- `apps/movix` — front de logistica/entregas.
- `apps/yper` — front principal do produto yper.
- `packages/@yper/api-client` — cliente HTTP da yper-api (sessao, auth, requests por app).
- `packages/@yper/i18n` — setup do vue-i18n e locale ativo compartilhado entre os apps.
- `packages/@yper/ui` — componentes visuais compartilhados (shell, modal, estilos base).
- `packages/@yper/auth` — telas de login/setup/troca de senha e gestao de usuarios.
- `packages/@yper/test-utils` — helpers de teste (montagem com plugins, acesso a modais teleportados).

## Setup em outra maquina

```sh
git clone git@github.com:yperdoom/yper_fronts.git
cd yper_fronts
nvm use
corepack enable
pnpm install
```

Cada app precisa de um `apps/<app>/.env.local` com a URL da API:

```sh
VITE_API_URL=http://localhost:4000
```

## Comandos

```sh
pnpm dev --filter helake   # ou movix / yper
pnpm test                  # roda os testes de todos os workspaces
pnpm coverage              # coverage de todos os workspaces
pnpm build                 # build de todos os apps
```

Portas do `dev`: `helake` 5173, `movix` 5174, `yper` 5175.

## Deploy

Cada app e um projeto Vercel separado, todos apontando para este mesmo repositorio:

- Root Directory: `apps/<app>`
- Framework Preset: Vite
- Node: 24
- Env: `VITE_API_URL` (URL da yper-api em producao)

Ordem de deploy: primeiro a `yper-api`, depois os fronts (eles dependem da API no ar).

## Convencoes

- Codigo, identificadores e rotas em ingles; texto para o usuario final vive em `src/locales` de cada app/pacote.
- Cobertura minima de testes: 85%.
