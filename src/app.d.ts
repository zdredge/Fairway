// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Error {
			message: string;
			/** Field-level validation problems, present on 400 responses. */
			errors?: string[];
		}
		interface Locals {
			user: import('$lib/server/db/schema').SafeUser | null;
			session: import('$lib/server/db/schema').Session | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
