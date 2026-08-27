import { describe, expect, test } from 'vitest';
import type { HoleAnswers, ScoringFacts } from '../types';
import {
	answersFromFacts,
	currentStep,
	isGreenInRegulation,
	maxPutts,
	toScoringFacts,
	validateScoring
} from './workflow';

const cleanPar4: HoleAnswers = { strokes: 4, putts: 2, fairwayHit: 'hit' };

function facts(overrides: Partial<ScoringFacts> = {}): ScoringFacts {
	return { strokes: 4, putts: 2, fairwayHit: 'hit', penalties: 0, penaltyType: null, ...overrides };
}

describe('currentStep', () => {
	test('every hole opens on the combined score+putts screen', () => {
		expect(currentStep(3, {})).toBe('score_putts');
		expect(currentStep(4, {})).toBe('score_putts');
		expect(currentStep(5, {})).toBe('score_putts');
	});

	test('score+putts stays until both are set', () => {
		expect(currentStep(4, { strokes: 4 })).toBe('score_putts');
		expect(currentStep(4, { putts: 2 })).toBe('score_putts');
	});

	test('par 4/5 asks fairway once score+putts are in', () => {
		expect(currentStep(4, { strokes: 4, putts: 2 })).toBe('fairway');
		expect(currentStep(5, { strokes: 5, putts: 2 })).toBe('fairway');
	});

	test('par 3 skips the fairway step (score+putts → review)', () => {
		expect(currentStep(3, { strokes: 3, putts: 2 })).toBe('review');
	});

	test('fairway answered → review', () => {
		expect(currentStep(4, cleanPar4)).toBe('review');
		expect(currentStep(4, { strokes: 5, putts: 2, fairwayHit: 'left' })).toBe('review');
	});

	test('a clean par 4 is two screens: score+putts, fairway, then review', () => {
		expect(currentStep(4, {})).toBe('score_putts');
		expect(currentStep(4, { strokes: 4, putts: 2 })).toBe('fairway');
		expect(currentStep(4, cleanPar4)).toBe('review');
	});

	test('a clean par 3 is one input screen: score+putts, then review', () => {
		expect(currentStep(3, {})).toBe('score_putts');
		expect(currentStep(3, { strokes: 3, putts: 2 })).toBe('review');
	});
});

describe('maxPutts', () => {
	test('is the score minus the tee shot', () => {
		expect(maxPutts(4)).toBe(3);
		expect(maxPutts(1)).toBe(0); // hole-in-one leaves no room for putts
	});
});

describe('isGreenInRegulation', () => {
	test('regulation two-putt par: GIR', () => {
		expect(isGreenInRegulation(4, 4, 2)).toBe(true);
	});

	test('scrambling par (up and down): no GIR', () => {
		expect(isGreenInRegulation(3, 3, 1)).toBe(false);
	});

	test('boundary: strokes - putts exactly par - 2 is GIR', () => {
		expect(isGreenInRegulation(5, 5, 2)).toBe(true);
		expect(isGreenInRegulation(5, 6, 2)).toBe(false);
	});

	test('chip-in (0 putts) counts strokes only', () => {
		expect(isGreenInRegulation(4, 2, 0)).toBe(true); // holed out from the fairway
		expect(isGreenInRegulation(4, 3, 0)).toBe(false); // chipped in from off the green
	});

	test('hole-in-one on a par 3 is GIR', () => {
		expect(isGreenInRegulation(3, 1, 0)).toBe(true);
	});
});

