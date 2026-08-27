import { error } from '@sveltejs/kit';

/** Parse a JSON request body, turning malformed JSON into a 400 instead of a 500. */
export async function readJsonBody(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		error(400, { message: 'Request body must be valid JSON' });
	}
}

/** Fail the request with a 400 carrying the list of validation problems. */
export function badRequest(errors: string[]): never {
	error(400, { message: 'Validation failed', errors });
}
