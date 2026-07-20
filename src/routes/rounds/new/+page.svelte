<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { apiFetch, ApiError } from '$lib/api';
	import type { ApiRound } from '$lib/types';

	let { data } = $props();

	// Deliberately captures the initial course list — these are form defaults
	// the user edits from there, not values that should track later data changes.
	// svelte-ignore state_referenced_locally
	let courseId = $state(data.courses[0]?.id ?? '');
	// svelte-ignore state_referenced_locally
	let holeCount = $state<9 | 18>(data.courses[0]?.holeCount === 9 ? 9 : 18);
	let tee = $state('');
	let playedOn = $state(new Date().toISOString().slice(0, 10));
	let errors = $state<string[]>([]);
	let submitting = $state(false);

	const selectedCourse = $derived(data.courses.find((course) => course.id === courseId));

	function onCourseChange() {
		// An 18-hole round can't be played on a 9-hole course.
		if (selectedCourse?.holeCount === 9) holeCount = 9;
		else holeCount = 18;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		errors = [];
		try {
			const round = await apiFetch<ApiRound>(fetch, '/api/rounds', {
				method: 'POST',
				body: {
					courseId,
					holeCount,
					tee: tee.trim() === '' ? undefined : tee.trim(),
					// Anchor the date-only input to local noon — a bare YYYY-MM-DD parses
					// as UTC midnight, which displays as the previous day west of UTC.
					playedOn: new Date(`${playedOn}T12:00:00`).toISOString()
				}
			});
			await goto(resolve('/rounds/[id]', { id: round.id }));
		} catch (err) {
			errors =
				err instanceof ApiError
					? err.errors.length > 0
						? err.errors
						: [err.message]
					: ['Something went wrong — please try again'];
		} finally {
			submitting = false;
		}
	}
</script>

<h1>Start a round</h1>

{#if data.courses.length === 0}
	<p class="empty">
		You need a course first. <a href={resolve('/courses/new')}>Create a course</a>, then come back
		to start a round.
	</p>
{:else}
	<form onsubmit={submit}>
		<label class="field">
			<span>Course</span>
			<select bind:value={courseId} onchange={onCourseChange}>
				{#each data.courses as course (course.id)}
					<option value={course.id}>{course.name} ({course.holeCount} holes)</option>
				{/each}
			</select>
		</label>

		<fieldset class="length">
			<legend>Round length</legend>
			<label>
				<input
					type="radio"
					name="roundLength"
					checked={holeCount === 9}
					onchange={() => (holeCount = 9)}
				/>
				9 holes
			</label>
			<label class:disabled={selectedCourse?.holeCount === 9}>
				<input
					type="radio"
					name="roundLength"
					checked={holeCount === 18}
					disabled={selectedCourse?.holeCount === 9}
					onchange={() => (holeCount = 18)}
				/>
				18 holes
			</label>
		</fieldset>

		<label class="field">
			<span>Tee (optional)</span>
			<input type="text" bind:value={tee} placeholder="e.g. white" />
		</label>

		<label class="field">
			<span>Date</span>
			<input type="date" bind:value={playedOn} required />
		</label>

		{#if errors.length > 0}
			<ul class="errors">
				{#each errors as error (error)}
					<li>{error}</li>
				{/each}
			</ul>
		{/if}

		<button class="btn" type="submit" disabled={submitting}>
			{submitting ? 'Starting…' : 'Start round'}
		</button>
	</form>
{/if}

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 22rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-weight: 600;
	}

	input,
	select {
		padding: 0.45rem 0.5rem;
		border: 1px solid #ccc;
		border-radius: 0.375rem;
		font: inherit;
	}

	.length {
		display: flex;
		gap: 1.25rem;
		border: none;
		padding: 0;
	}

	.length legend {
		font-weight: 600;
		margin-bottom: 0.35rem;
	}

	.length .disabled {
		color: #999;
	}

	.empty {
		color: #555;
	}

	.errors {
		margin: 0;
		padding: 0.75rem 1rem 0.75rem 2rem;
		background: #fdecea;
		border: 1px solid #f5c6c0;
		border-radius: 0.375rem;
		color: #a4231a;
	}

	.btn {
		background: #1a7a3a;
		color: #fff;
		border: none;
		padding: 0.6rem 1rem;
		border-radius: 0.375rem;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		align-self: flex-start;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: default;
	}
</style>
