import type { Customer } from "@route-bastion/contracts";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomersService } from "@/modules/customers/services/customers.service";
import CustomersView from "./CustomersView.vue";

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

function mountView() {
	return mount(CustomersView, {
		global: {
			plugins: [PrimeVue, ToastService],
			stubs: { CustomerFormDialog: true, DeleteCustomerDialog: true },
		},
	});
}

beforeEach(() => {
	setActivePinia(createPinia());
	vi.clearAllMocks();
	vi.mocked(CustomersService.list).mockResolvedValue({
		items: [
			makeCustomer(),
			makeCustomer({ id: "2", name: "Beatriz Transportes" }),
		],
		nextCursor: "c1",
	});
});

afterEach(() => {
	vi.useRealTimers();
});

describe("CustomersView", () => {
	it("renders one row per customer after load", async () => {
		const wrapper = mountView();
		await flushPromises();
		expect(wrapper.findAll('[data-testid="customer-row"]')).toHaveLength(2);
	});

	it("formats the CNPJ in the table", async () => {
		const wrapper = mountView();
		await flushPromises();
		expect(wrapper.html()).toContain("11.222.333/0001-81");
	});

	it("shows the empty state when there are no customers", async () => {
		vi.mocked(CustomersService.list).mockResolvedValue({
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
		vi.mocked(CustomersService.list).mockClear();
		vi.mocked(CustomersService.list).mockResolvedValue({
			items: [makeCustomer({ id: "3" })],
			nextCursor: null,
		});

		await wrapper.find('[data-testid="next"]').trigger("click");
		await flushPromises();

		expect(CustomersService.list).toHaveBeenCalledWith({
			cursor: "c1",
			search: "",
		});
	});

	it("debounced search triggers a search-scoped refetch", async () => {
		vi.useFakeTimers();
		const wrapper = mountView();
		await vi.runAllTimersAsync();
		vi.mocked(CustomersService.list).mockClear();

		const input = wrapper.find('[data-testid="search"]');
		await input.setValue("acme");
		await input.trigger("input");
		await vi.advanceTimersByTimeAsync(300);

		expect(CustomersService.list).toHaveBeenLastCalledWith({
			cursor: undefined,
			search: "acme",
		});
	});
});
