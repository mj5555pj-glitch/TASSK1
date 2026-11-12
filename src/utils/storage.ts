import { User, MaintenanceTask, CleanupLog } from '../types';
import { isTaskOlderThanOneWeek, calculateDurationSeconds, formatDurationArabic, SEVEN_DAYS_MS } from './time';

const USERS_STORAGE_KEY = 'isp_users_v2';
const TASKS_STORAGE_KEY = 'isp_maintenance_tasks_v2';
const CLEANUP_LOGS_KEY = 'isp_cleanup_logs_v2';
const CURRENT_USER_KEY = 'isp_current_user_v2';

// Seed default users
export const DEFAULT_USERS: User[] = [
  {
    id: 'user_admin',
    username: 'admin',
    password: '123',
    fullName: 'المهندس أحمد العلي',
    role: 'manager',
    phone: '07701234567',
    specialty: 'إدارة العمليات وتوجيه الفنيين',
    status: 'available',
  },
  {
    id: 'user_tech1',
    username: 'tech1',
    password: '123',
    fullName: 'عمر الصالح',
    role: 'technician',
    phone: '07712345678',
    specialty: 'ألياف ضوئية وكوابل فايبر FTTH',
    status: 'available',
  },
  {
    id: 'user_tech2',
    username: 'tech2',
    password: '123',
    fullName: 'يوسف النجار',
    role: 'technician',
    phone: '07723456789',
    specialty: 'برمجة راوترات وتوزيع شبكات Wi-Fi',
    status: 'available',
  },
  {
    id: 'user_tech3',
    username: 'tech3',
    password: '123',
    fullName: 'كمال حسن',
    role: 'technician',
    phone: '07734567890',
    specialty: 'صيانة أبراج وبث إشارة نانوستيشن',
    status: 'available',
  },
];

// Initial tasks: returns empty array (no demo tasks)
export function getInitialTasks(): MaintenanceTask[] {
  return [];
}

// Broadcast channel for multi-tab synchronization
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('isp_tasks_sync_channel');
  }
} catch {
  // Fallback
}

export function notifyTaskSync(type: string, payload?: unknown) {
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type, payload, timestamp: Date.now() });
    }
  } catch {
    // Ignore
  }
}

export function subscribeToTaskSync(callback: (event: { type: string; payload?: unknown }) => void): () => void {
  if (!broadcastChannel) {
    // Fallback using storage event
    const handler = (e: StorageEvent) => {
      if (e.key === TASKS_STORAGE_KEY) {
        callback({ type: 'TASKS_UPDATED' });
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }

  const handler = (event: MessageEvent) => {
    callback(event.data);
  };
  broadcastChannel.addEventListener('message', handler);
  return () => {
    broadcastChannel?.removeEventListener('message', handler);
  };
}

/**
 * Get all users
 */
export function getUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USERS;
  }
}

/**
 * Get currently logged-in user
 */
export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Set current user
 */
export function setCurrentUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch {
    // Ignore
  }
}

/**
 * Load tasks with automatic 7-day retention purge
 */
export function getTasks(): MaintenanceTask[] {
  try {
    let tasks: MaintenanceTask[] = [];
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) {
      tasks = getInitialTasks();
      saveTasks(tasks);
      return tasks;
    } else {
      tasks = JSON.parse(raw);
    }

    // Strip demo tasks and auto-clean tasks older than 7 days
    const DEMO_TASK_IDS = ['tsk_101', 'tsk_102', 'tsk_103', 'tsk_104'];
    const now = Date.now();
    const validTasks = tasks.filter((task) => 
      !DEMO_TASK_IDS.includes(task.id) && 
      !isTaskOlderThanOneWeek(task.createdAt, now)
    );

    if (validTasks.length !== tasks.length) {
      saveTasks(validTasks);
      return validTasks;
    }

    return tasks;
  } catch {
    return getInitialTasks();
  }
}

/**
 * Save tasks to storage and trigger broadcast
 */
export function saveTasks(tasks: MaintenanceTask[]): void {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Ignore
  }
}

/**
 * Record automated or manual cleanup action
 */
