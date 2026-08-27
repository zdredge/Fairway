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
		// A hard load of a never-cached page: return a small HTML shell, not the
		// API JSON below (a browser would render that JSON as raw page text).
		// In-app client-side navigations don't hit this — their data fetch gets the
		// JSON 503 and the page's load renders its own offline state.
		if (request.mode === 'navigate') {
			return new Response(OFFLINE_HTML, {
				status: 503,
				headers: { 'content-type': 'text/html; charset=utf-8' }
			});
		}
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

// Minimal, self-contained page shown when a never-before-seen route is opened
// (or hard-refreshed) with no connection. Reconnecting + Retry loads the app,
// after which in-app navigation works offline against the cache.
const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Offline · Fairway</title>
<style>
	body { margin: 0; min-height: 100vh; display: grid; place-items: center;
		font-family: system-ui, sans-serif; color: #222; background: #fff; padding: 1.5rem; }
	.card { max-width: 22rem; text-align: center; }
	h1 { color: #1a7a3a; font-size: 1.35rem; margin: 0 0 0.5rem; }
	p { color: #555; line-height: 1.5; margin: 0 0 1.25rem; }
	button { font: inherit; font-weight: 600; color: #fff; background: #1a7a3a;
		border: none; border-radius: 0.5rem; padding: 0.6rem 1.1rem; cursor: pointer; }
</style>
</head>
<body>
	<div class="card">
		<h1>You're offline</h1>
		<p>This page hasn't been loaded before, so it isn't available offline yet.
		Reconnect and try again — pages you've already visited stay available.</p>
		<button onclick="location.reload()">Retry</button>
	</div>
</body>
</html>`;

export {};
