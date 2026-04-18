package customer

import (
	"time"

	"github.com/google/uuid"
)

type Customer struct {
	ID                 uuid.UUID
	BusinessIdentifier string
	Name               string
	CreatedAt          time.Time
	UpdatedAt          *time.Time
	DeletedAt          *time.Time
}

func (c *Customer) IsDeleted() bool {
	return c.DeletedAt != nil
}

func (c *Customer) Delete() {
	now := time.Now()
	c.DeletedAt = &now
}

func NewCustomer(
	name,
	businessIdentifier string,
	createdAt time.Time,
	updatedAt,
	deletedAt *time.Time,
) *Customer {
	id, err := uuid.NewV7()
	if err != nil {
		panic("failed to generate UUID: " + err.Error())
	}

	return &Customer{
		ID:                 id,
		BusinessIdentifier: businessIdentifier,
		Name:               name,
		CreatedAt:          createdAt,
		UpdatedAt:          updatedAt,
		DeletedAt:          deletedAt,
	}
}

func HydrateCustomer(
	id uuid.UUID,
	businessIdentifier,
	name string,
	createdAt time.Time,
	updatedAt,
	deletedAt *time.Time,
) *Customer {
	return &Customer{
		ID:                 id,
		BusinessIdentifier: businessIdentifier,
		Name:               name,
		CreatedAt:          createdAt,
		UpdatedAt:          updatedAt,
		DeletedAt:          deletedAt,
	}
}

type APIKey struct {
	ID         uuid.UUID
	CustomerID uuid.UUID
	KeyHash    string
	CreatedAt  time.Time
	LastUsedAt *time.Time
	RevokedAt  *time.Time
}

func (k *APIKey) IsRevoked() bool {
	return k.RevokedAt != nil
}

func (k *APIKey) Revoke() {
	now := time.Now()
	k.RevokedAt = &now
}

func (k *APIKey) TouchLastUsedAt() {
	now := time.Now()
	k.LastUsedAt = &now
}

func NewAPIKey(
	customerID uuid.UUID,
	keyHash string,
	createdAt time.Time,
	lastUsedAt,
	revokedAt *time.Time,
) *APIKey {
	id, err := uuid.NewV7()
	if err != nil {
		panic("failed to generate UUID: " + err.Error())
	}

	return &APIKey{
		ID:         id,
		CustomerID: customerID,
		KeyHash:    keyHash,
		CreatedAt:  createdAt,
		LastUsedAt: lastUsedAt,
		RevokedAt:  revokedAt,
	}
}

func HydrateAPIKey(
	id,
	customerID uuid.UUID,
	keyHash string,
	createdAt time.Time,
	lastUsedAt,
	revokedAt *time.Time,
) *APIKey {
	return &APIKey{
		ID:         id,
		CustomerID: customerID,
		KeyHash:    keyHash,
		CreatedAt:  createdAt,
		LastUsedAt: lastUsedAt,
		RevokedAt:  revokedAt,
	}
}
