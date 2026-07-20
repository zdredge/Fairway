// Stats aggregation — derive-don't-store. Everything here is computed on read
// from the raw scoring facts; nothing is ever persisted. Pure math lives in
// computeStats() (unit-tested); getStatsForUser() is the thin fetch wrapper.
import { isGreenInRegulation } from '../scoring/workflow';
import type { FairwayHit } from '../types';
import { listCompletedRoundsWithScorings } from './db/queries';

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

export async function getStatsForUser(userId: string): Promise<Stats> {
	const rounds = await listCompletedRoundsWithScorings(userId);
	return computeStats(
		rounds.map((round) => {
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
		})
	);
}
