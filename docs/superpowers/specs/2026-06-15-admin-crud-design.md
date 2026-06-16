# CRUD de Admins — Design Spec

> RouteBastion · `admin-api` (NestJS/Fastify) + `@route-bastion/contracts` + `admin-ui` (Vue 3/PrimeVue)
> Data: 2026-06-15 · Escopo: full-stack

## Contexto e Problema

Os responsáveis pelo RouteBastion precisam gerir os acessos administrativos pela própria Admin UI. Hoje o módulo `admins` do `admin-api` só expõe **create** e **delete**, e a `admin-ui` está em estado esqueleto (sem camada HTTP, sem telas). Esta feature entrega o CRUD completo de admins de ponta a ponta — UI, contratos compartilhados e API — incluindo busca, paginação, bloqueio/desbloqueio e cadastro sem senha (com fluxo de primeira senha preparado para o futuro).

## Escopo

**Dentro:**
- CRUD de admins: criar, listar, editar, deletar.
- Busca textual por nome (case-insensitive).
- Paginação por cursor (10 por página), ordenação fixa por mais novo primeiro.
- Bloquear / desbloquear (status de conta).
- Cadastro sem senha (admin marcado como pendente de primeira senha).
- Pacote de contratos compartilhados (`@route-bastion/contracts`).
- Telas na `admin-ui` dentro de um shell de layout mínimo (`/dashboard/admins`).
- Testes: unitários, integração/e2e (Testcontainers), schema dos contratos e testes de front.

**Fora (iterações futuras):**
- Autenticação/autorização (assume-se um usuário legítimo da Admin UI).
- Fluxo de primeira senha / "esqueci minha senha".
- Regra de impedir o usuário atual de bloquear/deletar a si mesmo.
- Menu lateral rico (colapsar, breadcrumbs, ícones), além do shell mínimo.
- `GET /admins/:id` (leitura individual) — não necessário; a edição usa os dados da linha.

## Decisões

1. **Delete físico** — a operação remove a linha definitivamente.
2. **`deleted_at` removido** do ERD/tabela; desconsiderado em todo o código.
3. **`email` `unique` global** — com delete físico o email volta a ficar disponível naturalmente após a remoção.
4. **Campos editáveis:** `name`, `email`, `birthDate`.
5. **Troca de email reseta a senha:** `password_hash = NULL` + `is_password_creation_pending = true`.
6. **Status** representado por enum `admin_status` (`ACTIVE` | `BLOCKED`), gravando `status_changed_at` a cada mudança.
7. **Cadastro sem senha:** `password_hash` nullable; novos admins nascem com `is_password_creation_pending = true` e `status = ACTIVE`.
8. **Paginação por cursor**, 10 itens por página, ordenação fixa `created_at DESC` (mais novo primeiro); a UI não permite alterar ordenação.
9. **Busca por nome** case-insensitive (`ILIKE`); a UI normaliza o termo antes de enviar.
10. **Editar = `PUT`**; **bloquear/desbloquear = `PATCH`**.
11. **Contratos compartilhados** em `apps/packages/contracts` (`@route-bastion/contracts`), zod v4 como fonte única de verdade.
12. **Frontend:** Pinia stores + camada de services sobre `ky`; UI em PrimeVue.
13. **Datas:** na UI sempre `DD/MM/YYYY`; nos payloads sempre `YYYY-MM-DD` (`birthDate`) e ISO datetime (timestamps).
14. **Rota** `/dashboard/admins`, aninhada em um `DashboardLayout` (shell mínimo: sidebar + conteúdo).
15. **E2E com Testcontainers**, imagem fixa `postgres:18` (resolve a constraint de `uuidv7()`).

---

## Modelo de Dados (`admin-api`)

Alterações na tabela `admins` (`drizzle/tables/admins.ts` + migração):

| Campo | Mudança |
| --- | --- |
| `password_hash` | passa a **nullable** |
| `status` | novo: `pgEnum('admin_status', ['ACTIVE','BLOCKED'])`, default `ACTIVE`, `notNull` |
| `status_changed_at` | novo: `timestamp` nullable (preenchido em block/unblock) |
| `is_password_creation_pending` | novo: `boolean`, default `true`, `notNull` |
| `deleted_at` | **removido** |

