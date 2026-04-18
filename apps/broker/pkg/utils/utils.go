package utils

import "github.com/google/uuid"

func GenerateUUIDOrPanic() uuid.UUID {
	id, err := uuid.NewV7()
	if err != nil {
		panic("failed to generate uuid v7")
	}
	return id
}
