import { UsersController } from "@Modules/users/users.controller";
import { UsersService } from "@Modules/users/users.service";
import { Module } from "@nestjs/common";

@Module({
	controllers: [UsersController],
	providers: [UsersService],
})
export class HttpModule {}
