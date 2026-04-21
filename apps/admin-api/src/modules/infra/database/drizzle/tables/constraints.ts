import { isNull, sql } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { constraintKindEnum } from "../enums/enums";
import { customers } from "./customers";

export const constraints = pgTable(
	"constraints",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		customerId: uuid("customer_id")
			.notNull()
			.references(() => customers.id),

		kind: constraintKindEnum("kind").notNull(),
		value: jsonb("value").notNull(),

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
		index("idx_constraints_customer_id").on(table.customerId),

		uniqueIndex("idx_unique_constraints_customer_id_kind").on(
			table.customerId,
			table.kind,
		),

		index("idx_constraints_active")
			.on(table.customerId)
			.where(isNull(table.deletedAt)),
	],
);
