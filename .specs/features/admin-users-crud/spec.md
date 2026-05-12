# CRUD de Usuarios Administradores - Admin Specification

## Problem Statement

Os responsaveis pelo RouteBastion precisam gerir os acessos ao sistema Admin pela propria Admin UI. Hoje a gestao de usuarios administradores nao esta especificada como um fluxo completo entre UI, API e contratos, o que dificulta controlar quem pode acessar o ambiente administrativo.

Esta funcionalidade permite listar, buscar, criar, editar, bloquear, desbloquear e deletar usuarios administradores, mantendo regras de consistencia sobre existencia de usuario, unicidade de email e preparacao para o futuro fluxo de primeiro acesso.

## Goals

- [ ] Permitir que um usuario legitimo da aplicacao Admin visualize usuarios administradores cadastrados com paginacao por cursor de 10 itens por pagina.
- [ ] Permitir busca textual por nome de usuario administrador.
- [ ] Permitir criacao de usuarios administradores pela Admin UI sem gerar senha no cadastro.
- [ ] Permitir edicao, bloqueio, desbloqueio e delecao de usuarios administradores existentes.
- [ ] Manter contratos compartilhados em `apps/packages/contracts` para os fluxos entre `admin-ui` e `admin-api`.
- [ ] Cobrir a funcionalidade com testes unitarios, testes de integracao e testes de logica de UI conforme os criterios definidos.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Esqueci minha senha | Sera tratado em versao futura do modulo de autenticacao. |
| Fluxo de primeiro acesso | Sera tratado em versao futura do modulo de autenticacao. |
| Autenticacao e autorizacao | A funcionalidade assume um usuario legitimo da aplicacao Admin; controle de acesso sera especificado separadamente. |
| Geracao de senha no cadastro | O usuario criado sera marcado com `is_password_creation_pending` para cadastrar a primeira senha em fluxo futuro. |

---

## User Stories

### P1: Listar usuarios administradores MVP

**User Story**: Como responsavel pelo RouteBastion, quero visualizar usuarios administradores cadastrados para acompanhar quem tem acesso ao sistema Admin.

**Why P1**: A listagem e a entrada operacional para todas as demais acoes de gestao.

**Acceptance Criteria**:

1. WHEN o usuario legitimo navega ate a tela de usuarios administradores THEN o sistema SHALL exibir a primeira pagina da lista de usuarios cadastrados.
2. WHEN a lista possuir mais de 10 usuarios THEN o sistema SHALL paginar os resultados por cursor com 10 itens por pagina.
3. WHEN a API retorna uma pagina de usuarios THEN os usuarios SHALL estar ordenados por data de criacao em ordem decrescente, dos mais novos para os mais antigos.
4. WHEN o usuario navega para a proxima pagina THEN a UI SHALL enviar o cursor recebido anteriormente para buscar o proximo conjunto de resultados.
5. WHEN a UI renderiza a listagem THEN ela SHALL NOT oferecer controle para alterar a ordenacao dos dados.
6. WHEN nao existirem usuarios para os filtros aplicados THEN o sistema SHALL exibir um estado vazio apropriado.

**Independent Test**: Popular a base com mais de 10 usuarios, abrir a tela de usuarios administradores e validar que a lista pagina por cursor em grupos de 10, ordenando usuarios mais novos primeiro.

### P1: Buscar usuarios por nome MVP

**User Story**: Como responsavel pelo RouteBastion, quero buscar usuarios administradores por nome para encontrar rapidamente um acesso especifico.

**Why P1**: A busca reduz friccao operacional conforme a base de administradores cresce.

**Acceptance Criteria**:

1. WHEN o usuario informa um termo textual no filtro de busca THEN a UI SHALL normalizar o termo antes de enviar para a API.
2. WHEN a API recebe um termo de busca normalizado THEN o sistema SHALL executar consulta `LIKE` case-insensitive por nome.
3. WHEN o filtro de busca e alterado THEN o sistema SHALL atualizar a listagem considerando o novo termo.
4. WHEN o filtro de busca nao encontrar resultados THEN o sistema SHALL exibir estado vazio sem tratar a situacao como erro.
5. WHEN o usuario limpa o filtro de busca THEN o sistema SHALL voltar a listar usuarios sem filtro textual.

**Independent Test**: Cadastrar usuarios com nomes distintos, buscar por parte do nome e validar que somente usuarios compativeis aparecem.

### P1: Criar usuario administrador MVP

**User Story**: Como responsavel pelo RouteBastion, quero cadastrar um novo usuario administrador pela Admin UI para conceder acesso administrativo a uma pessoa.

