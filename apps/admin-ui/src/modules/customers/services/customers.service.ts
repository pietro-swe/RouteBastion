import type {
	CreateCustomerInput,
	Customer,
	ListCustomersOutput,
	ListCustomersQuery,
	UpdateCustomerInput,
} from "@route-bastion/contracts";
import { http } from "@/shared/http/client";

function listParams(query: ListCustomersQuery): Record<string, string> {
	const params: Record<string, string> = {};

	if (query.cursor) {
		params.cursor = query.cursor;
	}

	if (query.search) {
		params.search = query.search;
	}

	return params;
}

export class CustomersService {
	static list(query: ListCustomersQuery): Promise<ListCustomersOutput> {
		return http
			.get("customers", { searchParams: listParams(query) })
			.json<ListCustomersOutput>();
	}

	static create(input: CreateCustomerInput): Promise<Customer> {
		return http.post("customers", { json: input }).json<Customer>();
	}

	static update(id: string, input: UpdateCustomerInput): Promise<Customer> {
		return http.put(`customers/${id}`, { json: input }).json<Customer>();
	}

	static async remove(id: string): Promise<void> {
		await http.delete(`customers/${id}`);
	}
}
