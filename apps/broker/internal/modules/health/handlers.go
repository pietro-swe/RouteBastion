package health

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/infra/db"
)

func HealthCheckHandler(provider db.DBProvider) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{
			"database": provider.Health(),
		})
	}
}
