import type {
	Admin,
	CreateAdminData,
	ListAdminsParams,
	ListAdminsResult,
	UpdateAdminData,
} from "@Modules/admins/@types";
import { AdminsRepository } from "@Modules/admins/admins.repository";
import { Injectable } from "@nestjs/common";
import type { AdminStatus } from "@route-bastion/contracts";
import { and, desc, eq, ilike, lt, or, type SQL } from "drizzle-orm";
import { DrizzleService } from "../drizzle.service";
import { admins } from "../tables/admins";

@Injectable()
export class DrizzleAdminsRepository extends AdminsRepository {
	constructor(private readonly drizzle: DrizzleService) {
		super();
	}

	async getByID(id: string): Promise<Admin | null> {
		const [admin] = await this.drizzle.db
			.select()
			.from(admins)
			.where(eq(admins.id, id))
			.limit(1);

		return admin ?? null;
	}

	async getByEmail(email: string): Promise<Admin | null> {
		const [admin] = await this.drizzle.db
			.select()
			.from(admins)
			.where(eq(admins.email, email))
			.limit(1);

		return admin ?? null;
	}

	async list(params: ListAdminsParams): Promise<ListAdminsResult> {
		const conditions: (SQL | undefined)[] = [];

		if (params.search) {
			conditions.push(ilike(admins.name, `%${params.search}%`));
		}

		if (params.cursor) {
			conditions.push(
				or(
					lt(admins.createdAt, params.cursor.createdAt),
					and(
						eq(admins.createdAt, params.cursor.createdAt),
						lt(admins.id, params.cursor.id),
					),
				),
			);
		}

		const rows = await this.drizzle.db
			.select()
			.from(admins)
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(desc(admins.createdAt), desc(admins.id))
			.limit(params.limit + 1);

		const hasMore = rows.length > params.limit;
		const items = hasMore ? rows.slice(0, params.limit) : rows;
		const last = items.at(-1);

		const nextCursor =
			hasMore && last ? { createdAt: last.createdAt, id: last.id } : null;

		return { items, nextCursor };
	}

	async create(data: CreateAdminData): Promise<Admin> {
		const [created] = await this.drizzle.db
			.insert(admins)
			.values({
				name: data.name,
				email: data.email,
				birthDate: data.birthDate,
			})
			.returning();

		return created;
	}

	async update(id: string, data: UpdateAdminData): Promise<Admin> {
		const values: Partial<typeof admins.$inferInsert> = {
			name: data.name,
			email: data.email,
			birthDate: data.birthDate,
			modifiedAt: new Date(),
		};

		if (data.resetPassword) {
			values.passwordHash = null;
			values.isPasswordCreationPending = true;
		}

		const [updated] = await this.drizzle.db
			.update(admins)
			.set(values)
			.where(eq(admins.id, id))
			.returning();

		return updated;
	}

	async delete(id: string): Promise<void> {
		await this.drizzle.db.delete(admins).where(eq(admins.id, id));
	}

	async setStatus(id: string, status: AdminStatus): Promise<Admin> {
		const [updated] = await this.drizzle.db
			.update(admins)
			.set({ status, statusChangedAt: new Date() })
			.where(eq(admins.id, id))
			.returning();

		return updated;
	}
}
