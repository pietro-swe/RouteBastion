package customer

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/infra/db"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/infra/db/generated"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/customerrors"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/dbutils"
)

type CustomersStore interface {
	Create(ctx context.Context, input *Customer) error
	Delete(ctx context.Context, customerID uuid.UUID) error
	GetByBusinessIdentifier(ctx context.Context, businessIdentifier string) (*Customer, error)
	GetByID(ctx context.Context, customerID uuid.UUID) (*Customer, error)
	CreateAPIKey(ctx context.Context, input *APIKey) (*APIKey, error)
	RevokeAllAPIKeysByCustomerID(ctx context.Context, customerID uuid.UUID) error
}

type CustomersStoreImpl struct {
	queries *generated.Queries
}

func NewCustomersStore(
	provider db.DBProvider,
) CustomersStore {
	return &CustomersStoreImpl{
		queries: generated.New(provider.GetConn()),
	}
}

func (s *CustomersStoreImpl) Create(ctx context.Context, input *Customer) error {
	tx, err := dbutils.ExtractTx(ctx)
	if err != nil {
		return customerrors.NewInfrastructureError(
			customerrors.ErrCodeDatabaseFailure,
			err.Error(),
			err,
		)
	}

	q := s.queries.WithTx(tx)

	_, err = q.CreateCustomer(ctx, generated.CreateCustomerParams{
		ID:                 dbutils.UUIDToPgtypeUUID(input.ID),
		Name:               input.Name,
		BusinessIdentifier: input.BusinessIdentifier,
	})

	return err
}

func (s *CustomersStoreImpl) Delete(ctx context.Context, customerID uuid.UUID) error {
	tx, err := dbutils.ExtractTx(ctx)
	if err != nil {
		return err
	}

	parsedID := dbutils.UUIDToPgtypeUUID(customerID)

	q := s.queries.WithTx(tx)

	return q.DeleteCustomer(ctx, generated.DeleteCustomerParams{
		ID:        parsedID,
		DeletedAt: dbutils.ConvertTimeToPgtypeTimestamp(time.Now()),
	})
}

func (s *CustomersStoreImpl) GetByBusinessIdentifier(
	ctx context.Context,
	businessIdentifier string,
) (*Customer, error) {
	row, err := s.queries.GetCustomerByBusinessIdentifier(
		ctx,
		businessIdentifier,
	)
	if err != nil {
		return nil, err
	}

	parsedID, err := dbutils.PgtypeUUIDToUUID(row.ModelCustomer.ID)
	if err != nil {
		return nil, err
	}

	return HydrateCustomer(
		parsedID,
		row.ModelCustomer.BusinessIdentifier,
		row.ModelCustomer.Name,
		row.ModelCustomer.CreatedAt.Time,
		nil,
		nil,
	), nil
}

func (s *CustomersStoreImpl) GetByID(ctx context.Context, customerID uuid.UUID) (*Customer, error) {
	pgID := dbutils.UUIDToPgtypeUUID(customerID)

	row, err := s.queries.GetCustomerByID(ctx, pgID)
	if err != nil && !dbutils.IsNoRowsError(err) {
		return nil, customerrors.NewApplicationError(
			customerrors.ErrCodeDatabaseFailure,
			err.Error(),
			err,
		)
	}

	if dbutils.IsNoRowsError(err) {
		return nil, customerrors.NewApplicationError(
			customerrors.ErrCodeNotFound,
			"customer not found",
			err,
		)
	}

	parsedID, err := dbutils.PgtypeUUIDToUUID(row.ModelCustomer.ID)
	if err != nil {
		return nil, err
	}

	return HydrateCustomer(
		parsedID,
		row.ModelCustomer.BusinessIdentifier,
		row.ModelCustomer.Name,
		row.ModelCustomer.CreatedAt.Time,
		nil,
		nil,
	), nil
}

func (s *CustomersStoreImpl) CreateAPIKey(ctx context.Context, input *APIKey) (*APIKey, error) {
	tx, err := dbutils.ExtractTx(ctx)
	if err != nil {
		return nil, err
	}

	q := s.queries.WithTx(tx)

	row, err := q.CreateApiKey(ctx, generated.CreateApiKeyParams{
		ID:         dbutils.UUIDToPgtypeUUID(input.ID),
		CustomerID: dbutils.UUIDToPgtypeUUID(input.CustomerID),
		KeyHash:    input.KeyHash,
		CreatedAt:  dbutils.ConvertTimeToPgtypeTimestamp(input.CreatedAt),
	})
	if err != nil {
		return nil, err
	}

	parsedID, err := dbutils.PgtypeUUIDToUUID(row.ID)
	if err != nil {
		return nil, err
	}

	parsedCustomerID, err := dbutils.PgtypeUUIDToUUID(row.CustomerID)
	if err != nil {
		return nil, err
	}

	var lastUsedAt *time.Time
	if row.LastUsedAt.Valid {
		lastUsedAt = &row.LastUsedAt.Time
	}

	var revokedAt *time.Time
	if row.RevokedAt.Valid {
		revokedAt = &row.RevokedAt.Time
	}

	hydrated := HydrateAPIKey(
		parsedID,
		parsedCustomerID,
		row.KeyHash,
		row.CreatedAt.Time,
		lastUsedAt,
		revokedAt,
	)

	return hydrated, nil
}

func (s *CustomersStoreImpl) RevokeAllAPIKeysByCustomerID(ctx context.Context, customerID uuid.UUID) error {
	tx, err := dbutils.ExtractTx(ctx)
	if err != nil {
		return err
	}

	q := s.queries.WithTx(tx)

	return q.RevokeAllApiKeysByCustomerID(ctx, generated.RevokeAllApiKeysByCustomerIDParams{
		CustomerID: dbutils.UUIDToPgtypeUUID(customerID),
		RevokedAt:  dbutils.ConvertTimeToPgtypeTimestamp(time.Now()),
	})
}

// func (s *CustomersStoreImpl) GetByAPIKey(ctx context.Context, apiKey string) (*Customer, error) {
// 	row, err := s.queries.GetCustomerByApiKey(ctx, apiKey)
// 	if err != nil {
// 		return nil, err
// 	}

// 	return NewCustomer(
// 		row.ModelCustomer.ID,
// 		row.ModelCustomer.BusinessIdentifier,
// 		row.ModelCustomer.Name,
// 		row.ModelApiKey.Key,
// 		row.ModelCustomer.CreatedAt.Time,
// 		nil,
// 		nil,
// 	), nil
// }
