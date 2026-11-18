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
  runTransaction,
  Unsubscribe
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { MaintenanceTask, AllowedTaskType, DeductionSettings, DeductionRecord, DeductionReason } from './types';
import { SEVEN_DAYS_MS, isTaskOlderThanOneWeek, calculateDurationSeconds, formatDurationArabic } from './utils/time';
import { DEFAULT_DEDUCTION_SETTINGS } from './utils/deductions';
import { isDemoTechnicianUser } from './utils/storage';

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
  deductionExempt?: boolean;
  deductionExemptReason?: string;
}): Promise<MaintenanceTask> {
  const now = new Date();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const taskId = `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const isBroadcast = taskData.assignedToId === 'all' || !taskData.assignedToId;

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
    originallyBroadcast: isBroadcast,
    deductionExempt: !!taskData.deductionExempt,
    deductionExemptReason: taskData.deductionExemptReason || '',
    acceptDeductionApplied: false,
    acceptDeductionAmount: 0,
    completionDeductionApplied: false,
    completionDeductionAmount: 0,
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
 * Permanently purge any leftover demo technician accounts from Firestore
 */
export async function purgeAllDemoTechnicians(): Promise<number> {
  let purgedCount = 0;
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as import('./types').User;
      const candidate = { ...data, id: docSnap.id };
      if (isDemoTechnicianUser(candidate)) {
        await deleteDoc(doc(db, USERS_COLLECTION, docSnap.id));
        purgedCount++;
      }
    }
  } catch (err) {
    console.warn('Error purging demo technicians:', err);
  }
  return purgedCount;
}

/**
 * Subscribe to users / technicians collection in Firestore with automatic demo technician cleanup
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
        // Seed manager bootstrap account only (no demo technicians)
        onUpdate(DEFAULT_USERS);

        try {
          for (const u of DEFAULT_USERS) {
            await setDoc(doc(db, USERS_COLLECTION, u.id), u);
          }
        } catch (e) {
          console.warn('Could not seed default manager to Firestore:', e);
        }
        return;
      }

      const users: import('./types').User[] = [];
      snapshot.forEach((docSnap) => {
        const userData = {
          ...(docSnap.data() as import('./types').User),
          id: docSnap.id,
        };

        // Permanently exclude and clean up any leftover demo technicians
        if (isDemoTechnicianUser(userData)) {
          deleteDoc(doc(db, USERS_COLLECTION, docSnap.id)).catch(() => {});
          return;
        }

        users.push(userData);
      });

      // Always guarantee at least one manager account exists
      const hasManager = users.some((u) => u.role === 'manager' || u.id === 'user_admin');
      if (!hasManager && DEFAULT_USERS.length > 0) {
        users.unshift(DEFAULT_USERS[0]);
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
  technician?: { id: string; fullName: string },
  options?: { deductionExempt?: boolean; deductionExemptReason?: string }
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
    if (options?.deductionExempt) {
      updatePayload.deductionExempt = true;
      updatePayload.deductionExemptReason =
        options.deductionExemptReason || 'مهمة إضافية — يُطبق الخصم على المهمة الأولى فقط';
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
      originallyBroadcast: true,
      // Reset createdAt slightly or bump timestamp so all tech push notifications trigger anew
      lastBroadcastAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${TASKS_COLLECTION}/${taskId}`);
  }
}

/**
 * Pause a task temporarily in Firebase, saving accumulated working seconds
 */
