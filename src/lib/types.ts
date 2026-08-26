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

export const roundStatusValues = ['in_progress', 'complete'] as const;
export type RoundStatus = (typeof roundStatusValues)[number];

/**
 * The answers gathered by the end-of-hole question flow, in "question shape".
 * Every field starts undefined; the workflow derives the next question from
 * which fields are still missing. Mapped to storage shape by toScoringFacts().
 */
export interface HoleAnswers {
	/** "Final score?" — asked first; the golfer knows this immediately. */
	strokes?: number;
	/** "How many putts?" — always asked; capped at strokes - 1. */
	putts?: number;
	/** Fairway result from the pad (par 4/5 only): 'hit' or a miss direction. 'na' is derived on par 3. */
	fairwayHit?: FairwayHit;
}

/** The raw facts stored per hole — matches the `scoring` table's captured columns. */
export interface ScoringFacts {
	strokes: number;
	putts: number;
	fairwayHit: FairwayHit;
	penalties: number;
	penaltyType: PenaltyType | null;
}

// ---- Wire (API response) types ----
// The DB row types live in lib/server and carry Date fields; over JSON those
// serialize to ISO strings, so the client uses these DTO shapes instead.

export interface ApiCourse {
	id: string;
	name: string;
	holeCount: number;
	createdAt: string;
}

export interface ApiHole {
	id: string;
	courseId: string;
	number: number;
	par: number;
	yardage: number | null;
}

export interface ApiCourseWithHoles extends ApiCourse {
	holes: ApiHole[];
}

export interface ApiRound {
	id: string;
	userId: string;
	courseId: string;
	tee: string | null;
	playedOn: string;
	holeCount: number;
	status: RoundStatus;
}

export interface ApiScoring extends ScoringFacts {
	id: string;
	roundId: string;
	holeNumber: number;
}

export interface ApiRoundWithCourse extends ApiRound {
	course: ApiCourse;
}

/** Lean per-round summary for the history list — totals computed over scored holes. */
export interface ApiRoundSummary {
	id: string;
	courseName: string;
	holeCount: number;
	playedOn: string;
	tee: string | null;
	status: RoundStatus;
	holesScored: number;
	totalStrokes: number;
	totalPar: number;
	/**
	 * Client-only overlay: how many holes for this round are still queued in the
	 * offline outbox (not yet synced). Absent/0 when everything is synced. The
	 * server never sets this — it's added by the rounds-list load offline.
	 */
	pendingSync?: number;
}

export interface ApiRoundDetail extends ApiRound {
	course: ApiCourseWithHoles;
	scorings: ApiScoring[];
}

// ---- Stats (aggregated on the server, computed from raw scorings) ----

/** Per-round-length split — mixing 9- and 18-hole rounds in one average is misleading. */
export interface LengthSplit {
	nine: number | null;
	eighteen: number | null;
}

export interface ParTypeStats {
	average: number | null;
	holesPlayed: number;
}

export interface Stats {
	roundsPlayed: { nine: number; eighteen: number };
	scoringAverage: LengthSplit;
	puttsPerRound: LengthSplit;
	/** Fairways hit as a percentage of holes with a fairway (par 3s excluded). */
	fairwaysHit: { hit: number; opportunities: number; percent: number | null };
	greensInRegulation: { hit: number; holesPlayed: number; percent: number | null };
	byParType: { par3: ParTypeStats; par4: ParTypeStats; par5: ParTypeStats };
}

/** All stats scoped to one round length (9 or 18), for the dashboard's length toggle. */
export interface LengthStats {
	roundsPlayed: number;
	scoringAverage: number | null;
	puttsPerRound: number | null;
	fairwaysHit: { hit: number; opportunities: number; percent: number | null };
	greensInRegulation: { hit: number; holesPlayed: number; percent: number | null };
	byParType: { par3: ParTypeStats; par4: ParTypeStats; par5: ParTypeStats };
}

export interface StatsByLength {
	nine: LengthStats;
	eighteen: LengthStats;
}
