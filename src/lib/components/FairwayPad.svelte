<script lang="ts">
	import type { FairwayHit } from '$lib/types';

	interface Props {
		onSelect: (value: FairwayHit) => void;
		selected?: FairwayHit;
	}

	let { onSelect, selected }: Props = $props();
</script>

<div class="pad">
	<button
		type="button"
		class="long"
		class:selected={selected === 'long'}
		onclick={() => onSelect('long')}>Long</button
	>
	<button
		type="button"
		class="left"
		class:selected={selected === 'left'}
		onclick={() => onSelect('left')}>Left</button
	>
	<button
		type="button"
		class="hit"
		class:selected={selected === 'hit'}
		onclick={() => onSelect('hit')}>Hit</button
	>
	<button
		type="button"
		class="right"
		class:selected={selected === 'right'}
		onclick={() => onSelect('right')}>Right</button
	>
	<button
		type="button"
		class="short"
		class:selected={selected === 'short'}
		onclick={() => onSelect('short')}>Short</button
	>
</div>
<p class="hint">Tap the fairway if you hit it, or the direction you missed.</p>

<style>
	.pad {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-areas:
			'.    long  .'
			'left hit   right'
			'.    short .';
		gap: 0.75rem;
		max-width: 20rem;
		margin: 0 auto;
	}

	button {
		padding: 1rem;
		border: 2px solid var(--border-input);
		border-radius: var(--radius);
		background: var(--bg);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	button:hover {
		border-color: var(--green);
	}

	button.selected {
		border-color: var(--green);
		background: var(--green-tint);
		color: var(--green);
	}

	.long {
		grid-area: long;
	}
	.left {
		grid-area: left;
	}
	.right {
		grid-area: right;
	}
	.short {
		grid-area: short;
	}

	/* The center tile is the "hit the fairway" choice — styled as the green target. */
	.hit {
		grid-area: hit;
		border-radius: 50%;
		border-color: var(--green);
		background: var(--green-tint);
		color: var(--green);
	}

	.hit.selected {
		background: var(--green);
		color: #fff;
	}

	.hint {
		margin: 1rem 0 0;
		text-align: center;
		font-size: 0.85rem;
		color: var(--faint);
	}
</style>
