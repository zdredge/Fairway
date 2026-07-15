// Shared domain types — importable from client, server, and the scoring workflow.
// The DB schema (lib/server/db/schema.ts) derives its enum columns from these,
// so the question flow and the storage layer can never drift apart.

export const fairwayHitValues = ['hit', 'left', 'right', 'long', 'short', 'na'] as const;
export type FairwayHit = (typeof fairwayHitValues)[number];

export const missDirectionValues = ['left', 'right', 'long', 'short'] as const;
export type MissDirection = (typeof missDirectionValues)[number];

export const penaltyTypeValues = [
	'out_of_bounds',
	'water_hazard',
	'lost_ball',
	'unplayable'
] as const;
export type PenaltyType = (typeof penaltyTypeValues)[number];

/**
 * The answers gathered by the end-of-hole question flow, in "question shape".
 * Every field starts undefined; the workflow derives the next question from
 * which fields are still missing. Mapped to storage shape by toScoringFacts().
 */
export interface HoleAnswers {
	/** "Did you hit the fairway?" — asked on par 4/5 only. */
	hitFairway?: boolean;
	/** Follow-up when hitFairway === false. */
	missDirection?: MissDirection;
	/** "How many putts?" — always asked. */
	putts?: number;
	/** "Any penalties?" — a count; 0 means none. */
	penalties?: number;
	/** Follow-up when penalties > 0. */
	penaltyType?: PenaltyType;
	/** "Final score?" — asked last so it can be validated against the rest. */
	strokes?: number;
}

/** The raw facts stored per hole — matches the `scoring` table's captured columns. */
export interface ScoringFacts {
	strokes: number;
	putts: number;
	fairwayHit: FairwayHit;
	penalties: number;
	penaltyType: PenaltyType | null;
}
