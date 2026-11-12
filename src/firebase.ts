import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDocFromServer,
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { MaintenanceTask, AllowedTaskType } from './types';
import { SEVEN_DAYS_MS, isTaskOlderThanOneWeek, calculateDurationSeconds, formatDurationArabic } from './utils/time';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test Firestore connection on boot as mandated by SKILL.md
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline fallback active:', error.message);
    }
  }
}
testFirestoreConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initial default tasks: returns empty array (no demo tasks)
export function getInitialDefaultTasks(): MaintenanceTask[] {
  return [];
}

const TASKS_COLLECTION = 'tasks';

const DEMO_TASK_IDS = new Set(['tsk_101', 'tsk_102', 'tsk_103', 'tsk_104']);
const DEMO_SUBSCRIBERS = new Set(['حيدر عبد الرضا', 'سعد جاسم المحمداوي', 'مريم شاكر البصري', 'حسين علي التميمي']);

/**
 * Permanently purge all demo/sample tasks from Firestore
 */
export async function purgeAllDemoTasks(): Promise<number> {
  let purgedCount = 0;
  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const snapshot = await getDocs(tasksRef);
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as MaintenanceTask;
      if (DEMO_TASK_IDS.has(docSnap.id) || DEMO_SUBSCRIBERS.has(data.subscriberName)) {
        await deleteDoc(doc(db, TASKS_COLLECTION, docSnap.id));
        purgedCount++;
      }
    }
  } catch (err) {
    console.warn('Error purging demo tasks:', err);
  }
  return purgedCount;
}

/**
 * Subscribe to real-time updates from Firebase Firestore with 7-day auto-purge
 */
export function subscribeToFirestoreTasks(
  onUpdate: (tasks: MaintenanceTask[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const tasksRef = collection(db, TASKS_COLLECTION);
  const q = query(tasksRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    async (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }

      const tasks: MaintenanceTask[] = [];
      const expiredTaskIds: string[] = [];
      const now = Date.now();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as MaintenanceTask;

        // Auto-purge demo tasks if they exist in Firestore
        if (DEMO_TASK_IDS.has(docSnap.id) || DEMO_SUBSCRIBERS.has(data.subscriberName)) {
          deleteDoc(doc(db, TASKS_COLLECTION, docSnap.id)).catch(() => {});
          return;
        }

        const task: MaintenanceTask = {
          ...data,
          id: docSnap.id,
        };

        // Check 7-day retention rule: if older than 7 days, mark for auto-cleanup
        if (isTaskOlderThanOneWeek(task.createdAt, now)) {
          expiredTaskIds.push(task.id);
        } else {
          tasks.push(task);
        }
      });

      // Auto delete tasks older than 7 days from Firebase
      if (expiredTaskIds.length > 0) {
        for (const id of expiredTaskIds) {
          try {
            await deleteDoc(doc(db, TASKS_COLLECTION, id));
          } catch (e) {
            console.warn('Could not auto-delete expired task:', id, e);
          }
        }
      }

      onUpdate(tasks);
    },
    (error) => {
      console.error('Firestore onSnapshot error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, TASKS_COLLECTION);
    }
  );
}

/**
 * Add a new maintenance task to Firebase Firestore
 */
