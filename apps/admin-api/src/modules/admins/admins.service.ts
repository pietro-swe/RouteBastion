import { AlreadyExistsException } from "@Shared/exceptions/already-exists.exception";
import { NotFoundException } from "@Shared/exceptions/not-found.exception";
import { Result } from "@Types/result";
import { Injectable } from "@nestjs/common";
import type {
	Admin as AdminOutputDto,
	ListAdminsOutput,
	ListAdminsQuery,
} from "@route-bastion/contracts";
import type { Admin } from "./@types";
import { AdminsRepository } from "./admins.repository";
import { decodeCursor, encodeCursor } from "./cursor";
import { CreateAdminInput } from "./inputs/create";
import { UpdateAdminInput } from "./inputs/update";

@Injectable()
export class AdminsService {
	constructor(private readonly repository: AdminsRepository) {}

	async create(
		input: CreateAdminInput,
	): Promise<Result<AlreadyExistsException, AdminOutputDto>> {
		const exists = await this.repository.getByEmail(input.email);

		if (exists) {
			return [
				new AlreadyExistsException("Admin with this email already exists"),
				null,
			];
		}

		const created = await this.repository.create({
			name: input.name,
			email: input.email,
			birthDate: new Date(input.birthDate),
		});

		return [null, toOutput(created)];
	}

	async list(query: ListAdminsQuery): Promise<ListAdminsOutput> {
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
		input: UpdateAdminInput,
	): Promise<
		Result<AlreadyExistsException | NotFoundException, AdminOutputDto>
	> {
		const existing = await this.repository.getByID(id);

		if (!existing) {
			return [new NotFoundException("Admin not found"), null];
		}

		const emailChanged = input.email !== existing.email;

		if (emailChanged) {
			const emailOwner = await this.repository.getByEmail(input.email);

			if (emailOwner && emailOwner.id !== id) {
				return [
					new AlreadyExistsException("Admin with this email already exists"),
					null,
				];
			}
		}

		const updated = await this.repository.update(id, {
			name: input.name,
			email: input.email,
			birthDate: new Date(input.birthDate),
			resetPassword: emailChanged,
		});

		return [null, toOutput(updated)];
	}

	async block(id: string): Promise<Result<NotFoundException, AdminOutputDto>> {
		return this.setStatus(id, "BLOCKED");
	}

	async unblock(
		id: string,
	): Promise<Result<NotFoundException, AdminOutputDto>> {
		return this.setStatus(id, "ACTIVE");
	}

	private async setStatus(
		id: string,
		status: "ACTIVE" | "BLOCKED",
	): Promise<Result<NotFoundException, AdminOutputDto>> {
		const existing = await this.repository.getByID(id);

		if (!existing) {
			return [new NotFoundException("Admin not found"), null];
		}

		const updated = await this.repository.setStatus(id, status);

		return [null, toOutput(updated)];
	}

	async delete(id: string): Promise<Result<NotFoundException, null>> {
		const existing = await this.repository.getByID(id);

		if (!existing) {
			return [new NotFoundException("Admin not found"), null];
		}

		await this.repository.delete(id);

		return [null, null];
	}
}

function toOutput(admin: Admin): AdminOutputDto {
	return {
		id: admin.id,
		name: admin.name,
		email: admin.email,
		birthDate: admin.birthDate.toISOString().slice(0, 10),
		status: admin.status,
		isPasswordCreationPending: admin.isPasswordCreationPending,
		statusChangedAt: admin.statusChangedAt?.toISOString() ?? null,
		createdAt: admin.createdAt.toISOString(),
		modifiedAt: admin.modifiedAt?.toISOString() ?? null,
	};
}
