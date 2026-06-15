# broker Architecture
> Go 1.26 + Gin — VRP broker engine (layered, WIP)

Entry: `cmd/main.go:main()` → loads viper config (`pkg/env`), inits OTel, builds server `pkg/server/http.go:NewHTTPServer()`. Graceful shutdown on SIGINT/SIGTERM.

Layered per module (`internal/modules/<x>/`): handlers → services → stores (+ entities, dtos, mappers).
- **Stores**: `interface` + `Impl` wrapping sqlc `generated.Queries`. Tx pulled from context: `dbutils.ExtractTx(ctx)` + `queries.WithTx(tx)`. Hydrate entities from rows + pgtype↔uuid/time helpers in `pkg/dbutils`. Example: `customer/stores.go`.
- **Services**: free functions (not methods) taking deps as params (store, TxManager, HashGenerator) — functional DI. Wrap writes in `dbutils.WithinTransactionReturning` / `WithinTransactionReturningErr`. Example: `customer/services.go:CreateCustomer()`.
- **Errors**: `pkg/customerrors` — typed errors w/ codes (Infrastructure vs Application; ErrCodeNotFound, ErrCodeDatabaseFailure, ErrCodeEncryptionFailure...).

DB: pgx v5 + sqlc. Provider `internal/infra/db/pgx_provider.go` (DBProvider iface, `GetConn()`), tx manager `internal/infra/db/pg_tx_manager.go`. Generated code `internal/infra/db/generated/`. SQL: `sql/schema.sql`, `sql/queries.sql`, migrations `sql/migrations/`, config `sqlc.yml`.

Routes (`pkg/server/http.go:registerRoutes()`):
- `GET /health` (`modules/health`)
- `GET /v1/optimizations/sync`
- `POST` + `DELETE /v1/back-office/customers`
- `POST /v1/back-office/providers`

Auth: API-key middleware `pkg/middlewares/with_api_key.go` — header `RouteBastion-API-Key`, validated via `GetCustomerByApiKey`. ⚠ currently commented out in route registration.

Optimization engine: `optimization/services.go:OptimizeSync()` is a STUB (sleeps 10ms, returns empty slice). Provider client iface `internal/infra/clients/route_optimization_api_client.go`; impls = `fake_client.go` + `google_cloud_client.go` (cloud.google.com/go/maps).

Observability: OTel tracing in `pkg/instrumentation` (exporter/tracer/metrics), wired in main; but otelgin middleware + per-handler spans are commented out.
Gateway: Kong (`config/kong/`, `config/kong/dev/`). Load tests `tests/load/`. Live reload via Air (`.air.toml`).

WIP markers: many handlers/middleware/spans/queries commented out — treat as in-progress scaffolding.

Updated: 2026-06-15
