package provider

type CreateProviderInput struct {
	Name                    string                          `json:"name" binding:"required,min=3,max=100"`
	CommunicationMethods    []CreatCommunicationMethodInput `json:"communication_methods" binding:"required,dive"`
	MaxWaypointsPerRequest  int                             `json:"max_waypoints_per_request" binding:"required,min=1"`
	SupportsAsyncOperations bool                            `json:"supports_async_operations" binding:"required"`
}

type CreatCommunicationMethodInput struct {
	Method string `json:"method" binding:"required,oneof=http protocol_buffers"`
	Url    string `json:"url" binding:"required,url"`
}
