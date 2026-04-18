package db

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/exaring/otelpgx"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PgxProvider struct {
	db *pgxpool.Pool
}

var (
	database   = ""
	password   = ""
	username   = ""
	port       = ""
	host       = ""
	schema     = ""
	dbInstance *PgxProvider
)

func NewPgxProvider(
	dbDatabase string,
	dbPassword string,
	dbUsername string,
	dbPort string,
	dbHost string,
	dbSchema string,
) DBProvider {
	// Reuse Connection
	if dbInstance != nil {
		return dbInstance
	}

	database = dbDatabase
	password = dbPassword
	username = dbUsername
	port = dbPort
	host = dbHost
	schema = dbSchema

	ctx := context.Background()

	connStr := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable&search_path=%s",
		username,
		password,
		host,
		port,
		database,
		schema,
	)

	cfg, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		log.Fatalf("Unable to parse connection string: %v\n", err)
	}

	cfg.ConnConfig.Tracer = otelpgx.NewTracer()

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		log.Fatalf("Unable to create connection pool: %v\n", err)
	}

	if err := otelpgx.RecordStats(pool); err != nil {
		log.Fatalf("unable to record database stats: %v", err)
	}

	dbInstance = &PgxProvider{
		db: pool,
	}
	return dbInstance
}

func (s *PgxProvider) GetConn() *pgxpool.Pool {
	return s.db
}

// Health checks the health of the database connection by pinging the database.
// It returns a map with keys indicating various health statistics.
func (s *PgxProvider) Health() map[string]string {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	stats := make(map[string]string)

	// Ping the database
	err := s.db.Ping(ctx)
	if err != nil {
		stats["status"] = "down"
		stats["error"] = fmt.Sprintf("db down: %v", err)
		log.Fatalf("db down: %v", err) // Log the error and terminate the program
		return stats
	}

	// Database is up, add more statistics
	stats["status"] = "up"
	stats["message"] = "It's healthy"

	// Get database stats (like open connections, in use, idle, etc.)
	dbStats := s.db.Stat()
	stats["maxOpenConnections"] = strconv.Itoa(
		int(dbStats.MaxConns()),
	) // Maximum number of open connections
	stats["totalConnections"] = strconv.Itoa(
		int(dbStats.TotalConns()),
	) // Total number of established connections
	stats["connectionsInUse"] = strconv.Itoa(
		int(dbStats.AcquiredConns()),
	) // Number of connections currently in use
	stats["idle"] = strconv.Itoa(
		int(dbStats.IdleConns()),
	) // Number of idle connections
	stats["waitCount"] = strconv.FormatInt(
		dbStats.AcquireCount(),
		10,
	) // Total number of successful acquires from the pool
	stats["waitDuration"] = dbStats.AcquireDuration().
		String()
		// Total duration of all successful acquires
	stats["maxIdleClosed"] = strconv.FormatInt(
		dbStats.MaxIdleDestroyCount(),
		10,
	) // Connections closed due to exceeding MaxConnIdleTime
	stats["maxLifetimeClosed"] = strconv.FormatInt(
		dbStats.MaxLifetimeDestroyCount(),
		10,
	) // Connections closed due to exceeding MaxConnLifetime

	// Evaluate stats to provide a health message
	if dbStats.TotalConns() > 40 {
		stats["message"] = "The database is experiencing heavy load."
	}

	if dbStats.EmptyAcquireCount() > 1000 {
		stats["message"] = "The database has a high number of wait events, indicating potential bottlenecks."
	}

	if dbStats.MaxIdleDestroyCount() > int64(dbStats.TotalConns())/2 {
		stats["message"] = "Many idle connections are being closed; consider revising the connection pool settings."
	}

	if dbStats.MaxLifetimeDestroyCount() > int64(dbStats.TotalConns())/2 {
		stats["message"] = "Many connections are being closed due to max lifetime; consider increasing max lifetime or revising the connection usage pattern."
	}

	return stats
}

// Close closes the database connection.
// It logs a message indicating the disconnection from the specific database.
func (s *PgxProvider) Close() error {
	log.Printf("Disconnected from database: %s", database)
	s.db.Close()
	return nil
}
