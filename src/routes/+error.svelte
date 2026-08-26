<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	// Branded replacement for SvelteKit's default error page. Rendered inside the
	// root layout, so the header/nav stay put. Covers 404s (error(404, …)) and any
	// uncaught load failure.
	const status = $derived(page.status);
	const isNotFound = $derived(status === 404);
	const message = $derived(page.error?.message ?? 'Something went wrong.');

	// Send signed-in users back into the app; signed-out users to the home page.
	const signedIn = $derived(Boolean(page.data?.user));
	const homeHref = $derived(signedIn ? resolve('/rounds') : resolve('/'));
	const homeLabel = $derived(signedIn ? 'Back to rounds' : 'Go home');
</script>

<div class="error">
	<p class="status">{status}</p>
	<h1>{isNotFound ? 'Page not found' : 'Something went wrong'}</h1>
	<p class="message">
		{#if isNotFound}
			We couldn't find that page. It may have moved, or the link was mistyped.
		{:else}
			{message}
		{/if}
	</p>
	<a class="btn btn-primary" href={homeHref}>{homeLabel}</a>
</div>

<style>
	.error {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.5rem;
		padding: 2.5rem 1rem;
		max-width: 26rem;
		margin: 0 auto;
	}

	.status {
		margin: 0;
		font-size: 3rem;
		font-weight: 700;
		color: var(--green);
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	h1 {
		margin: 0.25rem 0 0;
		font-size: 1.4rem;
	}

	.message {
		margin: 0 0 1rem;
		color: var(--muted);
		line-height: 1.5;
	}
</style>
