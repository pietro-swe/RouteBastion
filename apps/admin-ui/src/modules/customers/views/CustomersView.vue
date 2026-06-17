<script setup lang="ts">
import type { Customer } from "@route-bastion/contracts";
import { useDebounceFn } from "@vueuse/core";
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import InputText from "primevue/inputtext";
import { onMounted, ref } from "vue";
import CustomerFormDialog from "@/modules/customers/components/CustomerFormDialog.vue";
import DeleteCustomerDialog from "@/modules/customers/components/DeleteCustomerDialog.vue";
import { useCustomersStore } from "@/modules/customers/stores/customers.store";
import { formatCnpj } from "@/shared/format/cnpj";
import { formatDateBR } from "@/shared/format/date";

const store = useCustomersStore();

const searchTerm = ref("");
const formVisible = ref(false);
const formMode = ref<"create" | "edit">("create");
const selectedCustomer = ref<Customer | null>(null);
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
	selectedCustomer.value = null;
	formVisible.value = true;
}

function openEdit(customer: Customer) {
	formMode.value = "edit";
	selectedCustomer.value = customer;
	formVisible.value = true;
}

function openDelete(customer: Customer) {
	selectedCustomer.value = customer;
	deleteVisible.value = true;
}
</script>

<template>
	<section>
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-xl font-bold">Customers</h2>
			<Button
				label="Novo customer"
				icon="pi pi-plus"
				data-testid="new-customer"
				@click="openCreate"
			/>
		</div>

		<IconField class="mb-4 block">
			<InputIcon class="pi pi-search" />
			<InputText
				v-model="searchTerm"
				placeholder="Buscar por nome ou CNPJ…"
				class="w-full"
				data-testid="search"
				@input="onSearch"
			/>
		</IconField>

		<DataTable
			:value="store.items"
			:loading="store.loading"
			data-testid="customer-table"
			data-key="id"
		>
			<template #empty>
				<p class="p-8 text-center text-surface-500" data-testid="empty">
					Nenhum customer encontrado.
				</p>
			</template>

			<Column header="Cliente">
				<template #body="{ data }">
					<div class="flex items-center gap-3" data-testid="customer-row">
						<Avatar :label="initials(data.name)" shape="circle" />
						<div class="font-semibold">{{ data.name }}</div>
					</div>
				</template>
			</Column>

			<Column header="CNPJ">
				<template #body="{ data }">
					{{ formatCnpj(data.businessIdentifier) }}
				</template>
			</Column>

			<Column header="Criado em">
				<template #body="{ data }">
					{{ formatDateBR(data.createdAt) }}
				</template>
			</Column>

			<Column header="">
				<template #body="{ data }">
					<div class="flex justify-end gap-2">
						<Button
							icon="pi pi-pencil"
							severity="secondary"
							text
							rounded
							aria-label="Editar"
							data-testid="edit"
							@click="openEdit(data)"
						/>
						<Button
							icon="pi pi-trash"
							severity="danger"
							text
							rounded
							aria-label="Deletar"
							data-testid="delete"
							@click="openDelete(data)"
						/>
					</div>
				</template>
			</Column>
		</DataTable>

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

		<CustomerFormDialog
			v-model:visible="formVisible"
			:mode="formMode"
			:customer="selectedCustomer"
		/>
		<DeleteCustomerDialog
			v-model:visible="deleteVisible"
			:customer="selectedCustomer"
		/>
	</section>
</template>
