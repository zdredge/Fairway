import { describe, expect, test } from 'vitest';
import { computeStats, type StatsRound } from './stats';

// Hand-checked fixture rounds (abbreviated hole lists — the math doesn't care
// whether a "round" has all its holes, and short lists keep the sums checkable).
const round18: StatsRound = {
	holeCount: 18,
	holes: [
		{ par: 4, strokes: 4, putts: 2, fairwayHit: 'hit' }, // GIR, fairway hit
		{ par: 3, strokes: 4, putts: 2, fairwayHit: 'na' }, // no GIR, no fairway chance
		{ par: 5, strokes: 6, putts: 2, fairwayHit: 'left' }, // no GIR, fairway miss
		{ par: 4, strokes: 3, putts: 1, fairwayHit: 'hit' } // GIR (birdie), fairway hit
	]
	// totals: strokes 17, putts 7 · fairways 2/3 · GIR 2/4
};

const round9: StatsRound = {
	holeCount: 9,
	holes: [
		{ par: 4, strokes: 5, putts: 2, fairwayHit: 'right' }, // no GIR, fairway miss
		{ par: 3, strokes: 3, putts: 2, fairwayHit: 'na' } // GIR (1 <= 1)
	]
	// totals: strokes 8, putts 4 · fairways 0/1 · GIR 1/2
};

describe('computeStats', () => {
	test('no rounds → zero counts and null averages, never 0%', () => {
		const stats = computeStats([]);
		expect(stats.roundsPlayed).toEqual({ nine: 0, eighteen: 0 });
		expect(stats.scoringAverage).toEqual({ nine: null, eighteen: null });
		expect(stats.puttsPerRound).toEqual({ nine: null, eighteen: null });
		expect(stats.fairwaysHit.percent).toBeNull();
		expect(stats.greensInRegulation.percent).toBeNull();
		expect(stats.byParType.par4).toEqual({ average: null, holesPlayed: 0 });
	});

	test('single 18-hole round, hand-checked', () => {
		const stats = computeStats([round18]);
		expect(stats.roundsPlayed).toEqual({ nine: 0, eighteen: 1 });
		expect(stats.scoringAverage.eighteen).toBe(17);
		expect(stats.scoringAverage.nine).toBeNull();
		expect(stats.puttsPerRound.eighteen).toBe(7);
		expect(stats.fairwaysHit).toEqual({
			hit: 2,
			opportunities: 3,
			percent: expect.closeTo((2 / 3) * 100)
		});
		expect(stats.greensInRegulation).toEqual({ hit: 2, holesPlayed: 4, percent: 50 });
	});

	test('fairway percentage excludes par-3 holes (na is not an opportunity)', () => {
		const stats = computeStats([round9]);
		expect(stats.fairwaysHit.opportunities).toBe(1); // the par 3 doesn't count
		expect(stats.fairwaysHit.percent).toBe(0); // a real 0%, distinct from null
	});

	test('9- and 18-hole rounds stay in separate buckets', () => {
		const stats = computeStats([round18, round9]);
		expect(stats.roundsPlayed).toEqual({ nine: 1, eighteen: 1 });
		expect(stats.scoringAverage).toEqual({ nine: 8, eighteen: 17 });
		expect(stats.puttsPerRound).toEqual({ nine: 4, eighteen: 7 });
	});

	test('per-hole percentages pool every round', () => {
		const stats = computeStats([round18, round9]);
		expect(stats.fairwaysHit).toEqual({ hit: 2, opportunities: 4, percent: 50 });
		expect(stats.greensInRegulation).toEqual({ hit: 3, holesPlayed: 6, percent: 50 });
	});

	test('scoring average by par type pools holes across rounds', () => {
		const stats = computeStats([round18, round9]);
		expect(stats.byParType.par3).toEqual({ average: 3.5, holesPlayed: 2 });
		expect(stats.byParType.par4).toEqual({ average: 4, holesPlayed: 3 });
		expect(stats.byParType.par5).toEqual({ average: 6, holesPlayed: 1 });
	});

	test('averages accumulate across multiple rounds of the same length', () => {
		const secondEighteen: StatsRound = {
			holeCount: 18,
			holes: [{ par: 4, strokes: 5, putts: 3, fairwayHit: 'hit' }]
		};
		const stats = computeStats([round18, secondEighteen]);
		expect(stats.scoringAverage.eighteen).toBe(11); // (17 + 5) / 2
		expect(stats.puttsPerRound.eighteen).toBe(5); // (7 + 3) / 2
	});
});
