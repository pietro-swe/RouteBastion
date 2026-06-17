<script setup lang="ts">
import { Form } from "@primevue/forms";
import { zodResolver } from "@primevue/forms/resolvers/zod";
import type { Customer } from "@route-bastion/contracts";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputMask from "primevue/inputmask";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import { useToast } from "primevue/usetoast";
import { computed, reactive, ref, watch } from "vue";
import { customerFormSchema, toCustomerInput } from "@/modules/customers/form";
import { useCustomersStore } from "@/modules/customers/stores/customers.store";
import { formatCnpj } from "@/shared/format/cnpj";

const props = defineProps<{
	visible: boolean;
	mode: "create" | "edit";
	customer: Customer | null;
}>();

const emit = defineEmits<{
	"update:visible": [value: boolean];
	saved: [];
}>();

const store = useCustomersStore();
const toast = useToast();
const resolver = zodResolver(customerFormSchema);
const submitting = ref(false);

const initialValues = reactive({
	name: "",
	businessIdentifier: "",
});

watch(
	() => props.visible,
	(open) => {
		if (!open) {
			return;
		}

		initialValues.name = props.customer?.name ?? "";
		initialValues.businessIdentifier = props.customer
			? formatCnpj(props.customer.businessIdentifier)
			: "";
	},
	{ immediate: true },
);

const title = computed(() =>
	props.mode === "create" ? "Novo customer" : "Editar customer",
);

async function onSubmit(event: {
	valid: boolean;
	values: Record<string, unknown>;
}) {
	if (!event.valid || submitting.value) {
		return;
	}

	const input = toCustomerInput({
		name: event.values.name as string,
		businessIdentifier: event.values.businessIdentifier as string,
	});

	submitting.value = true;

	try {
		if (props.mode === "create") {
			await store.create(input);
		} else if (props.customer) {
			await store.update(props.customer.id, input);
		}

		toast.add({
			severity: "success",
			summary: "Sucesso",
			detail:
				props.mode === "create" ? "Customer criado" : "Customer atualizado",
			life: 3000,
		});
		emit("saved");
		emit("update:visible", false);
	} catch {
		toast.add({
			severity: "error",
			summary: "Erro",
			detail: "Não foi possível salvar o customer",
			life: 4000,
		});
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<Dialog
		:visible="visible"
		modal
		:header="title"
		:style="{ width: '28rem' }"
		@update:visible="emit('update:visible', $event)"
	>
		<Form
			:initial-values="initialValues"
			:resolver="resolver"
			data-testid="customer-form"
			@submit="onSubmit"
		>
			<template #default="$form">
				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-1">
						<label for="name">Nome</label>
						<InputText id="name" name="name" data-testid="field-name" />
						<Message
							v-if="$form.name?.invalid"
							severity="error"
							size="small"
							variant="simple"
						>
							{{ $form.name.error?.message }}
						</Message>
					</div>

					<div class="flex flex-col gap-1">
						<label for="businessIdentifier">CNPJ</label>
						<InputMask
							id="businessIdentifier"
							name="businessIdentifier"
							mask="99.999.999/9999-99"
							placeholder="00.000.000/0000-00"
							data-testid="field-cnpj"
						/>
						<Message
							v-if="$form.businessIdentifier?.invalid"
							severity="error"
							size="small"
							variant="simple"
						>
							{{ $form.businessIdentifier.error?.message }}
						</Message>
					</div>
				</div>

				<div class="mt-6 flex justify-end gap-2">
					<Button
						label="Cancelar"
						severity="secondary"
						type="button"
						data-testid="cancel"
						@click="emit('update:visible', false)"
					/>
					<Button
						label="Salvar"
						type="submit"
						:loading="submitting"
						data-testid="save"
					/>
				</div>
			</template>
		</Form>
	</Dialog>
</template>
