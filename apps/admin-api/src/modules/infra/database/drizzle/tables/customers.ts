import { sql } from "drizzle-orm";
import {
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const customers = pgTable(
	"customers",
	{
		id: uuid("id").default(sql`uuidv7()`).primaryKey(),
		name: text("name").notNull(),
		businessIdentifier: text("business_identifier").notNull(),

		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		modifiedAt: timestamp("modified_at", { mode: "date" })
			.default(sql`NULL`)
			.$type<Date | null>(),
		deletedAt: timestamp("deleted_at", { mode: "date" })
			.default(sql`NULL`)
			.$type<Date | null>(),
	},
	(table) => [
		// Partial unique index so a CNPJ freed by a soft-delete can be reused.
		uniqueIndex("customers_business_identifier_unique")
			.on(table.businessIdentifier)
			.where(sql`${table.deletedAt} IS NULL`),
	],
);
