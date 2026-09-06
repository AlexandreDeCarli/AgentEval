import { AiUsageEvent } from '../types';
import { fileStorage } from '../utils/fileStorage';

const DATABASE_NAME = 'agenteval-ai-usage';
const STORE_NAME = 'events';
const LEGACY_STORAGE_KEY = 'agent-qa-ai-usage';

export interface AiUsageRepository {
    load: () => Promise<AiUsageEvent[]>;
    append: (event: AiUsageEvent) => Promise<void>;
    clear: () => Promise<void>;
}

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
    new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    });

const transactionComplete = (transaction: IDBTransaction): Promise<void> =>
    new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
        transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
    });

const parseLegacyEvents = (raw: string | null): AiUsageEvent[] => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as { state?: { events?: unknown } };
        return Array.isArray(parsed.state?.events) ? parsed.state.events as AiUsageEvent[] : [];
    } catch {
        return [];
    }
};

const createLegacyRepository = (): AiUsageRepository => ({
    load: async () => parseLegacyEvents(await fileStorage.getItem(LEGACY_STORAGE_KEY)),
    append: async (event) => {
        const events = parseLegacyEvents(await fileStorage.getItem(LEGACY_STORAGE_KEY));
        await fileStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ state: { events: [event, ...events] }, version: 1 }));
    },
    clear: async () => {
        await fileStorage.removeItem(LEGACY_STORAGE_KEY);
    },
});

export const createAiUsageRepository = (
    databaseFactory: IDBFactory | null = typeof indexedDB === 'undefined' ? null : indexedDB
): AiUsageRepository => {
    if (!databaseFactory) return createLegacyRepository();

    let databasePromise: Promise<IDBDatabase> | null = null;
    const openDatabase = () => {
        if (databasePromise) return databasePromise;
        databasePromise = new Promise((resolve, reject) => {
            const request = databaseFactory.open(DATABASE_NAME, 1);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('occurredAt', 'occurredAt');
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                databasePromise = null;
                reject(request.error || new Error('Unable to open AI usage database'));
            };
        });
        return databasePromise;
    };

    return {
        load: async () => {
            const database = await openDatabase();
            const transaction = database.transaction(STORE_NAME, 'readonly');
            const completed = transactionComplete(transaction);
            const events = await requestResult(transaction.objectStore(STORE_NAME).getAll()) as AiUsageEvent[];
            await completed;
            if (events.length > 0) return events.sort((left, right) => right.occurredAt - left.occurredAt);

            const legacyEvents = parseLegacyEvents(await fileStorage.getItem(LEGACY_STORAGE_KEY));
            if (legacyEvents.length === 0) return [];
            const migration = database.transaction(STORE_NAME, 'readwrite');
            const migrationCompleted = transactionComplete(migration);
            const store = migration.objectStore(STORE_NAME);
            legacyEvents.forEach((event) => store.put(event));
            await migrationCompleted;
            await fileStorage.removeItem(LEGACY_STORAGE_KEY);
            return legacyEvents.sort((left, right) => right.occurredAt - left.occurredAt);
        },
        append: async (event) => {
            const database = await openDatabase();
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const completed = transactionComplete(transaction);
            transaction.objectStore(STORE_NAME).put(event);
            await completed;
        },
        clear: async () => {
            const database = await openDatabase();
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const completed = transactionComplete(transaction);
            transaction.objectStore(STORE_NAME).clear();
            await completed;
            await fileStorage.removeItem(LEGACY_STORAGE_KEY);
        },
    };
};
