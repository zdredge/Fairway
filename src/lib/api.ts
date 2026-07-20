// Client-side API access. Everything the UI needs goes through /api (the
// Capacitor seam) — no form actions, no direct DB access from load functions.

export class ApiError extends Error {
	status: number;
	errors: string[];

	constructor(status: number, message: string, errors: string[] = []) {
		super(message);
		this.status = status;
		this.errors = errors;
	}
}

/**
 * Fetch a JSON API endpoint. Non-2xx responses throw ApiError carrying the
 * API's { message, errors? } body. Pass SvelteKit's `fetch` from load
 * functions so SSR requests are handled correctly.
 */
export async function apiFetch<T>(
	fetchFn: typeof fetch,
	path: string,
	init?: { method?: string; body?: unknown }
): Promise<T> {
	const res = await fetchFn(path, {
		method: init?.method ?? 'GET',
		headers: init?.body === undefined ? undefined : { 'content-type': 'application/json' },
		body: init?.body === undefined ? undefined : JSON.stringify(init.body)
	});
	if (!res.ok) {
		let message = res.statusText;
		let errors: string[] = [];
		try {
			const data = (await res.json()) as App.Error;
			message = data.message ?? message;
			errors = data.errors ?? [];
		} catch {
			// non-JSON error body; keep the status text
		}
		throw new ApiError(res.status, message, errors);
	}
	return (await res.json()) as T;
}
