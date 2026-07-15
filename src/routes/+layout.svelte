<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
	<header>
		<a href={resolve('/')} class="brand">Fairway</a>
		<nav>
			<a href={resolve('/courses')}>Courses</a>
			<a href={resolve('/rounds')}>Rounds</a>
			<a href={resolve('/stats')}>Stats</a>
		</nav>
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
		gap: 1rem;
	}

	nav a {
		color: inherit;
		text-decoration: none;
	}

	nav a:hover {
		text-decoration: underline;
	}

	main {
		padding: 1.5rem 0;
	}
</style>
