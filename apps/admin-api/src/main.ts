import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import {
	FastifyAdapter,
	type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { init as initDocs } from "./modules/config/docs";
import type { Env } from "./modules/config/env";

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
	);

	const configService = app.get(ConfigService<Env, true>);

	const env = configService.get("NODE_ENV", {
		infer: true,
	});

	if (env === "development") {
		initDocs(app);
	}

	const port = configService.get("PORT", { infer: true });

	await app.listen(port);
}

bootstrap();
