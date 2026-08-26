<script lang="ts">
	import { isGreenInRegulation } from '$lib/scoring/workflow';
	import QuestionCard from '$lib/components/QuestionCard.svelte';
	import type { ScoringFacts } from '$lib/types';

	interface Props {
		holeNumber: number;
		par: number;
		facts: ScoringFacts;
		saving: boolean;
		errors: string[];
		onSave: () => void;
		onBack: () => void;
	}

	let { holeNumber, par, facts, saving, errors, onSave, onBack }: Props = $props();

	const toPar = $derived(facts.strokes - par);
	const toParLabel = $derived(toPar === 0 ? 'E' : toPar > 0 ? `+${toPar}` : `${toPar}`);
	const gir = $derived(isGreenInRegulation(par, facts.strokes, facts.putts));

	const fairwayLabels: Record<string, string> = {
		hit: 'Hit',
		left: 'Missed left',
		right: 'Missed right',
		long: 'Missed long',
		short: 'Missed short',
		na: '—'
	};
</script>

<QuestionCard question="Review" {holeNumber} {par} {onBack}>
	<div class="review">
		<div class="score">
			<span class="strokes">{facts.strokes}</span>
			<span class="topar">{toParLabel}</span>
		</div>

		<dl class="summary">
			<div>
				<dt>Putts</dt>
				<dd>{facts.putts}</dd>
			</div>
			<div>
				<dt>Fairway</dt>
				<dd>{fairwayLabels[facts.fairwayHit]}</dd>
			</div>
			<div>
				<dt>GIR</dt>
				<dd><span class="gir" class:yes={gir}>{gir ? 'Yes' : 'No'}</span></dd>
			</div>
		</dl>

		{#if errors.length > 0}
			<ul class="errors">
				{#each errors as error (error)}
					<li>{error}</li>
				{/each}
			</ul>
		{/if}

		<button type="button" class="btn btn-primary btn-block" onclick={onSave} disabled={saving}>
			{saving ? 'Saving…' : 'Save hole'}
		</button>
	</div>
</QuestionCard>

<style>
	.review {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.score {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.75rem;
	}

	.strokes {
		font-size: 3rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.topar {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--faint);
	}

	.summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
		gap: 1rem;
		margin: 0;
	}

	.summary div {
		border: 1px solid var(--border-light);
		border-radius: var(--radius);
		padding: 0.75rem;
	}

	dt {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--faint);
	}

	dd {
		margin: 0.25rem 0 0;
		font-weight: 600;
	}

	.gir {
		display: inline-block;
		background: var(--danger-bg);
		color: var(--danger-ink);
		border-radius: var(--radius-pill);
		padding: 0.1rem 0.6rem;
		font-size: 0.9rem;
	}

	.gir.yes {
		background: var(--green-tint);
		color: var(--green);
	}
</style>
