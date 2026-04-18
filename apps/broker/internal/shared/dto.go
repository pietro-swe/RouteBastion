package shared

type SaveCustomerInput struct {
	Name               string `json:"name" binding:"required,min=3"`
	BusinessIdentifier string `json:"businessIdentifier" binding:"required,min=1"`
}

type Point struct {
	Latitude  float64 `json:"latitude" binding:"required,number"`
	Longitude float64 `json:"longitude" binding:"required,number"`
}

type Shipment struct {
	ID       string `json:"id" binding:"required"`
	Pickup   Point
	Delivery Point
}

type Vehicle struct {
	ID    string `json:"id" binding:"required"`
	Start Point  `json:"start" binding:"required"`
	End   *Point `json:"end" binding:"required"`
}

type RouteStep struct {
	ShipmentID string        `json:"shipmentID"`
	Kind       RouteStepKind `json:"kind"`
	Location   Point         `json:"location"`
}

type OptimizationRequestInput struct {
	Shipments []Shipment `json:"shipments" binding:"required"`
	Vehicles  []Vehicle  `json:"vehicles" binding:"required"`
}

type OptimizationRequestOutput struct {
	VehicleID                 string      `json:"vehicleID"`
	Steps                     []RouteStep `json:"steps"`
	TotalDistanceInKilometers float64     `json:"totalDistanceInKilometers"`
}

type GoogleFleetRoutingResponse struct {
	Routes []GoogleRoute `json:"routes"`
}

type GoogleRoute struct {
	VehicleIndex             int           `json:"vehicleIndex"`
	RouteTotalDistanceMeters int           `json:"routeTotalDistanceMeters"`
	Visits                   []GoogleVisit `json:"visits"`
}

type GoogleVisit struct {
	ShipmentIndex int            `json:"shipmentIndex"`
	Type          string         `json:"type"` // "PICKUP" or "DELIVERY"
	Waypoint      GoogleWaypoint `json:"waypoint"`
}

type GoogleWaypoint struct {
	LatLng GoogleLatLng `json:"latLng"`
}

type GoogleLatLng struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}
