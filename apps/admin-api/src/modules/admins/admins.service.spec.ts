import { AlreadyExistsException } from "@Shared/exceptions/already-exists.exception";
import { NotFoundException } from "@Shared/exceptions/not-found.exception";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Admin } from "./@types";
import { AdminsRepository } from "./admins.repository";
import { AdminsService } from "./admins.service";
import { encodeCursor } from "./cursor";

function makeAdmin(overrides: Partial<Admin> = {}): Admin {
	return {
		id: "018f8c2a-0000-7000-8000-000000000000",
		name: "Ana Lima",
		email: "ana@rb.io",
		birthDate: new Date("1990-04-12T00:00:00.000Z"),
		passwordHash: null,
		status: "ACTIVE",
		statusChangedAt: null,
		isPasswordCreationPending: true,
		createdAt: new Date("2026-06-15T12:00:00.000Z"),
		modifiedAt: null,
		...overrides,
	};
}

function makeRepo(): AdminsRepository {
	return {
		getByID: vi.fn(),
		getByEmail: vi.fn(),
		list: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		setStatus: vi.fn(),
	} as unknown as AdminsRepository;
}

describe("AdminsService.create", () => {
	let repo: AdminsRepository;
	let service: AdminsService;

	beforeEach(() => {
		repo = makeRepo();
		service = new AdminsService(repo);
	});

	it("rejects a duplicate email with AlreadyExistsException", async () => {
		vi.mocked(repo.getByEmail).mockResolvedValue(makeAdmin());

		const [error, output] = await service.create({
			name: "Ana",
			email: "ana@rb.io",
			birthDate: "1990-04-12",
		});

		expect(output).toBeNull();
		expect(error).toBeInstanceOf(AlreadyExistsException);
		expect(repo.create).not.toHaveBeenCalled();
	});

	it("creates an admin without a password and maps the output", async () => {
		vi.mocked(repo.getByEmail).mockResolvedValue(null);
		vi.mocked(repo.create).mockResolvedValue(makeAdmin());

		const [error, output] = await service.create({
			name: "Ana Lima",
			email: "ana@rb.io",
			birthDate: "1990-04-12",
		});

		expect(error).toBeNull();
		expect(repo.create).toHaveBeenCalledWith({
			name: "Ana Lima",
			email: "ana@rb.io",
			birthDate: new Date("1990-04-12"),
		});
		expect(output).toEqual({
			id: "018f8c2a-0000-7000-8000-000000000000",
			name: "Ana Lima",
			email: "ana@rb.io",
			birthDate: "1990-04-12",
			status: "ACTIVE",
			isPasswordCreationPending: true,
			statusChangedAt: null,
			createdAt: "2026-06-15T12:00:00.000Z",
			modifiedAt: null,
		});
	});
});

describe("AdminsService.list", () => {
	let repo: AdminsRepository;
	let service: AdminsService;

	beforeEach(() => {
		repo = makeRepo();
		service = new AdminsService(repo);
	});

	it("asks the repository for 10 items and forwards the search term", async () => {
		vi.mocked(repo.list).mockResolvedValue({ items: [], nextCursor: null });

		const output = await service.list({ search: "ana" });

		expect(repo.list).toHaveBeenCalledWith({
			limit: 10,
			search: "ana",
			cursor: undefined,
		});
		expect(output).toEqual({ items: [], nextCursor: null });
	});

	it("decodes the incoming cursor and encodes the next cursor", async () => {
		const next = {
			createdAt: new Date("2026-06-10T00:00:00.000Z"),
			id: "018f8c2a-0000-7000-8000-000000000111",
		};
		vi.mocked(repo.list).mockResolvedValue({
			items: [makeAdmin()],
			nextCursor: next,
		});

		const incoming = encodeCursor({
			createdAt: new Date("2026-06-15T12:00:00.000Z"),
			id: "018f8c2a-0000-7000-8000-000000000000",
		});

		const output = await service.list({ cursor: incoming });

		expect(vi.mocked(repo.list).mock.calls[0][0].cursor).toEqual({
			createdAt: new Date("2026-06-15T12:00:00.000Z"),
			id: "018f8c2a-0000-7000-8000-000000000000",
		});
		expect(output.items).toHaveLength(1);
		expect(output.nextCursor).toBe(encodeCursor(next));
	});
});

