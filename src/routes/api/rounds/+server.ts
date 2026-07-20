import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { createRound, getCourse, listRounds } from '$lib/server/db/queries';
import { badRequest, readJsonBody } from '$lib/server/http';

export const GET: RequestHandler = async () => {
	const user = await getSessionUser();
	return json(await listRounds(user.id));
};

export const POST: RequestHandler = async ({ request }) => {
	const user = await getSessionUser();
	const body = await readJsonBody(request);

	if (typeof body !== 'object' || body === null) {
		badRequest(['Body must be a JSON object']);
	}
	const { courseId, holeCount, tee, playedOn } = body as Record<string, unknown>;
	const errors: string[] = [];

	if (typeof courseId !== 'string' || courseId.length === 0) {
		errors.push('courseId is required');
		badRequest(errors);
	}
	const course = await getCourse(courseId);
	if (!course) error(404, { message: 'Course not found' });

	if (holeCount !== 9 && holeCount !== 18) {
		errors.push('holeCount must be 9 or 18');
	} else if (holeCount > course.holeCount) {
		errors.push(`holeCount cannot exceed the course's ${course.holeCount} holes`);
	}
	if (tee != null && (typeof tee !== 'string' || tee.trim().length === 0)) {
		errors.push('tee must be a non-empty string when present');
	}
	let playedOnDate: Date | undefined;
	if (playedOn != null) {
		playedOnDate = typeof playedOn === 'string' ? new Date(playedOn) : undefined;
		if (!playedOnDate || Number.isNaN(playedOnDate.getTime())) {
			errors.push('playedOn must be an ISO date string when present');
		}
	}
	if (errors.length > 0) badRequest(errors);

	const round = await createRound({
		userId: user.id,
		courseId: course.id,
		holeCount: holeCount as number,
		tee: tee == null ? undefined : (tee as string).trim(),
		playedOn: playedOnDate
	});
	return json(round, { status: 201 });
};
