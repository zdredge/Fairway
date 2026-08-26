/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

// Offline support: precache the app shell (all built client chunks + static
// files) so client-side navigation works with no network, and runtime-cache
// API GETs and page navigations so previously-seen data/pages load offline.
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `fairway-cache-${version}`;
const PRECACHE = [...build, ...files];

sw.addEventListener('install', (event) => {
	// Cache each asset individually so one bad response can't abort the whole
	// install (unlike the atomic cache.addAll).
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return; // writes go through the app outbox, never the SW

	const url = new URL(request.url);
	if (url.origin !== location.origin) return;

	// Precached app-shell asset → cache-first.
	if (PRECACHE.includes(url.pathname)) {
		event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request)));
		return;
	}

	// Never cache auth responses.
	if (url.pathname.startsWith('/api/auth/')) return;

	// API GETs, SvelteKit data requests, and page navigations → network-first,
	// falling back to the last cache so previously-seen data/pages load offline.
	const isApi = url.pathname.startsWith('/api/');
	const isData = url.pathname.endsWith('__data.json');
	if (isApi || isData || request.mode === 'navigate') {
		event.respondWith(networkFirst(request));
	}
});

async function networkFirst(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE);
	try {
		const response = await fetch(request);
		if (response.ok) cache.put(request, response.clone());
		return response;
	} catch {
		// Offline. Serve the last-seen copy if we have one.
		const cached = await cache.match(request);
		if (cached) return cached;
		// Nothing cached: resolve with a synthetic 503 rather than letting the
		// rejection propagate out of respondWith(). A rejected FetchEvent surfaces
		// as an uncaught "TypeError: Failed to fetch" plus a console network error,
		// and turns any awaiting caller (a load's fetch) into an unhandled crash.
		// A real Response lets apiFetch throw a clean, catchable ApiError instead.
		return new Response(JSON.stringify({ message: 'You are offline.', offline: true }), {
			status: 503,
			headers: { 'content-type': 'application/json' }
		});
	}
}

export {};
