import { AlreadyExistsException } from "@Shared/exceptions/already-exists.exception";
import { ErrorOutput } from "@Shared/http/outputs/error";
import {
	Body,
	ConflictException,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Put,
	Query,
} from "@nestjs/common";
import {
	ApiConflictResponse,
	ApiNoContentResponse,
	ApiNotFoundResponse,
	ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { AdminsService } from "./admins.service";
import { CreateAdminInput } from "./inputs/create";
import { ListAdminsQuery } from "./inputs/list-query";
import { UpdateAdminInput } from "./inputs/update";
import { AdminOutput } from "./outputs/admin";
import { ListAdminsOutput } from "./outputs/list";

@Controller("admins")
@ApiTags("admins")
export class AdminsController {
	constructor(private readonly service: AdminsService) {}

	@Post()
	@ZodResponse({
		status: HttpStatus.CREATED,
		type: AdminOutput,
		description: "Successfully created a new admin",
	})
	@ApiConflictResponse({
		type: ErrorOutput.Output,
		description: "An admin with the provided email already exists",
	})
	async create(@Body() input: CreateAdminInput): Promise<AdminOutput> {
		const [error, output] = await this.service.create(input);

		if (error) {
			throw new ConflictException({ error: error.message });
		}

		return output;
	}

	@Get()
	@ZodResponse({
		status: HttpStatus.OK,
		type: ListAdminsOutput,
		description: "Paginated list of admins",
	})
	async list(@Query() query: ListAdminsQuery): Promise<ListAdminsOutput> {
		return this.service.list(query);
	}

	@Put(":id")
	@ZodResponse({
		status: HttpStatus.OK,
		type: AdminOutput,
		description: "Successfully updated the admin",
	})
	@ApiNotFoundResponse({
		type: ErrorOutput.Output,
		description: "No admin found with the provided ID",
	})
	@ApiConflictResponse({
		type: ErrorOutput.Output,
		description: "An admin with the provided email already exists",
	})
	async update(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() input: UpdateAdminInput,
	): Promise<AdminOutput> {
		const [error, output] = await this.service.update(id, input);

		if (error) {
			if (error instanceof AlreadyExistsException) {
				throw new ConflictException({ error: error.message });
			}

			throw new NotFoundException({ error: error.message });
		}

		return output;
	}

	@Patch(":id/block")
	@ZodResponse({
		status: HttpStatus.OK,
		type: AdminOutput,
		description: "Successfully blocked the admin",
	})
	@ApiNotFoundResponse({
		type: ErrorOutput.Output,
		description: "No admin found with the provided ID",
	})
	async block(@Param("id", ParseUUIDPipe) id: string): Promise<AdminOutput> {
		const [error, output] = await this.service.block(id);

		if (error) {
			throw new NotFoundException({ error: error.message });
		}

		return output;
	}

	@Patch(":id/unblock")
	@ZodResponse({
		status: HttpStatus.OK,
		type: AdminOutput,
		description: "Successfully unblocked the admin",
	})
	@ApiNotFoundResponse({
		type: ErrorOutput.Output,
		description: "No admin found with the provided ID",
	})
	async unblock(@Param("id", ParseUUIDPipe) id: string): Promise<AdminOutput> {
		const [error, output] = await this.service.unblock(id);

		if (error) {
			throw new NotFoundException({ error: error.message });
		}

		return output;
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: "Successfully deleted the admin" })
	@ApiNotFoundResponse({
		type: ErrorOutput.Output,
		description: "No admin found with the provided ID",
	})
	async delete(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
		const [error] = await this.service.delete(id);

		if (error) {
			throw new NotFoundException({ error: error.message });
		}
	}
}
