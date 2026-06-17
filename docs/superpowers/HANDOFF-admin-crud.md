# Handoff — Admin CRUD (RouteBastion)

> Status de execução para retomar depois. Última atualização: 2026-06-16.
> Branch: **`feat/admin-crud`** (não fizemos merge; tudo está nessa branch).

## O que é

Feature full-stack de CRUD de Admins, dividida em **spec + 2 planos**:

| Documento | Caminho |
|---|---|
| Spec (design aprovado) | `docs/superpowers/specs/2026-06-15-admin-crud-design.md` |
| Plan 1 — Contracts + admin-api | `docs/superpowers/plans/2026-06-15-admin-crud-backend.md` |
| Plan 2 — admin-ui (frontend) | `docs/superpowers/plans/2026-06-15-admin-crud-frontend.md` |

Os planos têm **código completo, copiável**, por task, em passos de TDD. Quem retomar não precisa redesenhar nada — basta executar as tasks.

## Como estávamos executando

Via skill **`superpowers:subagent-driven-development`**: um subagente implementador por task + revisão de spec + revisão de qualidade, sequencialmente (nunca em paralelo — mexem nos mesmos arquivos). A lista de tasks também está no gerenciador de tarefas da sessão (TaskList).

**Decisão do usuário:** executar **somente o Plan 1 agora**; o **Plan 2 (frontend) fica para depois** ("amanhã").

> ⚠️ **Nota sobre o approach:** começamos com `subagent-driven-development`, mas os subagentes de **review em background morreram ao bater o limite de sessão (5h)**. As Tasks 1–2 foram revisadas por subagentes; a Task 3 em diante foi **executada e verificada inline pelo orquestrador** (typecheck + testes + inspeção de diffs a cada commit) — mais confiável perto do limite. **Plan 1 está code-complete (14/14).**

## Progresso do Plan 1 (14 tasks)

> Confirme sempre o estado real com `git log --oneline`.

| Task | Descrição | Status |
|---|---|---|
| 1 | Scaffold `@route-bastion/contracts` | ✅ `73811a9` |
| 2 | Schemas zod + tipos (TDD) | ✅ `1d27963` + `89dfa56` |
| 3 | Schema `admins` + wire Drizzle + **migração baseline regenerada** | ✅ `71d77b0` |
| 4 | Wire contracts + domain types + DTOs | ✅ `52dc8ac` |
| 5 | Repository abstract class + cursor codec (TDD) | ✅ `bf2624a` |
| 6–10 | Service `create`/`list`/`update`/`block`/`unblock`/`delete` (TDD, consolidado) | ✅ `7138b00` |
| 11 | Drizzle repository impl | ✅ `55e7008` |
| 12 | Controller + typecheck | ✅ `8a0b636` |
| 13 | Infra e2e (Testcontainers `postgres:18`) | ✅ `df73fa4` |
| 14 | Spec e2e de admins | ✅ `7114e07` — **VERIFICADO** (9/9 com Docker em 2026-06-16) |
| — | Revisão final + `superpowers:finishing-a-development-branch` | ⬜ pendente |

**Verificado ✅:** `@route-bastion/contracts` (16 testes + build), `admin-api` unit (16 testes: cursor + service), `admin-api` typecheck limpo, **`admin-api` e2e (9 testes, Testcontainers `postgres:18`, rodado em 2026-06-16)**.

**Plan 2 (frontend): 11 tasks, todas pendentes.**

## Como retomar (Plan 1 já está code-complete)

1. `git checkout feat/admin-crud` e `git log --oneline`.
2. ~~Rodar o e2e~~ — **feito** (9/9 em 2026-06-16). Para re-rodar: `pnpm --filter admin-api test:e2e` (precisa de Docker; sobe `postgres:18`).
3. Revisão final + `superpowers:finishing-a-development-branch` (merge/PR).
4. Depois, escrever/executar o **Plan 2** (frontend) — `docs/superpowers/plans/2026-06-15-admin-crud-frontend.md`.

