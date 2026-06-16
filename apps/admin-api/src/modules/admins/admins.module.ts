import { DatabaseModule } from "@Modules/infra/database/database.module";
import { Module } from "@nestjs/common";
import { AdminsController } from "./admins.controller";
import { AdminsService } from "./admins.service";

@Module({
	imports: [DatabaseModule],
	providers: [AdminsService],
	controllers: [AdminsController],
})
export class AdminsModule {}
