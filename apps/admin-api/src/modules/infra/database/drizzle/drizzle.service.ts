import { Env } from "@Modules/config/env";
import {
	Injectable,
	type OnModuleDestroy,
	type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
	private pool: Pool;
	db: NodePgDatabase;

	constructor(private readonly configService: ConfigService<Env, true>) {}

	onModuleInit() {
		const connectionString = this.configService.get<string>("DATABASE_URL");

		this.pool = new Pool({
			connectionString,
		});

		this.db = drizzle(this.pool);
	}

	async onModuleDestroy() {
		await this.pool.end();
	}
}
