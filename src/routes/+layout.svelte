<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { navigating, page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { apiFetch } from '$lib/api';
	import { activeRound, clearActiveRound } from '$lib/offline/activeRound';
	import { flush } from '$lib/offline/outbox';
	import { initOfflineStatus, refreshPending } from '$lib/offline/status';
	import OfflineIndicator from '$lib/components/OfflineIndicator.svelte';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children, data } = $props();

	let signingOut = $state(false);

	// A client-side navigation is in flight — drives the thin top progress bar.
	const isNavigating = $derived(navigating.to != null);

	// Show a "Resume round" pill whenever the user has an active round and isn't
	// already on that round's pages (detail / holes / stats).
	const resumeRound = $derived(
		$activeRound && !page.url.pathname.startsWith(`/rounds/${$activeRound.id}`)
			? $activeRound
			: null
	);

	// SvelteKit builds the service worker but doesn't auto-register it — do it here
	// (production only, to avoid interfering with the dev HMR socket).
	onMount(() => {
		initOfflineStatus();
		if (!dev && 'serviceWorker' in navigator) {
			navigator.serviceWorker
				.register('/service-worker.js')
				.catch((err) => console.error('Service worker registration failed:', err));
		}
	});

	// Drain the offline outbox while signed in: on load/login and on every reconnect.
	// Refresh the pending count after each flush so the indicator reflects reality.
	$effect(() => {
		if (!data.user) return;
		const drain = () => flush(fetch).then(refreshPending);
		drain();
		window.addEventListener('online', drain);
		return () => window.removeEventListener('online', drain);
	});

	async function signOut() {
		signingOut = true;
		try {
			await apiFetch(fetch, '/api/auth/logout', { method: 'POST' });
		} finally {
			clearActiveRound(); // don't leak the active round to the next user
			await goto(resolve('/login'), { invalidateAll: true });
			signingOut = false;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isNavigating}
	<div class="loading-bar" role="progressbar" aria-label="Loading"></div>
{/if}

<div class="app">
	<header>
		<a href={resolve('/')} class="brand">Fairway</a>
		{#if data.user}
			<nav>
				<a href={resolve('/courses')}>Courses</a>
				<a href={resolve('/rounds')}>Rounds</a>
				<a href={resolve('/stats')}>Stats</a>
				<button type="button" class="signout" onclick={signOut} disabled={signingOut}>
					Sign out
				</button>
			</nav>
		{/if}
	</header>

	<main>
		{#if data.user}
			<OfflineIndicator />
			{#if resumeRound}
				<a class="resume" href={resolve('/rounds/[id]', { id: resumeRound.id })}>
					<span class="dot" aria-hidden="true"></span>
					<span class="resume-text">Resume round · {resumeRound.courseName}</span>
					<span class="arrow" aria-hidden="true">→</span>
				</a>
			{/if}
		{/if}
		{@render children()}
	</main>
</div>

<style>
	.app {
		max-width: var(--page-max);
		margin: 0 auto;
		padding: 0 1rem;
	}

	/* Thin top progress bar during client-side navigation. */
	.loading-bar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		z-index: 100;
		background: var(--green);
		transform-origin: 0 50%;
		animation: loading-slide 1.1s ease-in-out infinite;
	}

	@keyframes loading-slide {
		0% {
			transform: scaleX(0);
			opacity: 1;
		}
		60% {
			transform: scaleX(0.9);
		}
		100% {
			transform: scaleX(1);
			opacity: 0.4;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.loading-bar {
			animation: none;
			transform: scaleX(1);
			opacity: 0.7;
		}
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		/* Wrap the nav below the brand on very narrow phones instead of clipping. */
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--border);
	}

	.brand {
		font-weight: 700;
		font-size: 1.25rem;
		color: var(--green);
		text-decoration: none;
	}

	nav {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
	}

	.resume {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.75rem;
		padding: 0.6rem 0.85rem;
		border: 1px solid var(--green);
		border-radius: var(--radius);
		background: var(--green-tint);
		color: var(--green);
		font-weight: 600;
		text-decoration: none;
	}

	.resume:hover {
		background: var(--green-tint-hover);
	}

	.resume .dot {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		background: var(--green);
		flex: none;
	}

	.resume-text {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.resume .arrow {
		flex: none;
	}

	nav a {
		color: inherit;
		text-decoration: none;
	}

	nav a:hover {
		text-decoration: underline;
	}

	.signout {
		background: none;
		border: none;
		padding: 0;
		color: var(--green);
		font: inherit;
		cursor: pointer;
	}

	.signout:hover {
		text-decoration: underline;
	}

	.signout:disabled {
		opacity: 0.6;
		cursor: default;
	}

	main {
		padding: 1.5rem 0;
	}
</style>
