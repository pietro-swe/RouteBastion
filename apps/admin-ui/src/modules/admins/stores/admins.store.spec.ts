import type { Admin } from "@route-bastion/contracts";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminsService } from "@/modules/admins/services/admins.service";
import { useAdminsStore } from "./admins.store";

vi.mock("@/modules/admins/services/admins.service", () => ({
	adminsService: {
		list: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		block: vi.fn(),
		unblock: vi.fn(),
		remove: vi.fn(),
	},
}));

function makeAdmin(overrides: Partial<Admin> = {}): Admin {
	return {
		id: "1",
		name: "Ana Lima",
		email: "ana@rb.io",
		birthDate: "1990-04-12",
		status: "ACTIVE",
		isPasswordCreationPending: true,
		statusChangedAt: null,
		createdAt: "2026-06-15T12:00:00.000Z",
		modifiedAt: null,
		...overrides,
	};
}

beforeEach(() => {
	setActivePinia(createPinia());
	vi.clearAllMocks();
});

describe("useAdminsStore", () => {
	it("fetchFirstPage loads items and nextCursor", async () => {
		vi.mocked(adminsService.list).mockResolvedValue({
			items: [makeAdmin()],
			nextCursor: "c1",
		});

		const store = useAdminsStore();
		await store.fetchFirstPage();

		expect(store.items).toHaveLength(1);
		expect(store.hasNext).toBe(true);
		expect(store.hasPrev).toBe(false);
		expect(adminsService.list).toHaveBeenCalledWith({
			cursor: undefined,
			search: undefined,
		});
	});

	it("fetchNext pushes the cursor; fetchPrev pops it", async () => {
		vi.mocked(adminsService.list)
			.mockResolvedValueOnce({ items: [makeAdmin()], nextCursor: "c1" })
			.mockResolvedValueOnce({
				items: [makeAdmin({ id: "2" })],
				nextCursor: "c2",
			})
			.mockResolvedValueOnce({ items: [makeAdmin()], nextCursor: "c1" });

		const store = useAdminsStore();
		await store.fetchFirstPage();
		await store.fetchNext();

		expect(adminsService.list).toHaveBeenLastCalledWith({
			cursor: "c1",
			search: undefined,
		});
		expect(store.hasPrev).toBe(true);

		await store.fetchPrev();
		expect(adminsService.list).toHaveBeenLastCalledWith({
			cursor: undefined,
			search: undefined,
		});
		expect(store.hasPrev).toBe(false);
	});

	it("setSearch trims the term and refetches from the first page", async () => {
		vi.mocked(adminsService.list).mockResolvedValue({
			items: [],
			nextCursor: null,
		});

		const store = useAdminsStore();
		await store.setSearch("  ana  ");

		expect(store.search).toBe("ana");
		expect(adminsService.list).toHaveBeenLastCalledWith({
			cursor: undefined,
			search: "ana",
		});
	});

	it("resets pagination to the first page and keeps search after a mutation", async () => {
		vi.mocked(adminsService.list)
			.mockResolvedValueOnce({ items: [makeAdmin()], nextCursor: "c1" })
			.mockResolvedValueOnce({
				items: [makeAdmin({ id: "2" })],
				nextCursor: "c2",
			})
			.mockResolvedValueOnce({ items: [makeAdmin()], nextCursor: null });
		vi.mocked(adminsService.create).mockResolvedValue(makeAdmin());

		const store = useAdminsStore();
		await store.setSearch("ana");
		await store.fetchNext();
		expect(store.hasPrev).toBe(true);

		await store.create({
			name: "New",
			email: "new@rb.io",
			birthDate: "1990-04-12",
		});

		expect(adminsService.create).toHaveBeenCalled();
		expect(adminsService.list).toHaveBeenLastCalledWith({
			cursor: undefined,
			search: "ana",
		});
		expect(store.hasPrev).toBe(false);
	});

	it("block/unblock/update/remove each refetch from the first page", async () => {
		vi.mocked(adminsService.list).mockResolvedValue({
			items: [makeAdmin()],
			nextCursor: null,
		});
		vi.mocked(adminsService.block).mockResolvedValue(makeAdmin());
		vi.mocked(adminsService.remove).mockResolvedValue();

		const store = useAdminsStore();
		await store.block("1");
		await store.remove("1");

		expect(adminsService.block).toHaveBeenCalledWith("1");
		expect(adminsService.remove).toHaveBeenCalledWith("1");
		expect(adminsService.list).toHaveBeenCalledTimes(2);
	});

	it("sets an error message when loading fails", async () => {
		vi.mocked(adminsService.list).mockRejectedValue(new Error("boom"));

		const store = useAdminsStore();
		await store.fetchFirstPage();

		expect(store.error).toBe("Falha ao carregar admins");
		expect(store.items).toEqual([]);
	});
});
