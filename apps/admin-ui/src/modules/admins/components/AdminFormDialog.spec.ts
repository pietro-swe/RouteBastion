import type { Admin } from "@route-bastion/contracts";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { beforeEach, describe, expect, it } from "vitest";
import AdminFormDialog from "./AdminFormDialog.vue";

const DialogStub = {
	props: ["visible"],
	template: `<div><slot /></div>`,
};

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

function mountDialog(props: Record<string, unknown>) {
	return mount(AdminFormDialog, {
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

describe("AdminFormDialog", () => {
	it("renders the create title in create mode", () => {
		const wrapper = mountDialog({ visible: true, mode: "create", admin: null });
		expect(wrapper.find('[data-testid="admin-form"]').exists()).toBe(true);
	});

	it("cancel emits update:visible false", async () => {
		const wrapper = mountDialog({ visible: true, mode: "create", admin: null });
		await wrapper.find('[data-testid="cancel"]').trigger("click");
		expect(wrapper.emitted("update:visible")?.at(-1)).toEqual([false]);
	});

	it("shows the email-change warning in edit mode when the email changes", async () => {
		const wrapper = mountDialog({
			visible: true,
			mode: "edit",
			admin: makeAdmin({ email: "old@rb.io" }),
		});
		await flushPromises();

		expect(wrapper.find('[data-testid="email-warning"]').exists()).toBe(false);

		await wrapper.find('[data-testid="field-email"]').setValue("new@rb.io");

		expect(wrapper.find('[data-testid="email-warning"]').exists()).toBe(true);
	});
});
