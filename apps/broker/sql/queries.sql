-- Customers

-- name: CreateCustomer :one
INSERT INTO customers (
  id, name, business_identifier, created_at
) VALUES (
  $1, $2, $3, $4
) RETURNING *;

-- name: DeleteCustomer :exec
UPDATE customers
  SET deleted_at = $2
WHERE customers.id = $1;

-- name: GetCustomerByBusinessIdentifier :one
SELECT
  sqlc.embed(c)
FROM customers AS c
WHERE c.business_identifier = $1
LIMIT 1;

-- name: GetCustomerByApiKey :one
SELECT
  sqlc.embed(c)
FROM customers AS c
JOIN api_keys AS ak
  ON c.id = ak.customer_id
WHERE ak.key_hash = $1
LIMIT 1;

-- name: GetCustomerByID :one
SELECT
  sqlc.embed(c)
FROM customers AS c
WHERE c.id = $1
LIMIT 1;

-- API Keys

-- name: CreateApiKey :one
INSERT INTO api_keys (
  id, key_hash, customer_id, created_at
) VALUES (
  $1, $2, $3, $4
) RETURNING *;

-- name: SetApiKeyLastUsedAt :exec
UPDATE api_keys AS ak
SET
	last_used_at = $2
WHERE ak.id = $1;

-- name: RevokeApiKey :exec
UPDATE api_keys AS ak
SET
	revoked_at = $2
WHERE ak.id = $1 AND ak.revoked_at IS NULL;

-- name: RevokeAllApiKeysByCustomerID :exec
UPDATE api_keys AS ak
SET
  revoked_at = $2
WHERE ak.customer_id = $1 AND ak.revoked_at IS NULL;

-- name: GetMostRecentApiKeyByCustomerID :one
SELECT
  sqlc.embed(ak)
FROM api_keys AS ak
WHERE (ak.customer_id, ak.revoked_at) = ($1, NULL)
ORDER BY ak.created_at DESC
LIMIT 1;

-- name: GetLastUsedApiKeyByCustomerID :one
SELECT
  sqlc.embed(ak)
FROM api_keys AS ak
WHERE (ak.customer_id, ak.revoked_at) = ($1, NULL)
ORDER BY ak.last_used_at DESC NULLS LAST
LIMIT 1;

-- Providers

-- name: CreateProvider :one
INSERT INTO providers (
  id, name, created_at
) VALUES (
  $1, $2, $3
) RETURNING *;

-- name: UpdateProvider :exec
UPDATE providers AS p
SET
  name = $2,
  modified_at = $3
WHERE p.id = $1;

-- name: DeleteProvider :exec
UPDATE providers AS p
SET
  deleted_at = $2,
  modified_at = $3
WHERE p.id = $1;

-- name: GetActiveProviders :many
SELECT
  sqlc.embed(p)
FROM providers AS p
WHERE p.deleted_at IS NULL
ORDER BY p.name ASC;

-- name: GetAllProviders :many
SELECT
  sqlc.embed(p)
FROM providers AS p
ORDER BY p.name ASC;

-- name: GetProviderByID :one
SELECT
  sqlc.embed(p)
FROM providers AS p
WHERE p.id = $1
LIMIT 1;

-- name: CreateProviderAccessMethod :one
INSERT INTO provider_access_methods (
  id, provider_id, communication_method, url, created_at
) VALUES (
  $1, $2, $3, $4, $5
) RETURNING *;

-- name: UpdateProviderAccessMethod :exec
UPDATE provider_access_methods AS pam
SET
  communication_method = $2,
  url = $3,
  modified_at = $4
WHERE pam.id = $1;

-- name: DeleteProviderAccessMethod :exec
UPDATE provider_access_methods AS pam
SET
  deleted_at = $2,
  modified_at = $3
WHERE pam.id = $1;

-- name: GetActiveProviderAccessMethodsByProviderID :many
SELECT
  sqlc.embed(pam)
FROM provider_access_methods AS pam
WHERE (pam.provider_id, pam.deleted_at) = ($1, NULL)
ORDER BY pam.created_at ASC;

-- name: CreateProviderConstraint :one
INSERT INTO provider_constraints (
  id, provider_id, max_waypoints_per_request
) VALUES (
  $1, $2, $3
) RETURNING *;

-- name: UpdateProviderConstraint :exec
UPDATE provider_constraints AS pc
SET
  max_waypoints_per_request = $2,
  modified_at = $3
WHERE pc.id = $1;

-- name: GetProviderConstraintByProviderID :one
SELECT
  sqlc.embed(pc)
FROM provider_constraints AS pc
WHERE pc.provider_id = $1
LIMIT 1;

-- name: CreateProviderFeature :one
INSERT INTO provider_features (
  id, provider_id, supports_async_operations
) VALUES (
  $1, $2, $3
) RETURNING *;

-- name: UpdateProviderFeature :exec
UPDATE provider_features AS pf
SET
  supports_async_operations = $2,
  modified_at = $3
WHERE pf.id = $1;

-- name: GetProviderDetailsByProviderID :one
SELECT
  sqlc.embed(p),
  sqlc.embed(pc),
  sqlc.embed(pf)
FROM providers AS p
LEFT JOIN provider_constraints AS pc
  ON p.id = pc.provider_id
LEFT JOIN provider_features AS pf
  ON p.id = pf.provider_id
WHERE p.id = $1
LIMIT 1;

-- Optimizations

-- name: CreateOptimization :one
INSERT INTO optimizations (
  id, customer_id, kind, created_at
) VALUES (
  $1, $2, $3, $4
) RETURNING *;

-- name: CreateOptimizationRun :one
INSERT INTO optimization_runs (
  id, optimization_id, provider_id, status, started_at
) VALUES (
  $1, $2, $3, $4, $5
) RETURNING *;

-- name: UpdateOptimizationRun :exec
UPDATE optimization_runs AS optr
SET
  status = $2,
  cost = $3,
  ended_at = $4
WHERE optr.id = $1;

-- name: GetActiveOptimizationRunsByCustomerID :many
WITH optimization AS (
  SELECT
    o.id
  FROM optimizations AS o
  WHERE o.customer_id = $1
)
SELECT
  sqlc.embed(optr)
FROM optimization_runs AS optr
JOIN optimization AS o
  ON optr.optimization_id = o.id
WHERE optr.ended_at IS NULL
ORDER BY optr.started_at DESC;

-- name: GetOptimizationByID :one
SELECT
  sqlc.embed(o)
FROM optimizations AS o
WHERE o.id = $1
LIMIT 1;
