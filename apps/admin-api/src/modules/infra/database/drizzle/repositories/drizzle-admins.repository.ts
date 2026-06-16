import { Admin } from "@Modules/admins/@types";
import { AdminsRepository } from "@Modules/admins/admins.repository";
import { CreateAdminInput } from "@Modules/admins/inputs/create";
import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DrizzleService } from "../drizzle.service";
import { admins } from "../tables/admins";

@Injectable()
export class DrizzleAdminsRepository extends AdminsRepository {
	constructor(private readonly drizzle: DrizzleService) {
		super();
	}

	async getByID(id: string): Promise<Admin | null> {
		const admin = await this.drizzle.db.query.admins
			.findFirst({
				where: eq(admins.id, id),
			})
			.execute();

		return admin ?? null;
	}

	async getByEmail(email: string): Promise<Admin | null> {
		const admin = await this.drizzle.db.query.admins
			.findFirst({
				where: eq(admins.email, email),
			})
			.execute();

		return admin ?? null;
	}

	async create(data: CreateAdminInput): Promise<Admin> {
		const row: typeof admins.$inferInsert = {
			name: data.name,
			email: data.email,
			birthDate: new Date(data.birthDate),
			passwordHash: data.password,
		};

		const [created] = await this.drizzle.db
			.insert(admins)
			.values(row)
			.returning();

		return created;
	}

	async delete(id: string): Promise<void> {
		await this.drizzle.db.delete(admins).where(eq(admins.id, id));
	}
}
