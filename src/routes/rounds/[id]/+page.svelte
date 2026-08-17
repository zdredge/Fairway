<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { apiFetch, ApiError } from '$lib/api';
	import { isGreenInRegulation } from '$lib/scoring/workflow';
	import type { ApiScoring } from '$lib/types';

	let { data } = $props();

	const round = $derived(data.round);
	const complete = $derived(round.status === 'complete');

	const played = $derived(
		new Date(round.playedOn).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);

	// par by hole number, and scoring by hole number, for the grid.
	const parByHole = $derived(new Map(round.course.holes.map((h) => [h.number, h.par])));
	const scoreByHole = $derived(new Map(round.scorings.map((s) => [s.holeNumber, s])));
	const holeNumbers = $derived(Array.from({ length: round.holeCount }, (_, i) => i + 1));

	const scoredCount = $derived(round.scorings.length);
	const allScored = $derived(scoredCount === round.holeCount);
	const nextHole = $derived(holeNumbers.find((n) => !scoreByHole.has(n)));

	// Running totals over scored holes only.
	const totalStrokes = $derived(round.scorings.reduce((sum, s) => sum + s.strokes, 0));
	const scoredPar = $derived(
		round.scorings.reduce((sum, s) => sum + (parByHole.get(s.holeNumber) ?? 0), 0)
	);
	const toPar = $derived(totalStrokes - scoredPar);
	const toParLabel = $derived(toPar === 0 ? 'E' : toPar > 0 ? `+${toPar}` : `${toPar}`);

	let finishing = $state(false);
	let finishError = $state('');

	function holeHref(n: number) {
		return resolve('/rounds/[id]/holes/[n]', { id: round.id, n: String(n) });
	}

	function gir(scoring: ApiScoring) {
		return isGreenInRegulation(
			parByHole.get(scoring.holeNumber) ?? 0,
			scoring.strokes,
			scoring.putts
		);
	}

	async function finish() {
		finishing = true;
		finishError = '';
		try {
			await apiFetch(fetch, `/api/rounds/${round.id}`, {
				method: 'PATCH',
				body: { status: 'complete' }
			});
			await invalidateAll();
		} catch (err) {
			finishError = err instanceof ApiError ? err.message : 'Could not finish the round';
		} finally {
			finishing = false;
		}
	}
</script>

<div class="head">
	<h1>{round.course.name}</h1>
	<span class="badge" class:complete>{complete ? 'Complete' : 'In progress'}</span>
</div>

<p class="meta">
	{played}{#if round.tee}&nbsp;· {round.tee} tees{/if}
</p>

<div class="progress">
	<div class="bar"><span style:width={`${(scoredCount / round.holeCount) * 100}%`}></span></div>
	<p class="progress-text">
		{scoredCount} of {round.holeCount} holes scored
		{#if scoredCount > 0}
			· {totalStrokes} strokes ({toParLabel})
		{/if}
	</p>
</div>

<ul class="grid">
	{#each holeNumbers as n (n)}
		{@const scoring = scoreByHole.get(n)}
		<li>
			{#if complete}
				<div class="cell" class:scored={scoring}>
					<span class="num">{n}</span>
					<span class="par">par {parByHole.get(n)}</span>
					{#if scoring}
						<span class="strokes" class:gir={gir(scoring)}>{scoring.strokes}</span>
					{/if}
				</div>
			{:else}
				<a class="cell" class:scored={scoring} href={holeHref(n)}>
					<span class="num">{n}</span>
					<span class="par">par {parByHole.get(n)}</span>
					{#if scoring}
						<span class="strokes" class:gir={gir(scoring)}>{scoring.strokes}</span>
					{:else}
						<span class="dash">–</span>
					{/if}
				</a>
			{/if}
		</li>
	{/each}
</ul>

{#if !complete}
	<div class="actions">
		{#if nextHole !== undefined}
			<a class="btn primary" href={holeHref(nextHole)}>Score hole {nextHole}</a>
		{/if}
		{#if allScored}
			<button class="btn primary" onclick={finish} disabled={finishing}>
				{finishing ? 'Finishing…' : 'Finish round'}
			</button>
		{/if}
	</div>
	{#if finishError}
		<p class="error">{finishError}</p>
	{/if}
{:else}
	<p class="done">Round complete — nice work. Full scorecard and stats arrive in Phase 6.</p>
{/if}

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	h1 {
		margin: 0;
	}

	.badge {
		background: #fff4d6;
		color: #8a6100;
		border-radius: 999px;
		padding: 0.15rem 0.6rem;
		font-size: 0.85rem;
		white-space: nowrap;
	}

	.badge.complete {
		background: #e2f4e8;
		color: #1a7a3a;
	}

	.meta {
		color: #666;
		margin: 0.25rem 0 1.25rem;
	}

	.bar {
		height: 0.5rem;
		background: #eee;
		border-radius: 999px;
		overflow: hidden;
	}

	.bar span {
		display: block;
		height: 100%;
		background: #1a7a3a;
	}

	.progress-text {
		margin: 0.5rem 0 0;
		color: #444;
		font-size: 0.95rem;
	}

	.grid {
		list-style: none;
		padding: 0;
		margin: 1.5rem 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
		gap: 0.5rem;
	}

	.cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		padding: 0.5rem;
		border: 1px solid #e2e2e2;
		border-radius: 0.5rem;
		text-decoration: none;
		color: inherit;
	}

	a.cell:hover {
		border-color: #1a7a3a;
	}

	.cell.scored {
		background: #f6faf7;
	}

	.num {
		font-weight: 700;
	}

	.par {
		font-size: 0.7rem;
		color: #888;
	}

	.strokes {
		font-size: 1.25rem;
		font-weight: 700;
		color: #333;
	}

	.strokes.gir {
		color: #1a7a3a;
	}

	.dash {
		font-size: 1.25rem;
		color: #ccc;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
	}

	.btn {
		padding: 0.6rem 1rem;
		border-radius: 0.375rem;
		text-decoration: none;
		font: inherit;
		font-weight: 600;
		border: 1px solid #1a7a3a;
		color: #1a7a3a;
		background: #fff;
		cursor: pointer;
	}

	.btn.primary {
		background: #1a7a3a;
		color: #fff;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.error {
		color: #a4231a;
	}

	.done {
		color: #1a7a3a;
		font-weight: 600;
	}
</style>
