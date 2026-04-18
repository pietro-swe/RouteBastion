import { pgTable, uuid, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { providers } from "./providers";
import { sql } from "drizzle-orm";

export const providerFeatures = pgTable(
  "provider_features",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id),

    supportsAsyncOperations: boolean(
      "supports_async_operations"
    ).notNull(),

    modifiedAt: timestamp("modified_at", {
      mode: "date",
    }).default(sql`NULL`).$type<Date | null>(),
  },
  (table) => [
    index("idx_provider_features_provider_id").on(
      table.providerId
    )
  ],
);
