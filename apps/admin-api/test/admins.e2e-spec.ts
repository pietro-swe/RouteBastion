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

function createAdmin(overrides: Record<string, unknown> = {}) {
	return request(app.getHttpServer())
		.post("/admins")
		.send({
			name: "Ana Lima",
			email: `ana-${Math.random().toString(36).slice(2)}@rb.io`,
			birthDate: "1990-04-12",
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
	await pool.query("TRUNCATE admins RESTART IDENTITY CASCADE");
});

describe("admins e2e", () => {
	it("creates an admin without a password (201, pending password)", async () => {
		const res = await createAdmin({ email: "ana@rb.io" });

		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({
			name: "Ana Lima",
			email: "ana@rb.io",
			birthDate: "1990-04-12",
			status: "ACTIVE",
			isPasswordCreationPending: true,
			statusChangedAt: null,
			modifiedAt: null,
		});
		expect(res.body.id).toBeDefined();
	});

	it("rejects a duplicate email with 409", async () => {
		await createAdmin({ email: "dup@rb.io" });
		const res = await createAdmin({ email: "dup@rb.io" });

		expect(res.status).toBe(409);
		expect(res.body.error).toContain("email");
	});

	it("rejects invalid input with 422", async () => {
		const res = await request(app.getHttpServer())
			.post("/admins")
			.send({ name: "", email: "nope", birthDate: "12/04/1990" });

		expect(res.status).toBe(422);
	});

	it("lists newest-first with cursor pagination of 10", async () => {
		for (let i = 0; i < 12; i++) {
			// biome-ignore lint/performance/noAwaitInLoops: sequential creation gives deterministic created_at ordering for the pagination assertions
			await createAdmin({ name: `Admin ${i}`, email: `a${i}@rb.io` });
		}

		const first = await request(app.getHttpServer()).get("/admins");
		expect(first.status).toBe(200);
		expect(first.body.items).toHaveLength(10);
		expect(first.body.nextCursor).not.toBeNull();

		const second = await request(app.getHttpServer())
			.get("/admins")
			.query({ cursor: first.body.nextCursor });
		expect(second.body.items).toHaveLength(2);
		expect(second.body.nextCursor).toBeNull();

		const firstIds = first.body.items.map((a: { id: string }) => a.id);
		const secondIds = second.body.items.map((a: { id: string }) => a.id);
		expect(
			firstIds.filter((id: string) => secondIds.includes(id)),
		).toHaveLength(0);
	});

	it("searches by name (case-insensitive)", async () => {
		await createAdmin({ name: "Beatriz", email: "b@rb.io" });
		await createAdmin({ name: "Carlos", email: "c@rb.io" });

		const res = await request(app.getHttpServer())
			.get("/admins")
			.query({ search: "bea" });

		expect(res.body.items).toHaveLength(1);
		expect(res.body.items[0].name).toBe("Beatriz");
	});

	it("updates name/birthDate and preserves email; 404 for missing", async () => {
		const created = await createAdmin({ email: "edit@rb.io" });
		const id = created.body.id;

		const res = await request(app.getHttpServer()).put(`/admins/${id}`).send({
			name: "Ana Editada",
			email: "edit@rb.io",
			birthDate: "1991-01-01",
		});

		expect(res.status).toBe(200);
		expect(res.body.name).toBe("Ana Editada");
		expect(res.body.birthDate).toBe("1991-01-01");
		expect(res.body.modifiedAt).not.toBeNull();

		const missing = await request(app.getHttpServer())
			.put("/admins/018f8c2a-0000-7000-8000-0000000000ff")
			.send({ name: "X", email: "x@rb.io", birthDate: "1991-01-01" });
		expect(missing.status).toBe(404);
	});

	it("resets password pending flag when email changes", async () => {
		const created = await createAdmin({ email: "old@rb.io" });
		const id = created.body.id;

		// simulate that the admin already set a password
		await pool.query(
			"UPDATE admins SET password_hash = 'hash', is_password_creation_pending = false WHERE id = $1",
			[id],
		);

		const res = await request(app.getHttpServer())
			.put(`/admins/${id}`)
			.send({ name: "Ana Lima", email: "new@rb.io", birthDate: "1990-04-12" });

		expect(res.status).toBe(200);
		expect(res.body.email).toBe("new@rb.io");
		expect(res.body.isPasswordCreationPending).toBe(true);

		const { rows } = await pool.query(
			"SELECT password_hash FROM admins WHERE id = $1",
			[id],
		);
		expect(rows[0].password_hash).toBeNull();
	});

	it("blocks and unblocks an admin", async () => {
		const created = await createAdmin({ email: "status@rb.io" });
		const id = created.body.id;

		const blocked = await request(app.getHttpServer()).patch(
			`/admins/${id}/block`,
		);
		expect(blocked.status).toBe(200);
		expect(blocked.body.status).toBe("BLOCKED");
		expect(blocked.body.statusChangedAt).not.toBeNull();

		const unblocked = await request(app.getHttpServer()).patch(
			`/admins/${id}/unblock`,
		);
		expect(unblocked.status).toBe(200);
		expect(unblocked.body.status).toBe("ACTIVE");
	});

	it("physically deletes an admin (204) and 404 afterwards on re-delete", async () => {
		const created = await createAdmin({ email: "del@rb.io" });
		const id = created.body.id;

		const del = await request(app.getHttpServer()).delete(`/admins/${id}`);
		expect(del.status).toBe(204);

		const { rows } = await pool.query(
			"SELECT COUNT(*)::int AS c FROM admins WHERE id = $1",
			[id],
		);
		expect(rows[0].c).toBe(0);

		const again = await request(app.getHttpServer()).delete(`/admins/${id}`);
		expect(again.status).toBe(404);
	});
});
