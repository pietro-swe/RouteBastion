import { isNull } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const providers = pgTable(
	"providers",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		name: text("name").notNull(),

		createdAt: timestamp("created_at").defaultNow().notNull(),
		modifiedAt: timestamp("modified_at"),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("idx_providers_active").on(table.id).where(isNull(table.deletedAt)),
	],
);
