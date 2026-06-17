<script setup lang="ts">
import { Form } from "@primevue/forms";
import { zodResolver } from "@primevue/forms/resolvers/zod";
import type { Admin } from "@route-bastion/contracts";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import { useToast } from "primevue/usetoast";
import { computed, reactive, ref, watch } from "vue";
import { adminFormSchema, toAdminInput } from "@/modules/admins/form";
import { useAdminsStore } from "@/modules/admins/stores/admins.store";
import { parseApiDate } from "@/shared/format/date";

const props = defineProps<{
	visible: boolean;
	mode: "create" | "edit";
	admin: Admin | null;
}>();

const emit = defineEmits<{
	"update:visible": [value: boolean];
	saved: [];
}>();

const store = useAdminsStore();
const toast = useToast();
const resolver = zodResolver(adminFormSchema);
const submitting = ref(false);
const currentEmail = ref("");

const initialValues = reactive({
	name: "",
	email: "",
	birthDate: null as Date | null,
});

watch(
	() => props.visible,
	(open) => {
		if (!open) {
			return;
		}

		initialValues.name = props.admin?.name ?? "";
		initialValues.email = props.admin?.email ?? "";
		initialValues.birthDate = props.admin
			? parseApiDate(props.admin.birthDate)
			: null;
		currentEmail.value = props.admin?.email ?? "";
	},
	{ immediate: true },
);

const title = computed(() =>
	props.mode === "create" ? "Novo admin" : "Editar admin",
);

const emailChanged = computed(
	() =>
		props.mode === "edit" &&
		!!props.admin &&
		currentEmail.value !== props.admin.email,
);

async function onSubmit(event: {
	valid: boolean;
	values: Record<string, unknown>;
}) {
	if (!event.valid || submitting.value) {
		return;
	}

	const input = toAdminInput({
		name: event.values.name as string,
		email: event.values.email as string,
		birthDate: event.values.birthDate as Date,
	});

	submitting.value = true;

	try {
		if (props.mode === "create") {
			await store.create(input);
		} else if (props.admin) {
			await store.update(props.admin.id, input);
		}

		toast.add({
			severity: "success",
			summary: "Sucesso",
			detail: props.mode === "create" ? "Admin criado" : "Admin atualizado",
			life: 3000,
		});
		emit("saved");
		emit("update:visible", false);
	} catch {
		toast.add({
			severity: "error",
			summary: "Erro",
			detail: "Não foi possível salvar o admin",
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
			data-testid="admin-form"
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
						<label for="email">Email</label>
						<InputText
							id="email"
							name="email"
							data-testid="field-email"
							@input="
								currentEmail = ($event.target as HTMLInputElement).value
							"
						/>
						<Message
							v-if="$form.email?.invalid"
							severity="error"
							size="small"
							variant="simple"
						>
							{{ $form.email.error?.message }}
						</Message>
						<Message
							v-if="emailChanged"
							severity="warn"
							size="small"
							variant="simple"
							data-testid="email-warning"
						>
							Ao alterar o email deste usuário, a senha do mesmo será
							redefinida e ele deverá criar uma nova no seu próximo acesso.
						</Message>
					</div>

					<div class="flex flex-col gap-1">
						<label for="birthDate">Data de nascimento</label>
						<DatePicker
							input-id="birthDate"
							name="birthDate"
							date-format="dd/mm/yy"
							data-testid="field-birthdate"
						/>
						<Message
							v-if="$form.birthDate?.invalid"
							severity="error"
							size="small"
							variant="simple"
						>
							{{ $form.birthDate.error?.message }}
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
