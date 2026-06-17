import type { Admin } from "@route-bastion/contracts";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminsService } from "@/modules/admins/services/admins.service";
import DeleteAdminDialog from "./DeleteAdminDialog.vue";

vi.mock("@/modules/admins/services/admins.service", () => ({
	adminsService: { remove: vi.fn(), list: vi.fn() },
}));

const DialogStub = { props: ["visible"], template: `<div><slot /></div>` };

const admin: Admin = {
	id: "1",
	name: "Ana Lima",
	email: "ana@rb.io",
	birthDate: "1990-04-12",
	status: "ACTIVE",
	isPasswordCreationPending: true,
	statusChangedAt: null,
	createdAt: "2026-06-15T12:00:00.000Z",
	modifiedAt: null,
};

function mountDialog() {
	return mount(DeleteAdminDialog, {
		props: { visible: true, admin },
		global: {
			plugins: [PrimeVue, ToastService],
			stubs: { Dialog: DialogStub },
		},
	});
}

beforeEach(() => {
	setActivePinia(createPinia());
	vi.clearAllMocks();
	vi.mocked(adminsService.list).mockResolvedValue({
		items: [],
		nextCursor: null,
	});
});

describe("DeleteAdminDialog", () => {
	it("shows the admin name in the confirmation message", () => {
		const wrapper = mountDialog();
		expect(wrapper.find('[data-testid="delete-message"]').text()).toContain(
			"Ana Lima",
		);
	});

	it("confirm calls store.remove and closes", async () => {
		vi.mocked(adminsService.remove).mockResolvedValue();
		const wrapper = mountDialog();

		await wrapper.find('[data-testid="delete-confirm"]').trigger("click");
		await flushPromises();

		expect(adminsService.remove).toHaveBeenCalledWith("1");
		expect(wrapper.emitted("update:visible")?.at(-1)).toEqual([false]);
	});

	it("cancel emits update:visible false without deleting", async () => {
		const wrapper = mountDialog();
		await wrapper.find('[data-testid="delete-cancel"]').trigger("click");
		expect(adminsService.remove).not.toHaveBeenCalled();
		expect(wrapper.emitted("update:visible")?.at(-1)).toEqual([false]);
	});
});
