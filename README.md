# yper fronts

Monorepo dos fronts **yper**, **movix** e **helake** (Vue 3 + Vite), todos consumindo a `yper-api`.

## Estrutura

- `apps/*` — um app por produto, cada um com deploy próprio.
- `packages/*` — código compartilhado (`@yper/api-client`, `@yper/i18n`, `@yper/ui`, `@yper/auth`).

## Uso

```sh
pnpm install
pnpm dev --filter movix   # um app
pnpm test                 # todos os testes
pnpm build                # build de todos os apps
```
