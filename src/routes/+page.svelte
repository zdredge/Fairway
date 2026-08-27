<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<h1>Fairway</h1>
<p>A simple, fast golf round tracker. Log each hole, see your stats.</p>

<div class="actions">
	<a class="btn btn-primary" href={resolve('/rounds/new')}>Start a round</a>
	<a class="btn" href={resolve('/courses/new')}>New course</a>
</div>

<style>
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}
</style>
