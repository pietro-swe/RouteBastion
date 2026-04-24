export type User = {
	id: string;
	name: string;
	email: string;
	birthDate: Date;
	passwordHash: string;
	createdAt: Date;
	modifiedAt: Date | null;
	deletedAt: Date | null;
};
