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
		border: 1px solid #e2e2e2;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #666;
	}

	.value {
		font-size: 2rem;
		font-weight: 700;
		color: #1a7a3a;
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}

	.sub {
		color: #666;
		font-size: 0.9rem;
	}
</style>
