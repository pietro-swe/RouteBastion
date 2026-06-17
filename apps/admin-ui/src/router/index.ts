import { createRouter, createWebHistory } from "vue-router";
import DashboardLayout from "@/shared/layouts/DashboardLayout.vue";

export const routes = {
	Login: "/auth",
	ForgotPassword: "/forgot-password",
	Dashboard: "/dashboard",
	Admins: "/dashboard/admins",
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
			],
		},
	],
});

export default router;