export async function pauseTaskInFirebase(
  task: MaintenanceTask,
  pauseReason?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const activeStartIso = task.resumedAt || task.acceptedAt || task.createdAt;
  const currentSegmentSecs = calculateDurationSeconds(activeStartIso, nowIso);
  const totalAccumulated = (task.accumulatedSeconds || 0) + currentSegmentSecs;

  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, task.id);
    await updateDoc(taskDocRef, {
      status: 'paused',
      pausedAt: nowIso,
      pauseReason: pauseReason?.trim() || '',
      accumulatedSeconds: totalAccumulated,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${TASKS_COLLECTION}/${task.id}`);
  }
}

/**
 * Suspend (put on hold) an accepted task and move it to the "المهام المعلقة" queue
 */
export async function suspendTaskInFirebase(
  task: MaintenanceTask,
  suspendReason?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const activeStartIso = task.resumedAt || task.acceptedAt || task.createdAt;
  const currentSegmentSecs = calculateDurationSeconds(activeStartIso, nowIso);
  const totalAccumulated = (task.accumulatedSeconds || 0) + currentSegmentSecs;

  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, task.id);
    await updateDoc(taskDocRef, {
      status: 'suspended',
      suspendedAt: nowIso,
      suspendReason: suspendReason?.trim() || '',
      accumulatedSeconds: totalAccumulated,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${TASKS_COLLECTION}/${task.id}`);
  }
}

/**
 * Resume a paused or suspended task in Firebase
 */
export async function resumeTaskInFirebase(taskId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskDocRef, {
      status: 'in_progress',
      resumedAt: nowIso,
      pausedAt: null,
      suspendedAt: null,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${TASKS_COLLECTION}/${taskId}`);
  }
}

/**
 * Complete task in Firebase (Records completed time, calculated duration across pauses/holds, and status to completed)
 */
export async function completeTaskInFirebase(
  task: MaintenanceTask,
  completionNotes?: string
): Promise<void> {
  const now = new Date();
  const completedAtIso = now.toISOString();

  let durationSecs = task.accumulatedSeconds || 0;
  if (task.status !== 'paused' && task.status !== 'suspended') {
    const startIso = task.resumedAt || task.acceptedAt || task.createdAt;
    durationSecs += calculateDurationSeconds(startIso, completedAtIso);
  }
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
 * Update task information or switch assigned technician in Firebase Firestore
 */
export async function updateTaskInFirebase(
  taskId: string,
  updates: Partial<MaintenanceTask>
): Promise<void> {
  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskDocRef, updates as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${TASKS_COLLECTION}/${taskId}`);
    throw error;
  }
}

/**
 * Resend an existing pending, paused, or suspended task to the selected technician(s) as a fresh pending dispatch
 */
