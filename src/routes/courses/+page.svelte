<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<div class="head">
	<h1>Courses</h1>
	<a class="btn" href={resolve('/courses/new')}>New course</a>
</div>

{#if data.courses.length === 0}
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
		border-bottom: 1px solid #eee;
	}

	.name {
		font-weight: 600;
	}

	.meta {
		color: #666;
		font-size: 0.9rem;
	}
</style>
