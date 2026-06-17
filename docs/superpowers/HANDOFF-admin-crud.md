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

> ⚠️ **Atenção sobre o approach:** os subagentes de **review em background morreram ao bater o limite de sessão (5h)** — as Tasks 1 e 2 foram revisadas com sucesso, mas os agentes de review ficam frágeis perto do limite. A Task 3 (migração) foi **recuperada e verificada diretamente pelo orquestrador** (inspeção do SQL gerado + diffs), sem respawnar agentes. **Recomendação ao retomar:** para as Tasks 4–14, considere **execução inline direta** (os planos já têm o código completo) ou subagentes implementadores com **review inline** — é mais confiável que depender de agentes de review em background.

## Progresso do Plan 1 (14 tasks)

> Confirme sempre o estado real com `git log --oneline`.

| Task | Descrição | Status |
|---|---|---|
| 1 | Scaffold `@route-bastion/contracts` | ✅ commit `73811a9` |
| 2 | Schemas zod + tipos (TDD) | ✅ commits `1d27963` + `89dfa56` (hardening de testes) |
| 3 | Schema `admins` (status, is_password_creation_pending, password nullable, **drop deleted_at**) + wire Drizzle + **migração baseline regenerada** | ✅ commit `71d77b0` |
| 4 | Wire contracts + domain types + DTOs (deleta `outputs/create.ts`) | ⬜ **PRÓXIMA** |
| 5 | Repository abstract class + cursor codec (TDD) | ⬜ pendente |
| 6 | Service `create` (TDD) | ⬜ pendente |
| 7 | Service `list` (cursor) (TDD) | ⬜ pendente |
| 8 | Service `update` (reset de senha na troca de email) (TDD) | ⬜ pendente |
| 9 | Service `block`/`unblock` (TDD) | ⬜ pendente |
| 10 | Service `delete` físico (TDD) | ⬜ pendente |
| 11 | Drizzle repository impl (list/update/delete/setStatus) | ⬜ pendente |
| 12 | Controller (POST/GET/PUT/PATCH block\|unblock/DELETE) + typecheck | ⬜ pendente |
| 13 | Infra e2e (Testcontainers `postgres:18`) | ⬜ pendente |
| 14 | Spec e2e de admins | ⬜ pendente |
| — | Revisão final + `superpowers:finishing-a-development-branch` | ⬜ pendente |

**Plan 2 (frontend): 11 tasks, todas pendentes.** Recomendado escrever/executar só depois do Plan 1.

> ℹ️ Após a Task 3 o projeto **ainda não compila** (`tsc`): `@types/index.ts`, `admins.service.ts`, `admins.controller.ts`, `outputs/create.ts` e `drizzle-admins.repository.ts` ainda referenciam o shape antigo do `Admin`. Isso é **esperado** — fica verde a partir da Task 4 em diante (Tasks 4, 11, 12). Não "conserte" isoladamente; siga o plano.

## Como retomar

1. `git checkout feat/admin-crud` e `git log --oneline` (último commit do Plan 1 = `71d77b0`, Task 3).
2. Próxima é a **Task 4** do Plan 1 (`docs/superpowers/plans/2026-06-15-admin-crud-backend.md`). Seguir task a task (cada task = test → implementação → rodar → commit), inline ou via subagentes (ver aviso sobre approach acima).
3. Ao terminar o Plan 1: revisão final + `superpowers:finishing-a-development-branch`.
4. Depois, escrever/executar o **Plan 2** (frontend).

### Comandos de verificação (Definition of Done do Plan 1)
- `pnpm --filter @route-bastion/contracts test` e `... build`
- `pnpm --filter admin-api exec tsc --noEmit -p tsconfig.json` (só fica limpo após Tasks 4/11/12)
- `pnpm --filter admin-api test` (unit)
- `pnpm --filter admin-api test:e2e` (**precisa de Docker rodando** — Testcontainers sobe `postgres:18`)

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
