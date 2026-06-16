import { sql } from "drizzle-orm";
import { boolean, index, pgTable, uuid } from "drizzle-orm/pg-core";
import { providers } from "./providers";

export const providerFeatures = pgTable(
	"provider_features",
	{
		id: uuid("id").default(sql`uuidv7()`).primaryKey(),

		providerId: uuid("provider_id")
			.notNull()
			.references(() => providers.id),

		supportsAsyncOperations: boolean("supports_async_operations").notNull(),
	},
	(table) => [index("idx_provider_features_provider_id").on(table.providerId)],
);
