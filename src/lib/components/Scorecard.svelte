<script lang="ts">
	import { resolve } from '$app/paths';
	import { scoreCategory } from '$lib/scoring/roundStats';
	import type { ApiHole, ApiScoring } from '$lib/types';

	interface Props {
		holes: ApiHole[];
		scorings: ApiScoring[];
		holeCount: number;
		roundId: string;
		interactive?: boolean;
	}

	let { holes, scorings, holeCount, roundId, interactive = false }: Props = $props();

	const parByHole = $derived(new Map(holes.map((h) => [h.number, h.par])));
	const scoreByHole = $derived(new Map(scorings.map((s) => [s.holeNumber, s])));

	type Col =
		{ kind: 'hole'; n: number } | { kind: 'total'; label: string; from: number; to: number };

	// Columns: 1..9 · OUT · 10..18 · IN · TOT for an 18-hole round; 1..9 · TOT for a 9-hole round.
	const columns = $derived.by<Col[]>(() => {
		const cols: Col[] = [];
		for (let n = 1; n <= Math.min(9, holeCount); n++) cols.push({ kind: 'hole', n });
		if (holeCount > 9) {
			cols.push({ kind: 'total', label: 'OUT', from: 1, to: 9 });
			for (let n = 10; n <= holeCount; n++) cols.push({ kind: 'hole', n });
			cols.push({ kind: 'total', label: 'IN', from: 10, to: holeCount });
		}
		cols.push({ kind: 'total', label: 'TOT', from: 1, to: holeCount });
		return cols;
	});

	const colKey = (col: Col) => (col.kind === 'hole' ? `h${col.n}` : col.label);

	function sumPar(from: number, to: number): number {
		let sum = 0;
		for (let n = from; n <= to; n++) sum += parByHole.get(n) ?? 0;
		return sum;
	}

	// Sum a scoring field over scored holes in the range; null when none are scored (renders blank).
	function sumField(from: number, to: number, field: 'strokes' | 'putts'): number | null {
		let sum = 0;
		let any = false;
		for (let n = from; n <= to; n++) {
			const s = scoreByHole.get(n);
			if (s) {
				sum += s[field];
				any = true;
			}
		}
		return any ? sum : null;
	}

	const holeHref = (n: number) => resolve('/rounds/[id]/holes/[n]', { id: roundId, n: String(n) });

	// Traditional scorecard marks: circle under par, square over par; doubled at the extremes.
	function markClass(strokes: number, par: number): string {
		switch (scoreCategory(strokes, par)) {
			case 'eagle':
				return 'mark circle double';
			case 'birdie':
				return 'mark circle';
			case 'bogey':
				return 'mark square';
			case 'double':
			case 'worse':
				return 'mark square double';
			default:
				return ''; // par — plain number
		}
	}
</script>

<div class="wrap">
	<table>
		<thead>
			<tr>
				<th class="label">Hole</th>
				{#each columns as col (colKey(col))}
					{#if col.kind === 'hole'}
						<th class="hole">
							{#if interactive}
								<a href={holeHref(col.n)}>{col.n}</a>
							{:else}
								{col.n}
							{/if}
						</th>
					{:else}
						<th class="seg">{col.label}</th>
					{/if}
				{/each}
			</tr>
		</thead>
		<tbody>
			<tr>
				<th class="label">Par</th>
				{#each columns as col (colKey(col))}
					{#if col.kind === 'hole'}
						<td>{parByHole.get(col.n)}</td>
					{:else}
						<td class="seg">{sumPar(col.from, col.to)}</td>
					{/if}
				{/each}
			</tr>
			<tr>
				<th class="label">Score</th>
				{#each columns as col (colKey(col))}
					{#if col.kind === 'hole'}
						{@const s = scoreByHole.get(col.n)}
						<td>
							{#if s}
								<span class={markClass(s.strokes, parByHole.get(col.n) ?? 0)}>{s.strokes}</span>
							{:else}
								–
							{/if}
						</td>
					{:else}
						{@const t = sumField(col.from, col.to, 'strokes')}
						<td class="seg">{t ?? ''}</td>
					{/if}
				{/each}
			</tr>
		</tbody>
	</table>
</div>

<div class="legend">
	<span><span class="mark circle legend-mark"></span> Birdie</span>
	<span><span class="mark circle double legend-mark"></span> Eagle+</span>
	<span><span class="mark square legend-mark"></span> Bogey</span>
	<span><span class="mark square double legend-mark"></span> Double+</span>
</div>

<style>
	.wrap {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	table {
		border-collapse: collapse;
		width: 100%;
		font-variant-numeric: tabular-nums;
	}

	th,
	td {
		border: 1px solid #e2e2e2;
		padding: 0.4rem 0.6rem;
		text-align: center;
		min-width: 2.4rem;
	}

	/* Traditional score marks around the number. Double via an outer ring that
	   follows the border-radius (circle for circles, square for squares). */
	.mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		line-height: 1;
	}

	.mark.circle {
		border: 2px solid #c0392b;
		border-radius: 50%;
	}

	.mark.square {
		border: 2px solid #2c3e50;
	}

	.mark.circle.double {
		box-shadow:
			0 0 0 2px #fff,
			0 0 0 4px #c0392b;
	}

	.mark.square.double {
		box-shadow:
			0 0 0 2px #fff,
			0 0 0 4px #2c3e50;
	}

	/* Sticky row-label column so Par/Score/Putts stay visible while scrolling. */
	.label {
		position: sticky;
		left: 0;
		text-align: left;
		font-weight: 600;
		background: #fff;
		z-index: 1;
	}

	thead th {
		background: #f6faf7;
		font-weight: 700;
	}

	thead .label {
		background: #f6faf7;
	}

	.seg {
		background: #f0f0f0;
		font-weight: 700;
	}

	.hole a {
		display: block;
		color: #1a7a3a;
		text-decoration: none;
		font-weight: 700;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.25rem;
		margin-top: 0.85rem;
		font-size: 0.8rem;
		color: #555;
	}

	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	/* Legend marks reuse the .mark.circle/.square(.double) styles, just smaller. */
	.legend-mark {
		width: 0.9rem;
		height: 0.9rem;
	}
</style>
