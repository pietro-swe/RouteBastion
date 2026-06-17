import type { AdminStatus } from "@route-bastion/contracts";
import type {
	Admin,
	CreateAdminData,
	ListAdminsParams,
	ListAdminsResult,
	UpdateAdminData,
} from "./@types";

export abstract class AdminsRepository {
	abstract getByID(id: string): Promise<Admin | null>;
	abstract getByEmail(email: string): Promise<Admin | null>;
	abstract list(params: ListAdminsParams): Promise<ListAdminsResult>;
	abstract create(data: CreateAdminData): Promise<Admin>;
	abstract update(id: string, data: UpdateAdminData): Promise<Admin>;
	abstract delete(id: string): Promise<void>;
	abstract setStatus(id: string, status: AdminStatus): Promise<Admin>;
}
