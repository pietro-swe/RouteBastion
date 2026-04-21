import { ZodExceptionFilter } from "@Modules/infra/http/filters/zod-exception.filter";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import env from "./modules/config/env";

@Module({
	imports: [
		ConfigModule.forRoot({
			skipProcessEnv: true,
			isGlobal: true,
			load: [env],
		}),
	],
	providers: [
		{
			provide: APP_PIPE,
			useClass: ZodValidationPipe,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: ZodSerializerInterceptor,
		},
		{
			provide: APP_FILTER,
			useClass: ZodExceptionFilter,
		},
	],
})
export class AppModule {}