`email` mantém a constraint `unique`. Limpeza de cascata: remover `deletedAt` do tipo `Admin` (`@types/index.ts`) e do output (`outputs/create.ts`)/service. Novo enum aggregado em `drizzle/enums`.

---

## Backend (`admin-api`)

Mantém os padrões do módulo: `abstract class` como DI token do repositório, services retornando `Result<Err, T>` (tuplas, sem throw), DTOs via `nestjs-zod` construídos sobre os schemas do pacote de contratos, exceptions de domínio traduzidas para HTTP no controller.

### Endpoints

| Método | Rota | Ação | Sucesso |
| --- | --- | --- | --- |
| `POST` | `/admins` | criar (sem senha) | `201` |
| `GET` | `/admins?cursor=&search=` | listar (cursor + busca) | `200` |
| `PUT` | `/admins/:id` | editar (`name`/`email`/`birthDate`) | `200` |
| `PATCH` | `/admins/:id/block` | bloquear | `200` |
| `PATCH` | `/admins/:id/unblock` | desbloquear | `200` |
| `DELETE` | `/admins/:id` | delete físico | `204` |

Erros: `AlreadyExistsException → 409`, `NotFoundException → 404`, validação zod → `400` (pipe/filtro globais já existentes).

### Regras de negócio (service)

- **create:** 409 se `email` já existe (qualquer registro). Cria com `password_hash = NULL`, `is_password_creation_pending = true`, `status = ACTIVE`.
- **list:** apenas ordenado por `created_at DESC`, página de 10, cursor opaco baseado em `(created_at, id)`. `search` → `name ILIKE %termo%`. Retorna `{ items, nextCursor }` (`nextCursor = null` quando não há próxima página).
- **update (PUT):** 404 se não existe; 409 se o novo `email` pertence a outro admin; se o **email mudou** → `password_hash = NULL` + `is_password_creation_pending = true`.
- **block/unblock (PATCH):** 404 se não existe; seta `status` + `status_changed_at = now()`.
- **delete:** 404 se não existe; remove a linha.

### Repositório (`abstract class AdminsRepository` → `DrizzleAdminsRepository`)

`getByID(id)` · `getByEmail(email)` · `list({ cursor, limit, search })` · `create(data)` · `update(id, partial)` · `delete(id)` (físico) · `setStatus(id, status)`.

---

## Contratos (`@route-bastion/contracts`)

- **Local:** `apps/packages/contracts` · **nome:** `@route-bastion/contracts`.
- `pnpm-workspace.yaml`: adicionar glob `apps/packages/*`.
- Ambos os apps declaram `"@route-bastion/contracts": "workspace:*"`.
- **Build:** `tsc` emitindo JS ESM + `.d.ts` em `dist/`, com campo `exports`/`types`. Dep `zod` (v4, alinhado ao `^4.3.6` da API).

### Schemas exportados (zod v4) + tipos inferidos

- `adminStatusSchema = z.enum(['ACTIVE','BLOCKED'])`
- `createAdminInputSchema` → `{ name, email, birthDate }` (sem senha; `birthDate = z.iso.date()`)
- `updateAdminInputSchema` → `{ name, email, birthDate }`
- `adminOutputSchema` → `{ id, name, email, birthDate, status, isPasswordCreationPending, statusChangedAt|null, createdAt, modifiedAt|null }` — **sem** `passwordHash` e **sem** `deletedAt`
- `listAdminsQuerySchema` → `{ cursor?, search? }` (limite de 10 fixo no servidor)
- `listAdminsOutputSchema` → `{ items: Admin[], nextCursor: string | null }`
- `errorOutputSchema` → alinhado ao `ErrorOutput` atual da API
- Tipos: `CreateAdminInput`, `UpdateAdminInput`, `Admin`, `ListAdminsQuery`, `ListAdminsOutput` via `z.infer`.

