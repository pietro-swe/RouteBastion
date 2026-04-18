package customer

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/infra/db"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/shared"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/crypto"
	"github.com/pietro-swe/RouteBastion/apps/broker/pkg/customerrors"
	"go.opentelemetry.io/otel/trace"
)

func CreateCustomerHandler(
	encryptionKey []byte,
	tracer trace.Tracer,
	provider db.DBProvider,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		body := shared.SaveCustomerInput{}
		err := c.BindJSON(&body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    customerrors.ErrCodeInvalidInput,
				"message": err.Error(),
			})

			return
		}

		store := NewCustomersStore(provider)
		apiKeyGen := crypto.NewHashGenerator(encryptionKey)
		txManager := db.NewPgTxManager(provider.GetConn())

		// traceCtx, span := tracer.Start(ctx, "customer.CreateCustomer")
		customer, err := CreateCustomer(
			ctx,
			txManager,
			store,
			apiKeyGen,
			body,
		)
		// span.End()
		if err != nil {
			switch e := err.(type) {
			case *customerrors.AppError:
				c.JSON(customerrors.ToHttpStatus(e), gin.H{
					"code":    e.Code,
					"message": e.Msg,
				})
			default:
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    customerrors.ErrUnknown,
					"message": e.Error(),
				})
			}

			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"id":                 customer.ID,
			"name":               customer.Name,
			"businessIdentifier": customer.BusinessIdentifier,
			"createdAt":          customer.CreatedAt,
			"updatedAt":          customer.UpdatedAt,
			"deletedAt":          customer.DeletedAt,
		})
	}
}

func DeleteCustomerHandler(
	tracer trace.Tracer,
	provider db.DBProvider,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		customerID := c.Param("id")

		parsedCustomerID, err := uuid.Parse(customerID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    customerrors.ErrCodeInvalidInput,
				"message": "invalid customer ID format",
			})

			return
		}

		store := NewCustomersStore(provider)
		txManager := db.NewPgTxManager(provider.GetConn())

		// traceCtx, span := tracer.Start(ctx, "customer.DisableCustomer")
		disableErr := DisableCustomer(
			ctx,
			txManager,
			store,
			parsedCustomerID,
		)
		// span.End()

		if disableErr != nil {
			switch e := disableErr.(type) {
			case *customerrors.AppError:
				c.JSON(customerrors.ToHttpStatus(e), gin.H{
					"code":    e.Code,
					"message": e.Msg,
				})
			default:
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    customerrors.ErrUnknown,
					"message": e.Error(),
				})
			}

			return
		}

		c.Status(http.StatusNoContent)
	}
}
