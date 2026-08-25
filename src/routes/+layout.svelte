<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { apiFetch } from '$lib/api';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();

	let signingOut = $state(false);

	async function signOut() {
		signingOut = true;
		try {
			await apiFetch(fetch, '/api/auth/logout', { method: 'POST' });
		} finally {
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
