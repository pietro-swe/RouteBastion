export class AlreadyExistsException extends Error {
	constructor(message?: string) {
		super(message ?? "Resource already exists");
		// biome-ignore lint/security/noSecrets: This is not a secret wtf???
		this.name = "AlreadyExistsException";
	}
}
