import { describe, expect, it } from "vitest";
import { formatDateBR, parseApiDate, toApiDate } from "./date";

describe("toApiDate", () => {
	it("formats a Date to YYYY-MM-DD using local parts", () => {
		expect(toApiDate(new Date(1990, 3, 12))).toBe("1990-04-12");
	});

	it("zero-pads month and day", () => {
		expect(toApiDate(new Date(2026, 0, 5))).toBe("2026-01-05");
	});
});

describe("formatDateBR", () => {
	it("reformats a YYYY-MM-DD string to DD/MM/YYYY", () => {
		expect(formatDateBR("1990-04-12")).toBe("12/04/1990");
	});

	it("accepts a full ISO datetime and keeps the date part", () => {
		expect(formatDateBR("2026-06-15T12:00:00.000Z")).toBe("15/06/2026");
	});
});

describe("parseApiDate", () => {
	it("parses YYYY-MM-DD to a local Date at midnight", () => {
		const date = parseApiDate("1990-04-12");
		expect(date.getFullYear()).toBe(1990);
		expect(date.getMonth()).toBe(3);
		expect(date.getDate()).toBe(12);
	});

	it("round-trips with toApiDate", () => {
		expect(toApiDate(parseApiDate("2026-01-05"))).toBe("2026-01-05");
	});
});
