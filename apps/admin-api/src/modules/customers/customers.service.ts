import { AlreadyExistsException } from "@Shared/exceptions/already-exists.exception";
import { NotFoundException } from "@Shared/exceptions/not-found.exception";
import { Result } from "@Types/result";
import { Injectable } from "@nestjs/common";
import type {
	Customer as CustomerOutputDto,
	ListCustomersOutput,
	ListCustomersQuery,
} from "@route-bastion/contracts";
import type { Customer } from "./@types";
import { decodeCursor, encodeCursor } from "./cursor";
import { CustomersRepository } from "./customers.repository";
import { CreateCustomerInput } from "./inputs/create";
import { UpdateCustomerInput } from "./inputs/update";

@Injectable()
export class CustomersService {
	constructor(private readonly repository: CustomersRepository) {}

	async create(
		input: CreateCustomerInput,
	): Promise<Result<AlreadyExistsException, CustomerOutputDto>> {
		const exists = await this.repository.getByBusinessIdentifier(
			input.businessIdentifier,
		);

		if (exists) {
			return [
				new AlreadyExistsException(
					"Customer with this business identifier already exists",
				),
				null,
			];
		}

		const created = await this.repository.create({
			name: input.name,
			businessIdentifier: input.businessIdentifier,
		});

		return [null, toOutput(created)];
	}

	async list(query: ListCustomersQuery): Promise<ListCustomersOutput> {
		const cursor = query.cursor ? decodeCursor(query.cursor) : null;

		const result = await this.repository.list({
			limit: 10,
			search: query.search,
			cursor: cursor ?? undefined,
		});

		return {
			items: result.items.map(toOutput),
			nextCursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
		};
	}

	async update(
		id: string,
		input: UpdateCustomerInput,
	): Promise<
		Result<AlreadyExistsException | NotFoundException, CustomerOutputDto>
	> {
		const existing = await this.repository.getByID(id);

		if (!existing) {
			return [new NotFoundException("Customer not found"), null];
		}

		const identifierChanged =
			input.businessIdentifier !== existing.businessIdentifier;

		if (identifierChanged) {
			const owner = await this.repository.getByBusinessIdentifier(
				input.businessIdentifier,
			);

			if (owner && owner.id !== id) {
				return [
					new AlreadyExistsException(
						"Customer with this business identifier already exists",
					),
					null,
				];
			}
		}

		const updated = await this.repository.update(id, {
			name: input.name,
			businessIdentifier: input.businessIdentifier,
		});

		return [null, toOutput(updated)];
	}

	async delete(id: string): Promise<Result<NotFoundException, null>> {
		const existing = await this.repository.getByID(id);

		if (!existing) {
			return [new NotFoundException("Customer not found"), null];
		}

		await this.repository.softDelete(id);

		return [null, null];
	}
}

function toOutput(customer: Customer): CustomerOutputDto {
	return {
		id: customer.id,
		name: customer.name,
		businessIdentifier: customer.businessIdentifier,
		createdAt: customer.createdAt.toISOString(),
		modifiedAt: customer.modifiedAt?.toISOString() ?? null,
	};
}