**Datas:** `birthDate = z.iso.date()` (YYYY-MM-DD); `createdAt`/`modifiedAt`/`statusChangedAt = z.iso.datetime()` (ISO completo) — corrige de passagem a inconsistência atual em `outputs/create.ts`.

### Consumo

- **admin-api:** `inputs/*` e `outputs/*` viram `class X extends createZodDto(<schema do pacote>)`.
- **admin-ui:** importa os schemas para validação de formulário (resolver zod do `@primevue/forms`) e os tipos para services/stores; o `@types/user.ts` é substituído pelo `Admin` do pacote.

---

## Frontend (`admin-ui`)

Stack disponível: PrimeVue 4.5 (DataTable/Dialog/Toast/Tag/Avatar), `@primevue/forms` (resolver zod), primeicons, Tailwind v4, `ky`, Pinia, `@vueuse/core`.

### Estrutura

```
src/shared/layouts/DashboardLayout.vue   # shell: sidebar (nav) + <router-view/>
src/shared/http/client.ts                # instância ky (baseUrl via env Vite, ex. VITE_ADMIN_API_URL)
src/shared/format/date.ts                # DD/MM/YYYY <-> YYYY-MM-DD
src/modules/admins/
  views/AdminsView.vue
  components/AdminFormDialog.vue          # criar/editar
  components/DeleteAdminDialog.vue        # confirmação
  services/admins.service.ts
  stores/admins.store.ts
```

### Roteamento

- Rota pai `path: "/dashboard"` → `DashboardLayout`; filho `path: "admins"` → `AdminsView` ⇒ `/dashboard/admins`.
- Mapa `routes`: `Dashboard: "/dashboard"`, `Admins: "/dashboard/admins"`.
- Shell mínimo agora; demais telas (customers, providers…) entram como novos filhos de `/dashboard`.

### Service (`admins.service.ts`)

Funções `list({cursor,search})`, `create`, `update(id)`, `block(id)`, `unblock(id)`, `remove(id)` usando `ky`, tipadas pelos contratos. Fala o contrato em ISO; conversão de/para `DD/MM/YYYY` no `date.ts` e no submit do form.

### Store (`admins.store.ts`, Pinia setup store)

Estado: `items`, `search`, `loading`, `error`, e uma **pilha de cursors** para suportar "Anterior/Próxima". Ações: `fetchFirstPage`, `fetchNext`, `fetchPrev`, `setSearch` (debounce), `create/update/block/unblock/remove` — chamam o service e **recarregam a primeira página** após mutação.

### Tela (`AdminsView.vue`) — layout aprovado

- Header "Admins" + botão **Novo admin**; campo de busca (debounce → `setSearch`).
- Cabeçalho de colunas **Admin | Status | Criado em |** + linhas-card: `Avatar` (iniciais), nome/email, `Tag` de status (verde `ACTIVE` / vermelho `BLOCKED`), data `DD/MM/YYYY`, ícones de ação (primeicons): editar · bloquear/desbloquear · deletar.
- Estado vazio (lista vazia e busca sem resultado) e estado de loading.
- Paginação cursor "‹ Anterior / Próxima ›".

### Modais e feedback

- `AdminFormDialog` (criar/editar): `Form` do `@primevue/forms` com resolver zod dos contratos; campos Nome, Email, `DatePicker` (`dd/mm/yy`). No editar, pré-preenche e exibe sob o email o aviso: _"Ao alterar o email deste usuário, a senha do mesmo será redefinida e ele deverá criar uma nova no seu próximo acesso."_ Sucesso → fecha + toast de sucesso + refresh; erro → mantém aberto + toast de erro.
- `DeleteAdminDialog`: apenas confirmação ("Tem certeza que deseja deletar X?") → toast.
- **block/unblock:** ação direta pelo ícone (sem modal) + toast.
- `main.ts`: garantir plugin PrimeVue + tema + `ToastService` (com `<Toast/>` montado).

---

## Testes

