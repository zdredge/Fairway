<script lang="ts">
	interface Props {
		value: number;
		min?: number;
		max?: number;
		label?: string;
	}

	let { value = $bindable(), min = 0, max, label }: Props = $props();

	const canDecrement = $derived(value > min);
	const canIncrement = $derived(max === undefined || value < max);

	function decrement() {
		if (canDecrement) value -= 1;
	}
	function increment() {
		if (canIncrement) value += 1;
	}
</script>

<div class="stepper">
	<button type="button" onclick={increment} disabled={!canIncrement} aria-label="Increase"
		>＋</button
	>
	<span class="value" aria-live="polite" aria-label={label}>{value}</span>
	<button type="button" onclick={decrement} disabled={!canDecrement} aria-label="Decrease">−</button
	>
</div>

<style>
	.stepper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	button {
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 50%;
		border: 2px solid var(--green);
		background: var(--bg);
		color: var(--green);
		font-size: 1.75rem;
		line-height: 1;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.value {
		min-width: 3rem;
		text-align: center;
		font-size: 3rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
</style>
