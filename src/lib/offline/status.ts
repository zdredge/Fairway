// App-wide offline/connection status for the UI indicator. Plain Svelte stores
// (not runes) so this is a normal importable module. Client-only — the values
// are seeded to a sensible "online, nothing pending" default during SSR.
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { pendingCount } from './outbox';

/** Whether the browser currently reports a network connection. */
export const online = writable(browser ? navigator.onLine : true);

/** How many writes are still queued in the offline outbox. */
export const pending = writable(0);

/** Re-read the outbox size into the `pending` store. Safe to call anytime. */
export async function refreshPending(): Promise<void> {
	if (!browser) return;
	try {
		pending.set(await pendingCount());
	} catch {
		// IndexedDB unavailable (e.g. private mode) — leave the last known value.
	}
}

let started = false;

/** Wire up online/offline listeners once and seed the initial counts. */
export function initOfflineStatus(): void {
	if (!browser || started) return;
	started = true;
	online.set(navigator.onLine);
	window.addEventListener('online', () => online.set(true));
	window.addEventListener('offline', () => online.set(false));
	void refreshPending();
}
