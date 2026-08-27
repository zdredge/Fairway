import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireLogin } from '$lib/server/auth';
import { completeRound, getRound } from '$lib/server/db/queries';
import { badRequest, readJsonBody } from '$lib/server/http';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireLogin(locals);
	const round = await getRound(params.id);
	if (!round || round.userId !== user.id) error(404, { message: 'Round not found' });
	return json(round);
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const user = requireLogin(locals);
	const round = await getRound(params.id);
	if (!round || round.userId !== user.id) error(404, { message: 'Round not found' });

	const body = await readJsonBody(request);
	const status = (body as Record<string, unknown> | null)?.status;
	if (status !== 'complete') {
		badRequest(["status must be 'complete' — it's the only allowed transition"]);
	}
	if (round.status === 'complete') {
		error(409, { message: 'Round is already complete' });
	}

	return json(await completeRound(round.id));
};
