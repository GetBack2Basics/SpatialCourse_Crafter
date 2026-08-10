// Offline Storage Service wrapping IndexedDB for device-first offline capability
// Stores the active course and pending submissions that haven't been synced to the cloud yet.

const DB_NAME = 'spatial_course_offline_db';
const DB_VERSION = 1;
const STORE_SUBMISSIONS = 'submissions';
const STORE_COURSE = 'active_course';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_SUBMISSIONS)) {
        db.createObjectStore(STORE_SUBMISSIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_COURSE)) {
        db.createObjectStore(STORE_COURSE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

class OfflineStorage {
  async saveCourse(course) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_COURSE, 'readwrite');
      tx.objectStore(STORE_COURSE).put({ id: 'active', ...course });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getActiveCourse() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_COURSE, 'readonly');
      const req = tx.objectStore(STORE_COURSE).get('active');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveSubmission(submission) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SUBMISSIONS, 'readwrite');
      tx.objectStore(STORE_SUBMISSIONS).put({ ...submission, id: submission.id || Date.now().toString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPendingSubmissions() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SUBMISSIONS, 'readonly');
      const req = tx.objectStore(STORE_SUBMISSIONS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async clearPendingSubmissions() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SUBMISSIONS, 'readwrite');
      tx.objectStore(STORE_SUBMISSIONS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();
