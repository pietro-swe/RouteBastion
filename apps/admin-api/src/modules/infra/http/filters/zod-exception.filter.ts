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
import z, { ZodError } from "zod";

@Catch(HttpException)
export class ZodExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(ZodExceptionFilter.name);

	catch(exception: HttpException, host: ArgumentsHost) {
		const reply = host.switchToHttp().getResponse<FastifyReply>();

		if (exception instanceof ZodSerializationException) {
			const zodError = exception.getZodError();

			if (env.NODE_ENV === "development") {
				this.logger.error({
					message: "Zod serialization error",
					error: zodError,
				});
			}

			reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
				message: "Internal server error",
			});

			return;
		}

		if (exception instanceof ZodValidationException) {
			const zodError = exception.getZodError();

			if (env.NODE_ENV === "development") {
				this.logger.error({
					message: "Zod validation error",
					error: zodError,
				});
			}

			if (zodError instanceof ZodError) {
				reply.status(HttpStatus.UNPROCESSABLE_ENTITY).send({
					message: "Validation failed",
					errors: z.treeifyError(zodError),
				});

				return;
			}
		}

		reply.status(exception.getStatus()).send(exception.getResponse());
	}
}
