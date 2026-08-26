<script lang="ts">
	import { resolve } from '$app/paths';
	import { activeRound } from '$lib/offline/activeRound';
	import { pickCurrentRoundId } from '$lib/offline/merge';
	import type { ApiRoundSummary } from '$lib/types';

	let { data } = $props();

	// The round to flag as "current": the one the user is playing (last opened, via
	// the store) or, failing that, the most-recent in-progress round in the list.
	const currentId = $derived(pickCurrentRoundId(data.rounds, $activeRound?.id ?? null));

	function dateLabel(iso: string) {
		return new Date(iso).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function toParLabel(round: ApiRoundSummary) {
		const toPar = round.totalStrokes - round.totalPar;
		return toPar === 0 ? 'E' : toPar > 0 ? `+${toPar}` : `${toPar}`;
	}
</script>

<div class="head">
	<h1>Rounds</h1>
	<a class="btn btn-primary" href={resolve('/rounds/new')}>Start a round</a>
</div>

{#if data.offline}
	<p class="empty">
		Your rounds aren't available offline yet — reconnect to load them. If you have a round in
		progress, use the “Resume round” button above to get back to it.
	</p>
{:else if data.rounds.length === 0}
	<p class="empty">
		No rounds yet. <a href={resolve('/rounds/new')}>Start a round</a> to begin tracking your golf.
	</p>
{:else}
	<ul class="rounds">
		{#each data.rounds as round (round.id)}
			<li>
				<a href={resolve('/rounds/[id]', { id: round.id })}>
					<div class="top">
						<span class="course">{round.courseName}</span>
						<span class="badge" class:complete={round.status === 'complete'}>
							{round.status === 'complete' ? 'Complete' : 'In progress'}
						</span>
					</div>
					{#if round.id === currentId}
						<div class="current"><span class="dot" aria-hidden="true"></span> Current Round</div>
					{/if}
					<div class="bottom">
						<span class="date">{dateLabel(round.playedOn)} · {round.holeCount} holes</span>
						{#if round.status === 'complete'}
							<span class="score">{round.totalStrokes} ({toParLabel(round)})</span>
						{:else}
							<span class="score muted">
								{round.holesScored} of {round.holeCount} scored
								{#if round.pendingSync}<span class="pending">· {round.pendingSync} unsynced</span
									>{/if}
							</span>
						{/if}
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.empty {
		color: var(--muted);
	}

	.rounds {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.rounds a {
		display: block;
		padding: 0.85rem 1rem;
		border: 1px solid var(--border-card);
		border-radius: var(--radius);
		text-decoration: none;
		color: inherit;
	}

	.rounds a:hover {
		border-color: var(--green);
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.course {
		font-weight: 600;
	}

	.badge {
		background: var(--amber-bg);
		color: var(--amber-ink);
		border-radius: var(--radius-pill);
		padding: 0.1rem 0.55rem;
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.badge.complete {
		background: var(--green-tint);
		color: var(--green);
	}

	.bottom {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 0.35rem;
	}

	.date {
		color: var(--faint);
		font-size: 0.9rem;
	}

	.score {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.score.muted {
		font-weight: 400;
		color: var(--faint);
		font-size: 0.9rem;
	}

	.pending {
		color: var(--amber-ink);
		font-weight: 600;
	}

	.current {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.35rem;
		color: var(--green);
		font-size: 0.8rem;
		font-weight: 700;
	}

	.current .dot {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		background: var(--green);
	}
</style>
