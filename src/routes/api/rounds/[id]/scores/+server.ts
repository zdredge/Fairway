import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireLogin } from '$lib/server/auth';
import { getRound, saveScoring } from '$lib/server/db/queries';
import { badRequest, readJsonBody } from '$lib/server/http';
import { validateScoring } from '$lib/scoring/workflow';
import type { FairwayHit, PenaltyType, ScoringFacts } from '$lib/types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireLogin(locals);
	const round = await getRound(params.id);
	if (!round || round.userId !== user.id) error(404, { message: 'Round not found' });
	if (round.status === 'complete') {
		error(409, { message: 'Round is complete — scores can no longer be submitted' });
	}

	const body = await readJsonBody(request);
	if (typeof body !== 'object' || body === null) {
		badRequest(['Body must be a JSON object']);
	}
	const { holeNumber, strokes, putts, fairwayHit, penalties, penaltyType } = body as Record<
		string,
		unknown
	>;

	// Shape checks first; range and cross-field rules belong to validateScoring.
	const errors: string[] = [];
	if (!Number.isInteger(holeNumber) || (holeNumber as number) < 1) {
		errors.push('holeNumber must be a positive integer');
	} else if ((holeNumber as number) > round.holeCount) {
		errors.push(`holeNumber must be within this ${round.holeCount}-hole round`);
	}
	if (typeof strokes !== 'number') errors.push('strokes is required');
	if (typeof putts !== 'number') errors.push('putts is required');
	if (typeof penalties !== 'number') errors.push('penalties is required');
	if (typeof fairwayHit !== 'string') errors.push('fairwayHit is required');
	if (penaltyType != null && typeof penaltyType !== 'string') {
		errors.push('penaltyType must be a string when present');
	}
	if (errors.length > 0) badRequest(errors);

	const hole = round.course.holes.find((h) => h.number === holeNumber);
	if (!hole) badRequest([`Hole ${holeNumber} is not on the course`]);

	// The shared Phase 2 rules — the same module the scoring UI runs client-side.
	const facts: ScoringFacts = {
		strokes: strokes as number,
		putts: putts as number,
		fairwayHit: fairwayHit as FairwayHit,
		penalties: penalties as number,
		penaltyType: penaltyType == null ? null : (penaltyType as PenaltyType)
	};
	const problems = validateScoring(hole.par, facts);
	if (problems.length > 0) badRequest(problems);

	const saved = await saveScoring({
		roundId: round.id,
		holeNumber: holeNumber as number,
		...facts
	});
	return json(saved, { status: 201 });
};
