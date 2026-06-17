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
import { CustomersService } from "./customers.service";
import { CreateCustomerInput } from "./inputs/create";
import { ListCustomersQuery } from "./inputs/list-query";
import { UpdateCustomerInput } from "./inputs/update";
import { CustomerOutput } from "./outputs/customer";
import { ListCustomersOutput } from "./outputs/list";

@Controller("customers")
@ApiTags("customers")
export class CustomersController {
	constructor(private readonly service: CustomersService) {}

	@Post()
	@ZodResponse({
		status: HttpStatus.CREATED,
		type: CustomerOutput,
		description: "Successfully created a new customer",
	})
	@ApiConflictResponse({
		type: ErrorOutput.Output,
		description:
			"A customer with the provided business identifier already exists",
	})
	async create(@Body() input: CreateCustomerInput): Promise<CustomerOutput> {
		const [error, output] = await this.service.create(input);

		if (error) {
			throw new ConflictException({ error: error.message });
		}

		return output;
	}

	@Get()
	@ZodResponse({
		status: HttpStatus.OK,
		type: ListCustomersOutput,
		description: "Paginated list of customers",
	})
	async list(@Query() query: ListCustomersQuery): Promise<ListCustomersOutput> {
		return this.service.list(query);
	}

	@Put(":id")
	@ZodResponse({
		status: HttpStatus.OK,
		type: CustomerOutput,
		description: "Successfully updated the customer",
	})
	@ApiNotFoundResponse({
		type: ErrorOutput.Output,
		description: "No customer found with the provided ID",
	})
	@ApiConflictResponse({
		type: ErrorOutput.Output,
		description:
			"A customer with the provided business identifier already exists",
	})
	async update(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() input: UpdateCustomerInput,
	): Promise<CustomerOutput> {
		const [error, output] = await this.service.update(id, input);

		if (error) {
			if (error instanceof AlreadyExistsException) {
				throw new ConflictException({ error: error.message });
			}

			throw new NotFoundException({ error: error.message });
		}

		return output;
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: "Successfully deleted the customer" })
	@ApiNotFoundResponse({
		type: ErrorOutput.Output,
		description: "No customer found with the provided ID",
	})
	async delete(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
		const [error] = await this.service.delete(id);

		if (error) {
			throw new NotFoundException({ error: error.message });
		}
	}
}
