package customer

type SaveCustomerInput struct {
	Name               string `json:"name" binding:"required,min=3"`
	BusinessIdentifier string `json:"businessIdentifier" binding:"required,min=1"`
}
