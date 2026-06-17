import { AlreadyExistsException } from "@Shared/exceptions/already-exists.exception";
import { NotFoundException } from "@Shared/exceptions/not-found.exception";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Customer } from "./@types";
import { encodeCursor } from "./cursor";
import { CustomersRepository } from "./customers.repository";
import { CustomersService } from "./customers.service";

const VALID_CNPJ = "11222333000181";
const OTHER_CNPJ = "45448325000192";

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
	return {
		id: "018f8c2a-0000-7000-8000-000000000000",
		name: "Acme Ltda",
		businessIdentifier: VALID_CNPJ,
		createdAt: new Date("2026-06-15T12:00:00.000Z"),
		modifiedAt: null,
		deletedAt: null,
		...overrides,
	};
}

function makeRepo(): CustomersRepository {
	return {
		getByID: vi.fn(),
		getByBusinessIdentifier: vi.fn(),
		list: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		softDelete: vi.fn(),
	} as unknown as CustomersRepository;
}

describe("CustomersService.create", () => {
	let repo: CustomersRepository;
	let service: CustomersService;

	beforeEach(() => {
		repo = makeRepo();
		service = new CustomersService(repo);
	});

	it("rejects a duplicate businessIdentifier with AlreadyExistsException", async () => {
		vi.mocked(repo.getByBusinessIdentifier).mockResolvedValue(makeCustomer());

		const [error, output] = await service.create({
			name: "Acme",
			businessIdentifier: VALID_CNPJ,
		});

		expect(output).toBeNull();
		expect(error).toBeInstanceOf(AlreadyExistsException);
		expect(repo.create).not.toHaveBeenCalled();
	});

	it("creates a customer and maps the output", async () => {
		vi.mocked(repo.getByBusinessIdentifier).mockResolvedValue(null);
		vi.mocked(repo.create).mockResolvedValue(makeCustomer());

		const [error, output] = await service.create({
			name: "Acme Ltda",
			businessIdentifier: VALID_CNPJ,
		});

		expect(error).toBeNull();
		expect(repo.create).toHaveBeenCalledWith({
			name: "Acme Ltda",
			businessIdentifier: VALID_CNPJ,
		});
		expect(output).toEqual({
			id: "018f8c2a-0000-7000-8000-000000000000",
			name: "Acme Ltda",
			businessIdentifier: VALID_CNPJ,
			createdAt: "2026-06-15T12:00:00.000Z",
			modifiedAt: null,
		});
	});
});

describe("CustomersService.list", () => {
	let repo: CustomersRepository;
	let service: CustomersService;

	beforeEach(() => {
		repo = makeRepo();
		service = new CustomersService(repo);
	});

	it("asks the repository for 10 items and forwards the search term", async () => {
		vi.mocked(repo.list).mockResolvedValue({ items: [], nextCursor: null });

		const output = await service.list({ search: "acme" });

		expect(repo.list).toHaveBeenCalledWith({
			limit: 10,
			search: "acme",
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
			items: [makeCustomer()],
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

describe("CustomersService.update", () => {
	let repo: CustomersRepository;
	let service: CustomersService;
	const id = "018f8c2a-0000-7000-8000-000000000000";

	beforeEach(() => {
		repo = makeRepo();
		service = new CustomersService(repo);
	});

	const input = { name: "Acme Updated", businessIdentifier: VALID_CNPJ };

	it("returns NotFoundException when the customer does not exist", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(null);

		const [error, output] = await service.update("missing-id", input);

		expect(output).toBeNull();
		expect(error).toBeInstanceOf(NotFoundException);
		expect(repo.update).not.toHaveBeenCalled();
	});

	it("returns AlreadyExistsException when the new businessIdentifier belongs to another customer", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(
			makeCustomer({ businessIdentifier: OTHER_CNPJ }),
		);
		vi.mocked(repo.getByBusinessIdentifier).mockResolvedValue(
			makeCustomer({ id: "another-id", businessIdentifier: VALID_CNPJ }),
		);

		const [error] = await service.update(id, input);

		expect(error).toBeInstanceOf(AlreadyExistsException);
		expect(repo.update).not.toHaveBeenCalled();
	});

	it("updates name and businessIdentifier", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(
			makeCustomer({ businessIdentifier: OTHER_CNPJ }),
		);
		vi.mocked(repo.getByBusinessIdentifier).mockResolvedValue(null);
		vi.mocked(repo.update).mockResolvedValue(
			makeCustomer({
				name: "Acme Updated",
				modifiedAt: new Date("2026-06-16T08:30:00.000Z"),
			}),
		);

		const [error, output] = await service.update(id, input);

		expect(error).toBeNull();
		expect(repo.update).toHaveBeenCalledWith(id, {
			name: "Acme Updated",
			businessIdentifier: VALID_CNPJ,
		});
		expect(output?.modifiedAt).toBe("2026-06-16T08:30:00.000Z");
	});

	it("skips the duplicate check when the businessIdentifier is unchanged", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(makeCustomer());
		vi.mocked(repo.update).mockResolvedValue(makeCustomer());

		await service.update(id, input);

		expect(repo.getByBusinessIdentifier).not.toHaveBeenCalled();
	});
});

describe("CustomersService.delete", () => {
	let repo: CustomersRepository;
	let service: CustomersService;
	const id = "018f8c2a-0000-7000-8000-000000000000";

	beforeEach(() => {
		repo = makeRepo();
		service = new CustomersService(repo);
	});

	it("returns NotFoundException for a missing customer", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(null);

		const [error] = await service.delete(id);

		expect(error).toBeInstanceOf(NotFoundException);
		expect(repo.softDelete).not.toHaveBeenCalled();
	});

	it("soft-deletes an existing customer", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(makeCustomer());

		const [error, value] = await service.delete(id);

		expect(error).toBeNull();
		expect(value).toBeNull();
		expect(repo.softDelete).toHaveBeenCalledWith(id);
	});
});
