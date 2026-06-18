import type { Customer } from "@route-bastion/contracts";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { beforeEach, describe, expect, it } from "vitest";
import CustomerFormDialog from "./CustomerFormDialog.vue";

const DialogStub = {
	props: ["visible"],
	template: `<div><slot /></div>`,
};

function mountDialog(props: {
	visible: boolean;
	mode: "create" | "edit";
	customer: Customer | null;
}) {
	return mount(CustomerFormDialog, {
		props,
		global: {
			plugins: [PrimeVue, ToastService],
			stubs: { Dialog: DialogStub },
		},
	});
}

beforeEach(() => {
	setActivePinia(createPinia());
});

describe("CustomerFormDialog", () => {
	it("renders the form in create mode", () => {
		const wrapper = mountDialog({
			visible: true,
			mode: "create",
			customer: null,
		});
		expect(wrapper.find('[data-testid="customer-form"]').exists()).toBe(true);
	});

	it("cancel emits update:visible false", async () => {
		const wrapper = mountDialog({
			visible: true,
			mode: "create",
			customer: null,
		});
		await wrapper.find('[data-testid="cancel"]').trigger("click");
		expect(wrapper.emitted("update:visible")?.at(-1)).toEqual([false]);
	});
});
