/*
Package instrumentation provides utilities related to Observability
*/
package instrumentation

import (
	"context"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
	otelTrace "go.opentelemetry.io/otel/trace"
)

type ctxKey string

const tracerKey ctxKey = "tracer"

func InitTracer(exporter *otlptrace.Exporter) *trace.TracerProvider {
	tracer := trace.NewTracerProvider(
		trace.WithBatcher(
			exporter,
			trace.WithMaxExportBatchSize(trace.DefaultMaxExportBatchSize),
			trace.WithBatchTimeout(trace.DefaultScheduleDelay * time.Millisecond),
			trace.WithMaxExportBatchSize(trace.DefaultMaxExportBatchSize),
		),
		trace.WithResource(
			resource.NewWithAttributes(
				semconv.SchemaURL,
				semconv.ServiceNameKey.String("Broker-API"),
			),
		),
	)

	otel.SetTracerProvider(tracer)

	return tracer
}


func InjectTracer(ctx context.Context, tracer otelTrace.Tracer) context.Context {
	return context.WithValue(ctx, tracerKey, tracer)
}

func ExtractTracer(ctx context.Context) otelTrace.Tracer {
	if t, ok := ctx.Value(tracerKey).(otelTrace.Tracer); ok {
		return t
	}

	return otel.Tracer("default")
}

