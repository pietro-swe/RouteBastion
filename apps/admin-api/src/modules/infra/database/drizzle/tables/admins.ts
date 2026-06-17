import { sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { adminStatusEnum } from "../enums/enums";

export const admins = pgTable("admins", {
	id: uuid("id").default(sql`uuidv7()`).primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	birthDate: timestamp("birth_date", { mode: "date" }).notNull(),
	passwordHash: text("password_hash").$type<string | null>(),
	status: adminStatusEnum("status").default("ACTIVE").notNull(),
	statusChangedAt: timestamp("status_changed_at", { mode: "date" })
		.default(sql`NULL`)
		.$type<Date | null>(),
	isPasswordCreationPending: boolean("is_password_creation_pending")
		.default(true)
		.notNull(),

	createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
	modifiedAt: timestamp("modified_at", { mode: "date" })
		.default(sql`NULL`)
		.$type<Date | null>(),
});
