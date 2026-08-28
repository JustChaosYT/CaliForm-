import { WorkoutSession, Routine } from '../types/workout';
import { PRESET_ROUTINES } from '../data/calisthenicsLibrary';

const DB_NAME = 'CalisthenicsCoachDB';
const DB_VERSION = 1;
const WORKOUT_STORE = 'workout_sessions';
const ROUTINE_STORE = 'custom_routines';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(WORKOUT_STORE)) {
        db.createObjectStore(WORKOUT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(ROUTINE_STORE)) {
        db.createObjectStore(ROUTINE_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveWorkoutSession(session: WorkoutSession): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(WORKOUT_STORE, 'readwrite');
    const store = tx.objectStore(WORKOUT_STORE);

    // Save with blob preserved in IndexedDB
    await new Promise<void>((resolve, reject) => {
      const req = store.put(session);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to save workout to IndexedDB:', e);
  }
}

export async function getAllWorkoutSessions(): Promise<WorkoutSession[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(WORKOUT_STORE, 'readonly');
    const store = tx.objectStore(WORKOUT_STORE);

    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const sessions: WorkoutSession[] = req.result || [];
        // Restore Blob URLs if blob is present
        sessions.forEach((s) => {
          if (s.recordedVideoBlob && !s.recordedVideoBlobUrl) {
            s.recordedVideoBlobUrl = URL.createObjectURL(s.recordedVideoBlob);
          }
        });
        // Sort newest first
        resolve(sessions.sort((a, b) => b.startTime - a.startTime));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to fetch workouts from IndexedDB:', e);
    return [];
  }
}

export async function getWorkoutSessionById(id: string): Promise<WorkoutSession | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(WORKOUT_STORE, 'readonly');
    const store = tx.objectStore(WORKOUT_STORE);

    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const session: WorkoutSession = req.result;
        if (session && session.recordedVideoBlob && !session.recordedVideoBlobUrl) {
          session.recordedVideoBlobUrl = URL.createObjectURL(session.recordedVideoBlob);
        }
        resolve(session || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to get workout from IndexedDB:', e);
    return null;
  }
}

export async function deleteWorkoutSession(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(WORKOUT_STORE, 'readwrite');
    const store = tx.objectStore(WORKOUT_STORE);

    await new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to delete workout:', e);
  }
}

// --- Custom Routines Storage ---
export async function getSavedRoutines(): Promise<Routine[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(ROUTINE_STORE, 'readonly');
    const store = tx.objectStore(ROUTINE_STORE);

    const customRoutines = await new Promise<Routine[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    return [...PRESET_ROUTINES, ...customRoutines];
  } catch (e) {
    console.error('Failed to load routines:', e);
    return PRESET_ROUTINES;
  }
}

export async function saveCustomRoutine(routine: Routine): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(ROUTINE_STORE, 'readwrite');
    const store = tx.objectStore(ROUTINE_STORE);

    await new Promise<void>((resolve, reject) => {
      const req = store.put(routine);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to save routine:', e);
  }
}

export async function deleteCustomRoutine(routineId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(ROUTINE_STORE, 'readwrite');
    const store = tx.objectStore(ROUTINE_STORE);

    await new Promise<void>((resolve, reject) => {
      const req = store.delete(routineId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to delete routine:', e);
  }
}
