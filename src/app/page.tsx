'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Task } from '@/lib/types';
import { toDate, formatInTimeZone } from 'date-fns-tz';
import { Plus, Calendar, Check, Pencil, Trash2, LogOut, X, Settings, Save } from 'lucide-react';

// --- 时区配置 ---
const TIME_ZONE = 'Asia/Shanghai';

// --- 日期辅助函数 ---
const formatInUTC8 = (dateString: string) => formatInTimeZone(new Date(dateString), TIME_ZONE, 'yyyy-MM-dd HH:mm');
const formatDateTimeForInput = (dateString: string) => {
  if (!dateString) return '';
  const dateInUTC8 = toDate(dateString, { timeZone: 'UTC' });
  return formatInTimeZone(dateInUTC8, TIME_ZONE, `yyyy-MM-dd'T'HH:mm`);
};

// --- Settings Component ---
const SettingsPanel = () => {
  const [barkKey, setBarkKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/user/config')
      .then(res => res.json())
      .then(data => {
        setBarkKey(data.barkKey || '');
        setIsLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    const res = await fetch('/api/user/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barkKey }),
    });
    setIsSaving(false);
    if (res.ok) {
      setMessage('保存成功！');
    } else {
      setMessage('保存失败，请重试。');
    }
    setTimeout(() => setMessage(''), 2000);
  };

  if (isLoading) {
    return <div className="p-6 text-center">加载设置...</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">通知设置</h3>
      <div>
        <label htmlFor="barkKey" className="block mb-1 text-sm font-medium text-slate-600">
          Bark Key
        </label>
        <input
          id="barkKey"
          type="text"
          value={barkKey}
          onChange={(e) => setBarkKey(e.target.value)}
          placeholder="粘贴您的 Bark Key"
          className="block w-full px-3 py-2 transition duration-150 ease-in-out border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="flex items-center justify-center w-full gap-2 px-4 py-2 font-bold text-white transition-colors bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
      >
        <Save size={18} />
        {isSaving ? '保存中...' : '保存设置'}
      </button>
      {message && <p className="text-sm text-center text-green-600">{message}</p>}
    </div>
  );
};


export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 表单状态
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newType, setNewType] = useState<'one-time' | 'recurring'>('one-time');
  const [newIntervalDays, setNewIntervalDays] = useState<number | ''>('');
  const [formError, setFormError] = useState('');

  // 模态框与设置面板状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const fetchTasks = async () => {
    setIsLoading(true);
    const res = await fetch('/api/tasks');
    if (res.ok) setTasks((await res.json()).sort((a: Task, b: Task) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
    setIsLoading(false);
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') fetchTasks();
  }, [status, router]);

  // --- CRUD 操作 ---
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newTitle || !newDueDate) {
      setFormError('标题和截止日期是必填项。');
      return;
    }
    const utcDate = toDate(newDueDate, { timeZone: TIME_ZONE });
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, type: newType, dueDate: utcDate.toISOString(), intervalDays: newType === 'recurring' ? Number(newIntervalDays) : null }),
    });
    if (res.ok) {
      setNewTitle(''); setNewDueDate(''); setNewType('one-time'); setNewIntervalDays('');
      fetchTasks();
    } else {
      setFormError((await res.json()).message || '���建任务失败。');
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    const utcDate = toDate(editingTask.dueDate, { timeZone: TIME_ZONE });
    const res = await fetch(`/api/tasks/${editingTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editingTask, dueDate: utcDate.toISOString() }),
    });
    if (res.ok) {
      setIsModalOpen(false);
      fetchTasks();
    } else {
      alert('更新任务失败。');
    }
  };

  const handleComplete = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}/complete`, { method: 'PATCH' });
    fetchTasks();
  };

  const handleDelete = async (taskId: string) => {
    if (confirm('您确定要删除这个任务吗？')) {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      fetchTasks();
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask({ ...task, dueDate: formatDateTimeForInput(task.dueDate) });
    setIsModalOpen(true);
  };

  // --- UI 渲染 ---
  if (status === 'loading' || isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-50">加载中...</div>;
  }
  if (!session) return null;

  const now = new Date();
  const dueTasks = tasks.filter(t => !t.isCompleted && new Date(t.dueDate) <= now);
  const upcomingTasks = tasks.filter(t => !t.isCompleted && new Date(t.dueDate) > now);
  const completedTasks = tasks.filter(t => t.isCompleted);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur-lg shadow-sm">
        <div className="max-w-5xl px-4 py-3 mx-auto sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold sm:text-2xl">任务管理器</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-slate-600 transition-colors rounded-lg hover:bg-slate-200" title="设置">
                <Settings size={20} />
              </button>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white transition-colors bg-red-500 rounded-lg shadow-sm hover:bg-red-600">
                <LogOut size={16} />
                <span className="hidden sm:inline">退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl p-4 mx-auto sm:p-6 lg:p-8">
        {showSettings && (
          <div className="mb-10 bg-white border border-gray-200 rounded-xl shadow-sm">
            <SettingsPanel />
          </div>
        )}

        <div className="p-6 mb-10 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">添加新任务</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="md:col-span-6"><input type="text" placeholder="任务标题" value={newTitle} onChange={e => setNewTitle(e.target.value)} required className="block w-full px-3 py-2 transition duration-150 ease-in-out border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50" /></div>
            <div className="md:col-span-2"><input type="datetime-local" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} required className="block w-full px-3 py-2 transition duration-150 ease-in-out border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50" /></div>
            <div className="md:col-span-2"><select value={newType} onChange={e => setNewType(e.target.value as any)} className="block w-full px-3 py-2 transition duration-150 ease-in-out border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"><option value="one-time">一次性</option><option value="recurring">周期性</option></select></div>
            {newType === 'recurring' && (<div className="md:col-span-2"><input type="number" placeholder="间隔 (天)" value={newIntervalDays} onChange={e => setNewIntervalDays(Number(e.target.value))} min="1" required className="block w-full px-3 py-2 transition duration-150 ease-in-out border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50" /></div>)}
            <div className="md:col-span-6">{formError && <p className="mb-2 text-sm text-red-600">{formError}</p>}<button type="submit" className="flex items-center justify-center w-full gap-2 px-4 py-3 font-bold text-white transition-colors bg-indigo-600 rounded-lg hover:bg-indigo-700"><Plus size={20} /> 添加任务</button></div>
          </form>
        </div>
        <div className="space-y-10">
          <TaskList title="已到期任务" tasks={dueTasks} onComplete={handleComplete} onEdit={openEditModal} onDelete={handleDelete} />
          <TaskList title="未到期任务" tasks={upcomingTasks} onComplete={handleComplete} onEdit={openEditModal} onDelete={handleDelete} />
          <TaskList title="已完成任务" tasks={completedTasks} />
        </div>
      </main>

      {isModalOpen && editingTask && (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
          <div className="w-full max-w-lg p-6 bg-white rounded-xl shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">编辑任务</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-500 rounded-full hover:bg-gray-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input type="text" value={editingTask.title} onChange={e => setEditingTask({ ...editingTask, title: e.target.value })} className="block w-full px-3 py-2 transition duration-150 ease-in-out border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50" />
              <input type="datetime-local" value={editingTask.dueDate} onChange={e => setEditingTask({ ...editingTask, dueDate: e.target.value })} className="block w-full px-3 py-2 transition duration-150 ease-in-out border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50" />
              <select value={editingTask.type} onChange={e => setEditingTask({ ...editingTask, type: e.target.value as any })} className="block w-full px-3 py-2 transition duration-150 ease-in-out border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"><option value="one-time">一次性</option><option value="recurring">周期性</option></select>
              {editingTask.type === 'recurring' && (<input type="number" placeholder="间隔 (天)" value={editingTask.intervalDays || ''} onChange={e => setEditingTask({ ...editingTask, intervalDays: Number(e.target.value) })} min="1" className="block w-full px-3 py-2 transition duration-150 ease-in-out border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50" />)}
              <div className="flex justify-end gap-4 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">保存更改</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const TaskCard = ({ task, onComplete, onEdit, onDelete }: { task: Task; onComplete?: (id: string) => void; onEdit?: (task: Task) => void; onDelete?: (id: string) => void; }) => (
  <div className={`p-4 bg-white border border-gray-200 rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-1 ${task.isCompleted ? 'opacity-60' : ''}`}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className={`font-semibold text-lg ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>{task.title}</p>
        <p className="flex items-center gap-2 mt-1 text-sm text-gray-500">
          <Calendar size={14} />
          <span>{task.isCompleted ? '完成于' : '截止于'}: {formatInUTC8(task.dueDate)}</span>
          {task.type === 'recurring' && !task.isCompleted && <span className="text-xs font-medium text-blue-600 bg-blue-100 rounded-full px-2 py-0.5">每 {task.intervalDays} 天</span>}
        </p>
      </div>
      {!task.isCompleted && onComplete && onEdit && onDelete && (
        <div className="flex gap-2 self-end sm:self-center flex-shrink-0">
          <button onClick={() => onComplete(task.id)} className="p-2 text-green-600 transition-colors rounded-lg hover:bg-green-100" title="完成"><Check size={18} /></button>
          <button onClick={() => onEdit(task)} className="p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-100" title="编辑"><Pencil size={18} /></button>
          <button onClick={() => onDelete(task.id)} className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-100" title="删除"><Trash2 size={18} /></button>
        </div>
      )}
    </div>
  </div>
);

const TaskList = ({ title, tasks, ...props }: { title: string; tasks: Task[]; onComplete?: (id: string) => void; onEdit?: (task: Task) => void; onDelete?: (id: string) => void; }) => (
  <section>
    <h2 className="mb-4 text-xl font-bold text-slate-600">{title}</h2>
    <div className="space-y-3">
      {tasks.length > 0 ? tasks.map(task => <TaskCard key={task.id} task={task} {...props} />) : <p className="py-4 text-center text-gray-500 bg-gray-100 rounded-lg">{title === '已完成任务' ? '还没有已完成的任务。' : '这里没有任务，干得漂亮！'}</p>}
    </div>
  </section>
);