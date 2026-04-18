package middlewares

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/infra/db"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/infra/db/generated"
)

func WithValidAPIKey(provider db.DBProvider) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		const apiKeyHeader string = "RouteBastion-API-Key"

		apiKey := ctx.GetHeader(apiKeyHeader)

		if apiKey == "" {
			ctx.AbortWithStatusJSON(
				http.StatusUnauthorized,
				gin.H{
					"error": "API Key header is missing",
				},
			)

			return
		}

		queries := generated.New(provider.GetConn())
		_, err := queries.GetCustomerByApiKey(ctx, apiKey)
		if err != nil {
			ctx.AbortWithStatusJSON(
				http.StatusInternalServerError,
				gin.H{
					"error": "Failed to validate API key",
				},
			)

			return
		}

		ctx.Next()
	}
}
