import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";

export function init(app: NestFastifyApplication) {
	const config = new DocumentBuilder()
		.setTitle("RouteBastion Admin API")
		.setDescription("API documentation for RouteBastion Admin")
		.setVersion("1.0")
		.addTag("users")
		.addTag("api-keys")
		.addTag("constraints")
		.addTag("customers")
		.addTag("vehicles")
		.addTag("providers")
		.addTag("providers-features")
		.addTag("providers-access-methods")
		.build();

	const documentFactory = () => SwaggerModule.createDocument(app, config);

	SwaggerModule.setup("api/docs", app, cleanupOpenApiDoc(documentFactory()));
}