export async function resendExistingTaskInFirebase(
  task: MaintenanceTask,
  overrides: {
    taskType: AllowedTaskType;
    subscriberName: string;
    phone: string;
    notes: string;
    assignedToId: string;
    assignedToName: string;
    deductionExempt?: boolean;
    deductionExemptReason?: string;
  }
): Promise<void> {
  const now = new Date();
  const nowIso = now.toISOString();
  const isBroadcast = overrides.assignedToId === 'all' || !overrides.assignedToId;

  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, task.id);
    await updateDoc(taskDocRef, {
      taskType: overrides.taskType,
      subscriberName: overrides.subscriberName.trim(),
      phone: overrides.phone.trim(),
      notes: overrides.notes.trim(),
      assignedToId: overrides.assignedToId,
      assignedToName: overrides.assignedToName,
      status: 'pending',
      createdAt: nowIso,
      lastBroadcastAt: nowIso,
      acceptedAt: null,
      pausedAt: null,
      suspendedAt: null,
      resumedAt: null,
      pauseReason: '',
      suspendReason: '',
      accumulatedSeconds: 0,
      completedAt: null,
      durationSeconds: null,
      durationFormatted: null,
      expiresAt: new Date(now.getTime() + SEVEN_DAYS_MS).toISOString(),
      resentCount: (task.resentCount || 0) + 1,
      originallyBroadcast: isBroadcast,
      deductionExempt: !!overrides.deductionExempt,
      deductionExemptReason: overrides.deductionExemptReason || '',
      acceptDeductionApplied: false,
      acceptDeductionAmount: 0,
      completionDeductionApplied: false,
      completionDeductionAmount: 0,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${TASKS_COLLECTION}/${task.id}`);
    throw error;
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

const SETTINGS_COLLECTION = 'settings';
const WHATSAPP_TEMPLATE_DOC_ID = 'whatsapp';
const WHATSAPP_TEMPLATE_LOCAL_KEY = 'isp_whatsapp_template_v1';

/**
 * Subscribe to the manager-configured global WhatsApp message template in Firestore
 */
export function subscribeToWhatsAppTemplate(
  onUpdate: (template: string) => void
): Unsubscribe {
  // Immediately load cached template if available
  try {
    const cached = localStorage.getItem(WHATSAPP_TEMPLATE_LOCAL_KEY);
    if (cached && cached.trim().length > 0) {
      onUpdate(cached);
    }
  } catch {
    // Ignore storage errors
  }

  const docRef = doc(db, SETTINGS_COLLECTION, WHATSAPP_TEMPLATE_DOC_ID);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as import('./types').WhatsAppTemplateSettings;
        if (typeof data.template === 'string' && data.template.trim().length > 0) {
          try {
            localStorage.setItem(WHATSAPP_TEMPLATE_LOCAL_KEY, data.template);
          } catch {
            // Ignore
          }
          onUpdate(data.template);
        }
      }
    },
    (error) => {
      console.warn('Could not subscribe to WhatsApp template settings:', error);
    }
  );
}

/**
 * Save manager-edited WhatsApp message template to Firestore
 */
export async function saveWhatsAppTemplateToFirebase(
  settings: import('./types').WhatsAppTemplateSettings
): Promise<void> {
  try {
    localStorage.setItem(WHATSAPP_TEMPLATE_LOCAL_KEY, settings.template);
  } catch {
    // Ignore
  }

  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, WHATSAPP_TEMPLATE_DOC_ID), settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${WHATSAPP_TEMPLATE_DOC_ID}`);
    throw error;
  }
}

const DEDUCTION_SETTINGS_DOC_ID = 'deductions';
const DEDUCTION_SETTINGS_LOCAL_KEY = 'isp_deduction_settings_v1';
const DEDUCTIONS_COLLECTION = 'deductions';

/**
 * Subscribe to the manager-configured deduction settings in Firestore
 */
export function subscribeToDeductionSettings(
  onUpdate: (settings: DeductionSettings) => void
): Unsubscribe {
  try {
    const cached = localStorage.getItem(DEDUCTION_SETTINGS_LOCAL_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as Partial<DeductionSettings>;
      onUpdate({ ...DEFAULT_DEDUCTION_SETTINGS, ...parsed });
    }
  } catch {
    // Ignore storage errors
  }

  const docRef = doc(db, SETTINGS_COLLECTION, DEDUCTION_SETTINGS_DOC_ID);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<DeductionSettings>;
        const merged: DeductionSettings = {
          enabled: typeof data.enabled === 'boolean' ? data.enabled : DEFAULT_DEDUCTION_SETTINGS.enabled,
          unitLabel: typeof data.unitLabel === 'string' && data.unitLabel.trim() ? data.unitLabel.trim() : DEFAULT_DEDUCTION_SETTINGS.unitLabel,
          acceptDelayMinutes: typeof data.acceptDelayMinutes === 'number' && data.acceptDelayMinutes >= 0 ? data.acceptDelayMinutes : DEFAULT_DEDUCTION_SETTINGS.acceptDelayMinutes,
          acceptDelayDeduction: typeof data.acceptDelayDeduction === 'number' && data.acceptDelayDeduction >= 0 ? data.acceptDelayDeduction : DEFAULT_DEDUCTION_SETTINGS.acceptDelayDeduction,
          completionDelayMinutes: typeof data.completionDelayMinutes === 'number' && data.completionDelayMinutes >= 0 ? data.completionDelayMinutes : DEFAULT_DEDUCTION_SETTINGS.completionDelayMinutes,
          completionDelayDeduction: typeof data.completionDelayDeduction === 'number' && data.completionDelayDeduction >= 0 ? data.completionDelayDeduction : DEFAULT_DEDUCTION_SETTINGS.completionDelayDeduction,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        };
        try {
          localStorage.setItem(DEDUCTION_SETTINGS_LOCAL_KEY, JSON.stringify(merged));
        } catch {
          // Ignore
        }
        onUpdate(merged);
      } else {
        onUpdate(DEFAULT_DEDUCTION_SETTINGS);
      }
    },
    (error) => {
      console.warn('Could not subscribe to deduction settings:', error);
    }
  );
}

