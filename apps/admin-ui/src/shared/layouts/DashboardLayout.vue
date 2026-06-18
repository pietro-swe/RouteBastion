<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { routes } from "@/router";
</script>

<template>
	<div class="flex min-h-screen">
		<aside
			class="w-60 shrink-0 border-r border-surface-200 p-4"
			data-testid="sidebar"
		>
			<h1 class="mb-6 text-lg font-bold">RouteBastion</h1>
			<nav class="flex flex-col gap-1">
				<RouterLink
					:to="routes.Admins"
					class="rounded px-3 py-2 hover:bg-surface-100"
				>
					Admins
				</RouterLink>
				<RouterLink
					:to="routes.Customers"
					class="rounded px-3 py-2 hover:bg-surface-100"
				>
					Customers
				</RouterLink>
			</nav>
		</aside>
		<main class="flex-1 p-6">
			<RouterView />
		</main>
	</div>
</template>
