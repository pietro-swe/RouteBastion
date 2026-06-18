export type Customer = {
	id: string;
	name: string;
	businessIdentifier: string;
	createdAt: Date;
	modifiedAt: Date | null;
	deletedAt: Date | null;
};

export type CreateCustomerData = {
	name: string;
	businessIdentifier: string;
};

export type UpdateCustomerData = {
	name: string;
	businessIdentifier: string;
};

export type CustomersCursor = {
	createdAt: Date;
	id: string;
};

export type ListCustomersParams = {
	limit: number;
	search?: string;
	cursor?: CustomersCursor;
};

export type ListCustomersResult = {
	items: Customer[];
	nextCursor: CustomersCursor | null;
};
