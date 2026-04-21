import { env } from "@Modules/config/env";
import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { ZodSerializationException, ZodValidationException } from "nestjs-zod";

@Catch(HttpException)
export class ZodExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(ZodExceptionFilter.name);

	catch(exception: HttpException, host: ArgumentsHost) {
		const reply = host.switchToHttp().getResponse<FastifyReply>();

		const isZodError =
			exception instanceof ZodValidationException ||
			exception instanceof ZodSerializationException;

		if (env.NODE_ENV === "development" && isZodError) {
			const zodError = exception.getZodError();
			this.logger.error({
				message: "Zod validation/serialization error",
				error: zodError,
			});

			reply.status(HttpStatus.UNPROCESSABLE_ENTITY).send({
				message: "Validation/serialization failed",
				errors: zodError,
			});
		}

		reply.status(exception.getStatus()).send(exception.getResponse());
	}
}