### Comandos de verificação (Definition of Done do Plan 1)
- `pnpm --filter @route-bastion/contracts test` e `... build` — ✅ passando
- `pnpm --filter admin-api exec tsc --noEmit --incremental false -p tsconfig.json` — ✅ limpo (use `--incremental false`: a pasta `dist/` está com permissão de dono root e o buildinfo incremental falha ao escrever — não é erro de tipo)
- `pnpm --filter admin-api test` (unit) — ✅ 16 testes
- `pnpm --filter admin-api test:e2e` (**precisa de Docker** — Testcontainers sobe `postgres:18`) — ✅ 9 testes (rodado 2026-06-16)

## Aprendizados/armadilhas já descobertos (importante para quem retomar)

- **Migração baseline foi RESETADA** (Task 3): o antigo `0000_flat_abomination.sql` era **stale** (criava a tabela `users` antiga, anterior à reconciliação users→admins do ERD) e nunca casou com o código. Foi substituído por um único `0000_init.sql` limpo que cria o schema atual correto. **`drizzle-kit generate` contra uma baseline stale TRAVA** em prompts interativos de rename — por isso o agente da Task 3 emperrou. Gerar a partir de uma baseline limpa/vazia é não-interativo (só CREATEs). Se precisar regenerar de novo: limpe `drizzle/*.sql` + `drizzle/meta/`, e rode `pnpm --filter admin-api exec drizzle-kit generate --name init`.
- **Só a tabela `admins` perdeu `deleted_at`** (deletes físicos). As outras tabelas (constraints/customers/providers/vehicles) mantêm `deleted_at` no ERD — isso é correto, não remova.
- **Validação retorna HTTP 422** (`UNPROCESSABLE_ENTITY`) via `ZodExceptionFilter`, não 400. UUID inválido em path → 400 (ParseUUIDPipe). Os testes e2e (Task 14) já assumem isso.
- **`DrizzleService` precisa passar `{ schema }`** para `drizzle(pool, { schema })` — sem isso `db.query.*` não funciona (era o bug "drizzle-schema-not-wired"). Feito na Task 3.
- **`biome.json` usa allowlist em `files.includes`** — cada pacote novo precisa ser adicionado lá ou o pre-commit (`biome check --write`) ignora os arquivos. O pacote `apps/packages/contracts/**/*` já foi adicionado.
- **Barrel `index.ts` dos contratos** usa `export * from "./admins.js"` (extensão `.js` exigida por `nodenext`); o biome reclama de `noBarrelFile`/`noReExportAll` e de `noSecrets` no nome `"listAdminsQuerySchema"` → resolvido com `biome-ignore` inline.
- **`dist/` é gitignored** — não commitar build output dos contratos.
- **Hook husky** imprime "DEPRECATED" + "lint-staged could not find any staged files" em commits só de docs — **é benigno**, o commit passa. Em commits com `.ts` staged, ele roda `biome check --write` nesses arquivos.
- **`deleted_at` foi REMOVIDO do ERD** → deletes são **físicos** (decisão do usuário). A memória do projeto (`admin-api-schema-scope`) já foi atualizada com isso.
- **Regra de refetch (decisão #16 do spec):** no frontend, toda mutação bem-sucedida recarrega a listagem resetando a paginação para a 1ª página e reenviando o termo de busca ativo.

## Stack confirmada (para o Plan 2, frontend)
PrimeVue 4.5 + `@primevue/forms` (resolver: `import { zodResolver } from "@primevue/forms/resolvers/zod"`) + primeicons + Tailwind v4 + **`ky`** (cliente HTTP) + Pinia + `@vueuse/core`. Env: `VITE_API_URL`. Rota da tela: `/dashboard/admins` dentro de um `DashboardLayout`. `ToastService` ainda **não** está registrado no `main.ts` (Plan 2, Task 1).
