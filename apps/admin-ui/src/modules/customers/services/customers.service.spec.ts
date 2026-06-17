import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomersService } from "./customers.service";

function mockFetch(body: unknown, status = 200) {
	return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
		const req = input as Request;
		if (req.body) {
			(req as unknown as Record<string, unknown>)._capturedBody =
				await req.json();
		}
		return new Response(JSON.stringify(body), {
			status,
			headers: { "content-type": "application/json" },
		});
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("CustomersService", () => {
	it("list() builds the URL with cursor and search", async () => {
		const fetchSpy = mockFetch({ items: [], nextCursor: null });

		await CustomersService.list({ cursor: "abc", search: "acme" });

		const request = fetchSpy.mock.calls[0]![0] as Request;
		expect(request.method).toBe("GET");
		expect(request.url).toBe(
			"http://localhost:3000/api/customers?cursor=abc&search=acme",
		);
	});

	it("list() omits undefined params", async () => {
		const fetchSpy = mockFetch({ items: [], nextCursor: null });

		await CustomersService.list({});

		const request = fetchSpy.mock.calls[0]![0] as Request;
		expect(request.url).toBe("http://localhost:3000/api/customers");
	});

	it("create() POSTs the json body", async () => {
		const fetchSpy = mockFetch({ id: "1" }, 201);
		const input = { name: "Acme", businessIdentifier: "11222333000181" };

		await CustomersService.create(input);

		const request = fetchSpy.mock.calls[0]![0] as Request;
		expect(request.method).toBe("POST");
		expect(request.url).toBe("http://localhost:3000/api/customers");
		expect(
			(request as unknown as Record<string, unknown>)._capturedBody,
		).toEqual(input);
	});

	it("update() PUTs to /customers/:id", async () => {
		const fetchSpy = mockFetch({ id: "1" });

		await CustomersService.update("1", {
			name: "Acme",
			businessIdentifier: "11222333000181",
		});

		const request = fetchSpy.mock.calls[0]![0] as Request;
		expect(request.method).toBe("PUT");
		expect(request.url).toBe("http://localhost:3000/api/customers/1");
	});

	it("remove() DELETEs /customers/:id", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(null, { status: 200 }),
		);

		await CustomersService.remove("1");

		const request = vi.mocked(globalThis.fetch).mock.calls[0]![0] as Request;
		expect(request.method).toBe("DELETE");
		expect(request.url).toBe("http://localhost:3000/api/customers/1");
	});
});
