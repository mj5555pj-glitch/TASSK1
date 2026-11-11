import React, { useState, useEffect } from 'react';
import { User, MaintenanceTask, PageView, AllowedTaskType } from './types';
import { getUsers, getCurrentUser, setCurrentUser } from './utils/storage';
import { 
  subscribeToFirestoreTasks, 
  addTaskToFirebase, 
  acceptTaskInFirebase, 
  completeTaskInFirebase, 
  deleteTaskFromFirebase, 
  purgeExpiredTasksFromFirebase 
} from './firebase';
import { playNewTaskAlertSound, playSuccessSound } from './utils/audio';
import { LoginScreen } from './components/LoginScreen';
import { Navbar } from './components/Navbar';
import { DispatchPage } from './components/DispatchPage';
import { MonitoringPage } from './components/MonitoringPage';
import { ArchivePage } from './components/ArchivePage';
import { TechnicianView } from './components/TechnicianView';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setLoggedUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [currentPage, setCurrentPage] = useState<PageView>('dispatch');
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastTaskCount, setLastTaskCount] = useState<number | null>(null);

  // Initialize users & session
  useEffect(() => {
    const loadedUsers = getUsers();
    setUsers(loadedUsers);

    const saved = getCurrentUser();
    if (saved) {
      setLoggedUser(saved);
      if (saved.role === 'technician') {
        setCurrentPage('technician_queue');
      } else {
        setCurrentPage('dispatch');
      }
    }

    // Subscribe to Firebase Firestore real-time updates
    const unsubscribe = subscribeToFirestoreTasks((incomingTasks) => {
      setTasks(incomingTasks);
      setIsLoaded(true);

      // Play sound on incoming new task if task count increased
      setLastTaskCount((prev) => {
        if (prev !== null && incomingTasks.length > prev) {
          playNewTaskAlertSound();
        }
        return incomingTasks.length;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

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

  const handleSwitchUser = (user: User) => {
    setLoggedUser(user);
    setCurrentUser(user);
    if (user.role === 'technician') {
      setCurrentPage('technician_queue');
    } else if (currentPage === 'technician_queue') {
      setCurrentPage('dispatch');
    }
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

  // Technician accepts task
  const handleAcceptTask = async (taskId: string) => {
    await acceptTaskInFirebase(taskId);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Navbar with Page Switcher */}
      <Navbar
        currentUser={currentUser}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
        allUsers={users}
        pendingCount={pendingCount}
        inProgressCount={inProgressCount}
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

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>منظومة إرسال وتوجيه مهام صيانة شبكات الإنترنت الميدانية</span>
          <span className="text-[11px] text-slate-400">
            قاعدة بيانات سحابية متصلة في فايبر بيس · حفظ السجلات أسبوعياً وتتبع دقيق للأوقات
          </span>
        </div>
      </footer>
    </div>
  );
}
