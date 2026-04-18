/*
Package clients provides an interface and concrete implementations for HTTP Clients
*/
package clients

import (
	"context"

	"github.com/pietro-swe/RouteBastion/apps/broker/internal/shared"
)

type RouteOptimizationAPIClient interface {
	OptimizeSync(ctx context.Context, input shared.OptimizationRequestInput) ([]shared.OptimizationRequestOutput, error)
}
