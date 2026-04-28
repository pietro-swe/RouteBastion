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
import { CreateUserInput } from "./inputs/create";
import { CreateUserOutput } from "./outputs/create";
import { UsersService } from "./users.service";

@Controller("users")
@ApiTags("users")
export class UsersController {
	constructor(private readonly service: UsersService) {}

	@Post()
	@ZodResponse({
		status: HttpStatus.CREATED,
		type: CreateUserOutput,
		description: "Successfully created a new user",
	})
	@ApiConflictResponse({
		type: ErrorOutput.Output,
		description: "A user with the provided email already exists",
	})
	async create(@Body() input: CreateUserInput): Promise<CreateUserOutput> {
		const [error, output] = await this.service.create(input);

		if (error) {
			throw new ConflictException(
				{
					error: error.message,
				},
				{
					description: "A user with the provided email already exists",
				},
			);
		}

		return output;
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({
		description: "Successfully deleted the user",
	})
	@ApiNotFoundResponse({
		type: ErrorOutput.Output,
		description: "No user found with the provided ID",
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