/**
 * Save deduction rules settings to Firestore
 */
export async function saveDeductionSettingsToFirebase(
  settings: DeductionSettings
): Promise<void> {
  const payload: DeductionSettings = {
    enabled: !!settings.enabled,
    unitLabel: (settings.unitLabel || 'د.ع').trim().slice(0, 30),
    acceptDelayMinutes: Math.max(0, Number(settings.acceptDelayMinutes) || 0),
    acceptDelayDeduction: Math.max(0, Number(settings.acceptDelayDeduction) || 0),
    completionDelayMinutes: Math.max(0, Number(settings.completionDelayMinutes) || 0),
    completionDelayDeduction: Math.max(0, Number(settings.completionDelayDeduction) || 0),
    updatedAt: settings.updatedAt || new Date().toISOString(),
    updatedBy: settings.updatedBy || 'المدير',
  };

  try {
    localStorage.setItem(DEDUCTION_SETTINGS_LOCAL_KEY, JSON.stringify(payload));
  } catch {
    // Ignore
  }

  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, DEDUCTION_SETTINGS_DOC_ID), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${DEDUCTION_SETTINGS_DOC_ID}`);
    throw error;
  }
}

/**
 * Subscribe to real-time deduction ledger entries
 */
export function subscribeToDeductions(
  onUpdate: (records: DeductionRecord[]) => void
): Unsubscribe {
  const dedRef = collection(db, DEDUCTIONS_COLLECTION);
  const q = query(dedRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: DeductionRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as DeductionRecord;
        records.push({ ...data, id: docSnap.id });
      });
      onUpdate(records);
    },
    (error) => {
      console.error('Firestore deductions onSnapshot error:', error);
      handleFirestoreError(error, OperationType.GET, DEDUCTIONS_COLLECTION);
    }
  );
}

/**
 * Atomically apply a single delay deduction (accept or completion) on a task and increment the technician's deductionBalance.
 * Uses deterministic deduction document ID `${task.id}_${reason}` so duplicate deductions are impossible across clients.
 */
export async function applyTaskDeductionTransaction(params: {
  taskId: string;
  taskNumber: string;
  userId: string;
  userName: string;
  reason: DeductionReason;
  delayMinutes: number;
  allowedMinutes: number;
  amount: number;
  unitLabel: string;
  note?: string;
}): Promise<boolean> {
  if (params.amount <= 0 || !params.userId || params.userId === 'all') {
    return false;
  }

  const dedId = `${params.taskId}_${params.reason === 'accept_delay' ? 'accept' : 'complete'}`;
  const dedRef = doc(db, DEDUCTIONS_COLLECTION, dedId);
  const taskRef = doc(db, TASKS_COLLECTION, params.taskId);
  const userRef = doc(db, USERS_COLLECTION, params.userId);

  try {
    const applied = await runTransaction(db, async (transaction) => {
      const [dedSnap, taskSnap, userSnap] = await Promise.all([
        transaction.get(dedRef),
        transaction.get(taskRef),
        transaction.get(userRef),
      ]);

      if (dedSnap.exists()) {
        return false;
      }
      if (!taskSnap.exists()) {
        return false;
      }

      const taskData = taskSnap.data() as MaintenanceTask;
      if (taskData.deductionExempt) {
        return false;
      }
      if (params.reason === 'accept_delay' && taskData.acceptDeductionApplied) {
        return false;
      }
      if (params.reason === 'completion_delay' && taskData.completionDeductionApplied) {
        return false;
      }

      const newRecord: DeductionRecord = {
        id: dedId,
        userId: params.userId,
        userName: params.userName,
        taskId: params.taskId,
        taskNumber: params.taskNumber,
        reason: params.reason,
        delayMinutes: Math.max(0, Math.round(params.delayMinutes)),
        allowedMinutes: Math.max(0, Math.round(params.allowedMinutes)),
        amount: params.amount,
        unitLabel: params.unitLabel,
        createdAt: new Date().toISOString(),
        note: params.note || '',
      };

      transaction.set(dedRef, newRecord);

      if (params.reason === 'accept_delay') {
        transaction.update(taskRef, {
          acceptDeductionApplied: true,
          acceptDeductionAmount: params.amount,
        });
      } else {
        transaction.update(taskRef, {
          completionDeductionApplied: true,
          completionDeductionAmount: params.amount,
        });
      }

      if (userSnap.exists()) {
        const userData = userSnap.data() as import('./types').User;
        const currentBalance = typeof userData.deductionBalance === 'number' ? userData.deductionBalance : 0;
        transaction.update(userRef, {
          deductionBalance: Math.max(0, Number((currentBalance + params.amount).toFixed(2))),
        });
      }

      return true;
    });

    return applied;
  } catch (error) {
    console.warn('Could not apply task deduction transaction:', error);
    return false;
  }
}

/**
 * Waive (cancel) a specific deduction record and subtract its amount from the technician's deductionBalance.
 * Keeps the task's applied flag true with amount 0 so the automated check will not re-charge a waived deduction.
 */
export async function waiveDeductionRecordInFirebase(record: DeductionRecord): Promise<void> {
  const dedRef = doc(db, DEDUCTIONS_COLLECTION, record.id);
  const taskRef = doc(db, TASKS_COLLECTION, record.taskId);
  const userRef = doc(db, USERS_COLLECTION, record.userId);

  try {
    await runTransaction(db, async (transaction) => {
      const [dedSnap, taskSnap, userSnap] = await Promise.all([
        transaction.get(dedRef),
        transaction.get(taskRef),
        transaction.get(userRef),
      ]);

      if (dedSnap.exists()) {
        transaction.delete(dedRef);
      }

      if (taskSnap.exists()) {
        if (record.reason === 'accept_delay') {
          transaction.update(taskRef, {
            acceptDeductionApplied: true,
            acceptDeductionAmount: 0,
          });
        } else {
          transaction.update(taskRef, {
            completionDeductionApplied: true,
            completionDeductionAmount: 0,
          });
        }
      }

      if (userSnap.exists()) {
        const userData = userSnap.data() as import('./types').User;
        const currentBalance = typeof userData.deductionBalance === 'number' ? userData.deductionBalance : 0;
        const nextBalance = Math.max(0, Number((currentBalance - record.amount).toFixed(2)));
        transaction.update(userRef, {
          deductionBalance: nextBalance,
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${DEDUCTIONS_COLLECTION}/${record.id}`);
    throw error;
  }
}

/**
 * Reset an employee's deduction balance to 0 and clear their deduction records after settlement.
 */
export async function resetEmployeeDeductionBalanceInFirebase(
  userId: string,
  employeeRecords: DeductionRecord[]
): Promise<void> {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      deductionBalance: 0,
    });

    for (const rec of employeeRecords) {
      try {
        await deleteDoc(doc(db, DEDUCTIONS_COLLECTION, rec.id));
      } catch (e) {
        console.warn('Could not delete settled deduction record:', rec.id, e);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
    throw error;
  }
}


