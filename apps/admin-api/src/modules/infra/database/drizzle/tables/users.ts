import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	birthDate: timestamp("birth_date").notNull(),
	passwordHash: text("password_hash").notNull(),

	createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
	modifiedAt: timestamp("modified_at", { mode: "date" })
		.default(sql`NULL`)
		.$type<Date | null>(),
	deletedAt: timestamp("deleted_at", { mode: "date" })
		.default(sql`NULL`)
		.$type<Date | null>(),
});
