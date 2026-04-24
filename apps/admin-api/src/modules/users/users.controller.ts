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
import { ZodResponse } from "nestjs-zod";
import { CreateUserInput } from "./inputs/create";
import { CreateUserOutput } from "./outputs/create";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
	constructor(private readonly service: UsersService) {}

	@Post()
	@ZodResponse({
		type: CreateUserOutput,
	})
	async create(@Body() input: CreateUserInput): Promise<CreateUserOutput> {
		const [error, output] = await this.service.create(input);

		if (error) {
			throw new ConflictException(
				{
					message: error.message,
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
	async delete(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
		const [error] = await this.service.delete(id);

		if (error) {
			throw new NotFoundException({
				message: error.message,
			});
		}
	}
}
