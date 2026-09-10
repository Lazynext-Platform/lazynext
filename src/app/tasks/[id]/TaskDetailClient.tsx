'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, Clock, Square, AlertCircle, Play, Square as StopSquare, Plus, X, Loader2 } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

interface TaskDetailClientProps {
  taskId: string;
  currentStatus: string;
  activeEntryId: string | null;
  otherTasks: { id: string; title: string; status: string }[];
  existingDependencies: string[];
}

const STATUSES = [
  { value: 'todo', label: 'To Do', icon: Square, variant: 'default' as const },
  { value: 'in_progress', label: 'In Progress', icon: Play, variant: 'info' as const },
  { value: 'done', label: 'Done', icon: CheckSquare, variant: 'success' as const },
  { value: 'blocked', label: 'Blocked', icon: AlertCircle, variant: 'danger' as const },
];

export function TaskDetailClient({
  taskId,
  currentStatus,
  activeEntryId,
  otherTasks,
  existingDependencies,
}: TaskDetailClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [activeEntry, setActiveEntry] = useState<string | null>(activeEntryId);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [depError, setDepError] = useState<string | null>(null);
  const [depSuccess, setDepSuccess] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingTime, setUpdatingTime] = useState(false);
  const [showDepForm, setShowDepForm] = useState(false);
  const [selectedDep, setSelectedDep] = useState('');
  const [addingDep, setAddingDep] = useState(false);

  async function handleStatusChange(newStatus: string) {
    setUpdatingStatus(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to update status');
      }
      setStatus(newStatus);
      router.refresh();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleStartTime() {
    setUpdatingTime(true);
    setTimeError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start time tracking');
      }
      const { entry } = await res.json();
      setActiveEntry(entry.id);
      router.refresh();
    } catch (err) {
      setTimeError(err instanceof Error ? err.message : 'Failed to start time tracking');
    } finally {
      setUpdatingTime(false);
    }
  }

  async function handleStopTime() {
    if (!activeEntry) return;
    setUpdatingTime(true);
    setTimeError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/time/${activeEntry}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to stop time tracking');
      }
      setActiveEntry(null);
      router.refresh();
    } catch (err) {
      setTimeError(err instanceof Error ? err.message : 'Failed to stop time tracking');
    } finally {
      setUpdatingTime(false);
    }
  }

  async function handleAddDependency(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDep) return;
    setAddingDep(true);
    setDepError(null);
    setDepSuccess(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dependsOnId: selectedDep }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to add dependency');
      }
      setDepSuccess('Dependency added');
      setSelectedDep('');
      setShowDepForm(false);
      router.refresh();
      setTimeout(() => setDepSuccess(null), 2000);
    } catch (err) {
      setDepError(err instanceof Error ? err.message : 'Failed to add dependency');
    } finally {
      setAddingDep(false);
    }
  }

  async function handleRemoveDependency(dependsOnId: string) {
    setDepError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dependsOnId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to remove dependency');
      }
      router.refresh();
    } catch (err) {
      setDepError(err instanceof Error ? err.message : 'Failed to remove dependency');
    }
  }

  const availableTasks = otherTasks.filter((t) => !existingDependencies.includes(t.id));

  return (
    <Card className="p-5">
      <h2 className="heading-display text-sm mb-3">Actions</h2>

      {/* Status buttons */}
      <div className="mb-4">
        <span className="text-xs text-fg-secondary block mb-2">Update Status</span>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s) => {
            const Icon = s.icon;
            const isActive = status === s.value;
            return (
              <button
                key={s.value}
                onClick={() => handleStatusChange(s.value)}
                disabled={updatingStatus || isActive}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-2 rounded-md transition-colors disabled:opacity-50"
                style={{
                  borderColor: isActive ? 'var(--c-accent)' : 'var(--c-ink)',
                  backgroundColor: isActive ? 'var(--c-surface-alt)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <Icon className="h-3 w-3" />
                {s.label}
                {updatingStatus && isActive && <Loader2 className="h-3 w-3 animate-spin" />}
              </button>
            );
          })}
        </div>
        {statusError && <p className="text-xs text-danger mt-2">{statusError}</p>}
      </div>

      {/* Time tracking */}
      <div className="mb-4 pt-4 border-t" style={{ borderColor: 'var(--c-ink)' }}>
        <span className="text-xs text-fg-secondary block mb-2">Time Tracking</span>
        {activeEntry ? (
          <Button
            size="sm"
            variant="danger"
            onClick={handleStopTime}
            disabled={updatingTime}
            className="w-full"
          >
            {updatingTime ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopSquare className="h-4 w-4" />}
            Stop Timer
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleStartTime}
            disabled={updatingTime}
            className="w-full"
          >
            {updatingTime ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start Timer
          </Button>
        )}
        {activeEntry && (
          <div className="flex items-center gap-1 mt-2 text-xs text-info">
            <Clock className="h-3 w-3 animate-pulse" /> Tracking…
          </div>
        )}
        {timeError && <p className="text-xs text-danger mt-2">{timeError}</p>}
      </div>

      {/* Add dependency */}
      <div className="pt-4 border-t" style={{ borderColor: 'var(--c-ink)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-fg-secondary">Add Dependency</span>
          {availableTasks.length > 0 && (
            <button
              onClick={() => setShowDepForm(!showDepForm)}
              className="text-fg-secondary hover:text-fg"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        {showDepForm && availableTasks.length > 0 && (
          <form onSubmit={handleAddDependency} className="space-y-2 mb-2">
            <select
              value={selectedDep}
              onChange={(e) => setSelectedDep(e.target.value)}
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              <option value="">Select a task…</option>
              {availableTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.status})
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={addingDep || !selectedDep} className="flex-1">
                {addingDep ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowDepForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </form>
        )}
        {availableTasks.length === 0 && showDepForm && (
          <p className="text-xs text-fg-muted mb-2">No other tasks available to depend on.</p>
        )}
        {depError && <p className="text-xs text-danger mt-2">{depError}</p>}
        {depSuccess && <p className="text-xs text-success mt-2">{depSuccess}</p>}
      </div>

      {/* Cancel / Delete */}
      <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--c-ink)' }}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleStatusChange('cancelled')}
          disabled={updatingStatus || status === 'cancelled'}
          className="w-full"
        >
          Cancel Task
        </Button>
      </div>
    </Card>
  );
}
