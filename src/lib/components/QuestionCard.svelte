<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		question?: string;
		holeNumber: number;
		par: number;
		onBack: () => void;
		children: Snippet;
	}

	let { question, holeNumber, par, onBack, children }: Props = $props();
</script>

<div class="card">
	<div class="eyebrow">Hole {holeNumber} · par {par}</div>
	{#if question}
		<h2>{question}</h2>
	{/if}
	<div class="control">
		{@render children()}
	</div>
	<button type="button" class="back" onclick={onBack}>← Back</button>
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	h2 {
		margin: 0;
		font-size: 1.4rem;
		text-align: center;
	}

	.control {
		margin: 0.5rem 0;
	}

	.back {
		align-self: flex-start;
		background: none;
		border: none;
		color: var(--green);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
	}
</style>
