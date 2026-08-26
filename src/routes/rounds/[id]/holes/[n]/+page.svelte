<script lang="ts">
	import { browser } from '$app/environment';
	import { setActiveRound } from '$lib/offline/activeRound';
	import HoleFlow from '$lib/components/HoleFlow.svelte';

	let { data } = $props();

	// Scoring a hole means this is the round in play — register it for the global
	// "Resume round" pill (hole pages are only reachable while in progress).
	$effect(() => {
		if (browser) setActiveRound({ id: data.round.id, courseName: data.round.course.name });
	});
</script>

<!-- Key on the hole number: navigating hole→hole is the same route, so without
	 this SvelteKit reuses the component and its state carries over. The key forces
	 a fresh HoleFlow (fresh answers/drafts) for each hole. -->
{#key data.holeNumber}
	<HoleFlow
		round={data.round}
		holeNumber={data.holeNumber}
		par={data.par}
		existing={data.existing}
	/>
{/key}
