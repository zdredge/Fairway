<script lang="ts">
	let { data } = $props();

	const round = $derived(data.round);
	const played = $derived(
		new Date(round.playedOn).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);
</script>

<h1>{round.course.name}</h1>

<dl class="details">
	<div>
		<dt>Date</dt>
		<dd>{played}</dd>
	</div>
	<div>
		<dt>Length</dt>
		<dd>{round.holeCount} holes</dd>
	</div>
	{#if round.tee}
		<div>
			<dt>Tee</dt>
			<dd>{round.tee}</dd>
		</div>
	{/if}
	<div>
		<dt>Status</dt>
		<dd>
			<span class="badge" class:complete={round.status === 'complete'}>
				{round.status === 'complete' ? 'Complete' : 'In progress'}
			</span>
		</dd>
	</div>
	<div>
		<dt>Holes scored</dt>
		<dd>{round.scorings.length} of {round.holeCount}</dd>
	</div>
</dl>

<p class="note">Hole-by-hole scoring arrives in Phase 5 — this round is ready and waiting.</p>

<style>
	.details {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
		gap: 1rem;
		margin: 1.5rem 0;
	}

	.details div {
		border: 1px solid #eee;
		border-radius: 0.5rem;
		padding: 0.75rem;
	}

	dt {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #666;
	}

	dd {
		margin: 0.25rem 0 0;
		font-weight: 600;
	}

	.badge {
		display: inline-block;
		background: #fff4d6;
		color: #8a6100;
		border-radius: 999px;
		padding: 0.15rem 0.6rem;
		font-size: 0.85rem;
	}

	.badge.complete {
		background: #e2f4e8;
		color: #1a7a3a;
	}

	.note {
		color: #555;
	}
</style>
