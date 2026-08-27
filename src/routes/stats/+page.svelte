<script lang="ts">
	import { resolve } from '$app/paths';
	import StatCard from '$lib/components/StatCard.svelte';

	let { data } = $props();

	// Default to 18 unless the golfer only has 9-hole rounds. Initial default only —
	// the toggle drives it after mount. (data.stats is null when offline with no cache.)
	// svelte-ignore state_referenced_locally
	let selected = $state<'eighteen' | 'nine'>(
		data.stats && data.stats.eighteen.roundsPlayed === 0 && data.stats.nine.roundsPlayed > 0
			? 'nine'
			: 'eighteen'
	);

	const s = $derived(data.stats?.[selected]);
	const lengthLabel = $derived(selected === 'eighteen' ? '18-hole' : '9-hole');
	const hasAny = $derived(
		data.stats ? data.stats.eighteen.roundsPlayed + data.stats.nine.roundsPlayed > 0 : false
	);

	const avg = (v: number | null) => (v === null ? '—' : v.toFixed(1));
	const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`);
</script>

<h1>Stats</h1>

{#if data.offline}
	<p class="empty">
		Stats aren't available offline — they're calculated from all your rounds on the server.
		Reconnect to see your scoring average, putts, fairways, and greens in regulation.
	</p>
{:else if !hasAny}
	<p class="empty">
		No stats yet. <a href={resolve('/rounds/new')}>Play and finish a round</a> to see your scoring average,
		putts, fairways, and greens in regulation.
	</p>
{:else if s}
	<div class="toggle" role="group" aria-label="Round length">
		<button class:active={selected === 'eighteen'} onclick={() => (selected = 'eighteen')}>
			18 holes
		</button>
		<button class:active={selected === 'nine'} onclick={() => (selected = 'nine')}>9 holes</button>
	</div>

	{#if s.roundsPlayed === 0}
		<p class="empty">
			No {lengthLabel} rounds yet. Finish a {lengthLabel} round to see these stats.
		</p>
	{:else}
		<p class="summary">
			Across your {s.roundsPlayed} completed {lengthLabel} round{s.roundsPlayed === 1 ? '' : 's'}.
		</p>

		<div class="tiles">
			<StatCard label="Scoring average" value={avg(s.scoringAverage)} />
			<StatCard label="Putts per round" value={avg(s.puttsPerRound)} />
			<StatCard
				label="Fairways hit"
				value={pct(s.fairwaysHit.percent)}
				sub={`${s.fairwaysHit.hit} of ${s.fairwaysHit.opportunities}`}
			/>
			<StatCard
				label="Greens in regulation"
				value={pct(s.greensInRegulation.percent)}
				sub={`${s.greensInRegulation.hit} of ${s.greensInRegulation.holesPlayed}`}
			/>
			<StatCard
				label="Par X Scoring Average (3/4/5)"
				value={`${avg(s.byParType.par3.average)} / ${avg(s.byParType.par4.average)} / ${avg(
					s.byParType.par5.average
				)}`}
			/>
		</div>
	{/if}
{/if}

<style>
	.empty {
		color: var(--muted);
	}

	.toggle {
		display: inline-flex;
		border: 1px solid var(--green);
		border-radius: var(--radius);
		overflow: hidden;
		margin: 0.5rem 0 1.25rem;
	}

	.toggle button {
		padding: 0.45rem 1rem;
		border: none;
		background: var(--bg);
		color: var(--green);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.toggle button.active {
		background: var(--green);
		color: #fff;
	}

	.summary {
		color: var(--muted);
		margin: 0 0 1.5rem;
	}

	.tiles {
		display: grid;
		/* auto-fill (not auto-fit) keeps phantom tracks so a partial last row's cards
		   stay the same width as the others instead of stretching to fill. */
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		gap: 1rem;
	}
</style>
