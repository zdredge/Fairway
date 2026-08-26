<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { apiFetch, ApiError } from '$lib/api';

	let email = $state('');
	let displayName = $state('');
	let password = $state('');
	let errors = $state<string[]>([]);
	let submitting = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		errors = [];
		try {
			await apiFetch(fetch, '/api/auth/signup', {
				method: 'POST',
				body: { email, password, displayName: displayName.trim() || undefined }
			});
			await goto(resolve('/'), { invalidateAll: true });
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

<h1>Create your account</h1>

<form onsubmit={submit}>
	<label class="field">
		<span>Email</span>
		<input type="email" bind:value={email} autocomplete="email" required />
	</label>
	<label class="field">
		<span>Display name (optional)</span>
		<input type="text" bind:value={displayName} autocomplete="nickname" />
	</label>
	<label class="field">
		<span>Password</span>
		<input
			type="password"
			bind:value={password}
			autocomplete="new-password"
			minlength="8"
			required
		/>
		<small>At least 8 characters.</small>
	</label>

	{#if errors.length > 0}
		<ul class="errors">
			{#each errors as error (error)}
				<li>{error}</li>
			{/each}
		</ul>
	{/if}

	<button class="btn btn-primary" type="submit" disabled={submitting}>
		{submitting ? 'Creating…' : 'Create account'}
	</button>
</form>

<p class="alt">Already have an account? <a href={resolve('/login')}>Sign in</a>.</p>

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

	input {
		padding: 0.45rem 0.5rem;
		border: 1px solid var(--border-input);
		border-radius: var(--radius-sm);
		font: inherit;
	}

	small {
		font-weight: 400;
		color: var(--faint);
	}

	.btn {
		align-self: flex-start;
	}

	.alt {
		margin-top: 1.25rem;
		color: var(--muted);
	}

	.alt a {
		color: var(--green);
		font-weight: 600;
	}
</style>
