// Stats aggregation — derive-don't-store. Everything here is computed on read
// from the raw scoring facts; nothing is ever persisted. Pure math lives in
// computeStats() (unit-tested); getStatsForUser() is the thin fetch wrapper.
import { isGreenInRegulation } from '../scoring/workflow';
import type { FairwayHit, LengthStats, ParTypeStats, Stats, StatsByLength } from '../types';
import { listCompletedRoundsWithScorings } from './db/queries';

// The response types (Stats, LengthSplit, ParTypeStats, …) live in $lib/types so the
// client can import them without reaching into $lib/server; re-export for callers here.
export type { LengthSplit, ParTypeStats, Stats, LengthStats, StatsByLength } from '../types';

export interface StatsHole {
	par: number;
	strokes: number;
	putts: number;
	fairwayHit: FairwayHit;
}

export interface StatsRound {
	holeCount: number; // 9 or 18 — the round's declared length
	holes: StatsHole[];
}

function average(values: number[]): number | null {
	return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

function percent(hit: number, total: number): number | null {
	return total === 0 ? null : (hit / total) * 100;
}

export function computeStats(rounds: StatsRound[]): Stats {
	const nine = rounds.filter((r) => r.holeCount === 9);
	const eighteen = rounds.filter((r) => r.holeCount === 18);
	const roundTotal = (r: StatsRound, field: 'strokes' | 'putts') =>
		r.holes.reduce((sum, hole) => sum + hole[field], 0);

	const allHoles = rounds.flatMap((r) => r.holes);
	const fairwayOpportunities = allHoles.filter((h) => h.fairwayHit !== 'na');
	const fairwaysHit = fairwayOpportunities.filter((h) => h.fairwayHit === 'hit').length;
	const greensHit = allHoles.filter((h) => isGreenInRegulation(h.par, h.strokes, h.putts)).length;

	const parType = (par: number): ParTypeStats => {
		const holes = allHoles.filter((h) => h.par === par);
		return { average: average(holes.map((h) => h.strokes)), holesPlayed: holes.length };
	};

	return {
		roundsPlayed: { nine: nine.length, eighteen: eighteen.length },
		scoringAverage: {
			nine: average(nine.map((r) => roundTotal(r, 'strokes'))),
			eighteen: average(eighteen.map((r) => roundTotal(r, 'strokes')))
		},
		puttsPerRound: {
			nine: average(nine.map((r) => roundTotal(r, 'putts'))),
			eighteen: average(eighteen.map((r) => roundTotal(r, 'putts')))
		},
		fairwaysHit: {
			hit: fairwaysHit,
			opportunities: fairwayOpportunities.length,
			percent: percent(fairwaysHit, fairwayOpportunities.length)
		},
		greensInRegulation: {
			hit: greensHit,
			holesPlayed: allHoles.length,
			percent: percent(greensHit, allHoles.length)
		},
		byParType: { par3: parType(3), par4: parType(4), par5: parType(5) }
	};
}

/** Extract one length's stats from a computeStats result computed over only that length. */
function toLengthStats(stats: Stats, key: 'nine' | 'eighteen'): LengthStats {
	return {
		roundsPlayed: stats.roundsPlayed[key],
		scoringAverage: stats.scoringAverage[key],
		puttsPerRound: stats.puttsPerRound[key],
		fairwaysHit: stats.fairwaysHit,
		greensInRegulation: stats.greensInRegulation,
		byParType: stats.byParType
	};
}

export async function getStatsForUser(userId: string): Promise<StatsByLength> {
	const rounds = await listCompletedRoundsWithScorings(userId);
	const toStatsRounds = (holeCount: number) =>
		rounds
			.filter((round) => round.holeCount === holeCount)
			.map((round) => {
				const parByHole = new Map(round.course.holes.map((h) => [h.number, h.par]));
				return {
					holeCount: round.holeCount,
					holes: round.scorings.flatMap((s) => {
						const par = parByHole.get(s.holeNumber);
						// A scoring without a matching course hole shouldn't exist; skip defensively.
						if (par === undefined) return [];
						return [{ par, strokes: s.strokes, putts: s.putts, fairwayHit: s.fairwayHit }];
					})
				};
			});

	// Compute each length independently so fairways/GIR/par are scoped to that length too.
	return {
		nine: toLengthStats(computeStats(toStatsRounds(9)), 'nine'),
		eighteen: toLengthStats(computeStats(toStatsRounds(18)), 'eighteen')
	};
}
