import { pgEnum } from "drizzle-orm/pg-core";

export const constraintKindEnum = pgEnum("constraint_kind", [
	"budget",
	"availability",
	"performance",
	"security",
	"feature",
]);

export const cargoKindEnum = pgEnum("cargo_kind", [
	"bulk_cargo",
	"containerized_cargo",
	"refrigerated_cargo",
	"dry_cargo",
	"alive_cargo",
	"dangerous_cargo",
	"fragile_cargo",
	"indivisible_and_exceptional_cargo",
	"vehicle_cargo",
]);

export const communicationMethodEnum = pgEnum("communication_method", [
	"http",
	"protocol_buffers",
]);
