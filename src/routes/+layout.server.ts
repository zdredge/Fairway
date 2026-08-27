import type { LayoutServerLoad } from './$types';

// Just exposes the signed-in user to the layout. The auth redirect lives in
// hooks.server.ts so this load has no `url` dependency and SvelteKit can reuse
// it across client navigations (no per-navigation fetch → works offline).
export const load: LayoutServerLoad = async ({ locals }) => {
	return { user: locals.user };
};
