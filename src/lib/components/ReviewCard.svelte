<script lang="ts">
	import { isGreenInRegulation } from '$lib/scoring/workflow';
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

<div class="card">
	<div class="context">Hole {holeNumber} · par {par}</div>
	<h2>Review</h2>

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

	<div class="actions">
		<button type="button" class="back" onclick={onBack}>← Back</button>
		<button type="button" class="save" onclick={onSave} disabled={saving}>
			{saving ? 'Saving…' : 'Save hole'}
		</button>
	</div>
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.context {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #666;
	}

	h2 {
		margin: 0;
		font-size: 1.4rem;
	}

	.score {
		display: flex;
		align-items: baseline;
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
		color: #666;
	}

	.summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
		gap: 1rem;
		margin: 0;
	}

	.summary div {
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

	.gir {
		display: inline-block;
		background: #fdecea;
		color: #a4231a;
		border-radius: 999px;
		padding: 0.1rem 0.6rem;
		font-size: 0.9rem;
	}

	.gir.yes {
		background: #e2f4e8;
		color: #1a7a3a;
	}

	.errors {
		margin: 0;
		padding: 0.75rem 1rem 0.75rem 2rem;
		background: #fdecea;
		border: 1px solid #f5c6c0;
		border-radius: 0.375rem;
		color: #a4231a;
	}

	.actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.back {
		background: none;
		border: none;
		color: #1a7a3a;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
	}

	.save {
		background: #1a7a3a;
		color: #fff;
		border: none;
		padding: 0.7rem 1.5rem;
		border-radius: 0.375rem;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.save:disabled {
		opacity: 0.6;
		cursor: default;
	}
</style>
