'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  CheckSquare, 
  Plus, 
  ShoppingCart, 
  Sparkles, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  Circle, 
  X,
  AlertCircle,
  Home as HomeIcon,
  Heart,
  Tag
} from 'lucide-react';
import { useCurrentUser } from '@/components/UserContext';
import { useConfirm } from '@/components/ConfirmModal';
import { playTaskCheck, playTap } from '@/lib/sound-effects';
import { broadcastCoupleNotification } from '@/lib/notifications';

export interface AgendaTask {
  id: string;
  title: string;
  category: 'grocery' | 'chore' | 'errand' | 'date' | 'reminder';
  assignee: 'berk' | 'jaquilyn' | 'both';
  timeframe: 'today' | 'tomorrow' | 'this_week' | 'upcoming';
  dueDate?: string;
  dueDay?: string;
  dueTime?: string;
  completed: boolean;
  priority: 'normal' | 'urgent';
  createdAt: string;
}

const DEFAULT_TASKS: AgendaTask[] = [];

const CATEGORIES = {
  grocery: { label: 'Grocery', icon: ShoppingCart, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  chore: { label: 'Chores & Home', icon: HomeIcon, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  errand: { label: 'Errands', icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  date: { label: 'Date Night', icon: Heart, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  reminder: { label: 'Reminder', icon: Sparkles, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' }
};

const TIMEFRAME_LABELS = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  this_week: 'This Week',
  upcoming: 'Upcoming'
};

export default function AgendaPage() {
  const { currentUser } = useCurrentUser();
  const confirm = useConfirm();
  const [tasks, setTasks] = useState<AgendaTask[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('berlyn_agenda_tasks');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (e) { /* fallback */ }
      }
    }
    return [];
  });

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New task form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AgendaTask['category']>('grocery');
  const [assignee, setAssignee] = useState<AgendaTask['assignee']>('both');
  const [timeframe, setTimeframe] = useState<AgendaTask['timeframe']>('today');
  const [priority, setPriority] = useState<AgendaTask['priority']>('normal');
  const [dueDay, setDueDay] = useState('');
  const [dueTime, setDueTime] = useState('');

  // Fetch from Supabase via API route on mount and when tab refocuses
  const loadCloudTasks = async () => {
    try {
      const res = await fetch('/api/agenda', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tasks)) {
          let localSaved: AgendaTask[] = [];
          if (typeof window !== 'undefined') {
            const savedStr = localStorage.getItem('berlyn_agenda_tasks');
            if (savedStr) {
              try { localSaved = JSON.parse(savedStr); } catch {}
            }
          }

          const remoteIds = new Set(data.tasks.map((t: any) => t.id));
          const missingInCloud = localSaved.filter(lt => !remoteIds.has(lt.id));

          if (missingInCloud.length > 0) {
            // Push missing local tasks up to cloud!
            for (const mt of missingInCloud) {
              fetch('/api/agenda', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mt),
              }).catch(() => {});
            }
          }

          const mergedMap = new Map<string, AgendaTask>();
          data.tasks.forEach((t: AgendaTask) => mergedMap.set(t.id, t));
          localSaved.forEach((t: AgendaTask) => {
            if (!mergedMap.has(t.id)) mergedMap.set(t.id, t);
          });
          const merged = Array.from(mergedMap.values());

          setTasks(merged);
          if (typeof window !== 'undefined') {
            localStorage.setItem('berlyn_agenda_tasks', JSON.stringify(merged));
          }
        }
      }
    } catch (e) {
      // fallback to local
    }
  };

  useEffect(() => {
    loadCloudTasks();

    const handleFocus = () => {
      loadCloudTasks();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('berlyn_agenda_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Listen to cross-page updates (e.g. Bucket list adding a habit)
  useEffect(() => {
    const handleStorageUpdate = () => {
      try {
        const saved = localStorage.getItem('berlyn_agenda_tasks');
        if (saved) {
          setTasks(JSON.parse(saved));
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('agenda_updated', handleStorageUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('agenda_updated', handleStorageUpdate);
    };
  }, []);

  const toggleTask = async (id: string) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;
    const nextCompleted = !target.completed;
    if (nextCompleted) {
      playTaskCheck();
    }
    const updated = tasks.map(t => t.id === id ? { ...t, completed: nextCompleted } : t);
    setTasks(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('berlyn_agenda_tasks', JSON.stringify(updated));
    }

    try {
      await fetch('/api/agenda', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: nextCompleted }),
      });
    } catch (e) {
      // silent
    }
  };

  const deleteTask = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Task?',
      message: 'Are you sure you want to delete this task from your agenda?',
      confirmText: 'Delete',
    });
    if (ok) {
      const updated = tasks.filter(t => t.id !== id);
      setTasks(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('berlyn_agenda_tasks', JSON.stringify(updated));
      }

      try {
        await fetch(`/api/agenda?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      } catch (e) {
        // silent
      }
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: AgendaTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      category,
      assignee,
      timeframe,
      priority,
      dueDay: dueDay.trim() || undefined,
      dueTime: dueTime.trim() || undefined,
      completed: false,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    const updated = [newTask, ...tasks];
    setTasks(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('berlyn_agenda_tasks', JSON.stringify(updated));
    }

    setTitle('');
    setDueDay('');
    setDueTime('');
    setShowAddModal(false);
    playTap();

    broadcastCoupleNotification({
      type: 'agenda',
      sender: currentUser === 'jaquilyn' ? 'jaquilyn' : 'berk',
      title: currentUser === 'jaquilyn' ? '🌸 Jaquilyn added to Agenda' : '🦁 Berk added to Agenda',
      subtitle: newTask.title,
      link: '/agenda',
    });

    try {
      await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
    } catch (e) {
      // silent
    }
  };

  const clearCompleted = async () => {
    const completedTasks = tasks.filter(t => t.completed);
    const remaining = tasks.filter(t => !t.completed);
    setTasks(remaining);
    if (typeof window !== 'undefined') {
      localStorage.setItem('berlyn_agenda_tasks', JSON.stringify(remaining));
    }

    for (const c of completedTasks) {
      fetch(`/api/agenda?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' }).catch(() => {});
    }
  };

  const todayTasks = tasks.filter(t => t.timeframe === 'today');
  const todayDone = todayTasks.filter(t => t.completed).length;
  const activeCount = tasks.filter(t => !t.completed).length;
  const completedCount = tasks.filter(t => t.completed).length;

  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return !t.completed;
    if (activeFilter === 'completed') return t.completed;
    if (activeFilter === 'today') return t.timeframe === 'today';
    if (activeFilter === 'this_week') return t.timeframe === 'this_week' || t.timeframe === 'today' || t.timeframe === 'tomorrow';
    if (activeFilter === 'grocery') return t.category === 'grocery';
    if (activeFilter === 'chore') return t.category === 'chore';
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in pb-20">
      {/* 1. Header Card */}
      <div className="card-cozy p-5 relative overflow-hidden bg-gradient-to-br from-[#121929] via-[#0f1523] to-[#17142b] border border-white/[0.08]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
                <CalendarDays className="w-4 h-4" />
              </div>
              <h1 className="text-base font-bold text-white tracking-tight">Shared Agenda & Chores</h1>
            </div>
            <p className="text-xs text-slate-300">
              Daily tasks, grocery shopping runs, house chores & reminders for our daily life.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>

        {/* Today's progress banner */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">
              Today: <strong className="text-white">{todayDone}</strong> of {todayTasks.length} tasks completed
            </span>
          </div>
          {tasks.some(t => t.completed) && (
            <button
              onClick={clearCompleted}
              className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              Clear Completed
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {[
          { id: 'all', label: `All (${tasks.length})` },
          { id: 'active', label: `Active (${activeCount})` },
          { id: 'completed', label: `Completed (${completedCount})` },
          { id: 'today', label: `Today (${todayTasks.length})` },
          { id: 'this_week', label: 'This Week' },
          { id: 'grocery', label: '🛒 Grocery' },
          { id: 'chore', label: '🧹 Chores' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === f.id
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-[#141b27] text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 3. Task List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="card-cozy p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto" />
            <p className="text-xs text-slate-400">All clear! No tasks in this view.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const cat = CATEGORIES[task.category] || CATEGORIES.chore;
            const CatIcon = cat.icon;

            return (
              <div
                key={task.id}
                className={`card-cozy p-3.5 transition-all flex items-start justify-between gap-3 border ${
                  task.completed 
                    ? 'border-emerald-500/20 bg-[#0e171b]/40 opacity-75' 
                    : task.priority === 'urgent'
                    ? 'border-rose-500/30 bg-[#171424]/40'
                    : 'border-white/[0.07] hover:border-white/[0.12]'
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                    )}
                  </button>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Category Tag */}
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border font-medium ${cat.color}`}>
                        <CatIcon className="w-2.5 h-2.5" />
                        <span>{cat.label}</span>
                      </span>

                      {/* Timeframe */}
                      <span className="text-[10px] text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                        {TIMEFRAME_LABELS[task.timeframe]}
                      </span>

                      {/* Assignee Badge */}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 font-medium">
                        {task.assignee === 'berk' && '🦁 Berk'}
                        {task.assignee === 'jaquilyn' && '🌸 Jaquilyn'}
                        {task.assignee === 'both' && '💖 Together'}
                      </span>

                      {/* Scheduled Day / Time (e.g. from Habit or Manual) */}
                      {(task.dueDay || task.dueTime) && (
                        <span className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/25 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{task.dueDay}{task.dueDay && task.dueTime ? ' • ' : ''}{task.dueTime}</span>
                        </span>
                      )}

                      {/* Urgent */}
                      {task.priority === 'urgent' && !task.completed && (
                        <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-0.5">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Urgent
                        </span>
                      )}
                    </div>

                    <h4 className={`text-xs font-semibold leading-snug ${
                      task.completed ? 'line-through text-slate-400' : 'text-white'
                    }`}>
                      {task.title}
                    </h4>
                  </div>
                </div>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-rose-400" />
                Add Shared Task or Reminder
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 pt-3.5 overflow-y-auto flex-1">
              <form onSubmit={handleAddTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Task or Reminder Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Buy milk, bread & eggs"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AgendaTask['category'])}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="grocery">🛒 Grocery & Market</option>
                    <option value="chore">🧹 Chores & Cleaning</option>
                    <option value="errand">📋 Errands & Admin</option>
                    <option value="date">🥂 Date Night & Fun</option>
                    <option value="reminder">⏰ Reminder & Health</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Timeframe</label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as AgendaTask['timeframe'])}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="this_week">This Week</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Assignee</label>
                  <select
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value as AgendaTask['assignee'])}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="both">💖 Both of Us</option>
                    <option value="berk">🦁 Berk</option>
                    <option value="jaquilyn">🌸 Jaquilyn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as AgendaTask['priority'])}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent ⚡</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Scheduled Day (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Saturday or Daily"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Scheduled Time (Optional)</label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md transition-all cursor-pointer"
                >
                  Add Task
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
