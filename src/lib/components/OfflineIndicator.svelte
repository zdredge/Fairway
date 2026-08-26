<script lang="ts">
	// A small, non-blocking banner that surfaces connection state and unsynced
	// work. Hidden when online with an empty outbox. Driven by the offline status
	// stores, which the layout keeps up to date.
	import { online, pending } from '$lib/offline/status';

	// Offline: tell the user their changes are safe and queued.
	// Online but with a backlog: we're actively draining it.
	const show = $derived(!$online || $pending > 0);
	const label = $derived(
		!$online
			? $pending > 0
				? `Offline — ${$pending} change${$pending === 1 ? '' : 's'} will sync when you reconnect`
				: 'Offline — you can keep scoring; changes will sync when you reconnect'
			: `Syncing ${$pending} change${$pending === 1 ? '' : 's'}…`
	);
</script>

{#if show}
	<div class="indicator" class:offline={!$online} role="status" aria-live="polite">
		<span class="dot" aria-hidden="true"></span>
		{label}
	</div>
{/if}

<style>
	.indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.75rem;
		padding: 0.5rem 0.85rem;
		border-radius: 0.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		/* Online-but-syncing: green/informational. */
		background: #e2f4e8;
		color: #1a7a3a;
	}

	.indicator.offline {
		background: #fff4d6;
		color: #8a6100;
	}

	.dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		background: currentColor;
	}

	.indicator:not(.offline) .dot {
		animation: pulse 1.2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.indicator:not(.offline) .dot {
			animation: none;
		}
	}
</style>
