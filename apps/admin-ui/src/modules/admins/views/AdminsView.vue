<script setup lang="ts">
import type { Admin } from "@route-bastion/contracts";
import { useDebounceFn } from "@vueuse/core";
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";
import AdminFormDialog from "@/modules/admins/components/AdminFormDialog.vue";
import DeleteAdminDialog from "@/modules/admins/components/DeleteAdminDialog.vue";
import { useAdminsStore } from "@/modules/admins/stores/admins.store";
import { formatDateBR } from "@/shared/format/date";

const store = useAdminsStore();
const toast = useToast();

const searchTerm = ref("");
const formVisible = ref(false);
const formMode = ref<"create" | "edit">("create");
const selectedAdmin = ref<Admin | null>(null);
const deleteVisible = ref(false);

onMounted(() => {
	store.fetchFirstPage();
});

const onSearch = useDebounceFn(() => {
	store.setSearch(searchTerm.value);
}, 300);

function initials(name: string): string {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

function openCreate() {
	formMode.value = "create";
	selectedAdmin.value = null;
	formVisible.value = true;
}

function openEdit(admin: Admin) {
	formMode.value = "edit";
	selectedAdmin.value = admin;
	formVisible.value = true;
}

function openDelete(admin: Admin) {
	selectedAdmin.value = admin;
	deleteVisible.value = true;
}

async function toggleBlock(admin: Admin) {
	try {
		if (admin.status === "ACTIVE") {
			await store.block(admin.id);
			toast.add({
				severity: "success",
				summary: "Sucesso",
				detail: "Admin bloqueado",
				life: 3000,
			});
		} else {
			await store.unblock(admin.id);
			toast.add({
				severity: "success",
				summary: "Sucesso",
				detail: "Admin desbloqueado",
				life: 3000,
			});
		}
	} catch {
		toast.add({
			severity: "error",
			summary: "Erro",
			detail: "Não foi possível alterar o status",
			life: 4000,
		});
	}
}
</script>

<template>
	<section>
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-xl font-bold">Admins</h2>
			<Button
				label="Novo admin"
				icon="pi pi-plus"
				data-testid="new-admin"
				@click="openCreate"
			/>
		</div>

		<IconField class="mb-4 block">
			<InputIcon class="pi pi-search" />
			<InputText
				v-model="searchTerm"
				placeholder="Buscar por nome…"
				class="w-full"
				data-testid="search"
				@input="onSearch"
			/>
		</IconField>

		<div
			class="grid grid-cols-[3fr_1.3fr_1.3fr_1.4fr] px-3 pb-2 text-xs font-bold uppercase text-surface-500"
		>
			<span>Admin</span>
			<span>Status</span>
			<span>Criado em</span>
			<span></span>
		</div>

		<p v-if="store.loading" data-testid="loading">Carregando…</p>

		<p
			v-else-if="store.items.length === 0"
			class="rounded border border-surface-200 p-8 text-center text-surface-500"
			data-testid="empty"
		>
			Nenhum admin encontrado.
		</p>

		<ul v-else class="flex flex-col gap-2">
			<li
				v-for="admin in store.items"
				:key="admin.id"
				class="grid grid-cols-[3fr_1.3fr_1.3fr_1.4fr] items-center rounded-lg border border-surface-200 p-3"
				data-testid="admin-row"
			>
				<div class="flex items-center gap-3">
					<Avatar :label="initials(admin.name)" shape="circle" />
					<div>
						<div class="font-semibold">{{ admin.name }}</div>
						<div class="text-sm text-surface-500">{{ admin.email }}</div>
					</div>
				</div>
				<div>
					<Tag
						:value="admin.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'"
						:severity="admin.status === 'ACTIVE' ? 'success' : 'danger'"
					/>
				</div>
				<div>{{ formatDateBR(admin.createdAt) }}</div>
				<div class="flex justify-end gap-2">
					<Button
						icon="pi pi-pencil"
						severity="secondary"
						text
						rounded
						aria-label="Editar"
						data-testid="edit"
						@click="openEdit(admin)"
					/>
					<Button
						:icon="admin.status === 'ACTIVE' ? 'pi pi-lock' : 'pi pi-lock-open'"
						severity="secondary"
						text
						rounded
						:aria-label="admin.status === 'ACTIVE' ? 'Bloquear' : 'Desbloquear'"
						data-testid="toggle-block"
						@click="toggleBlock(admin)"
					/>
					<Button
						icon="pi pi-trash"
						severity="danger"
						text
						rounded
						aria-label="Deletar"
						data-testid="delete"
						@click="openDelete(admin)"
					/>
				</div>
			</li>
		</ul>

		<div class="mt-4 flex justify-end gap-2">
			<Button
				label="Anterior"
				icon="pi pi-chevron-left"
				severity="secondary"
				:disabled="!store.hasPrev"
				data-testid="prev"
				@click="store.fetchPrev()"
			/>
			<Button
				label="Próxima"
				icon="pi pi-chevron-right"
				icon-pos="right"
				severity="secondary"
				:disabled="!store.hasNext"
				data-testid="next"
				@click="store.fetchNext()"
			/>
		</div>

		<AdminFormDialog
			v-model:visible="formVisible"
			:mode="formMode"
			:admin="selectedAdmin"
		/>
		<DeleteAdminDialog v-model:visible="deleteVisible" :admin="selectedAdmin" />
	</section>
</template>
