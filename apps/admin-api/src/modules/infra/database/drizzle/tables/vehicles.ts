import { sql } from "drizzle-orm";
import {
	doublePrecision,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { cargoKindEnum } from "../enums/enums";
import { customers } from "./customers";

export const vehicles = pgTable(
	"vehicles",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		customerId: uuid("customer_id")
			.notNull()
			.references(() => customers.id),

		plate: text("plate").notNull(),
		capacity: doublePrecision("capacity").notNull(),

		cargoType: cargoKindEnum("cargo_type").notNull(),

		createdAt: timestamp("created_at").defaultNow().notNull(),
		modifiedAt: timestamp("modified_at", {
			mode: "date",
		})
			.default(sql`NULL`)
			.$type<Date | null>(),
		deletedAt: timestamp("deleted_at", {
			mode: "date",
		})
			.default(sql`NULL`)
			.$type<Date | null>(),
	},
	(table) => [
		index("idx_vehicles_customer_id").on(table.customerId),
		index("idx_vehicles_plate").on(table.plate),

		uniqueIndex("idx_unique_vehicles_customer_id_plate").on(
			table.customerId,
			table.plate,
		),
	],
);
