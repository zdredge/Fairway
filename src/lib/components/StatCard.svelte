<script lang="ts">
	interface Props {
		label: string;
		value: string;
		sub?: string;
	}

	let { label, value, sub }: Props = $props();
</script>

<div class="card">
	<div class="label">{label}</div>
	<div class="value">{value}</div>
	{#if sub}
		<div class="sub">{sub}</div>
	{/if}
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.35rem;
		border: 1px solid var(--border-card);
		border-radius: var(--radius);
		padding: 1rem;
	}

	.label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--faint);
	}

	.value {
		/* Shrinks on narrow tiles so a long value like "2.9 / 4.0 / 5.1" doesn't overflow. */
		font-size: clamp(1.35rem, 6vw, 2rem);
		font-weight: 700;
		color: var(--green);
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
		max-width: 100%;
	}

	.sub {
		color: var(--faint);
		font-size: 0.9rem;
	}
</style>
