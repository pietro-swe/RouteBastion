import { ErrorOutput } from "@Shared/http/outputs/error";
import {
	Body,
	ConflictException,
	Controller,
	Delete,
	HttpCode,
	HttpStatus,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Post,
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
import { CreateAdminOutput } from "./outputs/create";

@Controller("admins")
@ApiTags("admins")
export class AdminsController {
	constructor(private readonly service: AdminsService) {}

	@Post()
	@ZodResponse({
		status: HttpStatus.CREATED,
		type: CreateAdminOutput,
		description: "Successfully created a new admin",
	})
	@ApiConflictResponse({
		type: ErrorOutput.Output,
		description: "An admin with the provided email already exists",
	})
	async create(@Body() input: CreateAdminInput): Promise<CreateAdminOutput> {
		const [error, output] = await this.service.create(input);

		if (error) {
			throw new ConflictException(
				{
					error: error.message,
				},
				{
					description: "An admin with the provided email already exists",
				},
			);
		}

		return output;
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({
		description: "Successfully deleted the admin",
	})
	@ApiNotFoundResponse({
		type: ErrorOutput.Output,
		description: "No admin found with the provided ID",
	})
	async delete(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
		const [error] = await this.service.delete(id);

		if (error) {
			throw new NotFoundException({
				error: error.message,
			});
		}
	}
}
