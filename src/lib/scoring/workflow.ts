// The end-of-hole scoring workflow: branching flow, score-floor validation,
// and GIR derivation as pure functions. Shared on purpose — the client drives
// its screens with this module and the server enforces it on submit, so the
// rules are written once and enforced in both places (see ARCHITECTURE.md).
import { fairwayHitValues, penaltyTypeValues, type HoleAnswers, type ScoringFacts } from '../types';

export type ScoringStep =
	'fairway' | 'miss_direction' | 'putts' | 'penalties' | 'penalty_type' | 'score' | 'review';

/**
 * The next question to ask, derived from the answers gathered so far:
 * fairway (par 4/5 only) → miss_direction (only on a miss) → putts →
 * penalties → penalty_type (only when penalties > 0) → score → review.
 */
export function currentStep(par: number, answers: HoleAnswers): ScoringStep {
	if (par !== 3) {
		if (answers.hitFairway === undefined) return 'fairway';
		if (answers.hitFairway === false && answers.missDirection === undefined)
			return 'miss_direction';
	}
	if (answers.putts === undefined) return 'putts';
	if (answers.penalties === undefined) return 'penalties';
	if (answers.penalties > 0 && answers.penaltyType === undefined) return 'penalty_type';
	if (answers.strokes === undefined) return 'score';
	return 'review';
}

/**
 * The hard floor on the final score: every putt and penalty stroke counts,
 * plus the one guaranteed non-putt stroke — the tee shot.
 */
export function scoreFloor(answers: Pick<HoleAnswers, 'putts' | 'penalties'>): number {
	return (answers.putts ?? 0) + (answers.penalties ?? 0) + 1;
}

/** Starting value for the score stepper: par, unless the floor exceeds it. */
export function defaultStrokes(
	par: number,
	answers: Pick<HoleAnswers, 'putts' | 'penalties'>
): number {
	return Math.max(par, scoreFloor(answers));
}

/** Green in regulation: reached the green with two putts' worth of strokes to spare. */
export function isGreenInRegulation(par: number, strokes: number, putts: number): boolean {
	return strokes - putts <= par - 2;
}

/**
 * Map completed question-flow answers to the raw facts the DB stores.
 * Throws if the flow isn't complete (currentStep(par, answers) !== 'review').
 */
export function toScoringFacts(par: number, answers: HoleAnswers): ScoringFacts {
	const step = currentStep(par, answers);
	if (step !== 'review') {
		throw new Error(`Answers are incomplete: still on the '${step}' step`);
	}

	// currentStep === 'review' guarantees putts/penalties/strokes are present,
	// that a par-4/5 miss has a direction, and that penalties > 0 has a type.
	const { putts, penalties, strokes } = answers as Required<
		Pick<HoleAnswers, 'putts' | 'penalties' | 'strokes'>
	>;

	return {
		strokes,
		putts,
		fairwayHit: par === 3 ? 'na' : answers.hitFairway ? 'hit' : answers.missDirection!,
		penalties,
		penaltyType: penalties > 0 ? answers.penaltyType! : null
	};
}

/**
 * Validate the raw facts for one hole. Returns a list of problems; empty
 * means valid. Used by the UI before save and by the API on submit.
 */
export function validateScoring(par: number, facts: ScoringFacts): string[] {
	const errors: string[] = [];
	const { strokes, putts, penalties, fairwayHit, penaltyType } = facts;

	if (!Number.isInteger(par) || par < 3 || par > 5) {
		errors.push(`Par must be 3, 4, or 5 (got ${par})`);
	}
	if (!Number.isInteger(strokes) || strokes < 1) {
		errors.push(`Strokes must be a positive integer (got ${strokes})`);
	}
	if (!Number.isInteger(putts) || putts < 0) {
		errors.push(`Putts must be a non-negative integer (got ${putts})`);
	}
	if (!Number.isInteger(penalties) || penalties < 0) {
		errors.push(`Penalties must be a non-negative integer (got ${penalties})`);
	}
	if (!fairwayHitValues.includes(fairwayHit)) {
		errors.push(`Unknown fairway result '${fairwayHit}'`);
	}
	if (penaltyType !== null && !penaltyTypeValues.includes(penaltyType)) {
		errors.push(`Unknown penalty type '${penaltyType}'`);
	}

	// Only apply cross-field rules when the individual fields are sane.
	if (errors.length > 0) return errors;

	const floor = scoreFloor(facts);
	if (strokes < floor) {
		errors.push(
			`Score of ${strokes} is below the minimum of ${floor} (${putts} putts + ${penalties} penalties + the tee shot)`
		);
	}
	if (par === 3 && fairwayHit !== 'na') {
		errors.push(`A par 3 has no fairway to hit — expected 'na', got '${fairwayHit}'`);
	}
	if (par !== 3 && fairwayHit === 'na') {
		errors.push(`A par ${par} requires a fairway result, not 'na'`);
	}
	if (penalties > 0 && penaltyType === null) {
		errors.push('A penalty type is required when penalties were taken');
	}
	if (penalties === 0 && penaltyType !== null) {
		errors.push('Penalty type must be empty when no penalties were taken');
	}

	return errors;
}