Stack: Vitest na `admin-api` (`vitest.config.ts` unit + `vitest.e2e.config.ts` com supertest) e na `admin-ui` (`@vue/test-utils` + jsdom).

### Backend — `admin-api`

- **Unit** (`admins.service.spec.ts`, mock do `AdminsRepository`):
  - create: email existente → erro (409); sucesso → `password_hash=null`, `is_password_creation_pending=true`, `status=ACTIVE`.
  - update: inexistente → 404; email de outro → 409; email mudou → reset de senha; só `name`/`birthDate` → preserva senha/flag.
  - block/unblock: inexistente → 404; seta `status` + `status_changed_at`.
  - delete: inexistente → 404; remove a linha.
  - list: repassa `cursor/search/limit`; mapeia `{items, nextCursor}`.
- **Integração/e2e** (`admins.e2e-spec.ts`, supertest) com **Testcontainers**:
  - Deps (dev): `testcontainers` + `@testcontainers/postgresql`.
  - `globalSetup` no `vitest.e2e.config.ts`: sobe `PostgreSqlContainer("postgres:18")`, pega a URI (`getConnectionUri()`), aplica migrações Drizzle (`migrate()` de `drizzle-orm/node-postgres/migrator` apontando para `./drizzle`), expõe a URI via `provide`/`inject` do Vitest, e teardown encerra o container. Container reaproveitado em toda a suíte; cada spec limpa/seedeia seus dados.
  - Cobre: `POST 201`, `GET` com paginação por cursor (10/página, `created_at DESC`), busca `ILIKE`, `PUT` (incl. troca de email reseta senha), `PATCH` block/unblock, `DELETE 204`, e erros (409 email duplicado, 404).
  - Requisito: Docker disponível no ambiente de testes (sem dependência da versão do Postgres do host).

### Contratos — `@route-bastion/contracts`

- Testes leves de schema: parse válido/inválido por schema (formato de `birthDate`, email inválido, enum de status).

### Frontend — `admin-ui`

- **Service:** mock do `ky` — URLs/métodos/payloads corretos e conversão de datas (DD/MM/YYYY ↔ YYYY-MM-DD).
- **Store:** mock do service — pilha de cursors (first/next/prev), `setSearch` com debounce, mutações atualizando estado + recarregando 1ª página, tratamento de erro.
- **Componentes/UI** (`@vue/test-utils`): `AdminsView` (linhas, estado vazio, busca, paginação, ações abrindo dialogs/chamando ações, toasts); `AdminFormDialog` (validação via resolver zod, criar vs editar, aviso de troca de email, sucesso/erro); `DeleteAdminDialog` (confirmar/cancelar).

### Cobertura

**≥ 80%** para o escopo alterado (unit + integração no back; schema nos contratos; service, store e UI no front).

---

## Critérios de Sucesso

- [ ] Listar admins em `/dashboard/admins` com paginação por cursor (10/página), ordenados por `created_at DESC`, sem controle de ordenação na UI.
- [ ] Buscar admins por nome (case-insensitive).
- [ ] Criar, editar, bloquear, desbloquear e deletar admins pela UI.
- [ ] Criar/editar/deletar via modais; delete é só confirmação; block/unblock é ação direta com toast.
- [ ] Sucessos e erros das ações exibem toast.
- [ ] API impede email duplicado em create e update; rejeita update/delete/block/unblock de admin inexistente (404).
- [ ] Admins criados ficam sem senha, com `is_password_creation_pending = true` e `status = ACTIVE`.
- [ ] Troca de email reseta a senha e marca `is_password_creation_pending = true`.
- [ ] Block/unblock alteram `status` e registram `status_changed_at`.
- [ ] Delete remove fisicamente o registro.
- [ ] Datas: UI em `DD/MM/YYYY`, payloads em `YYYY-MM-DD`/ISO.
- [ ] Contratos compartilhados (`@route-bastion/contracts`) cobrindo inputs, outputs, query, listagem e erro.
- [ ] e2e roda contra `postgres:18` via Testcontainers; cobertura ≥ 80% no escopo alterado.
