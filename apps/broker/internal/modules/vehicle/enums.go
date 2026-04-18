package vehicle

type CargoKind string

const (
	CargoKindBulkCargo                      CargoKind = "bulk_cargo"
	CargoKindContainerizedCargo             CargoKind = "containerized_cargo"
	CargoKindRefrigeratedCargo              CargoKind = "refrigerated_cargo"
	CargoKindDryCargo                       CargoKind = "dry_cargo"
	CargoKindAliveCargo                     CargoKind = "alive_cargo"
	CargoKindDangerousCargo                 CargoKind = "dangerous_cargo"
	CargoKindFragileCargo                   CargoKind = "fragile_cargo"
	CargoKindIndivisibleAndExceptionalCargo CargoKind = "indivisible_and_exceptional_cargo"
	CargoKindVehicleCargo                   CargoKind = "vehicle_cargo"
)
