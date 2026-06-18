import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./cursor";

describe("cursor codec", () => {
	it("round-trips a cursor", () => {
		const cursor = {
			createdAt: new Date("2026-06-15T12:00:00.000Z"),
			id: "018f8c2a-0000-7000-8000-000000000000",
		};
		const decoded = decodeCursor(encodeCursor(cursor));
		expect(decoded).not.toBeNull();
		expect(decoded?.id).toBe(cursor.id);
		expect(decoded?.createdAt.toISOString()).toBe(
			cursor.createdAt.toISOString(),
		);
	});

	it("returns null for a malformed cursor", () => {
		expect(decodeCursor("!!!not-base64-json!!!")).toBeNull();
	});

	it("returns null for an undefined cursor", () => {
		expect(decodeCursor(undefined)).toBeNull();
	});
});
