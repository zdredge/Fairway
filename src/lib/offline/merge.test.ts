import { describe, expect, test } from 'vitest';
import type { ApiScoring, ScoringFacts } from '$lib/types';
import { mergeScorings, type PendingScore } from './merge';

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
