import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { communicationMethodEnum } from "../enums";
import { providers } from "./providers";
import { sql } from "drizzle-orm";

export const providerAccessMethods = pgTable(
  "provider_access_methods",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id),

    communicationMethod:
      communicationMethodEnum("communication_method").notNull(),

    url: text("url").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    modifiedAt: timestamp("modified_at", {
      mode: "date",
    }).default(sql`NULL`).$type<Date | null>(),
    deletedAt: timestamp("deleted_at", {
      mode: "date",
    }).default(sql`NULL`).$type<Date | null>(),
  },
  (table) => [
    index("idx_provider_access_methods_provider_id").on(
      table.providerId
    ),
  ],
);
