package customer

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/shared"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/crypto"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/customerrors"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/dbutils"
)

func CreateCustomer(
	ctx context.Context,
	tx dbutils.TxManager,
	store CustomersStore,
	keyGen crypto.HashGenerator,
	input shared.SaveCustomerInput,
) (*Customer, error) {
	_, err := store.GetByBusinessIdentifier(ctx, input.BusinessIdentifier)
	if err != nil {
		return nil, err
	}

	return dbutils.WithinTransactionReturning(
		ctx,
		tx,
		func(txCtx context.Context) (*Customer, error) {
			rawKey, err := uuid.NewV7()
			if err != nil {
				return nil, customerrors.NewInfrastructureError(
					customerrors.ErrCodeEncryptionFailure,
					err.Error(),
					err,
				)
			}

			hashed, err := keyGen.Generate(rawKey.String())
			if err != nil {
				return nil, customerrors.NewInfrastructureError(
					customerrors.ErrCodeEncryptionFailure,
					err.Error(),
					err,
				)
			}

			now := time.Now()

			customer := NewCustomer(
				input.Name,
				input.BusinessIdentifier,
				now,
				nil,
				nil,
			)

			err = store.Create(txCtx, customer)
			if err != nil {
				return nil, customerrors.NewInfrastructureError(
					customerrors.ErrCodeDatabaseFailure,
					err.Error(),
					err,
				)
			}

			apiKey := NewAPIKey(
				customer.ID,
				hashed,
				now,
				nil,
				nil,
			)

			_, err = store.CreateAPIKey(txCtx, apiKey)
			if err != nil {
				return nil, customerrors.NewInfrastructureError(
					customerrors.ErrCodeDatabaseFailure,
					err.Error(),
					err,
				)
			}

			return customer, nil
		},
	)
}

// func GetOneCustomerByAPIKey(
// 	ctx context.Context,
// 	store CustomersStore,
// 	apiKey string,
// ) (*Customer, error) {
// 	customer, err := store.GetByAPIKey(ctx, apiKey)

// 	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
// 		return nil, customerrors.NewInfrastructureError(
// 			customerrors.ErrCodeDatabaseFailure,
// 			err.Error(),
// 			err,
// 		)
// 	}

// 	if customer == nil {
// 		return nil, nil
// 	}

// 	return customer, nil
// }

func DisableCustomer(
	ctx context.Context,
	tx dbutils.TxManager,
	store CustomersStore,
	input uuid.UUID,
) error {
	_, err := store.GetByID(ctx, input)
	if err != nil {
		return err
	}

	deletionErr := dbutils.WithinTransactionReturningErr(
		ctx,
		tx,
		func(txCtx context.Context) error {
			err := store.Delete(txCtx, input)
			if err != nil {
				return customerrors.NewInfrastructureError(
					customerrors.ErrCodeDatabaseFailure,
					err.Error(),
					err,
				)
			}

			err = store.RevokeAllAPIKeysByCustomerID(txCtx, input)
			if err != nil {
				return customerrors.NewInfrastructureError(
					customerrors.ErrCodeDatabaseFailure,
					err.Error(),
					err,
				)
			}

			return nil
		},
	)

	return deletionErr
}