describe('toScoringFacts', () => {
	test('par 3 maps to fairwayHit na, penalties empty', () => {
		expect(toScoringFacts(3, { strokes: 3, putts: 2 })).toEqual({
			strokes: 3,
			putts: 2,
			fairwayHit: 'na',
			penalties: 0,
			penaltyType: null
		});
	});

	test('fairway hit maps to hit', () => {
		expect(toScoringFacts(4, cleanPar4).fairwayHit).toBe('hit');
	});

	test('a miss maps to its direction', () => {
		expect(toScoringFacts(4, { strokes: 5, putts: 2, fairwayHit: 'long' }).fairwayHit).toBe('long');
	});

	test('penalties always store as 0 / null (not captured in v1)', () => {
		const f = toScoringFacts(4, cleanPar4);
		expect(f.penalties).toBe(0);
		expect(f.penaltyType).toBeNull();
	});

	test('throws on incomplete answers, naming the pending step', () => {
		expect(() => toScoringFacts(4, { strokes: 4 })).toThrow(/score_putts/);
		expect(() => toScoringFacts(4, { strokes: 4, putts: 2 })).toThrow(/fairway/);
	});
});

describe('answersFromFacts', () => {
	// Must be the inverse of toScoringFacts: for any valid stored facts (penalties
	// empty), rebuilt answers reproduce them and leave the flow on review.
	const cases: Array<[string, number, ScoringFacts]> = [
		['par 3 (na)', 3, facts({ strokes: 3, putts: 2, fairwayHit: 'na' })],
		['par 4 fairway hit', 4, facts()],
		['par 4 miss left', 4, facts({ strokes: 5, fairwayHit: 'left' })],
		['par 5 miss long', 5, facts({ strokes: 5, fairwayHit: 'long' })],
		['par 3 hole-in-one', 3, facts({ strokes: 1, putts: 0, fairwayHit: 'na' })]
	];

	test.each(cases)('round-trips %s', (_label, par, f) => {
		const answers = answersFromFacts(par, f);
		expect(currentStep(par, answers)).toBe('review');
		expect(toScoringFacts(par, answers)).toEqual(f);
	});

	test('a par 3 gets no fairway answer', () => {
		expect(answersFromFacts(3, facts({ strokes: 3, fairwayHit: 'na' })).fairwayHit).toBeUndefined();
	});
});

describe('validateScoring', () => {
	test('a clean scoring passes', () => {
		expect(validateScoring(4, facts())).toEqual([]);
	});

	test('putts above score - 1 are rejected; at the cap accepted', () => {
		expect(validateScoring(4, facts({ strokes: 4, putts: 4 }))).toHaveLength(1);
		expect(validateScoring(4, facts({ strokes: 4, putts: 3 }))).toEqual([]);
	});

	test('hole-in-one is valid (0 putts)', () => {
		expect(validateScoring(3, facts({ strokes: 1, putts: 0, fairwayHit: 'na' }))).toEqual([]);
	});

	test('par 3 must record na for the fairway', () => {
		expect(validateScoring(3, facts({ strokes: 3, fairwayHit: 'hit' }))).not.toEqual([]);
		expect(validateScoring(3, facts({ strokes: 3, fairwayHit: 'na' }))).toEqual([]);
	});

	test('par 4/5 must record a real fairway result', () => {
		expect(validateScoring(4, facts({ fairwayHit: 'na' }))).not.toEqual([]);
		expect(validateScoring(5, facts({ strokes: 5, fairwayHit: 'short' }))).toEqual([]);
	});

	test('non-integer and negative inputs are rejected', () => {
		expect(validateScoring(4, facts({ strokes: 4.5 }))).not.toEqual([]);
		expect(validateScoring(4, facts({ putts: -1 }))).not.toEqual([]);
		expect(validateScoring(2.5, facts())).not.toEqual([]);
		expect(validateScoring(6, facts())).not.toEqual([]);
	});

	test('storage-shape penalty rules still hold (defensive; flow always sends 0/null)', () => {
		expect(validateScoring(4, facts({ strokes: 6, penalties: 1, penaltyType: null }))).not.toEqual(
			[]
		);
		expect(validateScoring(4, facts({ penalties: 0, penaltyType: 'lost_ball' }))).not.toEqual([]);
		expect(
			validateScoring(4, facts({ strokes: 6, penalties: 1, penaltyType: 'water_hazard' }))
		).toEqual([]);
	});
});
