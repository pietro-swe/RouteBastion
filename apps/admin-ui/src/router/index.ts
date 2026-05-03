import { createRouter, createWebHistory } from "vue-router";

export const routes = {
	Login: "/auth",
	ForgotPassword: "/forgot-password",
	Dashboard: "/dashboard",
} as const;

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [],
});

export default router;
