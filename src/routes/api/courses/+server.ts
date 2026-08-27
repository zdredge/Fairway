import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireLogin } from '$lib/server/auth';
import { createCourse, listCourses, type CreateCourseInput } from '$lib/server/db/queries';
import { badRequest, readJsonBody } from '$lib/server/http';

export const GET: RequestHandler = async ({ locals }) => {
	const user = requireLogin(locals);
	return json(await listCourses(user.id));
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireLogin(locals);
	const input = validateCourseInput(user.id, await readJsonBody(request));
	const course = await createCourse(input);
	return json(course, { status: 201 });
};

function validateCourseInput(userId: string, body: unknown): CreateCourseInput {
	if (typeof body !== 'object' || body === null) {
		badRequest(['Body must be a JSON object']);
	}
	const { name, holes } = body as Record<string, unknown>;
	const errors: string[] = [];

	if (typeof name !== 'string' || name.trim().length === 0) {
		errors.push('name is required');
	}
	if (!Array.isArray(holes) || (holes.length !== 9 && holes.length !== 18)) {
		errors.push('holes must be an array of 9 or 18 holes');
		badRequest(errors);
	}

	const parsed = holes.map((hole, i) => {
		if (typeof hole !== 'object' || hole === null) {
			errors.push(`holes[${i}] must be an object`);
			return null;
		}
		const { number, par, yardage } = hole as Record<string, unknown>;
		if (!Number.isInteger(number)) errors.push(`holes[${i}].number must be an integer`);
		if (!Number.isInteger(par) || (par as number) < 3 || (par as number) > 5) {
			errors.push(`holes[${i}].par must be 3, 4, or 5`);
		}
		if (yardage != null && (!Number.isInteger(yardage) || (yardage as number) <= 0)) {
			errors.push(`holes[${i}].yardage must be a positive integer when present`);
		}
		return {
			number: number as number,
			par: par as number,
			yardage: yardage == null ? undefined : (yardage as number)
		};
	});

	if (errors.length === 0) {
		const numbers = parsed.map((h) => h!.number).sort((a, b) => a - b);
		if (!numbers.every((n, i) => n === i + 1)) {
			errors.push(`hole numbers must be exactly 1..${holes.length} with no gaps or duplicates`);
		}
	}
	if (errors.length > 0) badRequest(errors);

	return { userId, name: (name as string).trim(), holes: parsed.map((h) => h!) };
}
