package provider

import (
	"context"
)

func CreateProvider(
	ctx context.Context,
	store ProvidersStore,
	input CreateProviderInput,
) (*Provider, error) {
	provider := NewProvider(input.Name)
	communicationMethods := make([]*ProviderCommunicationMethod, 0, len(input.CommunicationMethods))
	for _, methodInput := range input.CommunicationMethods {
		communicationMethod := NewProviderCommunicationMethod(
			CommunicationMethod(methodInput.Method),
			methodInput.Url,
		)
		communicationMethods = append(communicationMethods, communicationMethod)
	}
	contraint := NewProviderConstraint(
		input.MaxWaypointsPerRequest,
	)
	feature := NewProviderFeature(
		input.SupportsAsyncOperations,
	)

	_, err := store.Create(ctx, provider, communicationMethods, contraint, feature)
	if err != nil {
		return nil, err
	}

	return provider, nil
}

// func UpdateProvider(
// 	ctx context.Context,
// 	store ProvidersStore,
// 	input shared.UpdateProviderInput,
// ) (*Provider, error) {
// 	parsedID, err := uuid.FromString(input.ID)
// 	if err != nil {
// 		return nil, customerrors.NewApplicationError(
// 			customerrors.ErrCodeInvalidInput,
// 			"invalid provider ID",
// 			err,
// 		)
// 	}

// 	existingProvider, err := store.GetDetailsByID(ctx, parsedID)
// 	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
// 		return nil, customerrors.NewInfrastructureError(
// 			customerrors.ErrCodeDatabaseFailure,
// 			err.Error(),
// 			err,
// 		)
// 	}

// 	if errors.Is(err, pgx.ErrNoRows) {
// 		return nil, customerrors.NewApplicationError(
// 			customerrors.ErrCodeNotFound,
// 			"provider not found",
// 			err,
// 		)
// 	}

// 	now := time.Now()

// 	provider := &Provider{
// 		ID:         uuid.FromStringOrNil(input.ID),
// 		Name:       input.Name,
// 		CreatedAt:  existingProvider.CreatedAt,
// 		ModifiedAt: &now,
// 		DeletedAt:  existingProvider.DeletedAt,
// 	}

// 	updateErr := store.Update(ctx, provider)
// 	if updateErr != nil {
// 		return nil, customerrors.NewInfrastructureError(
// 			customerrors.ErrCodeDatabaseFailure,
// 			updateErr.Error(),
// 			updateErr,
// 		)
// 	}

// 	return provider, nil
// }

// func DeleteProvider(
// 	ctx context.Context,
// 	store ProvidersStore,
// 	id string,
// ) error {
// 	parsedID, err := uuid.FromString(id)
// 	if err != nil {
// 		return customerrors.NewApplicationError(
// 			customerrors.ErrCodeInvalidInput,
// 			"invalid provider ID",
// 			err,
// 		)
// 	}

// 	existingProvider, err := store.GetDetailsByID(ctx, parsedID)
// 	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
// 		return customerrors.NewInfrastructureError(
// 			customerrors.ErrCodeDatabaseFailure,
// 			err.Error(),
// 			err,
// 		)
// 	}

// 	if errors.Is(err, pgx.ErrNoRows) {
// 		return customerrors.NewApplicationError(
// 			customerrors.ErrCodeNotFound,
// 			"provider not found",
// 			err,
// 		)
// 	}

// 	if existingProvider.DeletedAt != nil {
// 		return customerrors.NewApplicationError(
// 			customerrors.ErrCodeConflict,
// 			"provider already deleted",
// 			nil,
// 		)
// 	}

// 	deleteErr := store.Delete(ctx, parsedID)
// 	if deleteErr != nil {
// 		return customerrors.NewInfrastructureError(
// 			customerrors.ErrCodeDatabaseFailure,
// 			deleteErr.Error(),
// 			deleteErr,
// 		)
// 	}

// 	return nil
// }
