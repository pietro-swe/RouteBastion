import type {
	CreateCustomerInput,
	Customer,
	UpdateCustomerInput,
} from "@route-bastion/contracts";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { CustomersService } from "@/modules/customers/services/customers.service";

export const useCustomersStore = defineStore("Customers", () => {
	const items = ref<Customer[]>([]);
	const search = ref("");
	const loading = ref(false);
	const error = ref<string | null>(null);

	const cursorStack = ref<(string | undefined)[]>([undefined]);
	const nextCursor = ref<string | null>(null);

	const hasPrev = computed(() => cursorStack.value.length > 1);
	const hasNext = computed(() => nextCursor.value !== null);

	async function load(cursor: string | undefined) {
		loading.value = true;
		error.value = null;

		try {
			const result = await CustomersService.list({
				cursor,
				search: search.value ?? undefined,
			});
			items.value = result.items;
			nextCursor.value = result.nextCursor;
		} catch {
			error.value = "Falha ao carregar customers";
			items.value = [];
			nextCursor.value = null;
		} finally {
			loading.value = false;
		}
	}

	async function refetch() {
		cursorStack.value = [undefined];
		await load(undefined);
	}

	async function fetchFirstPage() {
		await refetch();
	}

	async function fetchNext() {
		if (!nextCursor.value) {
			return;
		}

		cursorStack.value.push(nextCursor.value);
		await load(nextCursor.value);
	}

	async function fetchPrev() {
		if (cursorStack.value.length <= 1) {
			return;
		}

		cursorStack.value.pop();
		await load(cursorStack.value[cursorStack.value.length - 1]);
	}

	async function setSearch(term: string) {
		search.value = term.trim();
		await refetch();
	}

	async function create(input: CreateCustomerInput) {
		await CustomersService.create(input);
		await refetch();
	}

	async function update(id: string, input: UpdateCustomerInput) {
		await CustomersService.update(id, input);
		await refetch();
	}

	async function remove(id: string) {
		await CustomersService.remove(id);
		await refetch();
	}

	return {
		items,
		search,
		loading,
		error,
		hasPrev,
		hasNext,
		fetchFirstPage,
		fetchNext,
		fetchPrev,
		setSearch,
		create,
		update,
		remove,
	};
});
