import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const PUBLIC_PATHS = new Set(['/login', '/signup']);

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const isPublic = PUBLIC_PATHS.has(url.pathname);

	if (!locals.user && !isPublic) redirect(302, '/login');
	if (locals.user && isPublic) redirect(302, '/');

	return { user: locals.user };
};
