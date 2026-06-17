import type { Admin } from "@route-bastion/contracts";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminsService } from "@/modules/admins/services/admins.service";
import { useAdminsStore } from "./admins.store";

vi.mock("@/modules/admins/services/admins.service", () => ({
	AdminsService: {
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
		vi.mocked(AdminsService.list).mockResolvedValue({
			items: [makeAdmin()],
			nextCursor: "c1",
		});

		const store = useAdminsStore();
		await store.fetchFirstPage();

		expect(store.items).toHaveLength(1);
		expect(store.hasNext).toBe(true);
		expect(store.hasPrev).toBe(false);
		expect(AdminsService.list).toHaveBeenCalledWith({
			cursor: undefined,
			search: "",
		});
	});

	it("fetchNext pushes the cursor; fetchPrev pops it", async () => {
		vi.mocked(AdminsService.list)
			.mockResolvedValueOnce({ items: [makeAdmin()], nextCursor: "c1" })
			.mockResolvedValueOnce({
				items: [makeAdmin({ id: "2" })],
				nextCursor: "c2",
			})
			.mockResolvedValueOnce({ items: [makeAdmin()], nextCursor: "c1" });

		const store = useAdminsStore();
		await store.fetchFirstPage();
		await store.fetchNext();

		expect(AdminsService.list).toHaveBeenLastCalledWith({
			cursor: "c1",
			search: "",
		});
		expect(store.hasPrev).toBe(true);

		await store.fetchPrev();
		expect(AdminsService.list).toHaveBeenLastCalledWith({
			cursor: undefined,
			search: "",
		});
		expect(store.hasPrev).toBe(false);
	});

	it("setSearch trims the term and refetches from the first page", async () => {
		vi.mocked(AdminsService.list).mockResolvedValue({
			items: [],
			nextCursor: null,
		});

		const store = useAdminsStore();
		await store.setSearch("  ana  ");

		expect(store.search).toBe("ana");
		expect(AdminsService.list).toHaveBeenLastCalledWith({
			cursor: undefined,
			search: "ana",
		});
	});

	it("resets pagination to the first page and keeps search after a mutation", async () => {
		vi.mocked(AdminsService.list)
			.mockResolvedValueOnce({ items: [makeAdmin()], nextCursor: "c1" })
			.mockResolvedValueOnce({
				items: [makeAdmin({ id: "2" })],
				nextCursor: "c2",
			})
			.mockResolvedValueOnce({ items: [makeAdmin()], nextCursor: null });
		vi.mocked(AdminsService.create).mockResolvedValue(makeAdmin());

		const store = useAdminsStore();
		await store.setSearch("ana");
		await store.fetchNext();
		expect(store.hasPrev).toBe(true);

		await store.create({
			name: "New",
			email: "new@rb.io",
			birthDate: "1990-04-12",
		});

		expect(AdminsService.create).toHaveBeenCalled();
		expect(AdminsService.list).toHaveBeenLastCalledWith({
			cursor: undefined,
			search: "ana",
		});
		expect(store.hasPrev).toBe(false);
	});

	it("block/unblock/update/remove each refetch from the first page", async () => {
		vi.mocked(AdminsService.list).mockResolvedValue({
			items: [makeAdmin()],
			nextCursor: null,
		});
		vi.mocked(AdminsService.block).mockResolvedValue(makeAdmin());
		vi.mocked(AdminsService.remove).mockResolvedValue();

		const store = useAdminsStore();
		await store.block("1");
		await store.remove("1");

		expect(AdminsService.block).toHaveBeenCalledWith("1");
		expect(AdminsService.remove).toHaveBeenCalledWith("1");
		expect(AdminsService.list).toHaveBeenCalledTimes(2);
	});

	it("sets an error message when loading fails", async () => {
		vi.mocked(AdminsService.list).mockRejectedValue(new Error("boom"));

		const store = useAdminsStore();
		await store.fetchFirstPage();

		expect(store.error).toBe("Falha ao carregar admins");
		expect(store.items).toEqual([]);
	});
});
