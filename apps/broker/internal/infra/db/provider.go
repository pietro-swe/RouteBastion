package db

import (
	"github.com/jackc/pgx/v5/pgxpool"
)

type DBProvider interface {
	GetConn() *pgxpool.Pool

	// Health returns a map of health status information.
	// The keys and values in the map are service-specific.
	Health() map[string]string

	// Close terminates the database connection.
	// It returns an error if the connection cannot be closed.
	Close() error
}
