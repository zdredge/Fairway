<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { apiFetch } from '$lib/api';
	import { activeRound, clearActiveRound } from '$lib/offline/activeRound';
	import { flush } from '$lib/offline/outbox';
	import { initOfflineStatus, refreshPending } from '$lib/offline/status';
	import OfflineIndicator from '$lib/components/OfflineIndicator.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();

	let signingOut = $state(false);

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
		max-width: 40rem;
		margin: 0 auto;
		padding: 0 1rem;
		font-family: system-ui, sans-serif;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 0;
		border-bottom: 1px solid #ddd;
	}

	.brand {
		font-weight: 700;
		font-size: 1.25rem;
		color: #1a7a3a;
		text-decoration: none;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.resume {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.75rem;
		padding: 0.6rem 0.85rem;
		border: 1px solid #1a7a3a;
		border-radius: 0.5rem;
		background: #e2f4e8;
		color: #1a7a3a;
		font-weight: 600;
		text-decoration: none;
	}

	.resume:hover {
		background: #d3eddc;
	}

	.resume .dot {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		background: #1a7a3a;
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
		color: #1a7a3a;
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
