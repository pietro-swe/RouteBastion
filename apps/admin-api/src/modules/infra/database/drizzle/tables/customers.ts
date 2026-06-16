import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const customers = pgTable("customers", {
	id: uuid("id").default(sql`uuidv7()`).primaryKey(),
	name: text("name").notNull(),
	businessIdentifier: text("business_identifier").notNull().unique(),

	createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
	modifiedAt: timestamp("modified_at", { mode: "date" })
		.default(sql`NULL`)
		.$type<Date | null>(),
	deletedAt: timestamp("deleted_at", { mode: "date" })
		.default(sql`NULL`)
		.$type<Date | null>(),
});
