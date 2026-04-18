/*
Package server provides an unified interface that represents the application Server
*/
package server

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/infra/db"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/modules/customer"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/modules/health"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/modules/optimization"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/modules/provider"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/env"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/httputils"

	// "github.com/pietro-swe/RouteBastion/apps/broker/pkg/middlewares"

	"go.opentelemetry.io/otel/trace"
)

type Server struct {
	Port int

	EncryptionKey []byte
	Trace         trace.Tracer
	DB            db.DBProvider
}

func NewHTTPServer(config env.AppEnvConfig, trace trace.Tracer) *http.Server {
	port, err := strconv.Atoi(config.ServerPort)
	if err != nil {
		log.Fatalf("could not cast server port: %v", err)
	}

	provider := db.NewPgxProvider(
		config.DBDatabase,
		config.DBPassword,
		config.DBUsername,
		config.DBPort,
		config.DBHost,
		config.DBSchema,
	)

	newServer := &Server{
		Port:          port,
		EncryptionKey: config.EncryptionKeyBytes,
		Trace:         trace,
		DB:            provider,
	}

	newServer.registerCustomValidators()

	serverAddress := fmt.Sprintf("0.0.0.0:%d", newServer.Port)

	server := &http.Server{
		Addr:         serverAddress,
		Handler:      newServer.registerRoutes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	return server
}

func (s *Server) registerCustomValidators() {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		v.RegisterValidation("cargoKind", httputils.IsCargoKindValid)
	}
}

func (s *Server) registerRoutes() http.Handler {
	router := gin.New()

	// router.Use(otelgin.Middleware("Broker-REST-API"))

	router.GET(
		"/health",
		health.HealthCheckHandler(s.DB),
	)

	v1 := router.Group("/v1")
	{
		optimizations := v1.Group("/optimizations")
		// optimizations.Use(middlewares.WithValidAPIKey(s.DB))
		{
			optimizations.GET(
				"/sync",
				optimization.OptimizeSyncHandler(s.Trace),
			)
		}

		backoffice := v1.Group("/back-office")
		{
			customers := backoffice.Group("/customers")
			{
				customers.POST(
					"/",
					customer.CreateCustomerHandler(
						s.EncryptionKey,
						s.Trace,
						s.DB,
					),
				)

				customers.DELETE(
					"/:customerId",
					customer.DeleteCustomerHandler(s.Trace, s.DB),
				)
			}

			providers := backoffice.Group("/providers")
			{
				providers.POST(
					"/",
					provider.CreateProviderHandler(s.DB),
				)

				// providers.PUT(
				// 	"/:id",
				// 	provider.UpdateProviderHandler(s.DB),
				// )

				// providers.DELETE(
				// 	"/:id",
				// 	provider.DeleteProviderHandler(s.DB),
				// )
			}
		}
	}

	return router
}
