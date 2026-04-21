import { isNull, sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { customers } from "./customers";

export const apiKeys = pgTable(
	"api_keys",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		customerId: uuid("customer_id")
			.notNull()
			.references(() => customers.id),
		keyHash: text("key_hash").notNull().unique(),

		revokedAt: timestamp("revoked_at", {
			mode: "date",
		})
			.default(sql`NULL`)
			.$type<Date | null>(),
		lastUsedAt: timestamp("last_used_at", {
			mode: "date",
		})
			.default(sql`NULL`)
			.$type<Date | null>(),
		createdAt: timestamp("created_at", {
			mode: "date",
		})
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_api_keys_customer_id").on(table.customerId),
		index("idx_api_keys_customer_id_created_at_desc_active")
			.on(table.customerId, table.createdAt.desc())
			.where(isNull(table.revokedAt)),
	],
);
