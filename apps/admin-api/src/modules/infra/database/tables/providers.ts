import { isNull } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

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
    index("idx_providers_active")
      .on(table.id)
      .where(isNull(table.deletedAt))
  ]
);