**Why P1**: Criacao de usuarios e o principal mecanismo para gerir novos acessos.

**Acceptance Criteria**:

1. WHEN o usuario clica no botao de criar usuario THEN o sistema SHALL abrir um modal de cadastro na tela de listagem.
2. WHEN o usuario envia dados validos de cadastro THEN o sistema SHALL criar um novo registro na tabela `users`.
3. WHEN o email informado ja existir THEN o sistema SHALL rejeitar o cadastro com erro de email duplicado.
4. WHEN o usuario e criado THEN o sistema SHALL marcar `is_password_creation_pending` como `true`, sem gerar senha no cadastro.
5. WHEN o cadastro e concluido com sucesso THEN o sistema SHALL fechar o modal, atualizar a lista para refletir o novo usuario e exibir toast de sucesso.
6. WHEN o cadastro falha THEN o sistema SHALL manter o modal aberto e exibir toast de erro.

**Independent Test**: Abrir o modal pela listagem, criar um usuario com email unico e validar que ele aparece na lista como pendente de primeira senha.

### P1: Editar usuario administrador MVP

**User Story**: Como responsavel pelo RouteBastion, quero editar dados de usuarios administradores existentes para manter informacoes de acesso atualizadas.

**Why P1**: Sem edicao, correcoes de dados exigiriam intervencao direta no banco ou recriacao de usuarios.

**Acceptance Criteria**:

1. WHEN o usuario escolhe editar um usuario existente THEN o sistema SHALL abrir um formulario com os dados editaveis atuais.
2. WHEN o usuario envia `name`, `email` ou `birthDate` validos para um usuario existente THEN o sistema SHALL persistir as alteracoes na tabela `users`.
3. WHEN o usuario informado nao existe THEN o sistema SHALL rejeitar a alteracao com erro de usuario inexistente.
4. WHEN a alteracao tenta usar email ja pertencente a outro usuario THEN o sistema SHALL rejeitar a alteracao com erro de email duplicado.
5. WHEN a edicao altera o email do usuario THEN o sistema SHALL nulificar a senha do usuario e marcar `is_password_creation_pending` como `true`.
6. WHEN a edicao altera apenas `name` ou `birthDate` THEN o sistema SHALL preservar a senha e o estado atual de `is_password_creation_pending`.
7. WHEN a edicao e concluida com sucesso THEN o sistema SHALL fechar o modal, atualizar a lista para refletir os novos dados e exibir toast de sucesso.
8. WHEN a edicao falha THEN o sistema SHALL manter o modal aberto e exibir toast de erro.

**Independent Test**: Editar o nome de um usuario existente e validar na lista e no banco que a alteracao foi persistida.

### P1: Bloquear e desbloquear usuario administrador MVP

**User Story**: Como responsavel pelo RouteBastion, quero bloquear e desbloquear usuarios administradores para suspender ou restaurar acessos sem remover o cadastro.

**Why P1**: Bloqueio e desbloqueio sao operacoes essenciais para gestao de acesso reversivel.

**Acceptance Criteria**:

1. WHEN o usuario escolhe bloquear um usuario existente ativo THEN o sistema SHALL alterar o `status` do usuario para `BLOCKED`.
2. WHEN o usuario escolhe desbloquear um usuario existente bloqueado THEN o sistema SHALL alterar o `status` do usuario para `ACTIVE`.
3. WHEN o usuario informado nao existe THEN o sistema SHALL rejeitar a operacao com erro de usuario inexistente.
4. WHEN o `status` do usuario e alterado THEN o sistema SHALL registrar a data de alteracao de status.
5. WHEN a operacao e concluida com sucesso THEN o sistema SHALL atualizar a lista para refletir o novo status e exibir toast de sucesso.
6. WHEN a operacao falha THEN o sistema SHALL exibir toast de erro.

**Independent Test**: Bloquear um usuario existente, validar o status na lista e no banco, desbloquear o mesmo usuario e validar o retorno ao status ativo.

### P1: Deletar usuario administrador MVP

**User Story**: Como responsavel pelo RouteBastion, quero deletar usuarios administradores existentes para remover acessos que nao devem mais existir.

**Why P1**: Remocao de usuarios fecha o ciclo basico de CRUD e reduz risco operacional.

**Acceptance Criteria**:

