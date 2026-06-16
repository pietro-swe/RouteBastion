import { AdminsController } from "@Modules/admins/admins.controller";
import { AdminsService } from "@Modules/admins/admins.service";
import { Module } from "@nestjs/common";

@Module({
	controllers: [AdminsController],
	providers: [AdminsService],
})
export class HttpModule {}
