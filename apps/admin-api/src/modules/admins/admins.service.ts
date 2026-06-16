import { AlreadyExistsException } from "@Shared/exceptions/already-exists.exception";
import { NotFoundException } from "@Shared/exceptions/not-found.exception";
import { Result } from "@Types/result";
import { Injectable } from "@nestjs/common";
import { AdminsRepository } from "./admins.repository";
import { CreateAdminInput } from "./inputs/create";
import { CreateAdminOutput } from "./outputs/create";

@Injectable()
export class AdminsService {
	constructor(private readonly repository: AdminsRepository) {}

	async create(
		input: CreateAdminInput,
	): Promise<Result<AlreadyExistsException, CreateAdminOutput>> {
		const exists = await this.repository.getByEmail(input.email);

		if (exists) {
			return [
				new AlreadyExistsException("Admin with this email already exists"),
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
			return [new NotFoundException("Admin not found"), null];
		}

		await this.repository.delete(id);

		return [null, null];
	}
}
