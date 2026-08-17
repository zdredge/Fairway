// Phase 3 acceptance: exercises the full API against a running dev server —
// create course → start round → submit 18 holes (incl. a re-score) → complete
// → stats. Stats are asserted as *deltas* against the pre-run stats, so the
// script stays deterministic no matter what's already in the database.
// Usage: `npm run dev` in one terminal, then `npm run api:smoke`.
import type { Stats } from '../src/lib/server/stats';

const BASE = process.env.API_BASE ?? 'http://localhost:5173';

interface ErrorBody {
	message: string;
	errors?: string[];
}

let failures = 0;

function check(label: string, ok: boolean, detail?: string) {
	if (ok) {
		console.log(`  ok    ${label}`);
	} else {
		failures++;
		console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
	}
}

function checkEqual(label: string, actual: unknown, expected: unknown) {
	check(label, actual === expected, `expected ${expected}, got ${actual}`);
}

function checkClose(label: string, actual: number | null, expected: number) {
	check(
		label,
		actual !== null && Math.abs(actual - expected) < 1e-6,
		`expected ~${expected}, got ${actual}`
	);
}

async function api<T>(
	method: string,
	path: string,
	body?: unknown
): Promise<{ status: number; data: T }> {
	const res = await fetch(`${BASE}${path}`, {
		method,
		headers: body === undefined ? undefined : { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	return { status: res.status, data: (await res.json()) as T };
}

// One scripted 18-hole round. Hand-checked totals:
// strokes 82 · putts 35 · fairways 8/14 · GIR 10/18
// par-3 strokes 12/4 holes · par-4 44/10 · par-5 26/4
const HOLES: Array<{
	holeNumber: number;
	par: number;
	strokes: number;
	putts: number;
	fairwayHit: string;
	penalties: number;
	penaltyType?: string;
}> = [
	{ holeNumber: 1, par: 4, strokes: 4, putts: 2, fairwayHit: 'hit', penalties: 0 },
	{ holeNumber: 2, par: 4, strokes: 5, putts: 2, fairwayHit: 'left', penalties: 0 },
	{ holeNumber: 3, par: 3, strokes: 3, putts: 2, fairwayHit: 'na', penalties: 0 },
	{
		holeNumber: 4,
		par: 5,
		strokes: 7,
		putts: 2,
		fairwayHit: 'right',
		penalties: 1,
		penaltyType: 'water_hazard'
	},
	{ holeNumber: 5, par: 4, strokes: 4, putts: 1, fairwayHit: 'hit', penalties: 0 },
	{ holeNumber: 6, par: 4, strokes: 6, putts: 3, fairwayHit: 'long', penalties: 0 },
	{
		holeNumber: 7,
		par: 3,
		strokes: 4,
		putts: 2,
		fairwayHit: 'na',
		penalties: 1,
		penaltyType: 'lost_ball'
	},
	{ holeNumber: 8, par: 4, strokes: 3, putts: 1, fairwayHit: 'hit', penalties: 0 },
	{ holeNumber: 9, par: 5, strokes: 5, putts: 2, fairwayHit: 'hit', penalties: 0 },
	{ holeNumber: 10, par: 4, strokes: 4, putts: 2, fairwayHit: 'hit', penalties: 0 },
	{ holeNumber: 11, par: 3, strokes: 2, putts: 1, fairwayHit: 'na', penalties: 0 },
	{ holeNumber: 12, par: 4, strokes: 5, putts: 3, fairwayHit: 'hit', penalties: 0 },
	{
		holeNumber: 13,
		par: 5,
		strokes: 8,
		putts: 2,
		fairwayHit: 'short',
		penalties: 2,
		penaltyType: 'out_of_bounds'
	},
	{ holeNumber: 14, par: 4, strokes: 4, putts: 2, fairwayHit: 'left', penalties: 0 },
	{ holeNumber: 15, par: 4, strokes: 5, putts: 2, fairwayHit: 'right', penalties: 0 },
	{ holeNumber: 16, par: 3, strokes: 3, putts: 2, fairwayHit: 'na', penalties: 0 },
	{ holeNumber: 17, par: 5, strokes: 6, putts: 2, fairwayHit: 'hit', penalties: 0 },
	{ holeNumber: 18, par: 4, strokes: 4, putts: 2, fairwayHit: 'hit', penalties: 0 }
];

// Expected aggregates, computed from the table above (independent simple loops).
const expected = {
	strokes: HOLES.reduce((s, h) => s + h.strokes, 0),
	putts: HOLES.reduce((s, h) => s + h.putts, 0),
	fairwayOpportunities: HOLES.filter((h) => h.fairwayHit !== 'na').length,
	fairwaysHit: HOLES.filter((h) => h.fairwayHit === 'hit').length,
	gir: HOLES.filter((h) => h.strokes - h.putts <= h.par - 2).length,
	parTotal: (par: number) => HOLES.filter((h) => h.par === par).reduce((s, h) => s + h.strokes, 0),
	parCount: (par: number) => HOLES.filter((h) => h.par === par).length
};

async function main() {
	console.log(`Smoke-testing API at ${BASE}\n`);

	const before = (await api<Stats>('GET', '/api/stats')).data;

	// --- courses ---
	console.log('POST /api/courses');
	const badCourse = await api<ErrorBody>('POST', '/api/courses', {
		name: 'Too Short',
		holes: HOLES.slice(0, 5).map((h) => ({ number: h.holeNumber, par: h.par }))
	});
	checkEqual('rejects a 5-hole course with 400', badCourse.status, 400);

	const courseRes = await api<{ id: string; holeCount: number }>('POST', '/api/courses', {
		name: `Smoke Test Course ${Date.now()}`,
		holes: HOLES.map((h) => ({ number: h.holeNumber, par: h.par, yardage: 150 + h.holeNumber }))
	});
	checkEqual('creates an 18-hole course (201)', courseRes.status, 201);
	checkEqual('course has 18 holes', courseRes.data.holeCount, 18);
	const courseId = courseRes.data.id;

	// --- rounds ---
	console.log('POST /api/rounds');
	const badLength = await api<ErrorBody>('POST', '/api/rounds', { courseId, holeCount: 12 });
	checkEqual('rejects holeCount 12 with 400', badLength.status, 400);
	const noCourse = await api<ErrorBody>('POST', '/api/rounds', {
		courseId: crypto.randomUUID(),
		holeCount: 18
	});
	checkEqual('rejects unknown course with 404', noCourse.status, 404);

	const roundRes = await api<{ id: string; status: string }>('POST', '/api/rounds', {
		courseId,
		holeCount: 18,
		tee: 'white'
	});
	checkEqual('starts a round (201)', roundRes.status, 201);
	checkEqual('round starts in_progress', roundRes.data.status, 'in_progress');
	const roundId = roundRes.data.id;

	// --- score submission: validation failures ---
	console.log('POST /api/rounds/[id]/scores — rejections');
	// Putts (3) can't exceed the score minus the tee shot (strokes 3 → cap 2).
	const tooManyPutts = await api<ErrorBody>('POST', `/api/rounds/${roundId}/scores`, {
		holeNumber: 2,
		strokes: 3,
		putts: 3,
		fairwayHit: 'hit',
		penalties: 0
	});
	checkEqual('putts exceeding score − 1 → 400', tooManyPutts.status, 400);
	check(
		'error explains the putts/score relationship',
		(tooManyPutts.data.errors ?? []).some((e) => e.includes('tee shot'))
	);

	const par3Fairway = await api<ErrorBody>('POST', `/api/rounds/${roundId}/scores`, {
		holeNumber: 3,
		strokes: 3,
		putts: 2,
		fairwayHit: 'hit',
		penalties: 0
	});
	checkEqual("par-3 with fairwayHit 'hit' → 400", par3Fairway.status, 400);

	const offCourse = await api<ErrorBody>('POST', `/api/rounds/${roundId}/scores`, {
		holeNumber: 19,
		strokes: 4,
		putts: 2,
		fairwayHit: 'hit',
		penalties: 0
	});
	checkEqual('hole 19 → 400', offCourse.status, 400);

	const ghostRound = await api<ErrorBody>('POST', `/api/rounds/${crypto.randomUUID()}/scores`, {
		holeNumber: 1,
		strokes: 4,
		putts: 2,
		fairwayHit: 'hit',
		penalties: 0
	});
	checkEqual('unknown round → 404', ghostRound.status, 404);

	// --- score submission: the full round, hole 1 scored wrong first then corrected ---
	console.log('POST /api/rounds/[id]/scores — full round');
	const firstTry = await api<{ id: string }>('POST', `/api/rounds/${roundId}/scores`, {
		holeNumber: 1,
		strokes: 6,
		putts: 2,
		fairwayHit: 'hit',
		penalties: 0
	});
	checkEqual('initial (wrong) hole 1 accepted (201)', firstTry.status, 201);

	let allAccepted = true;
	for (const h of HOLES) {
		// par stays out of the body — the server derives it from the course.
		const res = await api<{ id: string }>('POST', `/api/rounds/${roundId}/scores`, {
			holeNumber: h.holeNumber,
			strokes: h.strokes,
			putts: h.putts,
			fairwayHit: h.fairwayHit,
			penalties: h.penalties,
			penaltyType: h.penaltyType
		});
		if (res.status !== 201) {
			allAccepted = false;
			console.error(`        hole ${h.holeNumber} → ${res.status}`);
		}
	}
	check('all 18 holes accepted (201)', allAccepted);

	console.log('GET /api/rounds/[id]');
	const fetched = await api<{ scorings: Array<{ holeNumber: number; strokes: number }> }>(
		'GET',
		`/api/rounds/${roundId}`
	);
	checkEqual('round fetch → 200', fetched.status, 200);
	checkEqual(
		'18 scorings — re-scoring hole 1 upserted, not duplicated',
		fetched.data.scorings.length,
		18
	);
	checkEqual(
		'hole 1 has the corrected score',
		fetched.data.scorings.find((s) => s.holeNumber === 1)?.strokes,
		4
	);

	console.log('GET /api/rounds');
	const list = await api<Array<{ id: string }>>('GET', '/api/rounds');
	check(
		'round history contains the round',
		list.data.some((r) => r.id === roundId)
	);

	// --- completion ---
	console.log('PATCH /api/rounds/[id]');
	const completed = await api<{ status: string }>('PATCH', `/api/rounds/${roundId}`, {
		status: 'complete'
	});
	checkEqual('round completes', completed.data.status, 'complete');
	const again = await api<ErrorBody>('PATCH', `/api/rounds/${roundId}`, { status: 'complete' });
	checkEqual('completing twice → 409', again.status, 409);
	const lateScore = await api<ErrorBody>('POST', `/api/rounds/${roundId}/scores`, {
		holeNumber: 1,
		strokes: 4,
		putts: 2,
		fairwayHit: 'hit',
		penalties: 0
	});
	checkEqual('scoring a completed round → 409', lateScore.status, 409);

	// --- stats: asserted as deltas over the pre-run stats ---
	console.log('GET /api/stats');
	const after = (await api<Stats>('GET', '/api/stats')).data;

	const n = before.roundsPlayed.eighteen;
	checkEqual('one more completed 18-hole round', after.roundsPlayed.eighteen, n + 1);
	checkEqual('9-hole rounds untouched', after.roundsPlayed.nine, before.roundsPlayed.nine);
	checkClose(
		'scoring average (18)',
		after.scoringAverage.eighteen,
		((before.scoringAverage.eighteen ?? 0) * n + expected.strokes) / (n + 1)
	);
	checkClose(
		'putts per round (18)',
		after.puttsPerRound.eighteen,
		((before.puttsPerRound.eighteen ?? 0) * n + expected.putts) / (n + 1)
	);
	checkEqual(
		'fairways hit +8',
		after.fairwaysHit.hit,
		before.fairwaysHit.hit + expected.fairwaysHit
	);
	checkEqual(
		'fairway opportunities +14 (par 3s excluded)',
		after.fairwaysHit.opportunities,
		before.fairwaysHit.opportunities + expected.fairwayOpportunities
	);
	checkClose(
		'fairways-hit % consistent with counts',
		after.fairwaysHit.percent,
		(after.fairwaysHit.hit / after.fairwaysHit.opportunities) * 100
	);
	checkEqual(
		'greens in regulation +10',
		after.greensInRegulation.hit,
		before.greensInRegulation.hit + expected.gir
	);
	checkEqual(
		'GIR holes +18',
		after.greensInRegulation.holesPlayed,
		before.greensInRegulation.holesPlayed + 18
	);
	for (const par of [3, 4, 5] as const) {
		const key = `par${par}` as const;
		const b = before.byParType[key];
		const a = after.byParType[key];
		checkEqual(
			`par-${par} holes played +${expected.parCount(par)}`,
			a.holesPlayed,
			b.holesPlayed + expected.parCount(par)
		);
		checkClose(
			`par-${par} scoring average`,
			a.average,
			((b.average ?? 0) * b.holesPlayed + expected.parTotal(par)) / a.holesPlayed
		);
	}

	console.log(failures === 0 ? '\nAPI smoke test passed.' : `\n${failures} check(s) failed.`);
	process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
	console.error(`Smoke test could not run (is the dev server up at ${BASE}?):`, err);
	process.exit(1);
});
