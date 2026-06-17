import { afterEach, describe, expect, it, vi } from "vitest";
import { adminsService } from "./admins.service";

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

describe("adminsService", () => {
	it("list() builds the URL with cursor and search", async () => {
		const fetchSpy = mockFetch({ items: [], nextCursor: null });

		await adminsService.list({ cursor: "abc", search: "ana" });

		const request = fetchSpy.mock.calls[0]![0] as Request;
		expect(request.method).toBe("GET");
		expect(request.url).toBe(
			"http://localhost:3000/api/admins?cursor=abc&search=ana",
		);
	});

	it("list() omits undefined params", async () => {
		const fetchSpy = mockFetch({ items: [], nextCursor: null });

		await adminsService.list({});

		const request = fetchSpy.mock.calls[0]![0] as Request;
		expect(request.url).toBe("http://localhost:3000/api/admins");
	});

	it("create() POSTs the json body", async () => {
		const fetchSpy = mockFetch({ id: "1" }, 201);
		const input = { name: "Ana", email: "ana@rb.io", birthDate: "1990-04-12" };

		await adminsService.create(input);

		const request = fetchSpy.mock.calls[0]![0] as Request;
		expect(request.method).toBe("POST");
		expect(request.url).toBe("http://localhost:3000/api/admins");
		expect(
			(request as unknown as Record<string, unknown>)._capturedBody,
		).toEqual(input);
	});

	it("update() PUTs to /admins/:id", async () => {
		const fetchSpy = mockFetch({ id: "1" });

		await adminsService.update("1", {
			name: "Ana",
			email: "ana@rb.io",
			birthDate: "1990-04-12",
		});

		const request = fetchSpy.mock.calls[0]![0] as Request;
		expect(request.method).toBe("PUT");
		expect(request.url).toBe("http://localhost:3000/api/admins/1");
	});

	it("block()/unblock() PATCH the status routes", async () => {
		const fetchSpy = mockFetch({ id: "1" });

		await adminsService.block("1");
		await adminsService.unblock("1");

		const first = fetchSpy.mock.calls[0]![0] as Request;
		const second = fetchSpy.mock.calls[1]![0] as Request;
		expect(first.method).toBe("PATCH");
		expect(first.url).toBe("http://localhost:3000/api/admins/1/block");
		expect(second.url).toBe("http://localhost:3000/api/admins/1/unblock");
	});

	it("remove() DELETEs /admins/:id", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(null, { status: 200 }),
		);

		await adminsService.remove("1");

		const request = vi.mocked(globalThis.fetch).mock.calls[0]![0] as Request;
		expect(request.method).toBe("DELETE");
		expect(request.url).toBe("http://localhost:3000/api/admins/1");
	});
});