1. WHEN o usuario solicita deletar um usuario existente THEN o sistema SHALL abrir um modal de confirmacao sem campos de entrada.
2. WHEN o usuario confirma a delecao THEN o sistema SHALL remover fisicamente o registro da tabela `users`.
3. WHEN o usuario informado nao existe THEN o sistema SHALL rejeitar a delecao com erro de usuario inexistente.
4. WHEN a delecao e concluida com sucesso THEN o sistema SHALL fechar o modal, atualizar a lista sem o usuario removido e exibir toast de sucesso.
5. WHEN a delecao falha THEN o sistema SHALL manter ou encerrar o modal conforme o erro e exibir toast de erro.
6. WHEN a lista fica vazia apos a delecao THEN o sistema SHALL exibir estado vazio apropriado.

**Independent Test**: Deletar um usuario existente pela UI e validar que ele nao aparece mais na listagem.

---

## Cross-Cutting Requirements

### API and Contracts

1. WHEN a Admin UI consome operacoes de usuarios THEN `admin-ui` SHALL usar contratos compartilhados em `apps/packages/contracts`.
2. WHEN `admin-api` expuser endpoints de usuarios THEN os payloads de entrada, saida e erro SHALL estar alinhados aos contratos compartilhados.
3. WHEN uma operacao falhar por regra de negocio THEN `admin-api` SHALL retornar status HTTP e corpo de erro consistentes com o padrao existente da API.
4. WHEN `admin-api` expuser listagem de usuarios THEN o contrato SHALL representar paginacao por cursor, limite de 10 itens e proximo cursor quando existir proxima pagina.

### UI Interaction

1. WHEN o usuario executa acoes de criar, editar ou deletar THEN a UI SHALL conduzir a acao por modal.
2. WHEN o usuario executa delecao THEN o modal SHALL ser apenas uma confirmacao da acao, sem campos de entrada.
3. WHEN uma acao de criar, editar, bloquear, desbloquear ou deletar conclui com sucesso THEN a UI SHALL exibir toast de sucesso.
4. WHEN uma acao de criar, editar, bloquear, desbloquear ou deletar falha THEN a UI SHALL exibir toast de erro.

### Testing and Coverage

1. WHEN a funcionalidade for implementada THEN o projeto SHALL atingir no minimo 80% de cobertura de testes para o escopo alterado.
2. WHEN houver logica de negocio no backend THEN ela SHALL ter testes unitarios.
3. WHEN houver persistencia na tabela `users` THEN ela SHALL ter testes de integracao cobrindo aplicacao + banco de dados.
4. WHEN houver stores no frontend THEN elas SHALL ter testes dedicados.
5. WHEN houver services no frontend THEN eles SHALL ter testes dedicados.
6. WHEN houver logica de UI no frontend THEN ela SHALL ter testes cobrindo comportamentos principais da tela, modal, filtros, paginacao e acoes.

---

## Edge Cases

- WHEN o email informado no cadastro ja existir THEN o sistema SHALL impedir a criacao e informar conflito.
- WHEN o email informado na edicao ja pertencer a outro usuario THEN o sistema SHALL impedir a alteracao e informar conflito.
- WHEN o email de um usuario for alterado THEN o sistema SHALL remover a senha existente e exigir criacao de nova senha em fluxo futuro.
- WHEN o usuario alvo de edicao, delecao, bloqueio ou desbloqueio nao existir THEN o sistema SHALL responder com erro de usuario inexistente.
- WHEN a busca textual receber termo vazio THEN o sistema SHALL tratar como listagem sem filtro textual.
- WHEN a busca textual receber termo sem resultados THEN o sistema SHALL exibir estado vazio.
- WHEN o cursor solicitado nao possuir resultados por mudanca de filtros ou delecoes THEN o sistema SHALL retornar estado vazio coerente ou permitir recarregar a listagem inicial.
- WHEN houver falha inesperada de comunicacao entre UI e API THEN a UI SHALL indicar erro sem perder os dados ja preenchidos no formulario.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| ADM-USR-01 | P1: Listar usuarios administradores | Tasks | Mapped to T4, T5, T6, T8, T9, T10, T11, T13 |
| ADM-USR-02 | P1: Buscar usuarios por nome | Tasks | Mapped to T4, T5, T6, T8, T9, T11, T13 |
| ADM-USR-03 | P1: Criar usuario administrador | Tasks | Mapped to T2, T3, T4, T5, T6, T8, T9, T10, T11, T13 |
| ADM-USR-04 | P1: Editar usuario administrador | Tasks | Mapped to T4, T5, T6, T8, T9, T10, T11, T13 |
| ADM-USR-05 | P1: Bloquear e desbloquear usuario administrador | Tasks | Mapped to T2, T4, T5, T6, T8, T9, T10, T11, T13 |
| ADM-USR-06 | P1: Deletar usuario administrador | Tasks | Mapped to T4, T5, T6, T8, T9, T10, T11, T13 |
| ADM-USR-07 | Cross-cutting: API and Contracts | Tasks | Mapped to T1, T3, T6, T8, T13 |
| ADM-USR-08 | Cross-cutting: Testing and Coverage | Tasks | Mapped to T7, T12, T13 |
| ADM-USR-09 | Cross-cutting: UI Interaction | Tasks | Mapped to T9, T10, T11, T13 |

