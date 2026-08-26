<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ApiRoundSummary } from '$lib/types';

	let { data } = $props();

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
	<a class="btn" href={resolve('/rounds/new')}>Start a round</a>
</div>

{#if data.rounds.length === 0}
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
		align-items: center;
		justify-content: space-between;
	}

	.btn {
		background: #1a7a3a;
		color: #fff;
		padding: 0.5rem 0.9rem;
		border-radius: 0.375rem;
		text-decoration: none;
		font-weight: 600;
	}

	.empty {
		color: #555;
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
		border: 1px solid #e2e2e2;
		border-radius: 0.5rem;
		text-decoration: none;
		color: inherit;
	}

	.rounds a:hover {
		border-color: #1a7a3a;
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
		background: #fff4d6;
		color: #8a6100;
		border-radius: 999px;
		padding: 0.1rem 0.55rem;
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.badge.complete {
		background: #e2f4e8;
		color: #1a7a3a;
	}

	.bottom {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 0.35rem;
	}

	.date {
		color: #666;
		font-size: 0.9rem;
	}

	.score {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.score.muted {
		font-weight: 400;
		color: #666;
		font-size: 0.9rem;
	}

	.pending {
		color: #8a6100;
		font-weight: 600;
	}
</style>
