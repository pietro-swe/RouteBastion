import type { AdminStatus } from "@route-bastion/contracts";

export type Admin = {
	id: string;
	name: string;
	email: string;
	birthDate: Date;
	passwordHash: string | null;
	status: AdminStatus;
	statusChangedAt: Date | null;
	isPasswordCreationPending: boolean;
	createdAt: Date;
	modifiedAt: Date | null;
};

export type CreateAdminData = {
	name: string;
	email: string;
	birthDate: Date;
};

export type UpdateAdminData = {
	name: string;
	email: string;
	birthDate: Date;
	resetPassword: boolean;
};

export type AdminsCursor = {
	createdAt: Date;
	id: string;
};

export type ListAdminsParams = {
	limit: number;
	search?: string;
	cursor?: AdminsCursor;
};

export type ListAdminsResult = {
	items: Admin[];
	nextCursor: AdminsCursor | null;
};