**Coverage**: 9 total, 9 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] Um usuario legitimo consegue listar usuarios administradores na Admin UI com paginacao por cursor de 10 itens por pagina.
- [ ] A listagem exibe usuarios ordenados por `createdAt` decrescente e a UI nao permite alterar a ordenacao.
- [ ] Um usuario legitimo consegue filtrar usuarios administradores por nome.
- [ ] Um usuario legitimo consegue criar, editar, bloquear, desbloquear e deletar usuarios administradores pela Admin UI.
- [ ] Criacao, edicao e delecao acontecem por modals; o modal de delecao e apenas confirmacao.
- [ ] Sucessos e erros das acoes de usuario exibem feedback por toast.
- [ ] A API impede email duplicado em criacao e edicao.
- [ ] A API rejeita edicao, delecao, bloqueio e desbloqueio de usuarios inexistentes.
- [ ] Usuarios criados ficam com `is_password_creation_pending = true`, sem senha gerada no cadastro.
- [ ] Alteracoes de email nulificam a senha e resetam `is_password_creation_pending` para `true`.
- [ ] Bloqueio e desbloqueio usam enum de `status` com valores `ACTIVE` e `BLOCKED` no banco e na aplicacao, registrando a data de alteracao de status.
- [ ] Delecao de usuario remove fisicamente o registro da tabela `users`.
- [ ] Contratos compartilhados cobrem payloads e respostas usados por `admin-ui` e `admin-api`.
- [ ] Testes do escopo implementado atingem no minimo 80% de cobertura e incluem unidade, integracao, stores, services e logica de UI.

---

## Current Codebase Notes

- `apps/admin-api` ja possui um modulo `users` com endpoints de criacao e delecao.
- A tabela `users` atual possui `id`, `name`, `email`, `birthDate`, `passwordHash`, `createdAt`, `modifiedAt` e `deletedAt`.
- O cadastro atual da API recebe `password`, mas a nova regra de negocio define que o sistema nao deve gerar senha no cadastro e deve marcar o usuario para cadastrar a primeira senha futuramente.
- A tabela `users` atual nao aparenta possuir campo explicito para `status`, data de alteracao de status ou pendencia de primeira senha.
- `admin-ui` ainda parece estar em estrutura inicial, com rotas basicas e tipo `User`.
- O pacote de contratos para esta funcionalidade sera `apps/packages/contracts`.

## Decisions

1. Delecao de usuarios administradores sera fisica.
2. Bloqueio e desbloqueio serao representados por `status`, usando enum no banco de dados e na aplicacao com valores `ACTIVE` e `BLOCKED`.
3. Alteracoes de `status` devem gravar uma data de alteracao de status.
4. Pendencia de criacao de senha sera representada por `is_password_creation_pending`.
5. Campos editaveis: `name`, `email` e `birthDate`.
6. Quando `email` for alterado, a senha sera nulificada e `is_password_creation_pending` sera definido como `true`.
7. Contratos compartilhados ficarao em `apps/packages/contracts`.
8. Busca por nome sera case-insensitive; a UI normaliza o termo antes de enviar para a API e a API executa consulta `LIKE`.
9. A regra que impede o usuario atual de bloquear ou deletar a si mesmo fica fora desta feature e sera tratada futuramente em autenticacao/autorizacao.
10. A tela de usuarios administradores ficara em `/users`.
11. A listagem usara paginacao por cursor, com 10 itens por pagina.
12. A ordenacao padrao e fixa sera por `createdAt` decrescente, exibindo registros mais novos primeiro.
13. A UI nao permitira alterar a ordenacao nesta versao.
14. Criacao, edicao e delecao serao executadas por modals.
15. O modal de delecao sera apenas uma confirmacao, sem receber dados.
16. A UI exibira toast de sucesso e toast de erro para as acoes de usuario.

## Open Questions

Nenhuma pergunta em aberto no momento.
