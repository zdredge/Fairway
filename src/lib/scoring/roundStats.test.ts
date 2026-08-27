import { describe, expect, test } from 'vitest';
import type { RoundStatsHole } from './roundStats';
import { roundStats, scoreCategory } from './roundStats';

describe('scoreCategory', () => {
	test('classifies each boundary against par', () => {
		expect(scoreCategory(2, 5)).toBe('eagle'); // -3
		expect(scoreCategory(2, 4)).toBe('eagle'); // -2
		expect(scoreCategory(3, 4)).toBe('birdie'); // -1
		expect(scoreCategory(4, 4)).toBe('par'); // 0
		expect(scoreCategory(5, 4)).toBe('bogey'); // +1
		expect(scoreCategory(6, 4)).toBe('double'); // +2
		expect(scoreCategory(7, 4)).toBe('worse'); // +3
	});
});

// A hand-checked 6-hole sample covering each distribution bucket and both
// fairway outcomes, plus a par 3 (no fairway opportunity).
const holes: RoundStatsHole[] = [
	{ par: 4, strokes: 2, putts: 1, fairwayHit: 'hit' }, // eagle, GIR, fairway hit
	{ par: 4, strokes: 3, putts: 1, fairwayHit: 'hit' }, // birdie, GIR, fairway hit
	{ par: 3, strokes: 3, putts: 2, fairwayHit: 'na' }, // par, GIR, no fairway
	{ par: 4, strokes: 5, putts: 2, fairwayHit: 'left' }, // bogey, no GIR, fairway miss
	{ par: 5, strokes: 7, putts: 2, fairwayHit: 'right' }, // double, no GIR, fairway miss
	{ par: 4, strokes: 8, putts: 3, fairwayHit: 'hit' } // worse (+4), no GIR, fairway hit
];
// totals: strokes 28, par 24, toPar +4, putts 11
// GIR: holes 1,2,3 → 3 of 6 · fairways: hits on 1,2,6 = 3 of 5 opportunities (par 3 excluded)

describe('roundStats', () => {
	test('totals and to-par', () => {
		const s = roundStats(holes);
		expect(s.holesScored).toBe(6);
		expect(s.strokes).toBe(28);
		expect(s.par).toBe(24);
		expect(s.toPar).toBe(4);
		expect(s.putts).toBe(11);
	});

	test('GIR counts scored holes', () => {
		expect(roundStats(holes).gir).toEqual({ hit: 3, total: 6 });
	});

	test('fairways exclude par 3s from the opportunity total', () => {
		expect(roundStats(holes).fairways).toEqual({ hit: 3, total: 5 });
	});

	test('distribution buckets by strokes minus par', () => {
		expect(roundStats(holes).distribution).toEqual({
			eagle: 1,
			birdie: 1,
			par: 1,
			bogey: 1,
			double: 1,
			worse: 1
		});
	});

	test('an empty (unscored) round is all zeros', () => {
		expect(roundStats([])).toEqual({
			holesScored: 0,
			strokes: 0,
			par: 0,
			toPar: 0,
			putts: 0,
			gir: { hit: 0, total: 0 },
			fairways: { hit: 0, total: 0 },
			distribution: { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, worse: 0 }
		});
	});

	test('a hole-in-one counts as eagle-or-better', () => {
		const s = roundStats([{ par: 3, strokes: 1, putts: 0, fairwayHit: 'na' }]);
		expect(s.distribution.eagle).toBe(1);
		expect(s.gir).toEqual({ hit: 1, total: 1 });
	});
});
