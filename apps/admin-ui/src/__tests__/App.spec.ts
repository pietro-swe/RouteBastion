import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { describe, expect, it } from "vitest";
import App from "../App.vue";

describe("App", () => {
	it("mounts without crashing", () => {
		const wrapper = mount(App, {
			global: {
				plugins: [PrimeVue, ToastService],
				stubs: { RouterView: true },
			},
		});
		expect(wrapper.exists()).toBe(true);
	});
});
