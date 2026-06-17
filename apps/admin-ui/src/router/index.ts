import { createRouter, createWebHistory } from "vue-router";
import DashboardLayout from "@/shared/layouts/DashboardLayout.vue";

export const routes = {
	Login: "/auth",
	ForgotPassword: "/forgot-password",
	Dashboard: "/dashboard",
	Admins: "/dashboard/admins",
	Customers: "/dashboard/customers",
} as const;

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/dashboard",
			component: DashboardLayout,
			children: [
				{
					path: "admins",
					name: "Admins",
					component: () => import("@/modules/admins/views/AdminsView.vue"),
				},
				{
					path: "customers",
					name: "Customers",
					component: () =>
						import("@/modules/customers/views/CustomersView.vue"),
				},
			],
		},
	],
});

export default router;
