import { UsersRepository } from "@Modules/users/users.repository";
import { Module } from "@nestjs/common";
import { DrizzleService } from "./drizzle/drizzle.service";
import { DrizzleUsersRepository } from "./drizzle/repositories/drizzle-users.repository";

@Module({
	providers: [
		DrizzleService,
		{
			provide: UsersRepository,
			useClass: DrizzleUsersRepository,
		},
	],
	exports: [DrizzleService, UsersRepository],
})
export class DatabaseModule {}
