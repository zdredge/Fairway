<script lang="ts">
	import { resolve } from '$app/paths';
	import { roundStats, type RoundStatsHole } from '$lib/scoring/roundStats';
	import StatCard from '$lib/components/StatCard.svelte';

	let { data } = $props();

	const round = $derived(data.round);

	const played = $derived(
		new Date(round.playedOn).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);

	// Join course pars with the scored holes, then derive the round's stats.
	const stats = $derived.by(() => {
		const parByHole = new Map(round.course.holes.map((h) => [h.number, h.par]));
		const holes: RoundStatsHole[] = round.scorings.flatMap((s) => {
			const par = parByHole.get(s.holeNumber);
			if (par === undefined) return [];
			return [{ par, strokes: s.strokes, putts: s.putts, fairwayHit: s.fairwayHit }];
		});
		return roundStats(holes);
	});

	const toParLabel = $derived(
		stats.toPar === 0 ? 'E' : stats.toPar > 0 ? `+${stats.toPar}` : `${stats.toPar}`
	);

	const pct = (hit: number, total: number) =>
		total === 0 ? '—' : `${Math.round((hit / total) * 100)}%`;

	const breakdown = $derived([
		{ label: 'Eagle+', n: stats.distribution.eagle },
		{ label: 'Birdie', n: stats.distribution.birdie },
		{ label: 'Par', n: stats.distribution.par },
		{ label: 'Bogey', n: stats.distribution.bogey },
		{ label: 'Double', n: stats.distribution.double },
		{ label: 'Triple+', n: stats.distribution.worse }
	]);
</script>

<a class="back" href={resolve('/rounds/[id]', { id: round.id })}>← {round.course.name}</a>
<h1>Round stats</h1>
<p class="meta">{played} · {stats.holesScored} of {round.holeCount} holes scored</p>

<div class="tiles">
	<StatCard label="Score" value={`${stats.strokes}`} sub={toParLabel} />
	<StatCard label="Putts" value={`${stats.putts}`} />
	<StatCard
		label="Greens in reg"
		value={pct(stats.gir.hit, stats.gir.total)}
		sub={`${stats.gir.hit} of ${stats.gir.total}`}
	/>
	<StatCard
		label="Fairways hit"
		value={pct(stats.fairways.hit, stats.fairways.total)}
		sub={`${stats.fairways.hit} of ${stats.fairways.total}`}
	/>
</div>

<div class="breakdown">
	<h2>Scoring breakdown</h2>
	<div class="rows">
		{#each breakdown as row (row.label)}
			<div class="row"><span>{row.label}</span><strong>{row.n}</strong></div>
		{/each}
	</div>
</div>

<style>
	.back {
		display: inline-block;
		color: #1a7a3a;
		font-weight: 600;
		text-decoration: none;
		margin-bottom: 0.5rem;
	}

	h1 {
		margin: 0;
	}

	.meta {
		color: #666;
		margin: 0.25rem 0 1.5rem;
	}

	.tiles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		gap: 1rem;
	}

	.breakdown {
		margin-top: 1.5rem;
		border: 1px solid #e2e2e2;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	h2 {
		margin: 0 0 0.75rem;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #666;
	}

	.rows {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
		gap: 0.5rem 1.5rem;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		border-bottom: 1px solid #eee;
		padding: 0.25rem 0;
	}

	.row span {
		color: #666;
	}

	.row strong {
		font-variant-numeric: tabular-nums;
	}
</style>
