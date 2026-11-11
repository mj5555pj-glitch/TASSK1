import React, { useState, useEffect, useRef } from 'react';
import { User, MaintenanceTask, PageView, AllowedTaskType } from './types';
import { getUsers, getCurrentUser, setCurrentUser } from './utils/storage';
import { 
  subscribeToFirestoreTasks, 
  subscribeToFirestoreUsers,
  saveUserToFirebase,
  deleteUserFromFirebase,
  addTaskToFirebase, 
  acceptTaskInFirebase, 
  completeTaskInFirebase, 
  deleteTaskFromFirebase, 
  purgeExpiredTasksFromFirebase,
  reassignTaskToAllInFirebase 
} from './firebase';
import { playNewTaskAlertSound, playSuccessSound, playOverdueAlertSound } from './utils/audio';
import { sendDevicePushNotification, sendManagerOverdueNotification } from './utils/notifications';
import { isTaskUnacceptedOverdue, getElapsedMinutes } from './utils/time';
import { LoginScreen } from './components/LoginScreen';
import { Navbar } from './components/Navbar';
import { DispatchPage } from './components/DispatchPage';
import { MonitoringPage } from './components/MonitoringPage';
import { ArchivePage } from './components/ArchivePage';
import { TechnicianView } from './components/TechnicianView';
import { PushNotificationToast } from './components/PushNotificationToast';
import { WhatsAppPreviewModal } from './components/WhatsAppPreviewModal';
import { TechniciansManagementModal } from './components/TechniciansManagementModal';
import { ManagerOverdueModal } from './components/ManagerOverdueModal';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setLoggedUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [currentPage, setCurrentPage] = useState<PageView>('dispatch');
  const [isLoaded, setIsLoaded] = useState(false);
  const [activePushToastTask, setActivePushToastTask] = useState<MaintenanceTask | null>(null);
  const [whatsAppModalTask, setWhatsAppModalTask] = useState<MaintenanceTask | null>(null);
  const [showTechManagementModal, setShowTechManagementModal] = useState(false);
  const [dismissedOverdueTaskIds, setDismissedOverdueTaskIds] = useState<Set<string>>(new Set());

  const knownTaskIdsRef = useRef<Set<string>>(new Set());
  const alertedOverdueTaskIdsRef = useRef<Set<string>>(new Set());
  const isInitialSnapshotRef = useRef<boolean>(true);
  const currentUserRef = useRef<User | null>(null);

  // Keep ref synced for async callback
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Initialize users & session & live Firestore listeners
  useEffect(() => {
    const localUsers = getUsers();
    setUsers(localUsers);

    const saved = getCurrentUser();
    if (saved) {
      setLoggedUser(saved);
      currentUserRef.current = saved;
      if (saved.role === 'technician') {
        setCurrentPage('technician_queue');
      } else {
        setCurrentPage('dispatch');
      }
    }

    // Subscribe to Firestore users collection for real-time technician credentials & management
    const unsubUsers = subscribeToFirestoreUsers((loadedUsers) => {
      setUsers(loadedUsers);
      // Sync currentUser if credentials changed
      const active = currentUserRef.current;
      if (active) {
        const found = loadedUsers.find((u) => u.id === active.id);
        if (found) {
          setLoggedUser(found);
          setCurrentUser(found);
        }
      }
    });

    // Subscribe to Firebase Firestore real-time updates
    const unsubTasks = subscribeToFirestoreTasks((incomingTasks) => {
      setTasks(incomingTasks);
      setIsLoaded(true);

      const activeUser = currentUserRef.current;

      if (isInitialSnapshotRef.current) {
        incomingTasks.forEach((t) => knownTaskIdsRef.current.add(t.id));
        isInitialSnapshotRef.current = false;
      } else {
        const newDispatchedTasks = incomingTasks.filter(
          (t) => !knownTaskIdsRef.current.has(t.id) && (t.status === 'pending' || !t.acceptedAt)
        );

        if (newDispatchedTasks.length > 0) {
          newDispatchedTasks.forEach((task) => {
            knownTaskIdsRef.current.add(task.id);

            // If user is a technician and task is assigned to them (or open to all)
            if (activeUser && activeUser.role === 'technician') {
              const isForThisTech = 
                task.assignedToId === activeUser.id || 
                task.assignedToId === 'all' || 
                !task.assignedToId;

              if (isForThisTech) {
                // Device Push Notification + Audio Chime + Vibration
                sendDevicePushNotification(task, () => {
                  setCurrentPage('technician_queue');
                });

                // In-App Notification Toast
                setActivePushToastTask(task);
              }
            } else if (activeUser && activeUser.role === 'manager') {
              playNewTaskAlertSound();
            }
          });
        }
      }
    });

    return () => {
      unsubUsers();
      unsubTasks();
    };
  }, []);

  // Automatic 15-minute alert engine for Manager when a task remains unaccepted
  useEffect(() => {
    const checkOverdueTasks = () => {
      const activeUser = currentUserRef.current;
      if (!activeUser || activeUser.role !== 'manager') return;

      const now = Date.now();
      const overdueTasks = tasks.filter(
        (t) =>
          (t.status === 'pending' || (!t.acceptedAt && !t.completedAt)) &&
          isTaskUnacceptedOverdue(t.createdAt, 15, now)
      );

      overdueTasks.forEach((task) => {
        if (!alertedOverdueTaskIdsRef.current.has(task.id)) {
          alertedOverdueTaskIdsRef.current.add(task.id);
          const mins = getElapsedMinutes(task.createdAt, now);
          // Play urgent 3-tone chime + device vibration + system push notification
          sendManagerOverdueNotification(task, mins, () => {
            setCurrentPage('monitoring');
          });
        }
      });
    };

    checkOverdueTasks();
    const interval = setInterval(checkOverdueTasks, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [tasks]);

  const handleLogin = (user: User) => {
    setLoggedUser(user);
    setCurrentUser(user);
    if (user.role === 'technician') {
      setCurrentPage('technician_queue');
    } else {
      setCurrentPage('dispatch');
    }
  };

  const handleLogout = () => {
    setLoggedUser(null);
    setCurrentUser(null);
  };

  // Add task to Firebase
  const handleAddTask = async (taskData: {
    taskType: AllowedTaskType;
    subscriberName: string;
    phone: string;
    notes: string;
    assignedToId: string;
    assignedToName: string;
  }) => {
    if (!currentUser) return;
    await addTaskToFirebase({
      ...taskData,
      createdBy: currentUser.fullName,
    });
    playSuccessSound();
  };

  // Technician accepts task (claims it for themselves if it was assigned to all)
  const handleAcceptTask = async (taskId: string) => {
    if (currentUser) {
      await acceptTaskInFirebase(taskId, {
        id: currentUser.id,
        fullName: currentUser.fullName,
      });
    } else {
      await acceptTaskInFirebase(taskId);
    }
    playSuccessSound();
  };

  // Technician completes task
  const handleCompleteTask = async (task: MaintenanceTask, notes?: string) => {
    await completeTaskInFirebase(task, notes);
    playSuccessSound();
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    await deleteTaskFromFirebase(taskId);
  };

  // Purge tasks older than 7 days
  const handlePurgeExpired = async (): Promise<number> => {
    return await purgeExpiredTasksFromFirebase(tasks);
  };

  // Technician Account Management (Manager actions)
  const handleSaveTechnician = async (tech: User) => {
    await saveUserToFirebase(tech);
    playSuccessSound();
  };

  const handleDeleteTechnician = async (techId: string) => {
    await deleteUserFromFirebase(techId);
    playSuccessSound();
  };

  // Reassign unaccepted / overdue task to ALL technicians immediately
  const handleReassignToAll = async (taskId: string) => {
    await reassignTaskToAllInFirebase(taskId);
    playSuccessSound();
    setDismissedOverdueTaskIds((prev) => new Set([...prev, taskId]));
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 font-sans" dir="rtl">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <div className="text-sm font-semibold">جاري الاتصال بقاعدة بيانات فايبر بيس (Firebase Firestore)...</div>
        <div className="text-xs text-slate-500 mt-1">تجهيز منظومة الصيانة وتحديث السجلات</div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} />;
  }

  const technicians = users.filter((u) => u.role === 'technician');
  const pendingCount = tasks.filter((t) => t.status === 'pending' || (!t.acceptedAt && !t.completedAt)).length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress' || (t.acceptedAt && !t.completedAt)).length;

  // Active unaccepted tasks overdue by >= 15 minutes that haven't been dismissed by the manager
  const managerOverdueTasks = currentUser.role === 'manager'
    ? tasks.filter(
        (t) =>
          (t.status === 'pending' || (!t.acceptedAt && !t.completedAt)) &&
          isTaskUnacceptedOverdue(t.createdAt, 15) &&
          !dismissedOverdueTaskIds.has(t.id)
      )
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Navbar with Page Switcher & Technician Management */}
      <Navbar
        currentUser={currentUser}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogout={handleLogout}
        pendingCount={pendingCount}
        inProgressCount={inProgressCount}
        onOpenTechManagement={() => setShowTechManagementModal(true)}
      />

      {/* Main Pages View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentUser.role === 'technician' ? (
          <TechnicianView
            technician={currentUser}
            tasks={tasks}
            onAcceptTask={handleAcceptTask}
            onCompleteTask={handleCompleteTask}
          />
        ) : (
          <>
            {currentPage === 'dispatch' && (
              <DispatchPage
                manager={currentUser}
                technicians={technicians}
                onAddTask={handleAddTask}
              />
            )}

            {currentPage === 'monitoring' && (
              <MonitoringPage
                tasks={tasks}
                onDeleteTask={handleDeleteTask}
                onCompleteTask={handleCompleteTask}
                onReassignToAll={handleReassignToAll}
              />
            )}

            {currentPage === 'archive' && (
              <ArchivePage
                tasks={tasks}
                onDeleteTask={handleDeleteTask}
                onPurgeExpired={handlePurgeExpired}
              />
            )}
          </>
        )}
      </main>

      {/* Real-time Push Notification Toast for Technicians */}
      {activePushToastTask && currentUser && currentUser.role === 'technician' && (
        <PushNotificationToast
          task={activePushToastTask}
          technicianName={currentUser.fullName}
          onAccept={(taskId) => {
            handleAcceptTask(taskId);
            setActivePushToastTask(null);
          }}
          onDismiss={() => setActivePushToastTask(null)}
          onOpenWhatsApp={(task) => {
            setWhatsAppModalTask(task);
            setActivePushToastTask(null);
          }}
        />
      )}

      {/* 15-Minute Unaccepted Task Alert Modal for Manager */}
      {managerOverdueTasks.length > 0 && currentUser.role === 'manager' && (
        <ManagerOverdueModal
          overdueTasks={managerOverdueTasks}
          onReassignToAll={handleReassignToAll}
          onOpenWhatsApp={(task) => setWhatsAppModalTask(task)}
          onDismiss={() => {
            const currentOverdueIds = managerOverdueTasks.map((t) => t.id);
            setDismissedOverdueTaskIds((prev) => new Set([...prev, ...currentOverdueIds]));
          }}
        />
      )}

      {/* WhatsApp Preview Modal from Push Toast */}
      {whatsAppModalTask && currentUser && (
        <WhatsAppPreviewModal
          task={whatsAppModalTask}
          technicianName={currentUser.fullName}
          onClose={() => setWhatsAppModalTask(null)}
        />
      )}

      {/* Manager Technicians Management Modal */}
      {showTechManagementModal && currentUser.role === 'manager' && (
        <TechniciansManagementModal
          technicians={technicians}
          onSaveTechnician={handleSaveTechnician}
          onDeleteTechnician={handleDeleteTechnician}
          onClose={() => setShowTechManagementModal(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>منظومة إرسال وتوجيه مهام صيانة شبكات الإنترنت الميدانية</span>
          <span className="text-[11px] text-slate-400">
            قاعدة بيانات سحابية متصلة في فايبر بيس · إشعارات فورية وتنبيهات حية للأجهزة
          </span>
        </div>
      </footer>
    </div>
  );
}
