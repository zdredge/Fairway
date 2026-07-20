<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<div class="head">
	<h1>Rounds</h1>
	<a class="btn" href={resolve('/rounds/new')}>Start a round</a>
</div>

<p class="empty">Round history arrives in Phase 6.</p>

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.btn {
		background: #1a7a3a;
		color: #fff;
		padding: 0.5rem 0.9rem;
		border-radius: 0.375rem;
		text-decoration: none;
		font-weight: 600;
	}

	.empty {
		color: #555;
	}
</style>
