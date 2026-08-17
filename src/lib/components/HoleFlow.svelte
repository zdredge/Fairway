<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { apiFetch, ApiError } from '$lib/api';
	import {
		answersFromFacts,
		currentStep,
		maxPutts,
		toScoringFacts,
		type ScoringStep
	} from '$lib/scoring/workflow';
	import type { ApiRoundDetail, ApiScoring, FairwayHit, HoleAnswers } from '$lib/types';
	import QuestionCard from '$lib/components/QuestionCard.svelte';
	import Stepper from '$lib/components/Stepper.svelte';
	import FairwayPad from '$lib/components/FairwayPad.svelte';
	import ReviewCard from '$lib/components/ReviewCard.svelte';

	interface Props {
		round: ApiRoundDetail;
		holeNumber: number;
		par: number;
		existing?: ApiScoring;
	}

	// This component is mounted under {#key holeNumber} in the page, so a fresh
	// instance (and fresh state) is created for every hole — the reason all the
	// $state below can safely initialize from props.
	let { round, holeNumber, par, existing }: Props = $props();

	// round is constant for this keyed instance, so capturing its id here is correct.
	// svelte-ignore state_referenced_locally
	const hubHref = resolve('/rounds/[id]', { id: round.id });

	// Prefill when re-scoring so the flow opens on review, ready to edit.
	// svelte-ignore state_referenced_locally
	let answers = $state<HoleAnswers>(existing ? answersFromFacts(par, existing) : {});
	// Steps already completed, so Back can undo one screen at a time.
	// svelte-ignore state_referenced_locally
	let history = $state<ScoringStep[]>(existing ? stepsFor(par, answers) : []);

	let saving = $state(false);
	let errors = $state<string[]>([]);

	// Working values for the two steppers, committed to `answers` on Next.
	// svelte-ignore state_referenced_locally
	let scoreDraft = $state(existing?.strokes ?? par);
	// svelte-ignore state_referenced_locally
	let puttsDraft = $state(existing?.putts ?? 2);

	const step = $derived(currentStep(par, answers));

	function stepsFor(p: number, a: HoleAnswers): ScoringStep[] {
		const steps: ScoringStep[] = [];
		if (a.strokes !== undefined && a.putts !== undefined) steps.push('score_putts');
		if (p !== 3 && a.fairwayHit !== undefined) steps.push('fairway');
		return steps;
	}

	function commit(completed: ScoringStep, patch: Partial<HoleAnswers>) {
		answers = { ...answers, ...patch };
		history = [...history, completed];
		errors = [];
	}

	function back() {
		const last = history[history.length - 1];
		if (!last) {
			goto(hubHref);
			return;
		}
		history = history.slice(0, -1);
		const next = { ...answers };
		if (last === 'score_putts') {
			delete next.strokes;
			delete next.putts;
		} else if (last === 'fairway') {
			delete next.fairwayHit;
		}
		answers = next;
		errors = [];
		// Drafts persist, so the reopened score+putts screen shows the prior values.
	}

	function commitScorePutts() {
		commit('score_putts', { strokes: scoreDraft, putts: puttsDraft });
	}

	// Putts can't exceed the score minus the tee shot. Since both steppers share
	// the screen, clamp the putts draft down live whenever the score drops.
	$effect(() => {
		const cap = maxPutts(scoreDraft);
		if (puttsDraft > cap) puttsDraft = Math.max(0, cap);
	});

	async function save() {
		saving = true;
		errors = [];
		try {
			const facts = toScoringFacts(par, answers);
			await apiFetch(fetch, `/api/rounds/${round.id}/scores`, {
				method: 'POST',
				body: { holeNumber, ...facts }
			});
			// Scoring a hole for the first time advances to the next hole (play-through);
			// re-scoring an already-scored hole, or finishing the last hole, returns to
			// the hub. Driven by round data, so it works however the hole was opened.
			const isReScore = existing != null;
			if (!isReScore && holeNumber < round.holeCount) {
				const nextHref = resolve('/rounds/[id]/holes/[n]', {
					id: round.id,
					n: String(holeNumber + 1)
				});
				await goto(nextHref, { invalidateAll: true });
			} else {
				await goto(hubHref, { invalidateAll: true });
			}
		} catch (err) {
			errors =
				err instanceof ApiError
					? err.errors.length > 0
						? err.errors
						: [err.message]
					: ['Something went wrong — please try again'];
		} finally {
			saving = false;
		}
	}
</script>

{#if step === 'score_putts'}
	<QuestionCard {holeNumber} {par} onBack={back}>
		<div class="score-putts-group">
			<div class="score-putts">
				<div class="field">
					<span class="field-title">Score</span>
					<Stepper bind:value={scoreDraft} min={1} label="Score" />
				</div>
				<div class="field">
					<span class="field-title">Putts</span>
					<Stepper bind:value={puttsDraft} min={0} max={maxPutts(scoreDraft)} label="Putts" />
				</div>
			</div>
			<button type="button" class="next" onclick={commitScorePutts}>Next</button>
		</div>
	</QuestionCard>
{:else if step === 'fairway'}
	<QuestionCard question="Fairway Hit?" {holeNumber} {par} onBack={back}>
		<FairwayPad
			selected={answers.fairwayHit}
			onSelect={(v: FairwayHit) => commit('fairway', { fairwayHit: v })}
		/>
	</QuestionCard>
{:else}
	<ReviewCard
		{holeNumber}
		{par}
		facts={toScoringFacts(par, answers)}
		{saving}
		{errors}
		onSave={save}
		onBack={back}
	/>
{/if}

<style>
	.score-putts-group {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		width: fit-content;
		margin: 0 auto;
	}

	.score-putts {
		display: flex;
		justify-content: center;
		gap: 3.5rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.field-title {
		font-weight: 600;
		font-size: 1.4rem;
	}

	.next {
		display: block;
		width: 100%;
		margin-top: 1.5rem;
		padding: 0.85rem;
		background: #1a7a3a;
		color: #fff;
		border: none;
		border-radius: 0.5rem;
		font: inherit;
		font-size: 1.05rem;
		font-weight: 600;
		cursor: pointer;
	}
</style>
