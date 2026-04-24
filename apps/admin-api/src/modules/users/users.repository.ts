import { User } from "./@types";
import { CreateUserInput } from "./inputs/create";

export abstract class UsersRepository {
	abstract getByID(id: string): Promise<User | null>;
	abstract getByEmail(email: string): Promise<User | null>;
	abstract create(data: CreateUserInput): Promise<User>;
	abstract delete(id: string): Promise<void>;
}
