package implementations

import (
	"context"

	routeoptimization "cloud.google.com/go/maps/routeoptimization/apiv1"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/shared"
	"google.golang.org/genproto/googleapis/type/latlng"

	rpb "cloud.google.com/go/maps/routeoptimization/apiv1/routeoptimizationpb"
)

type GoogleCloudClient struct{}

func (gcc *GoogleCloudClient) OptimizeSync(ctx context.Context, input shared.OptimizationRequestInput) ([]shared.OptimizationRequestOutput, error) {
	c, err := routeoptimization.NewClient(ctx)
	if err != nil {
		return make([]shared.OptimizationRequestOutput, 0), err
	}
	defer c.Close()

	shipments, vehicles := gcc.mapInternalInputToGoogleInput(input)

	req := &rpb.OptimizeToursRequest{
		Parent: "projects/routebastion",
		Model: &rpb.ShipmentModel{
			Shipments: shipments,
			Vehicles:  vehicles,
		},
	}

	result, err := c.OptimizeTours(ctx, req)
	if err != nil {
		return make([]shared.OptimizationRequestOutput, 0), err
	}

	mapped, err := gcc.mapGoogleResponseToInternal(result, input)
	if err != nil {
		return make([]shared.OptimizationRequestOutput, 0), err
	}

	return mapped, nil
}

func (gcc *GoogleCloudClient) mapInternalInputToGoogleInput(
	input shared.OptimizationRequestInput,
) (
	[]*rpb.Shipment,
	[]*rpb.Vehicle,
) {
	shipments := make([]*rpb.Shipment, 1)
	vehicles := make([]*rpb.Vehicle, 1)

	for _, shipment := range input.Shipments {
		pickup := make([]*rpb.Shipment_VisitRequest, 1)
		delivery := make([]*rpb.Shipment_VisitRequest, 1)

		pickup = append(pickup, &rpb.Shipment_VisitRequest{
			ArrivalLocation: &latlng.LatLng{
				Latitude:  shipment.Pickup.Latitude,
				Longitude: shipment.Pickup.Longitude,
			},
		})

		delivery = append(delivery, &rpb.Shipment_VisitRequest{
			ArrivalLocation: &latlng.LatLng{
				Latitude:  shipment.Delivery.Latitude,
				Longitude: shipment.Delivery.Longitude,
			},
		})

		shipments = append(shipments, &rpb.Shipment{
			Label:       shipment.ID,
			DisplayName: shipment.ID,
			Pickups:     pickup,
			Deliveries:  delivery,
		})
	}

	for _, vehicle := range input.Vehicles {
		var endLocation *latlng.LatLng = nil

		if vehicle.End != nil {
			endLocation = &latlng.LatLng{
				Latitude:  vehicle.End.Latitude,
				Longitude: vehicle.End.Longitude,
			}
		}

		vehicles = append(vehicles, &rpb.Vehicle{
			Label: vehicle.ID,
			StartLocation: &latlng.LatLng{
				Latitude:  vehicle.Start.Latitude,
				Longitude: vehicle.Start.Longitude,
			},
			EndLocation: endLocation,
		})
	}

	return shipments, vehicles
}

func (gcc *GoogleCloudClient) mapGoogleResponseToInternal(
	googleResponse *rpb.OptimizeToursResponse,
	input shared.OptimizationRequestInput,
) ([]shared.OptimizationRequestOutput, error) {
	shipmentIndexToID := make(map[int]string)
	for i, s := range input.Shipments {
		shipmentIndexToID[i] = s.ID
	}

	shipmentToID := make(map[string]shared.Shipment)
	for _, s := range input.Shipments {
		shipmentToID[s.ID] = s
	}

	vehicleIndexToID := make(map[int]string)
	for i, v := range input.Vehicles {
		vehicleIndexToID[i] = v.ID
	}

	var results []shared.OptimizationRequestOutput

	for _, route := range googleResponse.Routes {
		vehicleID := vehicleIndexToID[int(route.VehicleIndex)]

		steps := make([]shared.RouteStep, 0, len(route.Visits))
		for _, visit := range route.Visits {
			shipmentID := shipmentIndexToID[int(visit.ShipmentIndex)]
			requestShipment := shipmentToID[shipmentID]
			var stepType shared.RouteStepKind

			if visit.IsPickup {
				stepType = shared.Pickup
			} else {
				stepType = shared.Delivery
			}

			var lat float64
			var long float64

			if visit.IsPickup {
				lat = requestShipment.Pickup.Latitude
				long = requestShipment.Pickup.Longitude
			} else {
				lat = requestShipment.Delivery.Latitude
				long = requestShipment.Delivery.Latitude
			}

			steps = append(steps, shared.RouteStep{
				ShipmentID: shipmentID,
				Kind:       stepType,
				Location: shared.Point{
					Latitude:  lat,
					Longitude: long,
				},
			})
		}

		results = append(results, shared.OptimizationRequestOutput{
			VehicleID:                 vehicleID,
			Steps:                     steps,
			TotalDistanceInKilometers: route.Metrics.TravelDistanceMeters / 1000.0, // meters → km
		})
	}

	return results, nil
}
