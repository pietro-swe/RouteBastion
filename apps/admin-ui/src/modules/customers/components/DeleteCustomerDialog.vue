<script setup lang="ts">
import type { Customer } from "@route-bastion/contracts";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { useToast } from "primevue/usetoast";
import { ref } from "vue";
import { useCustomersStore } from "@/modules/customers/stores/customers.store";
import { formatCnpj } from "@/shared/format/cnpj";

const props = defineProps<{ visible: boolean; customer: Customer | null }>();
const emit = defineEmits<{ "update:visible": [value: boolean] }>();

const store = useCustomersStore();
const toast = useToast();
const deleting = ref(false);

async function confirm() {
	if (!props.customer || deleting.value) {
		return;
	}

	deleting.value = true;

	try {
		await store.remove(props.customer.id);
		toast.add({
			severity: "success",
			summary: "Sucesso",
			detail: "Customer deletado",
			life: 3000,
		});
		emit("update:visible", false);
	} catch {
		toast.add({
			severity: "error",
			summary: "Erro",
			detail: "Não foi possível deletar o customer",
			life: 4000,
		});
	} finally {
		deleting.value = false;
	}
}
</script>

<template>
	<Dialog
		:visible="visible"
		modal
		header="Deletar customer"
		:style="{ width: '24rem' }"
		@update:visible="emit('update:visible', $event)"
	>
		<p data-testid="delete-message">
			Tem certeza que deseja deletar <b>{{ customer?.name }}</b> ({{
				customer ? formatCnpj(customer.businessIdentifier) : ""
			}})?
		</p>
		<div class="mt-6 flex justify-end gap-2">
			<Button
				label="Cancelar"
				severity="secondary"
				type="button"
				data-testid="delete-cancel"
				@click="emit('update:visible', false)"
			/>
			<Button
				label="Deletar"
				severity="danger"
				:loading="deleting"
				data-testid="delete-confirm"
				@click="confirm"
			/>
		</div>
	</Dialog>
</template>
