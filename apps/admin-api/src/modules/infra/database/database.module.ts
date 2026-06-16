import { AdminsRepository } from "@Modules/admins/admins.repository";
import { Module } from "@nestjs/common";
import { DrizzleService } from "./drizzle/drizzle.service";
import { DrizzleAdminsRepository } from "./drizzle/repositories/drizzle-admins.repository";

@Module({
	providers: [
		DrizzleService,
		{
			provide: AdminsRepository,
			useClass: DrizzleAdminsRepository,
		},
	],
	exports: [DrizzleService, AdminsRepository],
})
export class DatabaseModule {}
