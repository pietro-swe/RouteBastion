package provider

import (
	"time"

	"github.com/google/uuid"
)

type CommunicationMethod string

const (
	CommunicationMethodHTTP            CommunicationMethod = "http"
	CommunicationMethodProtocolBuffers CommunicationMethod = "protocol_buffers"
)

type Provider struct {
	ID         uuid.UUID
	Name       string
	CreatedAt  time.Time
	ModifiedAt *time.Time
	DeletedAt  *time.Time
}

func NewProvider(name string) *Provider {
	id, err := uuid.NewV7()
	if err != nil {
		panic("failed to generate uuid v7 for provider")
	}

	return &Provider{
		ID:        id,
		Name:      name,
		CreatedAt: time.Now(),
	}
}

func HydrateProvider(id uuid.UUID, name string, createdAt time.Time, modifiedAt, deletedAt *time.Time) *Provider {
	return &Provider{
		ID:         id,
		Name:       name,
		CreatedAt:  createdAt,
		ModifiedAt: modifiedAt,
		DeletedAt:  deletedAt,
	}
}

type ProviderCommunicationMethod struct {
	ID         uuid.UUID
	Method     CommunicationMethod
	Url        string
	CreatedAt  time.Time
	ModifiedAt *time.Time
	DeletedAt  *time.Time
}

func (pcm *ProviderCommunicationMethod) IsDeleted() bool {
	return pcm.DeletedAt != nil
}

func (pcm *ProviderCommunicationMethod) Delete() {
	now := time.Now()
	pcm.DeletedAt = &now
}

func (pcm *ProviderCommunicationMethod) Touch() {
	now := time.Now()
	pcm.ModifiedAt = &now
}

func NewProviderCommunicationMethod(method CommunicationMethod, url string) *ProviderCommunicationMethod {
	id, err := uuid.NewV7()
	if err != nil {
		panic("failed to generate uuid v7 for provider communication method")
	}

	return &ProviderCommunicationMethod{
		ID:        id,
		Method:    method,
		Url:       url,
		CreatedAt: time.Now(),
	}
}

func HydrateProviderCommunicationMethod(id uuid.UUID, method CommunicationMethod, url string, createdAt time.Time, modifiedAt, deletedAt *time.Time) *ProviderCommunicationMethod {
	return &ProviderCommunicationMethod{
		ID:         id,
		Method:     method,
		Url:        url,
		CreatedAt:  createdAt,
		ModifiedAt: modifiedAt,
		DeletedAt:  deletedAt,
	}
}

type ProviderConstraint struct {
	ID                     uuid.UUID
	MaxWaypointsPerRequest int
	ModifiedAt             *time.Time
}

func (pc *ProviderConstraint) Touch() {
	now := time.Now()
	pc.ModifiedAt = &now
}

func NewProviderConstraint(maxWaypointsPerRequest int) *ProviderConstraint {
	id, err := uuid.NewV7()
	if err != nil {
		panic("failed to generate uuid v7 for provider constraint")
	}

	return &ProviderConstraint{
		ID:                     id,
		MaxWaypointsPerRequest: maxWaypointsPerRequest,
	}
}

func HydrateProviderConstraint(id uuid.UUID, maxWaypointsPerRequest int, modifiedAt *time.Time) *ProviderConstraint {
	return &ProviderConstraint{
		ID:                     id,
		MaxWaypointsPerRequest: maxWaypointsPerRequest,
		ModifiedAt:             modifiedAt,
	}
}

type ProviderFeature struct {
	ID                      uuid.UUID
	SupportsAsyncOperations bool
	ModifiedAt              *time.Time
}

func (pc *ProviderFeature) Touch() {
	now := time.Now()
	pc.ModifiedAt = &now
}

func NewProviderFeature(supportsAsyncOperations bool) *ProviderFeature {
	id, err := uuid.NewV7()
	if err != nil {
		panic("failed to generate uuid v7 for provider feature")
	}

	return &ProviderFeature{
		ID:                      id,
		SupportsAsyncOperations: supportsAsyncOperations,
	}
}

func HydrateProviderFeature(id uuid.UUID, supportsAsyncOperations bool, modifiedAt *time.Time) *ProviderFeature {
	return &ProviderFeature{
		ID:                      id,
		SupportsAsyncOperations: supportsAsyncOperations,
		ModifiedAt:              modifiedAt,
	}
}
