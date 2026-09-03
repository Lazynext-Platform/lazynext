'use client';

import { useState } from 'react';
import { Plus, CheckSquare } from 'lucide-react';
import { Card, Button, Input, Badge } from '@/components/ui';

interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
}

interface TaskListProps {
  projectId: string;
  initialTasks: Task[];
}

export function TaskList({ projectId, initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: newTitle.trim(), priority: newPriority }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create task');
      }
      const { task } = await res.json();
      setTasks([...tasks, task]);
      setNewTitle('');
      setNewPriority('medium');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
      }
    } catch {}
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="heading-display text-sm">Tasks ({tasks.length})</h2>
        <Button size="sm" variant="ghost" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Add task
        </Button>
      </div>

      {showForm && (
        <form onSubmit={addTask} className="mb-4 flex flex-col gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Task title"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="border-2 bg-surface px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <Button type="submit" size="sm" disabled={loading || !newTitle.trim()}>
              {loading ? 'Adding...' : 'Add'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      )}

      {tasks.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <CheckSquare className="h-8 w-8 mx-auto text-fg-muted mb-2" />
          <p className="text-sm text-fg-muted">No tasks yet. Click &ldquo;Add task&rdquo; to create one.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 border-2 bg-surface"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => toggleStatus(task)}
                  className="shrink-0"
                  aria-label={task.status === 'done' ? 'Mark as todo' : 'Mark as done'}
                >
                  <CheckSquare
                    className={`h-4 w-4 ${task.status === 'done' ? 'text-success' : 'text-fg-muted'}`}
                    style={task.status === 'done' ? { color: 'var(--c-success)' } : undefined}
                  />
                </button>
                <span
                  className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-fg-muted' : ''}`}
                >
                  {task.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge>{task.priority}</Badge>
                <Badge variant={task.status === 'done' ? 'success' : 'default'}>{task.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
