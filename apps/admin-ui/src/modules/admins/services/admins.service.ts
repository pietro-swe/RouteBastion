import type {
	Admin,
	CreateAdminInput,
	ListAdminsOutput,
	ListAdminsQuery,
	UpdateAdminInput,
} from "@route-bastion/contracts";
import { http } from "@/shared/http/client";

function listParams(query: ListAdminsQuery): Record<string, string> {
	const params: Record<string, string> = {};

	if (query.cursor) {
		params.cursor = query.cursor;
	}

	if (query.search) {
		params.search = query.search;
	}

	return params;
}

export const adminsService = {
	list(query: ListAdminsQuery): Promise<ListAdminsOutput> {
		return http
			.get("admins", { searchParams: listParams(query) })
			.json<ListAdminsOutput>();
	},

	create(input: CreateAdminInput): Promise<Admin> {
		return http.post("admins", { json: input }).json<Admin>();
	},

	update(id: string, input: UpdateAdminInput): Promise<Admin> {
		return http.put(`admins/${id}`, { json: input }).json<Admin>();
	},

	block(id: string): Promise<Admin> {
		return http.patch(`admins/${id}/block`).json<Admin>();
	},

	unblock(id: string): Promise<Admin> {
		return http.patch(`admins/${id}/unblock`).json<Admin>();
	},

	async remove(id: string): Promise<void> {
		await http.delete(`admins/${id}`);
	},
};
