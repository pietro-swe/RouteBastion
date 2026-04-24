import { User } from "@Modules/users/@types";
import { CreateUserInput } from "@Modules/users/inputs/create";
import { UsersRepository } from "@Modules/users/users.repository";
import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DrizzleService } from "../drizzle.service";
import { users } from "../tables/users";

@Injectable()
export class DrizzleUsersRepository extends UsersRepository {
	constructor(private readonly drizzle: DrizzleService) {
		super();
	}

	async getByID(id: string): Promise<User | null> {
		const [user] = await this.drizzle.db
			.select()
			.from(users)
			.where(eq(users.id, id))
			.limit(1);

		return user ?? null;
	}

	async getByEmail(email: string): Promise<User | null> {
		const [user] = await this.drizzle.db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		return user ?? null;
	}

	async create(data: CreateUserInput): Promise<User> {
		const row: typeof users.$inferInsert = {
			name: data.name,
			email: data.email,
			birthDate: new Date(data.birthDate),
			passwordHash: data.password,
		};

		const [created] = await this.drizzle.db
			.insert(users)
			.values(row)
			.returning();

		return created;
	}

	async delete(id: string): Promise<void> {
		await this.drizzle.db.delete(users).where(eq(users.id, id));
	}
}
