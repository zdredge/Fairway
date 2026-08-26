// Minimal promisified IndexedDB wrapper for the offline outbox — one object
// store, string keys. `indexedDB` is only touched inside functions (never at
// import time) so this module is safe to import during SSR.

const DB_NAME = 'fairway';
const DB_VERSION = 1;
export const OUTBOX_STORE = 'outbox';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
	dbPromise ??= new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
				db.createObjectStore(OUTBOX_STORE, { keyPath: 'key' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
	return dbPromise;
}

function tx<T>(
	mode: IDBTransactionMode,
	run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
	return openDb().then(
		(db) =>
			new Promise<T>((resolve, reject) => {
				const store = db.transaction(OUTBOX_STORE, mode).objectStore(OUTBOX_STORE);
				const req = run(store);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			})
	);
}

export function idbPut<T>(value: T): Promise<IDBValidKey> {
	return tx('readwrite', (store) => store.put(value));
}

export function idbDelete(key: string): Promise<undefined> {
	return tx('readwrite', (store) => store.delete(key));
}

export function idbGetAll<T>(): Promise<T[]> {
	return tx<T[]>('readonly', (store) => store.getAll());
}
