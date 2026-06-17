import { DatabaseModule } from "@Modules/infra/database/database.module";
import { Module } from "@nestjs/common";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";

@Module({
	imports: [DatabaseModule],
	providers: [CustomersService],
	controllers: [CustomersController],
})
export class CustomersModule {}