export function recordCleanupLog(deletedCount: number): void {
  try {
    const raw = localStorage.getItem(CLEANUP_LOGS_KEY);
    const logs: CleanupLog[] = raw ? JSON.parse(raw) : [];
    logs.unshift({
      timestamp: new Date().toISOString(),
      deletedCount,
    });
    localStorage.setItem(CLEANUP_LOGS_KEY, JSON.stringify(logs.slice(0, 20)));
  } catch {
    // Ignore
  }
}

/**
 * Add a new maintenance task (Sent by Manager)
 */
export function addTask(newTaskData: {
  taskType: import('../types').AllowedTaskType;
  subscriberName: string;
  phone: string;
  notes: string;
  assignedToId: string;
  assignedToName: string;
  createdBy: string;
}): MaintenanceTask {
  const tasks = getTasks();
  const now = new Date();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  
  const newTask: MaintenanceTask = {
    id: `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    taskNumber: `#TSK-${randomNum}`,
    taskType: newTaskData.taskType,
    subscriberName: newTaskData.subscriberName.trim(),
    phone: newTaskData.phone.trim(),
    notes: newTaskData.notes.trim(),
    assignedToId: newTaskData.assignedToId,
    assignedToName: newTaskData.assignedToName,
    createdBy: newTaskData.createdBy,
    createdAt: now.toISOString(),
    acceptedAt: null,
    completedAt: null,
    durationSeconds: null,
    durationFormatted: null,
    expiresAt: new Date(now.getTime() + SEVEN_DAYS_MS).toISOString(),
    status: 'pending',
  };

  const updatedTasks = [newTask, ...tasks];
  saveTasks(updatedTasks);
  notifyTaskSync('TASK_ADDED', newTask);
  return newTask;
}

/**
 * Technician accepts a task (Records accept time)
 */
export function acceptTask(taskId: string): MaintenanceTask | null {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  const nowIso = new Date().toISOString();
  tasks[index] = {
    ...tasks[index],
    acceptedAt: nowIso,
  };

  saveTasks(tasks);
  notifyTaskSync('TASK_ACCEPTED', tasks[index]);
  return tasks[index];
}

/**
 * Technician completes a task (Records complete time & duration)
 */
export function completeTask(taskId: string, completionNotes?: string): MaintenanceTask | null {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  const now = new Date();
  const completedAtIso = now.toISOString();
  
  // Calculate duration between acceptedAt (or createdAt if accepted wasn't set) and completedAt
  const startIso = tasks[index].acceptedAt || tasks[index].createdAt;
  const durationSecs = calculateDurationSeconds(startIso, completedAtIso);
  const formattedDuration = formatDurationArabic(durationSecs);

  tasks[index] = {
    ...tasks[index],
    completedAt: completedAtIso,
    durationSeconds: durationSecs,
    durationFormatted: formattedDuration,
    completionNotes: completionNotes?.trim() || undefined,
  };

  saveTasks(tasks);
  notifyTaskSync('TASK_COMPLETED', tasks[index]);
  return tasks[index];
}

/**
 * Delete a single task (Manager option)
 */
export function deleteTask(taskId: string): void {
  const tasks = getTasks();
  const filtered = tasks.filter((t) => t.id !== taskId);
  saveTasks(filtered);
  notifyTaskSync('TASK_DELETED', { taskId });
}

/**
 * Manually purge all tasks older than 7 days
 */
export function purgeTasksOlderThanOneWeek(): number {
  const tasks = getTasks();
  const now = Date.now();
  const kept = tasks.filter((t) => !isTaskOlderThanOneWeek(t.createdAt, now));
  const purgedCount = tasks.length - kept.length;
  
  if (purgedCount > 0) {
    saveTasks(kept);
    recordCleanupLog(purgedCount);
    notifyTaskSync('TASKS_CLEANED', { removedCount: purgedCount });
  }
  return purgedCount;
}

/**
 * Reset demo data if user wants to start fresh
 */
export function resetDemoData(): void {
  const initial = getInitialTasks();
  saveTasks(initial);
  notifyTaskSync('TASKS_RESET');
}
