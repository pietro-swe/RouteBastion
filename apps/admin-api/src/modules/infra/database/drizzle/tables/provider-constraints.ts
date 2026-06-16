import { sql } from "drizzle-orm";
import { index, integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { providers } from "./providers";

export const providerConstraints = pgTable(
	"provider_constraints",
	{
		id: uuid("id").default(sql`uuidv7()`).primaryKey(),

		providerId: uuid("provider_id")
			.notNull()
			.references(() => providers.id),

		maxWaypointsPerRequest: integer("max_waypoints_per_request").notNull(),
	},
	(table) => [
		index("idx_provider_constraints_provider_id").on(table.providerId),
	],
);
