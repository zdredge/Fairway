// Tracks "the in-progress round the user is currently playing" — the last
// in-progress round they opened. Persisted to localStorage so it survives a
// reload (app backgrounded/reopened, possibly offline). Plain Svelte store,
// browser-guarded, mirroring status.ts. Drives the global "Resume round" pill.
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface ActiveRound {
	id: string;
	courseName: string;
}

const KEY = 'fairway:active-round';

function load(): ActiveRound | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as ActiveRound) : null;
	} catch {
		return null;
	}
}

export const activeRound = writable<ActiveRound | null>(load());

export function setActiveRound(round: ActiveRound): void {
	if (!browser) return;
	activeRound.set(round);
	try {
		localStorage.setItem(KEY, JSON.stringify(round));
	} catch {
		// Storage unavailable (private mode / quota) — the in-memory store still works.
	}
}

export function clearActiveRound(): void {
	if (!browser) return;
	activeRound.set(null);
	try {
		localStorage.removeItem(KEY);
	} catch {
		// ignore
	}
}

/** Clear only when the active round matches — e.g. the round just completed. */
export function clearActiveRoundIf(id: string): void {
	if (!browser) return;
	activeRound.update((current) => {
		if (current?.id !== id) return current;
		try {
			localStorage.removeItem(KEY);
		} catch {
			// ignore
		}
		return null;
	});
}
