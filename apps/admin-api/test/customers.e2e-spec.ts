import {
	FastifyAdapter,
	type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { Pool } from "pg";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";

let app: NestFastifyApplication;
let pool: Pool;

// A known-valid CNPJ (11.222.333/0001-81) used for explicit single-customer cases.
const VALID_CNPJ = "11222333000181";

// Builds a valid CNPJ (with correct check digits) from a 12-digit base so the
// pagination tests can create many distinct customers that pass validation.
function cnpjWithBase(base: string): string {
	const calc = (digits: number[]): number => {
		let weight = digits.length - 7;
		let sum = 0;
		for (const digit of digits) {
			sum += digit * weight;
			weight = weight - 1 < 2 ? 9 : weight - 1;
		}
		const remainder = sum % 11;
		return remainder < 2 ? 0 : 11 - remainder;
	};

	const digits = base.split("").map(Number);
	const dv1 = calc(digits);
	const dv2 = calc([...digits, dv1]);
	return base + String(dv1) + String(dv2);
}

// Generated CNPJs use a "5..." prefix so they never collide with VALID_CNPJ
// ("11222333...") — keeps the search-by-businessIdentifier assertions unambiguous.
let cnpjSeq = 0;
function nextCnpj(): string {
	cnpjSeq++;
	return cnpjWithBase(String(500000000000 + cnpjSeq).padStart(12, "0"));
}

function createCustomer(overrides: Record<string, unknown> = {}) {
	return request(app.getHttpServer())
		.post("/customers")
		.send({
			name: "Acme Ltda",
			businessIdentifier: nextCnpj(),
			...overrides,
		});
}

beforeAll(async () => {
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleRef.createNestApplication<NestFastifyApplication>(
		new FastifyAdapter(),
	);
	await app.init();
	await app.getHttpAdapter().getInstance().ready();

	pool = new Pool({ connectionString: process.env.DATABASE_URL });
});

afterAll(async () => {
	await pool.end();
	await app.close();
});

beforeEach(async () => {
	await pool.query("TRUNCATE customers RESTART IDENTITY CASCADE");
});

describe("customers e2e", () => {
	it("creates a customer (201)", async () => {
		const res = await createCustomer({
			name: "Acme Ltda",
			businessIdentifier: VALID_CNPJ,
		});

		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({
			name: "Acme Ltda",
			businessIdentifier: VALID_CNPJ,
			modifiedAt: null,
		});
		expect(res.body.id).toBeDefined();
	});

	it("normalizes a masked CNPJ on create", async () => {
		const res = await createCustomer({
			businessIdentifier: "11.222.333/0001-81",
		});

		expect(res.status).toBe(201);
		expect(res.body.businessIdentifier).toBe(VALID_CNPJ);
	});

	it("rejects a duplicate businessIdentifier with 409", async () => {
		await createCustomer({ businessIdentifier: VALID_CNPJ });
		const res = await createCustomer({ businessIdentifier: VALID_CNPJ });

		expect(res.status).toBe(409);
		expect(res.body.error).toContain("business identifier");
	});

	it("rejects an invalid CNPJ with 422", async () => {
		const res = await request(app.getHttpServer())
			.post("/customers")
			.send({ name: "Acme", businessIdentifier: "12345678000100" });

		expect(res.status).toBe(422);
	});

	it("rejects an empty name with 422", async () => {
		const res = await request(app.getHttpServer())
			.post("/customers")
			.send({ name: "", businessIdentifier: VALID_CNPJ });

		expect(res.status).toBe(422);
	});

	it("lists newest-first with cursor pagination of 10", async () => {
		for (let i = 0; i < 12; i++) {
			// biome-ignore lint/performance/noAwaitInLoops: sequential creation gives deterministic created_at ordering for the pagination assertions
			await createCustomer({ name: `Customer ${i}` });
		}

		const first = await request(app.getHttpServer()).get("/customers");
		expect(first.status).toBe(200);
		expect(first.body.items).toHaveLength(10);
		expect(first.body.nextCursor).not.toBeNull();

		const second = await request(app.getHttpServer())
			.get("/customers")
			.query({ cursor: first.body.nextCursor });
		expect(second.body.items).toHaveLength(2);
		expect(second.body.nextCursor).toBeNull();

		const firstIds = first.body.items.map((c: { id: string }) => c.id);
		const secondIds = second.body.items.map((c: { id: string }) => c.id);
		expect(
			firstIds.filter((id: string) => secondIds.includes(id)),
		).toHaveLength(0);
	});

	it("searches by name and by businessIdentifier", async () => {
		await createCustomer({ name: "Beatriz Transportes" });
		await createCustomer({
			name: "Carlos Logística",
			businessIdentifier: VALID_CNPJ,
		});

		const byName = await request(app.getHttpServer())
			.get("/customers")
			.query({ search: "beatriz" });
		expect(byName.body.items).toHaveLength(1);
		expect(byName.body.items[0].name).toBe("Beatriz Transportes");

		const byCnpj = await request(app.getHttpServer())
			.get("/customers")
			.query({ search: "11222333" });
		expect(byCnpj.body.items).toHaveLength(1);
		expect(byCnpj.body.items[0].businessIdentifier).toBe(VALID_CNPJ);
	});

	it("updates name/businessIdentifier (200) and 404 for missing", async () => {
		const created = await createCustomer({ businessIdentifier: VALID_CNPJ });
		const id = created.body.id;

		const res = await request(app.getHttpServer())
			.put(`/customers/${id}`)
			.send({ name: "Acme Editada", businessIdentifier: VALID_CNPJ });

		expect(res.status).toBe(200);
		expect(res.body.name).toBe("Acme Editada");
		expect(res.body.modifiedAt).not.toBeNull();

		const missing = await request(app.getHttpServer())
			.put("/customers/018f8c2a-0000-7000-8000-0000000000ff")
			.send({ name: "X", businessIdentifier: VALID_CNPJ });
		expect(missing.status).toBe(404);
	});

	it("rejects updating to a businessIdentifier owned by another customer with 409", async () => {
		const a = await createCustomer({ businessIdentifier: VALID_CNPJ });
		const otherCnpj = nextCnpj();
		await createCustomer({ businessIdentifier: otherCnpj });

		const res = await request(app.getHttpServer())
			.put(`/customers/${a.body.id}`)
			.send({ name: "Acme", businessIdentifier: otherCnpj });

		expect(res.status).toBe(409);
	});

	it("soft-deletes a customer (204), hides it from the list, and 404 on re-delete", async () => {
		const created = await createCustomer({ businessIdentifier: VALID_CNPJ });
		const id = created.body.id;

		const del = await request(app.getHttpServer()).delete(`/customers/${id}`);
		expect(del.status).toBe(204);

		const { rows } = await pool.query(
			"SELECT deleted_at FROM customers WHERE id = $1",
			[id],
		);
		expect(rows[0].deleted_at).not.toBeNull();

		const list = await request(app.getHttpServer()).get("/customers");
		expect(list.body.items).toHaveLength(0);

		const again = await request(app.getHttpServer()).delete(`/customers/${id}`);
		expect(again.status).toBe(404);
	});

	it("allows re-creating a customer with the CNPJ of a soft-deleted one", async () => {
		const created = await createCustomer({ businessIdentifier: VALID_CNPJ });
		await request(app.getHttpServer()).delete(`/customers/${created.body.id}`);

		const res = await createCustomer({ businessIdentifier: VALID_CNPJ });

		expect(res.status).toBe(201);
		expect(res.body.id).not.toBe(created.body.id);
	});
});
