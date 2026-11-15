import React, { useState, useEffect, useRef } from 'react';
import { User, MaintenanceTask, PageView, AllowedTaskType, DeductionSettings, DeductionRecord } from './types';
import { getUsers, getCurrentUser, setCurrentUser } from './utils/storage';
import { 
  subscribeToFirestoreTasks, 
  subscribeToFirestoreUsers,
  saveUserToFirebase,
  deleteUserFromFirebase,
  addTaskToFirebase, 
  acceptTaskInFirebase, 
  pauseTaskInFirebase,
  suspendTaskInFirebase,
  resumeTaskInFirebase,
  completeTaskInFirebase, 
  updateTaskInFirebase,
  resendExistingTaskInFirebase,
  deleteTaskFromFirebase, 
  purgeExpiredTasksFromFirebase,
  reassignTaskToAllInFirebase,
  purgeAllDemoTasks,
  subscribeToWhatsAppTemplate,
  saveWhatsAppTemplateToFirebase,
  subscribeToDeductionSettings,
  saveDeductionSettingsToFirebase,
  subscribeToDeductions,
  applyTaskDeductionTransaction,
  waiveDeductionRecordInFirebase,
  resetEmployeeDeductionBalanceInFirebase
} from './firebase';
import { playNewTaskAlertSound, playSuccessSound, playOverdueAlertSound } from './utils/audio';
import { sendDevicePushNotification, sendManagerOverdueNotification } from './utils/notifications';
import { DEFAULT_WHATSAPP_TEMPLATE } from './utils/whatsapp';
import { isTaskUnacceptedOverdue, getElapsedMinutes } from './utils/time';
import { 
  DEFAULT_DEDUCTION_SETTINGS, 
  isTaskSecondaryOrExempt, 
  getActiveTaskWorkingSeconds 
} from './utils/deductions';
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
import { ManagerAccountModal } from './components/ManagerAccountModal';
import { WhatsAppTemplateModal } from './components/WhatsAppTemplateModal';
import { DeductionsModal } from './components/DeductionsModal';
import { TaskEditPayload } from './components/TaskEditModal';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setLoggedUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [currentPage, setCurrentPage] = useState<PageView>('dispatch');
  const [isLoaded, setIsLoaded] = useState(false);
  const [activePushToastTask, setActivePushToastTask] = useState<MaintenanceTask | null>(null);
  const [whatsAppModalTask, setWhatsAppModalTask] = useState<MaintenanceTask | null>(null);
  const [showTechManagementModal, setShowTechManagementModal] = useState(false);
  const [showManagerAccountModal, setShowManagerAccountModal] = useState(false);
  const [showWhatsAppTemplateModal, setShowWhatsAppTemplateModal] = useState(false);
  const [showDeductionsModal, setShowDeductionsModal] = useState(false);
  const [whatsappTemplate, setWhatsappTemplate] = useState<string>(DEFAULT_WHATSAPP_TEMPLATE);
  const [deductionSettings, setDeductionSettings] = useState<DeductionSettings>(DEFAULT_DEDUCTION_SETTINGS);
  const [deductionRecords, setDeductionRecords] = useState<DeductionRecord[]>([]);
  const [dismissedOverdueTaskIds, setDismissedOverdueTaskIds] = useState<Set<string>>(new Set());

  const knownTaskIdsRef = useRef<Set<string>>(new Set());
  const knownBroadcastsRef = useRef<Map<string, string>>(new Map());
  const alertedOverdueTaskIdsRef = useRef<Set<string>>(new Set());
  const inFlightDeductionsRef = useRef<Set<string>>(new Set());
  const isInitialSnapshotRef = useRef<boolean>(true);
  const currentUserRef = useRef<User | null>(null);

  // Keep ref synced for async callback
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Initialize users & session & live Firestore listeners
  useEffect(() => {
    // Purge any remaining demo tasks immediately
    purgeAllDemoTasks().catch(() => {});

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
        incomingTasks.forEach((t) => {
          knownTaskIdsRef.current.add(t.id);
          if (t.lastBroadcastAt) {
            knownBroadcastsRef.current.set(t.id, t.lastBroadcastAt);
          }
        });
        isInitialSnapshotRef.current = false;
      } else {
        const newDispatchedTasks = incomingTasks.filter((t) => {
          const isNewTask = !knownTaskIdsRef.current.has(t.id);
          const prevBroadcast = knownBroadcastsRef.current.get(t.id);
          const isResentBroadcast =
            !!t.lastBroadcastAt && t.lastBroadcastAt !== prevBroadcast;
          return (isNewTask || isResentBroadcast) && (t.status === 'pending' || !t.acceptedAt);
        });

        if (newDispatchedTasks.length > 0) {
          newDispatchedTasks.forEach((task) => {
            knownTaskIdsRef.current.add(task.id);
            if (task.lastBroadcastAt) {
              knownBroadcastsRef.current.set(task.id, task.lastBroadcastAt);
            }

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

        // Sync known task IDs and broadcast timestamps
        incomingTasks.forEach((t) => {
          knownTaskIdsRef.current.add(t.id);
          if (t.lastBroadcastAt) {
            knownBroadcastsRef.current.set(t.id, t.lastBroadcastAt);
          }
        });
      }
    });

    // Subscribe to global customizable WhatsApp message template
    const unsubWhatsAppTemplate = subscribeToWhatsAppTemplate((tmpl) => {
      setWhatsappTemplate(tmpl);
    });

    // Subscribe to manager deduction settings & deduction records ledger
    const unsubDeductionSettings = subscribeToDeductionSettings((cfg) => {
      setDeductionSettings(cfg);
    });
    const unsubDeductions = subscribeToDeductions((records) => {
      setDeductionRecords(records);
    });

    return () => {
      unsubUsers();
      unsubTasks();
      unsubWhatsAppTemplate();
      unsubDeductionSettings();
      unsubDeductions();
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

  // Automatic Employee Delay Deduction Engine (applies to primary task ONLY, exempts secondary tasks)
  useEffect(() => {
    if (!isLoaded || !currentUser || !deductionSettings.enabled) return;

    const evaluateDeductions = () => {
      const now = Date.now();
      const recordedIds = new Set(deductionRecords.map((r) => r.id));

      tasks.forEach((task) => {
        if (!task.assignedToId || task.assignedToId === 'all') return;

        // Enforce: ONLY first active task is eligible; secondary tasks are exempt
        if (isTaskSecondaryOrExempt(task, tasks)) return;

        const tech = users.find((u) => u.id === task.assignedToId && u.role === 'technician');
        if (!tech) return;

        // 1. Accept Delay Deduction Check
        if (
          !task.originallyBroadcast &&
          !task.acceptDeductionApplied &&
          !recordedIds.has(`${task.id}_accept`) &&
          deductionSettings.acceptDelayMinutes > 0 &&
          deductionSettings.acceptDelayDeduction > 0
        ) {
          const createdMs = new Date(task.createdAt).getTime();
          const acceptEndMs = task.acceptedAt
            ? new Date(task.acceptedAt).getTime()
            : task.completedAt
            ? new Date(task.completedAt).getTime()
            : now;

          if (!isNaN(createdMs) && !isNaN(acceptEndMs)) {
            const acceptElapsedMs = Math.max(0, acceptEndMs - createdMs);
            if (acceptElapsedMs >= deductionSettings.acceptDelayMinutes * 60 * 1000) {
              const lockKey = `${task.id}_accept`;
              if (!inFlightDeductionsRef.current.has(lockKey)) {
                inFlightDeductionsRef.current.add(lockKey);
                applyTaskDeductionTransaction({
                  taskId: task.id,
                  taskNumber: task.taskNumber,
                  userId: tech.id,
                  userName: tech.fullName,
                  reason: 'accept_delay',
                  delayMinutes: Math.floor(acceptElapsedMs / 60000),
                  allowedMinutes: deductionSettings.acceptDelayMinutes,
                  amount: deductionSettings.acceptDelayDeduction,
                  unitLabel: deductionSettings.unitLabel || 'د.ع',
                  note: `تجاوز مهلة قبول المهمة (${deductionSettings.acceptDelayMinutes} دقيقة)`,
                }).finally(() => {
                  inFlightDeductionsRef.current.delete(lockKey);
                });
              }
            }
          }
        }

        // 2. Completion Delay Deduction Check (based on active working seconds excluding pauses/holds)
        if (
          task.acceptedAt &&
          !task.completionDeductionApplied &&
          !recordedIds.has(`${task.id}_complete`) &&
          deductionSettings.completionDelayMinutes > 0 &&
          deductionSettings.completionDelayDeduction > 0
        ) {
          const completionRefMs = task.completedAt ? new Date(task.completedAt).getTime() : now;
          const activeSecs = getActiveTaskWorkingSeconds(task, completionRefMs);
          if (activeSecs >= deductionSettings.completionDelayMinutes * 60) {
            const lockKey = `${task.id}_complete`;
            if (!inFlightDeductionsRef.current.has(lockKey)) {
              inFlightDeductionsRef.current.add(lockKey);
              applyTaskDeductionTransaction({
                taskId: task.id,
                taskNumber: task.taskNumber,
                userId: tech.id,
                userName: tech.fullName,
                reason: 'completion_delay',
                delayMinutes: Math.floor(activeSecs / 60),
                allowedMinutes: deductionSettings.completionDelayMinutes,
                amount: deductionSettings.completionDelayDeduction,
                unitLabel: deductionSettings.unitLabel || 'د.ع',
                note: `تجاوز مهلة إنجاز المهمة (${deductionSettings.completionDelayMinutes} دقيقة)`,
              }).finally(() => {
                inFlightDeductionsRef.current.delete(lockKey);
              });
            }
          }
        }
      });
    };

    evaluateDeductions();
    const interval = setInterval(evaluateDeductions, 10000);
    return () => clearInterval(interval);
  }, [isLoaded, currentUser, tasks, users, deductionSettings, deductionRecords]);

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

  // Add task to Firebase (exempts secondary tasks if technician already has an active uncompleted task)
  const handleAddTask = async (taskData: {
    taskType: AllowedTaskType;
    subscriberName: string;
    phone: string;
    notes: string;
    assignedToId: string;
    assignedToName: string;
  }) => {
    if (!currentUser) return;
    const isSpecificTech = taskData.assignedToId && taskData.assignedToId !== 'all';
    const hasEarlierActiveTask = isSpecificTech
      ? tasks.some(
          (t) =>
            t.assignedToId === taskData.assignedToId &&
            t.status !== 'completed' &&
            !t.completedAt
        )
      : false;

    await addTaskToFirebase({
      ...taskData,
      createdBy: currentUser.fullName,
      deductionExempt: hasEarlierActiveTask,
      deductionExemptReason: hasEarlierActiveTask
        ? 'مهمة إضافية — يُطبق الخصم على المهمة الأولى فقط'
        : '',
    });
    playSuccessSound();
  };

  // Technician accepts task (claims it for themselves if it was assigned to all)
  const handleAcceptTask = async (taskId: string) => {
    if (currentUser) {
      const targetTask = tasks.find((t) => t.id === taskId);
      const wasBroadcast = !targetTask?.assignedToId || targetTask.assignedToId === 'all';
      const techAlreadyHasActiveTask = wasBroadcast
        ? tasks.some(
            (t) =>
              t.id !== taskId &&
              t.assignedToId === currentUser.id &&
              t.status !== 'completed' &&
              !t.completedAt
          )
        : false;

      await acceptTaskInFirebase(
        taskId,
        {
          id: currentUser.id,
          fullName: currentUser.fullName,
        },
        techAlreadyHasActiveTask
          ? {
              deductionExempt: true,
              deductionExemptReason: 'مهمة إضافية — يُطبق الخصم على المهمة الأولى فقط',
            }
          : undefined
      );
    } else {
      await acceptTaskInFirebase(taskId);
    }
    playSuccessSound();
  };

  // Technician pauses task temporarily
  const handlePauseTask = async (task: MaintenanceTask, pauseReason?: string) => {
    await pauseTaskInFirebase(task, pauseReason);
    playSuccessSound();
  };

  // Technician suspends (holds) task -> moves to "المهام المعلقة"
  const handleSuspendTask = async (task: MaintenanceTask, suspendReason?: string) => {
    await suspendTaskInFirebase(task, suspendReason);
    playSuccessSound();
  };

  // Technician resumes paused or suspended task
  const handleResumeTask = async (taskId: string) => {
    await resumeTaskInFirebase(taskId);
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

  // Manager Self Account Update
  const handleSaveManager = async (updatedManager: User) => {
    await saveUserToFirebase(updatedManager);
    setLoggedUser(updatedManager);
    setCurrentUser(updatedManager);
    playSuccessSound();
  };

  // Manager updates global WhatsApp template
  const handleSaveWhatsAppTemplate = async (newTemplate: string) => {
    await saveWhatsAppTemplateToFirebase({
      template: newTemplate,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.fullName || 'المدير',
    });
    setWhatsappTemplate(newTemplate);
    playSuccessSound();
  };

  // Manager edits task info or switches assigned technician
  const handleUpdateTask = async (
    taskId: string,
    updates: Partial<MaintenanceTask>
  ) => {
    await updateTaskInFirebase(taskId, updates);
    playSuccessSound();
  };

  // Manager resends an existing pending or paused task
  const handleResendExistingTask = async (
    task: MaintenanceTask,
    overrides: TaskEditPayload
  ) => {
    const isSpecificTech = overrides.assignedToId && overrides.assignedToId !== 'all';
    const hasEarlierActiveTask = isSpecificTech
      ? tasks.some(
          (t) =>
            t.id !== task.id &&
            t.assignedToId === overrides.assignedToId &&
            t.status !== 'completed' &&
            !t.completedAt
        )
      : false;

    await resendExistingTaskInFirebase(task, {
      ...overrides,
      deductionExempt: hasEarlierActiveTask,
      deductionExemptReason: hasEarlierActiveTask
        ? 'مهمة إضافية — يُطبق الخصم على المهمة الأولى فقط'
        : '',
    });
    alertedOverdueTaskIdsRef.current.delete(task.id);
    playSuccessSound();
  };

  // Manager resends a completed task as a brand new pending task
  const handleResendCompletedTask = async (data: TaskEditPayload) => {
    const isSpecificTech = data.assignedToId && data.assignedToId !== 'all';
    const hasEarlierActiveTask = isSpecificTech
      ? tasks.some(
          (t) =>
            t.assignedToId === data.assignedToId &&
            t.status !== 'completed' &&
            !t.completedAt
        )
      : false;

    await addTaskToFirebase({
      ...data,
      createdBy: currentUser?.fullName || 'المدير',
      deductionExempt: hasEarlierActiveTask,
      deductionExemptReason: hasEarlierActiveTask
        ? 'مهمة إضافية — يُطبق الخصم على المهمة الأولى فقط'
        : '',
    });
    playSuccessSound();
  };

  // Manager updates deduction rules settings
  const handleSaveDeductionSettings = async (settings: DeductionSettings) => {
    await saveDeductionSettingsToFirebase({
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.fullName || 'المدير',
    });
    setDeductionSettings(settings);
    playSuccessSound();
  };

  // Manager waives a specific deduction record
  const handleWaiveDeductionRecord = async (record: DeductionRecord) => {
    await waiveDeductionRecordInFirebase(record);
    playSuccessSound();
  };

  // Manager resets an employee's deduction balance to 0
  const handleResetEmployeeDeductionBalance = async (
    userId: string,
    records: DeductionRecord[]
  ) => {
    await resetEmployeeDeductionBalanceInFirebase(userId, records);
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
  const pendingCount = tasks.filter(
    (t) => t.status === 'pending' || (!t.acceptedAt && !t.completedAt && t.status !== 'paused' && t.status !== 'suspended')
  ).length;
  const inProgressCount = tasks.filter(
    (t) => t.status === 'in_progress' || (!!t.acceptedAt && !t.completedAt && t.status !== 'paused' && t.status !== 'suspended')
  ).length;

  // Active unaccepted tasks overdue by >= 15 minutes that haven't been dismissed by the manager
  const managerOverdueTasks = currentUser.role === 'manager'
    ? tasks.filter(
        (t) =>
          t.status === 'pending' &&
          !t.acceptedAt &&
          !t.completedAt &&
          isTaskUnacceptedOverdue(t.createdAt, 15) &&
          !dismissedOverdueTaskIds.has(t.id)
      )
    : [];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Navbar with Page Switcher & Technician Management */}
      <Navbar
        currentUser={currentUser}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogout={handleLogout}
        pendingCount={pendingCount}
        inProgressCount={inProgressCount}
        onOpenTechManagement={() => setShowTechManagementModal(true)}
        onOpenManagerAccount={() => setShowManagerAccountModal(true)}
        onOpenWhatsAppTemplate={() => setShowWhatsAppTemplateModal(true)}
        onOpenDeductions={() => setShowDeductionsModal(true)}
      />

      {/* Main Pages View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
        {currentUser.role === 'technician' ? (
          <TechnicianView
            technician={currentUser}
            tasks={tasks}
            whatsappTemplate={whatsappTemplate}
            deductionSettings={deductionSettings}
            deductionRecords={deductionRecords}
            onAcceptTask={handleAcceptTask}
            onPauseTask={handlePauseTask}
            onSuspendTask={handleSuspendTask}
            onResumeTask={handleResumeTask}
            onCompleteTask={handleCompleteTask}
          />
        ) : (
          <>
            {currentPage === 'dispatch' && (
              <DispatchPage
                manager={currentUser}
                technicians={technicians}
                onAddTask={handleAddTask}
                onOpenWhatsAppTemplate={() => setShowWhatsAppTemplateModal(true)}
              />
            )}

            {currentPage === 'monitoring' && (
              <MonitoringPage
                tasks={tasks}
                technicians={technicians}
                whatsappTemplate={whatsappTemplate}
                onOpenWhatsAppTemplate={() => setShowWhatsAppTemplateModal(true)}
                onDeleteTask={handleDeleteTask}
                onUpdateTask={handleUpdateTask}
                onResendExistingTask={handleResendExistingTask}
                onCompleteTask={handleCompleteTask}
                onReassignToAll={handleReassignToAll}
              />
            )}

            {currentPage === 'archive' && (
              <ArchivePage
                tasks={tasks}
                technicians={technicians}
                whatsappTemplate={whatsappTemplate}
                onOpenWhatsAppTemplate={() => setShowWhatsAppTemplateModal(true)}
                onDeleteTask={handleDeleteTask}
                onUpdateTask={handleUpdateTask}
                onResendCompletedTask={handleResendCompletedTask}
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
          onAccept={(taskId) => {
            handleAcceptTask(taskId);
            setActivePushToastTask(null);
          }}
          onDismiss={() => setActivePushToastTask(null)}
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

      {/* WhatsApp Preview Modal from Push Toast or Overdue Alert */}
      {whatsAppModalTask && currentUser && (
        <WhatsAppPreviewModal
          task={whatsAppModalTask}
          technicianName={currentUser.fullName}
          customTemplate={whatsappTemplate}
          onEditGlobalTemplate={
            currentUser.role === 'manager'
              ? () => setShowWhatsAppTemplateModal(true)
              : undefined
          }
          onClose={() => setWhatsAppModalTask(null)}
        />
      )}

      {/* Manager Technicians Management Modal */}
      {showTechManagementModal && currentUser.role === 'manager' && (
        <TechniciansManagementModal
          technicians={technicians}
          deductionUnitLabel={deductionSettings.unitLabel}
          onOpenDeductions={() => setShowDeductionsModal(true)}
          onSaveTechnician={handleSaveTechnician}
          onDeleteTechnician={handleDeleteTechnician}
          onClose={() => setShowTechManagementModal(false)}
        />
      )}

      {/* Manager Self Account Management Modal (includes Deduction Settings) */}
      {showManagerAccountModal && currentUser.role === 'manager' && (
        <ManagerAccountModal
          manager={currentUser}
          allUsers={users}
          deductionSettings={deductionSettings}
          onSave={handleSaveManager}
          onSaveDeductionSettings={handleSaveDeductionSettings}
          onOpenDeductionBalances={() => setShowDeductionsModal(true)}
          onClose={() => setShowManagerAccountModal(false)}
        />
      )}

      {/* Manager WhatsApp Message Template Editor Modal */}
      {showWhatsAppTemplateModal && currentUser.role === 'manager' && (
        <WhatsAppTemplateModal
          currentTemplate={whatsappTemplate}
          managerName={currentUser.fullName}
          onSave={handleSaveWhatsAppTemplate}
          onClose={() => setShowWhatsAppTemplateModal(false)}
        />
      )}

      {/* Manager Employee Deduction Balances & Settings Modal */}
      {showDeductionsModal && currentUser.role === 'manager' && (
        <DeductionsModal
          technicians={technicians}
          deductionSettings={deductionSettings}
          deductionRecords={deductionRecords}
          onSaveSettings={handleSaveDeductionSettings}
          onWaiveRecord={handleWaiveDeductionRecord}
          onResetEmployeeBalance={handleResetEmployeeDeductionBalance}
          onClose={() => setShowDeductionsModal(false)}
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
