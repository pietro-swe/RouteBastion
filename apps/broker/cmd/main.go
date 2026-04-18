package main

import (
	"context"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/env"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/instrumentation"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/server"
	"go.opentelemetry.io/otel"
)

func gracefulShutdown(apiServer *http.Server, done chan bool) {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	<-ctx.Done()

	log.Println("[Broker] shutting down gracefully, press Ctrl+C again to force")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := apiServer.Shutdown(ctx); err != nil {
		log.Printf("[Broker] server forced to shutdown with error: %v", err)
	}

	log.Println("[Broker] server exiting")

	done <- true
}

func main() {
	ctx := context.Background()

	config, err := env.LoadConfig(".")
	if err != nil {
		log.Fatalf("[Broker] could not load config: %v", err)
	}

	err = config.LoadEncryptionKeyBytes()
	if err != nil {
		log.Fatalf("[Broker] failed to decode encryption key: %v", err)
	}

	exporter, err := instrumentation.InitExporter(config)
	if err != nil {
		log.Fatalf("[Broker] failed to initialize exporter: %v", err)
	}

	tracerProvider := instrumentation.InitTracer(exporter)
	otel.SetTracerProvider(tracerProvider)

	tracer := tracerProvider.Tracer("github.com/pietro-swe/RouteBastion/apps/broker")

	defer func() {
		exporter.Shutdown(ctx)
		tracerProvider.Shutdown(ctx)
	}()

	server := server.NewHTTPServer(config, tracer)

	done := make(chan bool, 1)

	go gracefulShutdown(server, done)

	serverErr := server.ListenAndServe()
	if serverErr != nil && serverErr != http.ErrServerClosed {
		log.Fatalf("[Broker] http server error: %s", serverErr)
	}

	log.Printf("[Broker] Server running at 0.0.0.0:%s, waiting for graceful shutdown...", config.ServerPort)

	<-done
	log.Println("[Broker] graceful shutdown complete.")
}
