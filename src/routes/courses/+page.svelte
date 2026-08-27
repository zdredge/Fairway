<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<div class="head">
	<h1>Courses</h1>
	<a class="btn btn-primary" href={resolve('/courses/new')}>New course</a>
</div>

{#if data.offline}
	<p class="empty">Your courses aren't available offline yet — reconnect to load them.</p>
{:else if data.courses.length === 0}
	<p class="empty">
		No courses yet. <a href={resolve('/courses/new')}>Create your first course</a> to start tracking rounds.
	</p>
{:else}
	<ul class="courses">
		{#each data.courses as course (course.id)}
			<li>
				<span class="name">{course.name}</span>
				<span class="meta">{course.holeCount} holes</span>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.empty {
		color: var(--muted);
	}

	.courses {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0;
	}

	.courses li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 0.25rem;
		border-bottom: 1px solid var(--border-light);
	}

	.name {
		font-weight: 600;
	}

	.meta {
		color: var(--faint);
		font-size: 0.9rem;
	}
</style>
