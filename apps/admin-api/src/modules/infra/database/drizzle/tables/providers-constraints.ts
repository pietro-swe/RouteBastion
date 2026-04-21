import { sql } from "drizzle-orm";
import { index, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { providers } from "./providers";

export const providersConstraints = pgTable(
	"providers_constraints",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		providerId: uuid("provider_id")
			.notNull()
			.references(() => providers.id),

		maxWaypointsPerRequest: integer("max_waypoints_per_request").notNull(),

		modifiedAt: timestamp("modified_at", {
			mode: "date",
		})
			.default(sql`NULL`)
			.$type<Date | null>(),
	},
	(table) => [
		index("idx_provider_constraints_provider_id").on(table.providerId),
	],
);
