import { Admin } from "./@types";
import { CreateAdminInput } from "./inputs/create";

export abstract class AdminsRepository {
	abstract getByID(id: string): Promise<Admin | null>;
	abstract getByEmail(email: string): Promise<Admin | null>;
	abstract create(data: CreateAdminInput): Promise<Admin>;
	abstract delete(id: string): Promise<void>;
}
