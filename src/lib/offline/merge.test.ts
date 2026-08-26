import { describe, expect, test } from 'vitest';
import type { ApiRoundSummary, ApiScoring, ScoringFacts } from '$lib/types';
import {
	applyPendingComplete,
	mergeScorings,
	overlayRoundSummary,
	type PendingScore
} from './merge';

function server(holeNumber: number, strokes: number): ApiScoring {
	return {
		id: `srv-${holeNumber}`,
		roundId: 'r1',
		holeNumber,
		strokes,
		putts: 2,
		fairwayHit: 'hit',
		penalties: 0,
		penaltyType: null
	};
}

function pending(holeNumber: number, strokes: number): PendingScore {
	const facts: ScoringFacts = {
		strokes,
		putts: 2,
		fairwayHit: 'hit',
		penalties: 0,
		penaltyType: null
	};
	return { holeNumber, facts };
}

describe('mergeScorings', () => {
	test('returns the server list unchanged when nothing is pending', () => {
		const s = [server(1, 4)];
		expect(mergeScorings(s, [])).toBe(s);
	});

	test('adds a pending hole the server does not have yet', () => {
		const merged = mergeScorings([server(1, 4)], [pending(2, 5)]);
		expect(merged.map((m) => m.holeNumber)).toEqual([1, 2]);
		expect(merged.find((m) => m.holeNumber === 2)?.strokes).toBe(5);
	});

	test('pending wins over a synced hole (re-score), keeping the server id', () => {
		const merged = mergeScorings([server(1, 4)], [pending(1, 6)]);
		expect(merged).toHaveLength(1);
		expect(merged[0].strokes).toBe(6);
		expect(merged[0].id).toBe('srv-1'); // kept, so a later re-sync updates in place
	});

	test('result is sorted by hole number', () => {
		const merged = mergeScorings([server(3, 3)], [pending(1, 4), pending(2, 5)]);
		expect(merged.map((m) => m.holeNumber)).toEqual([1, 2, 3]);
	});
});

describe('applyPendingComplete', () => {
	test('flips in_progress to complete when a completion is queued', () => {
		expect(applyPendingComplete('in_progress', true)).toBe('complete');
	});

	test('leaves status unchanged with nothing queued', () => {
		expect(applyPendingComplete('in_progress', false)).toBe('in_progress');
	});

	test('never downgrades an already-complete round', () => {
		expect(applyPendingComplete('complete', false)).toBe('complete');
	});
});

describe('overlayRoundSummary', () => {
	function summary(overrides: Partial<ApiRoundSummary> = {}): ApiRoundSummary {
		return {
			id: 'r1',
			courseName: 'Pebble Creek',
			holeCount: 18,
			playedOn: '2026-08-26T12:00:00.000Z',
			tee: null,
			status: 'in_progress',
			holesScored: 3,
			totalStrokes: 12,
			totalPar: 12,
			...overrides
		};
	}

	test('returns the same object when nothing is pending', () => {
		const s = summary();
		expect(overlayRoundSummary(s, { pendingScoreHoles: [], hasPendingComplete: false })).toBe(s);
	});

	test('reports the pending unsynced hole count', () => {
		const merged = overlayRoundSummary(summary(), {
			pendingScoreHoles: [4, 5],
			hasPendingComplete: false
		});
		expect(merged.pendingSync).toBe(2);
		expect(merged.status).toBe('in_progress');
	});

	test('flips status to complete for a queued completion', () => {
		const merged = overlayRoundSummary(summary(), {
			pendingScoreHoles: [],
			hasPendingComplete: true
		});
		expect(merged.status).toBe('complete');
		expect(merged.pendingSync).toBe(0);
	});

	test('leaves server stroke/par totals untouched', () => {
		const merged = overlayRoundSummary(summary({ totalStrokes: 20, totalPar: 18 }), {
			pendingScoreHoles: [4],
			hasPendingComplete: false
		});
		expect(merged.totalStrokes).toBe(20);
		expect(merged.totalPar).toBe(18);
	});
});
