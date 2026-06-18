import type {
	CreateCustomerData,
	Customer,
	ListCustomersParams,
	ListCustomersResult,
	UpdateCustomerData,
} from "@Modules/customers/@types";
import { CustomersRepository } from "@Modules/customers/customers.repository";
import { Injectable } from "@nestjs/common";
import { and, desc, eq, ilike, isNull, lt, or, type SQL } from "drizzle-orm";
import { DrizzleService } from "../drizzle.service";
import { customers } from "../tables/customers";

@Injectable()
export class DrizzleCustomersRepository extends CustomersRepository {
	constructor(private readonly drizzle: DrizzleService) {
		super();
	}

	async getByID(id: string): Promise<Customer | null> {
		const [customer] = await this.drizzle.db
			.select()
			.from(customers)
			.where(and(eq(customers.id, id), isNull(customers.deletedAt)))
			.limit(1);

		return customer ?? null;
	}

	async getByBusinessIdentifier(
		businessIdentifier: string,
	): Promise<Customer | null> {
		const [customer] = await this.drizzle.db
			.select()
			.from(customers)
			.where(
				and(
					eq(customers.businessIdentifier, businessIdentifier),
					isNull(customers.deletedAt),
				),
			)
			.limit(1);

		return customer ?? null;
	}

	async list(params: ListCustomersParams): Promise<ListCustomersResult> {
		const conditions: (SQL | undefined)[] = [isNull(customers.deletedAt)];

		if (params.search) {
			conditions.push(
				or(
					ilike(customers.name, `%${params.search}%`),
					ilike(customers.businessIdentifier, `%${params.search}%`),
				),
			);
		}

		if (params.cursor) {
			conditions.push(
				or(
					lt(customers.createdAt, params.cursor.createdAt),
					and(
						eq(customers.createdAt, params.cursor.createdAt),
						lt(customers.id, params.cursor.id),
					),
				),
			);
		}

		const rows = await this.drizzle.db
			.select()
			.from(customers)
			.where(and(...conditions))
			.orderBy(desc(customers.createdAt), desc(customers.id))
			.limit(params.limit + 1);

		const hasMore = rows.length > params.limit;
		const items = hasMore ? rows.slice(0, params.limit) : rows;
		const last = items.at(-1);

		const nextCursor =
			hasMore && last ? { createdAt: last.createdAt, id: last.id } : null;

		return { items, nextCursor };
	}

	async create(data: CreateCustomerData): Promise<Customer> {
		const [created] = await this.drizzle.db
			.insert(customers)
			.values({
				name: data.name,
				businessIdentifier: data.businessIdentifier,
			})
			.returning();

		return created;
	}

	async update(id: string, data: UpdateCustomerData): Promise<Customer> {
		const [updated] = await this.drizzle.db
			.update(customers)
			.set({
				name: data.name,
				businessIdentifier: data.businessIdentifier,
				modifiedAt: new Date(),
			})
			.where(eq(customers.id, id))
			.returning();

		return updated;
	}

	async softDelete(id: string): Promise<void> {
		await this.drizzle.db
			.update(customers)
			.set({ deletedAt: new Date() })
			.where(eq(customers.id, id));
	}
}
