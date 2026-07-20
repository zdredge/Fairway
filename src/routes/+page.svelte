<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<h1>Fairway</h1>
<p>A simple, fast golf round tracker. Log each hole, see your stats.</p>

<div class="actions">
	<a class="btn primary" href={resolve('/rounds/new')}>Start a round</a>
	<a class="btn" href={resolve('/courses/new')}>New course</a>
</div>

<style>
	.actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.btn {
		padding: 0.6rem 1rem;
		border-radius: 0.375rem;
		text-decoration: none;
		font-weight: 600;
		color: #1a7a3a;
		border: 1px solid #1a7a3a;
	}

	.btn.primary {
		background: #1a7a3a;
		color: #fff;
	}
</style>
