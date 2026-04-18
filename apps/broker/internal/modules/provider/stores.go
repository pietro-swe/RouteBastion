package provider

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/infra/db"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/infra/db/generated"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/customerrors"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/dbutils"
)

const createProviderAccessMethod = `-- name: CreateProviderAccessMethod :one
INSERT INTO provider_access_methods (
  id, provider_id, communication_method, url, created_at
) VALUES (
  $1, $2, $3, $4, $5
) RETURNING id, provider_id, communication_method, url, created_at, modified_at, deleted_at
`

type ProvidersStore interface {
	Create(ctx context.Context, provider *Provider, communicationMethods []*ProviderCommunicationMethod, constraint *ProviderConstraint, features *ProviderFeature) (*Provider, error)
	// Update(ctx context.Context, provider *Provider) error
	// Delete(ctx context.Context, id uuid.UUID) error
	// GetDetailsByID(ctx context.Context, id uuid.UUID) (*Provider, error)
	// GetAllAvailable(ctx context.Context) ([]*Provider, error)
	// List(ctx context.Context) ([]*Provider, error)

	CreateCommunicationMethodsBulk(ctx context.Context, queriesWithTx *generated.Queries, pcms []*ProviderCommunicationMethod) error
	createConstraint(ctx context.Context, queriesWithTx *generated.Queries, providerID uuid.UUID, input *ProviderConstraint) error
	createFeatures(ctx context.Context, queriesWithTx *generated.Queries, providerID uuid.UUID, input *ProviderFeature) error
}

type ProvidersStoreImpl struct {
	queries *generated.Queries
}

func NewProvidersStore(provider db.DBProvider) ProvidersStore {
	return &ProvidersStoreImpl{
		queries: generated.New(provider.GetConn()),
	}
}

func (s *ProvidersStoreImpl) Create(ctx context.Context, provider *Provider, communicationMethods []*ProviderCommunicationMethod, constraint *ProviderConstraint, features *ProviderFeature) (*Provider, error) {
	tx, err := dbutils.ExtractTx(ctx)
	if err != nil {
		return nil, customerrors.NewInfrastructureError(
			customerrors.ErrCodeDatabaseFailure,
			err.Error(),
			err,
		)
	}

	queries := s.queries.WithTx(tx)

	params := generated.CreateProviderParams{
		ID:        dbutils.UUIDToPgtypeUUID(provider.ID),
		Name:      provider.Name,
		CreatedAt: dbutils.ConvertTimeToPgtypeTimestamp(time.Now()),
	}

	_, err = queries.CreateProvider(
		ctx,
		params,
	)
	if err != nil {
		return nil, customerrors.NewInfrastructureError(
			customerrors.ErrCodeDatabaseFailure,
			err.Error(),
			err,
		)
	}

	err = s.createConstraint(ctx, queries, provider.ID, constraint)
	if err != nil {
		return nil, err
	}

	err = s.createFeatures(ctx, queries, provider.ID, features)
	if err != nil {
		return nil, err
	}

	return provider, nil
}

func (s *ProvidersStoreImpl) CreateCommunicationMethodsBulk(
	ctx context.Context,
	queriesWithTx *generated.Queries,
	pcms []*ProviderCommunicationMethod,
) error {
	batch := &pgx.Batch{}
	for _, pcm := range pcms {
		batch.Queue(
			createProviderAccessMethod,
			dbutils.UUIDToPgtypeUUID(pcm.ID),
			dbutils.UUIDToPgtypeUUID(pcm.ID),
			string(pcm.Method),
			pcm.Url,
			dbutils.ConvertTimeToPgtypeTimestamp(pcm.CreatedAt),
		)
	}

	tx, err := dbutils.ExtractTx(ctx)
	if err != nil {
		return err
	}

	batchResults := tx.SendBatch(ctx, batch)
	defer batchResults.Close()

	for range pcms {
		_, err := batchResults.Exec()
		if err != nil {
			return err
		}
	}

	return batchResults.Close()
}

func (s *ProvidersStoreImpl) createConstraint(ctx context.Context, queriesWithTx *generated.Queries, providerID uuid.UUID, input *ProviderConstraint) error {
	params := generated.CreateProviderConstraintParams{
		ID:                     dbutils.UUIDToPgtypeUUID(input.ID),
		ProviderID:             dbutils.UUIDToPgtypeUUID(providerID),
		MaxWaypointsPerRequest: int32(input.MaxWaypointsPerRequest),
	}

	_, err := queriesWithTx.CreateProviderConstraint(
		ctx,
		params,
	)
	if err != nil {
		return customerrors.NewInfrastructureError(
			customerrors.ErrCodeDatabaseFailure,
			err.Error(),
			err,
		)
	}

	return nil
}

func (s *ProvidersStoreImpl) createFeatures(ctx context.Context, queriesWithTx *generated.Queries, providerID uuid.UUID, input *ProviderFeature) error {
	params := generated.CreateProviderFeatureParams{
		ID:                      dbutils.UUIDToPgtypeUUID(input.ID),
		ProviderID:              dbutils.UUIDToPgtypeUUID(providerID),
		SupportsAsyncOperations: input.SupportsAsyncOperations,
	}

	_, err := queriesWithTx.CreateProviderFeature(
		ctx,
		params,
	)
	if err != nil {
		return customerrors.NewInfrastructureError(
			customerrors.ErrCodeDatabaseFailure,
			err.Error(),
			err,
		)
	}

	return nil
}
