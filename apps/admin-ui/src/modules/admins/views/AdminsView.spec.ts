import type { Admin } from "@route-bastion/contracts";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminsService } from "@/modules/admins/services/admins.service";
import AdminsView from "./AdminsView.vue";

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

function mountView() {
	return mount(AdminsView, {
		global: {
			plugins: [PrimeVue, ToastService],
			stubs: { AdminFormDialog: true, DeleteAdminDialog: true },
		},
	});
}

beforeEach(() => {
	setActivePinia(createPinia());
	vi.clearAllMocks();
	vi.mocked(adminsService.list).mockResolvedValue({
		items: [
			makeAdmin(),
			makeAdmin({
				id: "2",
				name: "Bruno Sá",
				email: "b@rb.io",
				status: "BLOCKED",
			}),
		],
		nextCursor: "c1",
	});
});

afterEach(() => {
	vi.useRealTimers();
});

describe("AdminsView", () => {
	it("renders one row per admin after load", async () => {
		const wrapper = mountView();
		await flushPromises();
		expect(wrapper.findAll('[data-testid="admin-row"]')).toHaveLength(2);
	});

	it("shows the empty state when there are no admins", async () => {
		vi.mocked(adminsService.list).mockResolvedValue({
			items: [],
			nextCursor: null,
		});
		const wrapper = mountView();
		await flushPromises();
		expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true);
	});

	it("Próxima loads the next page with the current nextCursor", async () => {
		const wrapper = mountView();
		await flushPromises();
		vi.mocked(adminsService.list).mockClear();
		vi.mocked(adminsService.list).mockResolvedValue({
			items: [makeAdmin({ id: "3" })],
			nextCursor: null,
		});

		await wrapper.find('[data-testid="next"]').trigger("click");
		await flushPromises();

		expect(adminsService.list).toHaveBeenCalledWith({
			cursor: "c1",
			search: undefined,
		});
	});

	it("debounced search triggers a search-scoped refetch", async () => {
		vi.useFakeTimers();
		const wrapper = mountView();
		await vi.runAllTimersAsync();
		vi.mocked(adminsService.list).mockClear();

		const input = wrapper.find('[data-testid="search"]');
		await input.setValue("ana");
		await input.trigger("input");
		await vi.advanceTimersByTimeAsync(300);

		expect(adminsService.list).toHaveBeenLastCalledWith({
			cursor: undefined,
			search: "ana",
		});
	});

	it("blocking an active admin calls the block endpoint then refetches", async () => {
		vi.mocked(adminsService.block).mockResolvedValue(
			makeAdmin({ status: "BLOCKED" }),
		);
		const wrapper = mountView();
		await flushPromises();

		await wrapper.findAll('[data-testid="toggle-block"]')[0]!.trigger("click");
		await flushPromises();

		expect(adminsService.block).toHaveBeenCalledWith("1");
	});
});
