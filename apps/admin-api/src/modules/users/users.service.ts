import { AlreadyExistsException } from "@Shared/exceptions/already-exists.exception";
import { NotFoundException } from "@Shared/exceptions/not-found.exception";
import { Result } from "@Types/result";
import { Injectable } from "@nestjs/common";
import { CreateUserInput } from "./inputs/create";
import { CreateUserOutput } from "./outputs/create";
import { UsersRepository } from "./users.repository";

@Injectable()
export class UsersService {
	constructor(private readonly repository: UsersRepository) {}

	async create(
		input: CreateUserInput,
	): Promise<Result<AlreadyExistsException, CreateUserOutput>> {
		const exists = await this.repository.getByEmail(input.email);

		if (exists) {
			return [
				new AlreadyExistsException("User with this email already exists"),
				null,
			];
		}

		const output = await this.repository.create(input);

		return [
			null,
			{
				id: output.id,
				name: output.name,
				email: output.email,
				birthDate: output.birthDate.toISOString(),
				createdAt: output.createdAt.toISOString(),
				modifiedAt: output.modifiedAt?.toISOString() ?? null,
				deletedAt: output.deletedAt?.toISOString() ?? null,
			},
		];
	}

	async delete(id: string): Promise<Result<NotFoundException, null>> {
		const exists = await this.repository.getByID(id);

		if (!exists) {
			return [new NotFoundException("User not found"), null];
		}

		await this.repository.delete(id);

		return [null, null];
	}
}