export async function addTaskToFirebase(taskData: {
  taskType: AllowedTaskType;
  subscriberName: string;
  phone: string;
  notes: string;
  assignedToId: string;
  assignedToName: string;
  createdBy: string;
}): Promise<MaintenanceTask> {
  const now = new Date();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const taskId = `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newTask: MaintenanceTask = {
    id: taskId,
    taskNumber: `#TSK-${randomNum}`,
    taskType: taskData.taskType,
    subscriberName: taskData.subscriberName.trim(),
    phone: taskData.phone.trim(),
    notes: taskData.notes.trim(),
    assignedToId: taskData.assignedToId,
    assignedToName: taskData.assignedToName,
    createdBy: taskData.createdBy,
    createdAt: now.toISOString(),
    acceptedAt: null,
    completedAt: null,
    durationSeconds: null,
    durationFormatted: null,
    expiresAt: new Date(now.getTime() + SEVEN_DAYS_MS).toISOString(),
    status: 'pending',
  };

  try {
    await setDoc(doc(db, TASKS_COLLECTION, taskId), newTask);
    return newTask;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${TASKS_COLLECTION}/${taskId}`);
    throw error;
  }
}

const USERS_COLLECTION = 'users';

/**
 * Subscribe to users / technicians collection in Firestore with robust fallback
 */
export function subscribeToFirestoreUsers(
  onUpdate: (users: import('./types').User[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const usersRef = collection(db, USERS_COLLECTION);

  return onSnapshot(
    usersRef,
    async (snapshot) => {
      const { DEFAULT_USERS } = await import('./utils/storage');

      if (snapshot.empty) {
        // Immediately provide default users so login NEVER fails
        onUpdate(DEFAULT_USERS);

        // Seed default users to Firestore
        try {
          for (const u of DEFAULT_USERS) {
            await setDoc(doc(db, USERS_COLLECTION, u.id), u);
          }
        } catch (e) {
          console.warn('Could not seed default users to Firestore:', e);
        }
        return;
      }

      const users: import('./types').User[] = [];
      snapshot.forEach((docSnap) => {
        users.push(docSnap.data() as import('./types').User);
      });

      // Always guarantee the manager account exists
      const hasAdmin = users.some((u) => u.username.toLowerCase() === 'admin');
      if (!hasAdmin && DEFAULT_USERS.length > 0) {
        users.unshift(DEFAULT_USERS[0]);
        // Also persist admin back to Firestore
        setDoc(doc(db, USERS_COLLECTION, DEFAULT_USERS[0].id), DEFAULT_USERS[0]).catch(() => {});
      }

      onUpdate(users);
    },
    (error) => {
      console.error('Firestore users onSnapshot error:', error);
      import('./utils/storage').then(({ DEFAULT_USERS }) => {
        onUpdate(DEFAULT_USERS);
      });
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, USERS_COLLECTION);
    }
  );
}

/**
 * Add or update user / technician account in Firestore
 */
export async function saveUserToFirebase(user: import('./types').User): Promise<void> {
  try {
    await setDoc(doc(db, USERS_COLLECTION, user.id), user, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${user.id}`);
    throw error;
  }
}

/**
 * Delete a user / technician from Firestore
 */
export async function deleteUserFromFirebase(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${USERS_COLLECTION}/${userId}`);
    throw error;
  }
}

/**
 * Accept task in Firebase (Records accept time and claims task for technician if it was assigned to all)
 */
export async function acceptTaskInFirebase(
  taskId: string,
  technician?: { id: string; fullName: string }
): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    const updatePayload: Record<string, unknown> = {
      acceptedAt: nowIso,
      status: 'in_progress',
    };
    if (technician) {
      updatePayload.assignedToId = technician.id;
      updatePayload.assignedToName = technician.fullName;
    }
    await updateDoc(taskDocRef, updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${TASKS_COLLECTION}/${taskId}`);
  }
}

/**
 * Reassigns an overdue or unaccepted task to ALL technicians in Firebase
 */
export async function reassignTaskToAllInFirebase(taskId: string): Promise<void> {
  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskDocRef, {
      assignedToId: 'all',
      assignedToName: 'الكل (أي فني متاح)',
      // Reset createdAt slightly or bump timestamp so all tech push notifications trigger anew
      lastBroadcastAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${TASKS_COLLECTION}/${taskId}`);
  }
}

/**
 * Complete task in Firebase (Records completed time, calculated duration, and status to completed)
 */
export async function completeTaskInFirebase(
  task: MaintenanceTask,
  completionNotes?: string
): Promise<void> {
  const now = new Date();
  const completedAtIso = now.toISOString();

  const startIso = task.acceptedAt || task.createdAt;
  const durationSecs = calculateDurationSeconds(startIso, completedAtIso);
  const formattedDuration = formatDurationArabic(durationSecs);

  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, task.id);
    await updateDoc(taskDocRef, {
      completedAt: completedAtIso,
      durationSeconds: durationSecs,
      durationFormatted: formattedDuration,
      completionNotes: completionNotes?.trim() || '',
      status: 'completed',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${TASKS_COLLECTION}/${task.id}`);
  }
}

/**
 * Delete a task from Firebase Firestore
 */
export async function deleteTaskFromFirebase(taskId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${TASKS_COLLECTION}/${taskId}`);
  }
}

/**
 * Purge tasks older than 7 days from Firebase
 */
export async function purgeExpiredTasksFromFirebase(tasks: MaintenanceTask[]): Promise<number> {
  const now = Date.now();
  let purgedCount = 0;

  for (const task of tasks) {
    if (isTaskOlderThanOneWeek(task.createdAt, now)) {
      try {
        await deleteDoc(doc(db, TASKS_COLLECTION, task.id));
        purgedCount++;
      } catch (e) {
        console.warn('Failed to delete expired task:', task.id, e);
      }
    }
  }

  return purgedCount;
}
