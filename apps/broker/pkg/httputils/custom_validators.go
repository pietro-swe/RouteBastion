package httputils

import (
	"github.com/go-playground/validator/v10"
	"github.com/pietro-swe/RouteBastion/apps/broker/internal/modules/vehicle"
)

func IsCargoKindValid(fl validator.FieldLevel) bool {
	cargoKind := fl.Field().String()
	switch vehicle.CargoKind(cargoKind) {
	case vehicle.CargoKindBulkCargo,
		vehicle.CargoKindContainerizedCargo,
		vehicle.CargoKindRefrigeratedCargo,
		vehicle.CargoKindDryCargo,
		vehicle.CargoKindAliveCargo,
		vehicle.CargoKindDangerousCargo,
		vehicle.CargoKindFragileCargo,
		vehicle.CargoKindIndivisibleAndExceptionalCargo,
		vehicle.CargoKindVehicleCargo:
		return true
	}

	return false
}
