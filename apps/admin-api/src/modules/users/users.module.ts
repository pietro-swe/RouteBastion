import { DatabaseModule } from "@Modules/infra/database/database.module";
import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
	imports: [DatabaseModule],
	providers: [UsersService],
	controllers: [UsersController],
})
export class UsersModule {}
