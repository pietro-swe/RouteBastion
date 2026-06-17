import type { Customer } from "@route-bastion/contracts";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomersService } from "@/modules/customers/services/customers.service";
import { useCustomersStore } from "./customers.store";

vi.mock("@/modules/customers/services/customers.service", () => ({
	CustomersService: {
		list: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		remove: vi.fn(),
	},
}));

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
	return {
		id: "1",
		name: "Acme Ltda",
		businessIdentifier: "11222333000181",
		createdAt: "2026-06-15T12:00:00.000Z",
		modifiedAt: null,
		...overrides,
	};
}

beforeEach(() => {
	setActivePinia(createPinia());
	vi.clearAllMocks();
});

describe("useCustomersStore", () => {
	it("fetchFirstPage loads items and nextCursor", async () => {
		vi.mocked(CustomersService.list).mockResolvedValue({
			items: [makeCustomer()],
			nextCursor: "c1",
		});

		const store = useCustomersStore();
		await store.fetchFirstPage();

		expect(store.items).toHaveLength(1);
		expect(store.hasNext).toBe(true);
		expect(store.hasPrev).toBe(false);
		expect(CustomersService.list).toHaveBeenCalledWith({
			cursor: undefined,
			search: "",
		});
	});

	it("fetchNext pushes the cursor; fetchPrev pops it", async () => {
		vi.mocked(CustomersService.list)
			.mockResolvedValueOnce({ items: [makeCustomer()], nextCursor: "c1" })
			.mockResolvedValueOnce({
				items: [makeCustomer({ id: "2" })],
				nextCursor: "c2",
			})
			.mockResolvedValueOnce({ items: [makeCustomer()], nextCursor: "c1" });

		const store = useCustomersStore();
		await store.fetchFirstPage();
		await store.fetchNext();

		expect(CustomersService.list).toHaveBeenLastCalledWith({
			cursor: "c1",
			search: "",
		});
		expect(store.hasPrev).toBe(true);

		await store.fetchPrev();
		expect(CustomersService.list).toHaveBeenLastCalledWith({
			cursor: undefined,
			search: "",
		});
		expect(store.hasPrev).toBe(false);
	});

	it("setSearch trims the term and refetches from the first page", async () => {
		vi.mocked(CustomersService.list).mockResolvedValue({
			items: [],
			nextCursor: null,
		});

		const store = useCustomersStore();
		await store.setSearch("  acme  ");

		expect(store.search).toBe("acme");
		expect(CustomersService.list).toHaveBeenLastCalledWith({
			cursor: undefined,
			search: "acme",
		});
	});

	it("create/update/remove each refetch from the first page", async () => {
		vi.mocked(CustomersService.list).mockResolvedValue({
			items: [makeCustomer()],
			nextCursor: null,
		});
		vi.mocked(CustomersService.create).mockResolvedValue(makeCustomer());
		vi.mocked(CustomersService.remove).mockResolvedValue();

		const store = useCustomersStore();
		await store.create({ name: "New", businessIdentifier: "11222333000181" });
		await store.remove("1");

		expect(CustomersService.create).toHaveBeenCalled();
		expect(CustomersService.remove).toHaveBeenCalledWith("1");
		expect(CustomersService.list).toHaveBeenCalledTimes(2);
	});

	it("sets an error message when loading fails", async () => {
		vi.mocked(CustomersService.list).mockRejectedValue(new Error("boom"));

		const store = useCustomersStore();
		await store.fetchFirstPage();

		expect(store.error).toBe("Falha ao carregar customers");
		expect(store.items).toEqual([]);
	});
});
