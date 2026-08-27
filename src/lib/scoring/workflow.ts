// The end-of-hole scoring workflow: branching flow, putts-cap validation, and
// GIR derivation as pure functions. Shared on purpose — the client drives its
// screens with this module and the server enforces it on submit, so the rules
// are written once and enforced in both places (see ARCHITECTURE.md).
import { fairwayHitValues, penaltyTypeValues, type HoleAnswers, type ScoringFacts } from '../types';

export type ScoringStep = 'score_putts' | 'fairway' | 'review';

/**
 * The next question to ask, derived from the answers gathered so far:
 * score+putts (one screen) → fairway (par 4/5 only) → review.
 */
export function currentStep(par: number, answers: HoleAnswers): ScoringStep {
	if (answers.strokes === undefined || answers.putts === undefined) return 'score_putts';
	if (par !== 3 && answers.fairwayHit === undefined) return 'fairway';
	return 'review';
}

/**
 * The most putts possible given the score: every stroke but the tee shot could
 * be a putt. Because score is captured first, this caps the putts stepper
 * (rather than flooring the score) and keeps GIR derivation sane.
 */
export function maxPutts(strokes: number): number {
	return strokes - 1;
}

/** Green in regulation: reached the green with two putts' worth of strokes to spare. */
export function isGreenInRegulation(par: number, strokes: number, putts: number): boolean {
	return strokes - putts <= par - 2;
}

/**
 * Map completed question-flow answers to the raw facts the DB stores.
 * Penalties are not captured in the v1 flow, so they store as 0 / null.
 * Throws if the flow isn't complete (currentStep(par, answers) !== 'review').
 */
export function toScoringFacts(par: number, answers: HoleAnswers): ScoringFacts {
	const step = currentStep(par, answers);
	if (step !== 'review') {
		throw new Error(`Answers are incomplete: still on the '${step}' step`);
	}

	// currentStep === 'review' guarantees strokes/putts are present, and that a
	// par-4/5 hole has a fairway result.
	const { strokes, putts } = answers as Required<Pick<HoleAnswers, 'strokes' | 'putts'>>;

	return {
		strokes,
		putts,
		fairwayHit: par === 3 ? 'na' : answers.fairwayHit!,
		penalties: 0,
		penaltyType: null
	};
}

/**
 * Inverse of toScoringFacts — rebuild question-flow answers from stored facts,
 * so re-scoring a hole opens prefilled (lands on the review step). par 3 gets
 * no fairway answer (that step is skipped). Stored penalties are ignored, since
 * the v1 flow no longer captures them.
 */
export function answersFromFacts(par: number, facts: ScoringFacts): HoleAnswers {
	return {
		strokes: facts.strokes,
		putts: facts.putts,
		fairwayHit: par === 3 ? undefined : facts.fairwayHit
	};
}

/**
 * Validate the raw facts for one hole. Returns a list of problems; empty
 * means valid. Used by the UI before save and by the API on submit. Validates
 * the full storage shape, including the (currently always-empty) penalty fields.
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

	// Putts (plus any penalty strokes) can't account for more than the strokes
	// after the tee shot — this also protects the GIR derivation.
	if (putts + penalties > strokes - 1) {
		errors.push(
			`Putts (${putts})${penalties ? ` + penalties (${penalties})` : ''} can't exceed the score minus the tee shot (${strokes - 1})`
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
