// Per-round derivations, computed from the raw scored holes. Pure and shared —
// the round-stats screen runs it client-side over the loaded round detail.
import { isGreenInRegulation } from './workflow';
import type { FairwayHit } from '../types';

export interface RoundStatsHole {
	par: number;
	strokes: number;
	putts: number;
	fairwayHit: FairwayHit;
}

export type ScoreCategory = 'eagle' | 'birdie' | 'par' | 'bogey' | 'double' | 'worse';

/** Classify a hole score against par — one definition shared by the distribution and the scorecard markers. */
export function scoreCategory(strokes: number, par: number): ScoreCategory {
	const rel = strokes - par;
	if (rel <= -2) return 'eagle';
	if (rel === -1) return 'birdie';
	if (rel === 0) return 'par';
	if (rel === 1) return 'bogey';
	if (rel === 2) return 'double';
	return 'worse';
}

export interface ScoreDistribution {
	eagle: number; // strokes - par <= -2
	birdie: number; // -1
	par: number; // 0
	bogey: number; // +1
	double: number; // +2
	worse: number; // >= +3
}

export interface RoundStats {
	holesScored: number;
	strokes: number;
	par: number;
	toPar: number;
	putts: number;
	gir: { hit: number; total: number };
	fairways: { hit: number; total: number };
	distribution: ScoreDistribution;
}

export function roundStats(holes: RoundStatsHole[]): RoundStats {
	const distribution: ScoreDistribution = {
		eagle: 0,
		birdie: 0,
		par: 0,
		bogey: 0,
		double: 0,
		worse: 0
	};

	let strokes = 0;
	let par = 0;
	let putts = 0;
	let girHit = 0;
	let fairwayHit = 0;
	let fairwayTotal = 0;

	for (const hole of holes) {
		strokes += hole.strokes;
		par += hole.par;
		putts += hole.putts;

		if (isGreenInRegulation(hole.par, hole.strokes, hole.putts)) girHit += 1;

		// Par 3s have no fairway to hit, so they aren't fairway opportunities.
		if (hole.fairwayHit !== 'na') {
			fairwayTotal += 1;
			if (hole.fairwayHit === 'hit') fairwayHit += 1;
		}

		distribution[scoreCategory(hole.strokes, hole.par)] += 1;
	}

	return {
		holesScored: holes.length,
		strokes,
		par,
		toPar: strokes - par,
		putts,
		gir: { hit: girHit, total: holes.length },
		fairways: { hit: fairwayHit, total: fairwayTotal },
		distribution
	};
}
