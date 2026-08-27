<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { apiFetch, ApiError } from '$lib/api';
	import type { ApiCourseWithHoles } from '$lib/types';

	interface HoleRow {
		par: number;
		yardage: number | null;
	}

	const newRow = (): HoleRow => ({ par: 4, yardage: null });

	let name = $state('');
	let holeCount = $state<9 | 18>(18);
	let holes = $state<HoleRow[]>(Array.from({ length: 18 }, newRow));
	let errors = $state<string[]>([]);
	let submitting = $state(false);

	const totalPar = $derived(holes.reduce((sum, hole) => sum + hole.par, 0));

	function setHoleCount(count: 9 | 18) {
		holeCount = count;
		holes =
			holes.length > count
				? holes.slice(0, count)
				: [...holes, ...Array.from({ length: count - holes.length }, newRow)];
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		errors = [];
		try {
			await apiFetch<ApiCourseWithHoles>(fetch, '/api/courses', {
				method: 'POST',
				body: {
					name,
					holes: holes.map((hole, i) => ({
						number: i + 1,
						par: hole.par,
						yardage:
							typeof hole.yardage === 'number' && Number.isFinite(hole.yardage)
								? hole.yardage
								: undefined
					}))
				}
			});
			await goto(resolve('/courses'));
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

<h1>New course</h1>

<form onsubmit={submit}>
	<label class="field">
		<span>Course name</span>
		<input type="text" bind:value={name} placeholder="e.g. Pebble Creek" required />
	</label>

	<fieldset class="length">
		<legend>Holes</legend>
		<label>
			<input
				type="radio"
				name="holeCount"
				checked={holeCount === 9}
				onchange={() => setHoleCount(9)}
			/>
			9 holes
		</label>
		<label>
			<input
				type="radio"
				name="holeCount"
				checked={holeCount === 18}
				onchange={() => setHoleCount(18)}
			/>
			18 holes
		</label>
	</fieldset>

	<div class="table-wrap">
		<table class="holes">
			<thead>
				<tr><th>Hole</th><th>Par</th><th>Yardage (optional)</th></tr>
			</thead>
			<tbody>
				{#each holes as hole, i (i)}
					<tr>
						<td class="num">{i + 1}</td>
						<td>
							<select bind:value={hole.par} aria-label={`Par for hole ${i + 1}`}>
								<option value={3}>3</option>
								<option value={4}>4</option>
								<option value={5}>5</option>
							</select>
						</td>
						<td>
							<input
								type="number"
								min="1"
								bind:value={hole.yardage}
								aria-label={`Yardage for hole ${i + 1}`}
							/>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<p class="total">Total par: <strong>{totalPar}</strong></p>

	{#if errors.length > 0}
		<ul class="errors">
			{#each errors as error (error)}
				<li>{error}</li>
			{/each}
		</ul>
	{/if}

	<button class="btn btn-primary" type="submit" disabled={submitting}>
		{submitting ? 'Saving…' : 'Save course'}
	</button>
</form>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 26rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-weight: 600;
	}

	input[type='text'],
	input[type='number'],
	select {
		padding: 0.45rem 0.5rem;
		border: 1px solid var(--border-input);
		border-radius: var(--radius-sm);
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

	/* Let the per-hole table scroll sideways on narrow phones instead of overflowing. */
	.table-wrap {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.holes {
		border-collapse: collapse;
		width: 100%;
		min-width: 18rem;
	}

	.holes th {
		text-align: left;
		font-size: 0.85rem;
		color: var(--faint);
		padding: 0.25rem 0.5rem;
	}

	.holes td {
		padding: 0.2rem 0.5rem;
	}

	.holes .num {
		font-weight: 600;
		width: 3rem;
	}

	.holes input[type='number'] {
		width: 100%;
		min-width: 4rem;
	}

	.total {
		margin: 0;
		color: var(--ink);
	}

	.btn {
		align-self: flex-start;
	}
</style>
