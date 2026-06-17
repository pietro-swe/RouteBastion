import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import type { TestProject } from "vitest/node";

declare module "vitest" {
	export interface ProvidedContext {
		databaseUrl: string;
	}
}

let container: StartedPostgreSqlContainer;

export async function setup(project: TestProject) {
	container = await new PostgreSqlContainer("postgres:18").start();

	const databaseUrl = container.getConnectionUri();

	const pool = new Pool({ connectionString: databaseUrl });
	const db = drizzle(pool);
	await migrate(db, { migrationsFolder: "./drizzle" });
	await pool.end();

	project.provide("databaseUrl", databaseUrl);
}

export async function teardown() {
	await container?.stop();
}
