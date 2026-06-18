import type {
	CreateCustomerData,
	Customer,
	ListCustomersParams,
	ListCustomersResult,
	UpdateCustomerData,
} from "./@types";

export abstract class CustomersRepository {
	abstract getByID(id: string): Promise<Customer | null>;
	abstract getByBusinessIdentifier(
		businessIdentifier: string,
	): Promise<Customer | null>;
	abstract list(params: ListCustomersParams): Promise<ListCustomersResult>;
	abstract create(data: CreateCustomerData): Promise<Customer>;
	abstract update(id: string, data: UpdateCustomerData): Promise<Customer>;
	abstract softDelete(id: string): Promise<void>;
}
