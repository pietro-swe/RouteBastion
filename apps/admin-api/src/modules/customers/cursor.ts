import type { CustomersCursor } from "./@types";

export function encodeCursor(cursor: CustomersCursor): string {
	const payload = JSON.stringify({
		createdAt: cursor.createdAt.toISOString(),
		id: cursor.id,
	});

	return Buffer.from(payload, "utf8").toString("base64url");
}

export function decodeCursor(raw: string | undefined): CustomersCursor | null {
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(
			Buffer.from(raw, "base64url").toString("utf8"),
		) as { createdAt: string; id: string };

		const createdAt = new Date(parsed.createdAt);

		if (Number.isNaN(createdAt.getTime()) || typeof parsed.id !== "string") {
			return null;
		}

		return { createdAt, id: parsed.id };
	} catch {
		return null;
	}
}
