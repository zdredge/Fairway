import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireLogin } from '$lib/server/auth';
import { createRound, getCourse, listRoundSummaries } from '$lib/server/db/queries';
import { badRequest, readJsonBody } from '$lib/server/http';
import type { ApiRoundSummary } from '$lib/types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = requireLogin(locals);
	const rounds = await listRoundSummaries(user.id);

	// Summarize each round over its scored holes — keeps full scorings off the wire.
	const summaries: ApiRoundSummary[] = rounds.map((round) => {
		const parByHole = new Map(round.course.holes.map((h) => [h.number, h.par]));
		let totalStrokes = 0;
		let totalPar = 0;
		for (const s of round.scorings) {
			totalStrokes += s.strokes;
			totalPar += parByHole.get(s.holeNumber) ?? 0;
		}
		return {
			id: round.id,
			courseName: round.course.name,
			holeCount: round.holeCount,
			playedOn: round.playedOn.toISOString(),
			tee: round.tee,
			status: round.status,
			holesScored: round.scorings.length,
			totalStrokes,
			totalPar
		};
	});
	return json(summaries);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireLogin(locals);
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
	// 404 both for a missing course and one owned by another user.
	if (!course || course.userId !== user.id) error(404, { message: 'Course not found' });

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
