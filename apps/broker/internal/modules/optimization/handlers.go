package optimization

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/otel/trace"
)

func OptimizeSyncHandler(
	tracer trace.Tracer,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// traceCtx, span := tracer.Start(ctx, "optimization.OptimizeSync")
		_, err := OptimizeSync(ctx)
		// span.End()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})

			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
		})
	}
}
