import { Env } from "@Modules/config/env";
import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export class DrizzleService implements OnModuleInit, OnModuleDestroy {
	private pool: Pool;
	db: NodePgDatabase;

	constructor(private readonly configService: ConfigService<Env, true>) {}

	onModuleInit() {
		this.pool = new Pool({
			connectionString: this.configService.get<string>("DATABASE_URL"),
		});

		this.db = drizzle(this.pool);
	}

	async onModuleDestroy() {
		await this.pool.end();
	}
}
