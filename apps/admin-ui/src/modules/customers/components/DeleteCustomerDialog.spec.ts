import type { Customer } from "@route-bastion/contracts";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomersService } from "@/modules/customers/services/customers.service";
import DeleteCustomerDialog from "./DeleteCustomerDialog.vue";

vi.mock("@/modules/customers/services/customers.service", () => ({
	CustomersService: { remove: vi.fn(), list: vi.fn() },
}));

const DialogStub = { props: ["visible"], template: `<div><slot /></div>` };

const customer: Customer = {
	id: "1",
	name: "Acme Ltda",
	businessIdentifier: "11222333000181",
	createdAt: "2026-06-15T12:00:00.000Z",
	modifiedAt: null,
};

function mountDialog() {
	return mount(DeleteCustomerDialog, {
		props: { visible: true, customer },
		global: {
			plugins: [PrimeVue, ToastService],
			stubs: { Dialog: DialogStub },
		},
	});
}

beforeEach(() => {
	setActivePinia(createPinia());
	vi.clearAllMocks();
	vi.mocked(CustomersService.list).mockResolvedValue({
		items: [],
		nextCursor: null,
	});
});

describe("DeleteCustomerDialog", () => {
	it("shows the customer name in the confirmation message", () => {
		const wrapper = mountDialog();
		expect(wrapper.find('[data-testid="delete-message"]').text()).toContain(
			"Acme Ltda",
		);
	});

	it("confirm calls store.remove and closes", async () => {
		vi.mocked(CustomersService.remove).mockResolvedValue();
		const wrapper = mountDialog();

		await wrapper.find('[data-testid="delete-confirm"]').trigger("click");
		await flushPromises();

		expect(CustomersService.remove).toHaveBeenCalledWith("1");
		expect(wrapper.emitted("update:visible")?.at(-1)).toEqual([false]);
	});

	it("cancel emits update:visible false without deleting", async () => {
		const wrapper = mountDialog();
		await wrapper.find('[data-testid="delete-cancel"]').trigger("click");
		expect(CustomersService.remove).not.toHaveBeenCalled();
		expect(wrapper.emitted("update:visible")?.at(-1)).toEqual([false]);
	});
});
