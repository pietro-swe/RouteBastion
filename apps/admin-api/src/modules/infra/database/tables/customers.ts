import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  businessIdentifier: text("business_identifier").notNull().unique(),
  contactEmail: text("contact_email").notNull(),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  modifiedAt: timestamp("modified_at", { mode: "date" }).default(sql`NULL`).$type<Date | null>(),
  deletedAt: timestamp("deleted_at", { mode: "date" }).default(sql`NULL`).$type<Date | null>(),
});
