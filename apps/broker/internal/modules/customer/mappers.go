package customer

import (
	"time"

	"github.com/pietro-swe/RouteBastion/apps/broker/internal/infra/db/generated"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/customerrors"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/dbutils"
)

func APIKeyFromDatabaseToDomain(dbModel *generated.ModelApiKey) (*APIKey, error) {
	parsedID, err := dbutils.PgtypeUUIDToUUID(dbModel.ID)
	if err != nil {
		return nil, customerrors.NewDomainError(
			customerrors.ErrCodeInvalidData,
			"invalid API key ID",
			err,
		)
	}

	parsedCustomerID, err := dbutils.PgtypeUUIDToUUID(dbModel.CustomerID)
	if err != nil {
		return nil, customerrors.NewDomainError(
			customerrors.ErrCodeInvalidData,
			"invalid customer ID",
			err,
		)
	}

	var lastUsedAt *time.Time
	if dbModel.LastUsedAt.Valid {
		lastUsedAt = &dbModel.LastUsedAt.Time
	}

	var revokedAt *time.Time
	if dbModel.RevokedAt.Valid {
		revokedAt = &dbModel.RevokedAt.Time
	}

	return HydrateAPIKey(
		parsedID,
		parsedCustomerID,
		dbModel.KeyHash,
		dbModel.CreatedAt.Time,
		lastUsedAt,
		revokedAt,
	), nil
}
