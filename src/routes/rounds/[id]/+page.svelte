<script lang="ts">
	import { invalidate, invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { apiFetch, ApiError } from '$lib/api';
	import { clearActiveRoundIf, setActiveRound } from '$lib/offline/activeRound';
	import { queueComplete } from '$lib/offline/outbox';
	import { refreshPending } from '$lib/offline/status';
	import Scorecard from '$lib/components/Scorecard.svelte';

	let { data } = $props();

	const round = $derived(data.round);
	const complete = $derived(round.status === 'complete');

	// Remember this as the round the user is playing so a global "Resume round"
	// pill can bring them back; clear it once the round is complete.
	$effect(() => {
		if (!browser) return;
		if (complete) clearActiveRoundIf(round.id);
		else setActiveRound({ id: round.id, courseName: round.course.name });
	});

	const played = $derived(
		new Date(round.playedOn).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);

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
	let finishNote = $state('');

	function holeHref(n: number) {
		return resolve('/rounds/[id]/holes/[n]', { id: round.id, n: String(n) });
	}

	async function finish() {
		finishing = true;
		finishError = '';
		finishNote = '';
		try {
			await apiFetch(fetch, `/api/rounds/${round.id}`, {
				method: 'PATCH',
				body: { status: 'complete' }
			});
			await invalidateAll();
		} catch (err) {
			if (err instanceof ApiError) {
				finishError = err.message;
			} else {
				// Offline: queue the completion; it finishes on reconnect. Re-run the
				// page load (served from cache, no network) so the pending-complete
				// overlay flips the badge to Complete right now instead of on reconnect.
				await queueComplete(round.id);
				void refreshPending();
				await invalidate((url) => url.pathname === `/api/rounds/${round.id}`);
				finishNote = "You're offline — this round will finish when you reconnect.";
			}
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

{#if !complete}
	<div class="progress">
		<div class="bar"><span style:width={`${(scoredCount / round.holeCount) * 100}%`}></span></div>
		<p class="progress-text">
			{scoredCount} of {round.holeCount} hole{scoredCount === 1 ? '' : 's'} scored
			{#if scoredCount > 0}
				· {totalStrokes} ({toParLabel})
			{/if}
		</p>
	</div>
{/if}

<Scorecard
	holes={round.course.holes}
	scorings={round.scorings}
	holeCount={round.holeCount}
	roundId={round.id}
	interactive={!complete}
/>

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
	{#if finishNote}
		<p class="note">{finishNote}</p>
	{/if}
{:else}
	<div class="final">
		<p>Final score: <strong>{totalStrokes}</strong> ({toParLabel})</p>
		<a href={resolve('/rounds/[id]/stats', { id: round.id })}>View round stats →</a>
	</div>
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
		margin: 0.5rem 0 1.25rem;
		color: #444;
		font-size: 0.95rem;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.5rem;
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

	.note {
		color: #8a6100;
	}

	.final {
		margin-top: 1.5rem;
	}

	.final p {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
	}

	.final a {
		color: #1a7a3a;
		font-weight: 600;
		text-decoration: none;
	}
</style>
