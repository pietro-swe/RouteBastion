import { z } from "zod";

export const adminStatusSchema = z.enum(["ACTIVE", "BLOCKED"]);
export type AdminStatus = z.infer<typeof adminStatusSchema>;

export const createAdminInputSchema = z.object({
	name: z.string().min(1),
	email: z.email(),
	birthDate: z.iso.date(),
});
export type CreateAdminInput = z.infer<typeof createAdminInputSchema>;

export const updateAdminInputSchema = z.object({
	name: z.string().min(1),
	email: z.email(),
	birthDate: z.iso.date(),
});
export type UpdateAdminInput = z.infer<typeof updateAdminInputSchema>;

export const adminOutputSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	email: z.email(),
	birthDate: z.iso.date(),
	status: adminStatusSchema,
	isPasswordCreationPending: z.boolean(),
	statusChangedAt: z.iso.datetime().nullable(),
	createdAt: z.iso.datetime(),
	modifiedAt: z.iso.datetime().nullable(),
});
export type Admin = z.infer<typeof adminOutputSchema>;

export const listAdminsQuerySchema = z.object({
	cursor: z.string().optional(),
	search: z.string().optional(),
});
export type ListAdminsQuery = z.infer<typeof listAdminsQuerySchema>;

export const listAdminsOutputSchema = z.object({
	items: z.array(adminOutputSchema),
	nextCursor: z.string().nullable(),
});
export type ListAdminsOutput = z.infer<typeof listAdminsOutputSchema>;

export const errorOutputSchema = z.object({
	error: z.string(),
});
export type ErrorOutput = z.infer<typeof errorOutputSchema>;