describe("AdminsService.update", () => {
	let repo: AdminsRepository;
	let service: AdminsService;

	beforeEach(() => {
		repo = makeRepo();
		service = new AdminsService(repo);
	});

	const input = {
		name: "Ana Updated",
		email: "ana@rb.io",
		birthDate: "1990-04-12",
	};

	it("returns NotFoundException when the admin does not exist", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(null);

		const [error, output] = await service.update("missing-id", input);

		expect(output).toBeNull();
		expect(error).toBeInstanceOf(NotFoundException);
		expect(repo.update).not.toHaveBeenCalled();
	});

	it("returns AlreadyExistsException when the new email belongs to another admin", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(
			makeAdmin({ email: "old@rb.io" }),
		);
		vi.mocked(repo.getByEmail).mockResolvedValue(
			makeAdmin({ id: "another-id", email: "ana@rb.io" }),
		);

		const [error] = await service.update(
			"018f8c2a-0000-7000-8000-000000000000",
			input,
		);

		expect(error).toBeInstanceOf(AlreadyExistsException);
		expect(repo.update).not.toHaveBeenCalled();
	});

	it("resets the password when the email changes", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(
			makeAdmin({ email: "old@rb.io" }),
		);
		vi.mocked(repo.getByEmail).mockResolvedValue(null);
		vi.mocked(repo.update).mockResolvedValue(
			makeAdmin({ email: "ana@rb.io", isPasswordCreationPending: true }),
		);

		const [error] = await service.update(
			"018f8c2a-0000-7000-8000-000000000000",
			input,
		);

		expect(error).toBeNull();
		expect(repo.update).toHaveBeenCalledWith(
			"018f8c2a-0000-7000-8000-000000000000",
			{
				name: "Ana Updated",
				email: "ana@rb.io",
				birthDate: new Date("1990-04-12"),
				resetPassword: true,
			},
		);
	});

	it("preserves the password when only name/birthDate change", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(
			makeAdmin({ email: "ana@rb.io" }),
		);
		vi.mocked(repo.update).mockResolvedValue(makeAdmin());

		await service.update("018f8c2a-0000-7000-8000-000000000000", input);

		expect(repo.update).toHaveBeenCalledWith(
			"018f8c2a-0000-7000-8000-000000000000",
			expect.objectContaining({ resetPassword: false }),
		);
		expect(repo.getByEmail).not.toHaveBeenCalled();
	});
});

describe("AdminsService.block / unblock", () => {
	let repo: AdminsRepository;
	let service: AdminsService;
	const id = "018f8c2a-0000-7000-8000-000000000000";

	beforeEach(() => {
		repo = makeRepo();
		service = new AdminsService(repo);
	});

	it("blocks an existing admin", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(makeAdmin());
		vi.mocked(repo.setStatus).mockResolvedValue(
			makeAdmin({ status: "BLOCKED" }),
		);

		const [error, output] = await service.block(id);

		expect(error).toBeNull();
		expect(repo.setStatus).toHaveBeenCalledWith(id, "BLOCKED");
		expect(output?.status).toBe("BLOCKED");
	});

	it("unblocks an existing admin", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(makeAdmin({ status: "BLOCKED" }));
		vi.mocked(repo.setStatus).mockResolvedValue(
			makeAdmin({ status: "ACTIVE" }),
		);

		const [error, output] = await service.unblock(id);

		expect(error).toBeNull();
		expect(repo.setStatus).toHaveBeenCalledWith(id, "ACTIVE");
		expect(output?.status).toBe("ACTIVE");
	});

	it("returns NotFoundException when blocking a missing admin", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(null);

		const [error] = await service.block(id);

		expect(error).toBeInstanceOf(NotFoundException);
		expect(repo.setStatus).not.toHaveBeenCalled();
	});
});

describe("AdminsService.delete", () => {
	let repo: AdminsRepository;
	let service: AdminsService;
	const id = "018f8c2a-0000-7000-8000-000000000000";

	beforeEach(() => {
		repo = makeRepo();
		service = new AdminsService(repo);
	});

	it("returns NotFoundException for a missing admin", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(null);

		const [error] = await service.delete(id);

		expect(error).toBeInstanceOf(NotFoundException);
		expect(repo.delete).not.toHaveBeenCalled();
	});

	it("deletes an existing admin", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(makeAdmin());

		const [error, value] = await service.delete(id);

		expect(error).toBeNull();
		expect(value).toBeNull();
		expect(repo.delete).toHaveBeenCalledWith(id);
	});
});
