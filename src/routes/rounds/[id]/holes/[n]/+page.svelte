<script lang="ts">
	import HoleFlow from '$lib/components/HoleFlow.svelte';

	let { data } = $props();
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
