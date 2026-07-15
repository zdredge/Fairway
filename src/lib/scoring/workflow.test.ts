import { describe, expect, test } from 'vitest';
import type { HoleAnswers, ScoringFacts } from '../types';
import {
	currentStep,
	defaultStrokes,
	isGreenInRegulation,
	scoreFloor,
	toScoringFacts,
	validateScoring
} from './workflow';

const cleanPar4: HoleAnswers = { hitFairway: true, putts: 2, penalties: 0, strokes: 4 };

function facts(overrides: Partial<ScoringFacts> = {}): ScoringFacts {
	return { strokes: 4, putts: 2, fairwayHit: 'hit', penalties: 0, penaltyType: null, ...overrides };
}

describe('currentStep', () => {
	test('par 4/5 opens on the fairway question', () => {
		expect(currentStep(4, {})).toBe('fairway');
		expect(currentStep(5, {})).toBe('fairway');
	});

	test('par 3 skips the fairway question and opens on putts', () => {
		expect(currentStep(3, {})).toBe('putts');
	});

	test('par 3 never asks fairway or miss direction, even with fairway answers present', () => {
		expect(currentStep(3, { hitFairway: false, putts: 2, penalties: 0, strokes: 3 })).toBe(
			'review'
		);
	});

	test('a fairway miss inserts the miss-direction follow-up', () => {
		expect(currentStep(4, { hitFairway: false })).toBe('miss_direction');
	});

	test('a fairway hit goes straight to putts', () => {
		expect(currentStep(4, { hitFairway: true })).toBe('putts');
	});

	test('miss direction answered → putts', () => {
		expect(currentStep(4, { hitFairway: false, missDirection: 'left' })).toBe('putts');
	});

	test('putts answered → penalties', () => {
		expect(currentStep(4, { hitFairway: true, putts: 2 })).toBe('penalties');
	});

	test('penalties > 0 inserts the penalty-type follow-up', () => {
		expect(currentStep(4, { hitFairway: true, putts: 2, penalties: 1 })).toBe('penalty_type');
	});

	test('penalties = 0 skips penalty type and goes to score', () => {
		expect(currentStep(4, { hitFairway: true, putts: 2, penalties: 0 })).toBe('score');
	});

	test('penalty type answered → score', () => {
		expect(
			currentStep(4, { hitFairway: true, putts: 2, penalties: 1, penaltyType: 'water_hazard' })
		).toBe('score');
	});

	test('score is always the last question; complete answers → review', () => {
		expect(currentStep(4, cleanPar4)).toBe('review');
		expect(
			currentStep(5, {
				hitFairway: false,
				missDirection: 'right',
				putts: 2,
				penalties: 2,
				penaltyType: 'out_of_bounds',
				strokes: 8
			})
		).toBe('review');
	});

	test('a clean par 4 is exactly three questions: fairway, putts, penalties, then score', () => {
		let answers: HoleAnswers = {};
		const asked: string[] = [];
		const scripted: HoleAnswers = cleanPar4;
		for (const [key, value] of Object.entries(scripted)) {
			asked.push(currentStep(4, answers));
			answers = { ...answers, [key]: value };
		}
		expect(asked).toEqual(['fairway', 'putts', 'penalties', 'score']);
		expect(currentStep(4, answers)).toBe('review');
	});
});

describe('scoreFloor & defaultStrokes', () => {
	test('floor is putts + penalties + the tee shot', () => {
		expect(scoreFloor({ putts: 2, penalties: 1 })).toBe(4);
		expect(scoreFloor({ putts: 0, penalties: 0 })).toBe(1);
	});

	test('stepper defaults to par when the floor allows it', () => {
		expect(defaultStrokes(4, { putts: 2, penalties: 0 })).toBe(4);
		expect(defaultStrokes(3, { putts: 1, penalties: 0 })).toBe(3);
	});

	test('stepper defaults to the floor when it exceeds par', () => {
		expect(defaultStrokes(3, { putts: 3, penalties: 2 })).toBe(6);
		expect(defaultStrokes(4, { putts: 4, penalties: 0 })).toBe(5);
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
	test('par 3 maps to fairwayHit na', () => {
		expect(toScoringFacts(3, { putts: 2, penalties: 0, strokes: 3 })).toEqual({
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
		expect(
			toScoringFacts(4, { ...cleanPar4, hitFairway: false, missDirection: 'long' }).fairwayHit
		).toBe('long');
	});

	test('penalties carry their type; none means null', () => {
		expect(
			toScoringFacts(4, { ...cleanPar4, penalties: 1, penaltyType: 'lost_ball', strokes: 6 })
				.penaltyType
		).toBe('lost_ball');
		expect(toScoringFacts(4, cleanPar4).penaltyType).toBeNull();
	});

	test('throws on incomplete answers, naming the pending step', () => {
		expect(() => toScoringFacts(4, { hitFairway: false })).toThrow(/miss_direction/);
		expect(() => toScoringFacts(4, { ...cleanPar4, strokes: undefined })).toThrow(/score/);
	});
});

describe('validateScoring', () => {
	test('a clean scoring passes', () => {
		expect(validateScoring(4, facts())).toEqual([]);
	});

	test('score below the floor is rejected; at the floor is accepted', () => {
		const withPenalty = facts({ putts: 2, penalties: 1, penaltyType: 'water_hazard' });
		expect(validateScoring(4, { ...withPenalty, strokes: 3 })).toHaveLength(1);
		expect(validateScoring(4, { ...withPenalty, strokes: 4 })).toEqual([]);
	});

	test('hole-in-one is valid (floor of 1)', () => {
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

	test('penalty type is required iff penalties were taken', () => {
		expect(validateScoring(4, facts({ strokes: 5, penalties: 1, penaltyType: null }))).not.toEqual(
			[]
		);
		expect(validateScoring(4, facts({ penalties: 0, penaltyType: 'lost_ball' }))).not.toEqual([]);
		expect(
			validateScoring(4, facts({ strokes: 5, penalties: 1, penaltyType: 'unplayable' }))
		).toEqual([]);
	});

	test('non-integer and negative inputs are rejected', () => {
		expect(validateScoring(4, facts({ strokes: 4.5 }))).not.toEqual([]);
		expect(validateScoring(4, facts({ putts: -1 }))).not.toEqual([]);
		expect(validateScoring(4, facts({ penalties: -2 }))).not.toEqual([]);
		expect(validateScoring(2.5, facts())).not.toEqual([]);
		expect(validateScoring(6, facts())).not.toEqual([]);
	});

	test('score never drops below putts (GIR protection falls out of the floor)', () => {
		const bad = facts({ strokes: 2, putts: 3 });
		expect(validateScoring(4, bad)).not.toEqual([]);
	});
});
