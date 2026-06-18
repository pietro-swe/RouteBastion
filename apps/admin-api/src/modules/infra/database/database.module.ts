import { AdminsRepository } from "@Modules/admins/admins.repository";
import { CustomersRepository } from "@Modules/customers/customers.repository";
import { Module } from "@nestjs/common";
import { DrizzleService } from "./drizzle/drizzle.service";
import { DrizzleAdminsRepository } from "./drizzle/repositories/drizzle-admins.repository";
import { DrizzleCustomersRepository } from "./drizzle/repositories/drizzle-customers.repository";

@Module({
	providers: [
		DrizzleService,
		{
			provide: AdminsRepository,
			useClass: DrizzleAdminsRepository,
		},
		{
			provide: CustomersRepository,
			useClass: DrizzleCustomersRepository,
		},
	],
	exports: [DrizzleService, AdminsRepository, CustomersRepository],
})
export class DatabaseModule {}
