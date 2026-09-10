'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Workflow, Plus, Trash2, Save, Loader2, AlertCircle, Play, Copy,
  Check, GitBranch, Layers, Settings2, Eye, X, ChevronDown, ChevronRight,
  Clock, Activity, Zap,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  WorkflowDefinition,
  WorkflowStats,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeType,
  WorkflowStatus,
  NodeExecution,
} from '@/lib/services/workflow-types';

// ── Node library types (serialized from server) ──

interface ConfigFieldSchema {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'array' | 'object' | 'date';
  required?: boolean;
  options?: string[];
  default?: unknown;
  description?: string;
}

interface NodeSchema {
  nodeType: WorkflowNodeType;
  category: 'trigger' | 'logic' | 'action' | 'integration' | 'flow';
  label: string;
  description: string;
  fields: ConfigFieldSchema[];
}

interface TriggerTypeDef {
  type: string;
  label: string;
  description: string;
  fields: ConfigFieldSchema[];
}

interface ActionTypeDef {
  action: string;
  label: string;
  description: string;
  fields: ConfigFieldSchema[];
}

interface IntegrationTypeDef {
  integration: string;
  label: string;
  description: string;
  fields: ConfigFieldSchema[];
}

interface ConditionOperatorDef {
  operator: string;
  label: string;
  description: string;
}

interface NodeLibraryData {
  triggerTypes: TriggerTypeDef[];
  actionTypes: ActionTypeDef[];
  integrationTypes: IntegrationTypeDef[];
  conditionOperators: ConditionOperatorDef[];
  nodeTypes: Record<string, NodeSchema[]>;
}

// ── Props ──

interface WorkflowBuilderProps {
  organizationId: string;
  workflows: WorkflowDefinition[];
  stats: WorkflowStats;
  nodeLibrary: NodeLibraryData;
}

// ── Status badge colors ──

const STATUS_VARIANT: Record<WorkflowStatus, 'default' | 'success' | 'warning' | 'info' | 'accent'> = {
  draft: 'default',
  published: 'success',
  archived: 'warning',
};

const NODE_ICONS: Record<string, typeof Zap> = {
  trigger: Zap,
  action: Activity,
  condition: GitBranch,
  parallel: Layers,
  loop: Layers,
  delay: Clock,
  integration: Settings2,
  approval: Check,
  notification: Activity,
  transform: Settings2,
  http: Settings2,
  ai: Settings2,
  database: Settings2,
};

// ── Component ──

export function WorkflowBuilder({ organizationId, workflows: initialWorkflows, stats: initialStats, nodeLibrary }: WorkflowBuilderProps) {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(initialWorkflows);
  const [stats, setStats] = useState<WorkflowStats>(initialStats);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // Editor state
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Test run state
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{ nodes: NodeExecution[]; path: string[]; duration: number } | null>(null);

  // Execution history
  const [executions, setExecutions] = useState<Array<{ id: string; status: string; startedAt: string; completedAt?: string }>>([]);
  const [showExecutions, setShowExecutions] = useState(false);

  const selected = useMemo(() => workflows.find((w) => w.id === selectedId) || null, [workflows, selectedId]);

  // Load a workflow into the editor
  const loadWorkflow = useCallback((wf: WorkflowDefinition) => {
    setSelectedId(wf.id);
    setNodes(wf.nodes || []);
    setEdges(wf.edges || []);
    setSelectedNode(null);
    setTestResult(null);
    setExecutions([]);
    setSaveMsg(null);
  }, []);

  // Refresh workflow list
  const refreshList = useCallback(async () => {
    try {
      const res = await fetch('/api/workflows');
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows || []);
      }
      const statsRes = await fetch('/api/workflows/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }
    } catch {
      // ignore
    }
  }, []);

  // Create a new workflow
  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          nodes: [{ id: 'trigger_1', type: 'trigger', name: 'Trigger', config: { type: 'manual' }, position: { x: 100, y: 100 } }],
          edges: [],
          variables: [],
          config: {},
        }),
      });
      const data = await res.json();
      if (res.ok && data.workflow) {
        await refreshList();
        loadWorkflow(data.workflow);
        setShowCreate(false);
        setNewName('');
      } else {
        setError(data.error || 'Failed to create workflow');
      }
    } catch {
      setError('Failed to create workflow');
    }
    setCreating(false);
  };

  // Save the current workflow
  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/workflows/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMsg({ type: 'success', text: 'Saved' });
        await refreshList();
      } else {
        setSaveMsg({ type: 'error', text: data.error || 'Save failed' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Save failed' });
    }
    setSaving(false);
  };

  // Duplicate the selected workflow
  const handleDuplicate = async () => {
    if (!selectedId || !selected) return;
    try {
      const res = await fetch(`/api/workflows/${selectedId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${selected.name} (Copy)` }),
      });
      if (res.ok) {
        await refreshList();
      }
    } catch {
      // ignore
    }
  };

  // Delete a workflow
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedId === id) {
          setSelectedId(null);
          setNodes([]);
          setEdges([]);
        }
        await refreshList();
      }
    } catch {
      // ignore
    }
  };

  // Publish / unpublish
  const handlePublish = async (publish: boolean) => {
    if (!selectedId) return;
    const endpoint = publish ? 'publish' : 'unpublish';
    try {
      const res = await fetch(`/api/workflows/${selectedId}/${endpoint}`, { method: 'POST' });
      if (res.ok) {
        await refreshList();
      }
    } catch {
      // ignore
    }
  };

  // Test run
  const handleTestRun = async () => {
    if (!selectedId) return;
    setTestRunning(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/workflows/${selectedId}/test-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: {} }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult(data.result);
      } else {
        setSaveMsg({ type: 'error', text: data.error || 'Test run failed' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Test run failed' });
    }
    setTestRunning(false);
  };

  // Execute for real
  const handleExecute = async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/workflows/${selectedId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: {} }),
      });
      if (res.ok) {
        setSaveMsg({ type: 'success', text: 'Execution started' });
        loadExecutions();
      } else {
        const data = await res.json();
        setSaveMsg({ type: 'error', text: data.error || 'Execution failed' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Execution failed' });
    }
  };

  // Load execution history
  const loadExecutions = async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/workflows/${selectedId}/executions`);
      if (res.ok) {
        const data = await res.json();
        setExecutions((data.executions || []).map((e: { id: string; status: string; startedAt: string; completedAt?: string }) => ({
          id: e.id,
          status: e.status,
          startedAt: e.startedAt,
          completedAt: e.completedAt,
        })));
        setShowExecutions(true);
      }
    } catch {
      // ignore
    }
  };

  // Add a node from the palette
  const addNode = useCallback((nodeType: WorkflowNodeType) => {
    const schema = Object.values(nodeLibrary.nodeTypes).flat().find((s) => s.nodeType === nodeType);
    const config: Record<string, unknown> = {};
    for (const field of schema?.fields || []) {
      if (field.default !== undefined) config[field.key] = field.default;
    }
    const node: WorkflowNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: nodeType,
      name: schema?.label || nodeType,
      config,
      position: { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 },
    };
    setNodes([...nodes, node]);
    setSelectedNode(node);
  }, [nodes, nodeLibrary.nodeTypes]);

  // Update selected node config
  const updateNodeConfig = (key: string, value: unknown) => {
    if (!selectedNode) return;
    const updated = { ...selectedNode, config: { ...selectedNode.config, [key]: value } };
    setSelectedNode(updated);
    setNodes(nodes.map((n) => (n.id === updated.id ? updated : n)));
  };

  // Delete a node
  const deleteNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
    setEdges(edges.filter((e) => e.source !== id && e.target !== id));
    if (selectedNode?.id === id) setSelectedNode(null);
  };

  // Add an edge between two nodes
  const addEdge = (source: string, target: string, handle?: string) => {
    const edge: WorkflowEdge = {
      id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source,
      target,
      sourceHandle: handle,
    };
    setEdges([...edges, edge]);
  };

  const allNodeSchemas = useMemo(() => Object.values(nodeLibrary.nodeTypes).flat(), [nodeLibrary]);

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-fg-secondary">Total</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-fg-secondary">Published</p>
          <p className="text-2xl font-bold mt-1 text-success">{stats.byStatus?.published || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-fg-secondary">Drafts</p>
          <p className="text-2xl font-bold mt-1">{stats.byStatus?.draft || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-fg-secondary">Executions</p>
          <p className="text-2xl font-bold mt-1 text-accent-primary">{stats.executionCount}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Workflow list */}
        <section className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Workflows</h2>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="h-4 w-4" /> New
            </Button>
          </div>

          {showCreate && (
            <Card className="p-3 space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Workflow name"
                className="w-full rounded border border-border bg-app px-3 py-2 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setNewName(''); }}>
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {error && (
            <div className="rounded border border-danger/30 bg-danger/10 p-2 text-xs text-danger flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {error}
            </div>
          )}

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {workflows.length === 0 ? (
              <p className="text-xs text-fg-secondary py-4 text-center">No workflows yet.</p>
            ) : (
              workflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => loadWorkflow(wf)}
                  className={`w-full text-left rounded-lg border p-3 transition hover:border-accent/40 ${
                    selectedId === wf.id ? 'border-accent bg-accent/5' : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{wf.name}</span>
                    <Badge variant={STATUS_VARIANT[wf.status]}>{wf.status}</Badge>
                  </div>
                  {wf.description && (
                    <p className="text-xs text-fg-secondary mt-1 truncate">{wf.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-fg-faint">v{wf.version}</span>
                    <span className="text-xs text-fg-faint">{wf.nodes?.length || 0} nodes</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(wf.id); }}
                      className="ml-auto text-fg-faint hover:text-danger"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Center: Canvas / Editor */}
        <section className="lg:col-span-6 space-y-4">
          {selected ? (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold flex-1 truncate">{selected.name}</h2>
                <Button size="sm" variant="ghost" onClick={handleDuplicate}>
                  <Copy className="h-4 w-4" /> Duplicate
                </Button>
                <Button size="sm" variant="ghost" onClick={handleTestRun} disabled={testRunning}>
                  {testRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Test Run
                </Button>
                <Button size="sm" variant="secondary" onClick={handleExecute}>
                  <Play className="h-4 w-4" /> Execute
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
                {selected.status === 'published' ? (
                  <Button size="sm" variant="ghost" onClick={() => handlePublish(false)}>Unpublish</Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => handlePublish(true)}>Publish</Button>
                )}
              </div>

              {saveMsg && (
                <div className={`rounded border p-2 text-xs flex items-center gap-1 ${
                  saveMsg.type === 'success' ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/10 text-danger'
                }`}>
                  {saveMsg.type === 'success' ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {saveMsg.text}
                  <button onClick={() => setSaveMsg(null)} className="ml-auto"><X className="h-3 w-3" /></button>
                </div>
              )}

              {/* Node canvas */}
              <Card className="p-4 min-h-[400px]">
                <div className="space-y-2">
                  {nodes.length === 0 ? (
                    <EmptyState icon={Workflow} title="No nodes" description="Add nodes from the palette on the right." />
                  ) : (
                    nodes.map((node) => {
                      const Icon = NODE_ICONS[node.type] || Activity;
                      const isSelected = selectedNode?.id === node.id;
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                            isSelected ? 'border-accent bg-accent/5' : 'border-border bg-card hover:border-accent/30'
                          }`}
                        >
                          <Icon className="h-4 w-4 text-accent-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{node.name}</p>
                            <p className="text-xs text-fg-faint">{node.type}</p>
                          </div>
                          {node.type !== 'trigger' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                              className="text-fg-faint hover:text-danger"
                              aria-label="Delete node"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              {/* Test run results */}
              {testResult && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-accent-primary" />
                    <h3 className="text-sm font-semibold">Test Run Results</h3>
                    <Badge variant="info">{testResult.duration}ms</Badge>
                    <button onClick={() => setTestResult(null)} className="ml-auto"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-fg-secondary">Path: {testResult.path.join(' → ') || 'empty'}</p>
                    {testResult.nodes.map((ne, i) => (
                      <div key={i} className="rounded border border-border p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{ne.nodeId}</span>
                          <Badge variant={ne.status === 'completed' ? 'success' : ne.status === 'failed' ? 'danger' : 'info'}>
                            {ne.status}
                          </Badge>
                        </div>
                        {ne.output !== undefined && (
                          <pre className="mt-1 text-fg-faint overflow-x-auto text-xs">
                            {JSON.stringify(ne.output, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Execution history */}
              {showExecutions && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4 text-accent-primary" />
                    <h3 className="text-sm font-semibold">Execution History</h3>
                    <button onClick={() => setShowExecutions(false)} className="ml-auto"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {executions.length === 0 ? (
                      <p className="text-xs text-fg-secondary text-center py-4">No executions yet.</p>
                    ) : (
                      executions.map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between rounded border border-border p-2 text-xs">
                          <span className="font-mono truncate">{ex.id}</span>
                          <Badge variant={ex.status === 'completed' ? 'success' : ex.status === 'failed' ? 'danger' : 'info'}>
                            {ex.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-8">
              <EmptyState
                icon={Workflow}
                title="Select a workflow"
                description="Choose a workflow from the list, or create a new one to start building."
              />
            </Card>
          )}
        </section>

        {/* Right: Node palette + config */}
        <section className="lg:col-span-3 space-y-4">
          {/* Node palette */}
          <div>
            <h2 className="text-sm font-semibold mb-2">Node Palette</h2>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {allNodeSchemas.map((schema) => {
                const Icon = NODE_ICONS[schema.nodeType] || Activity;
                return (
                  <button
                    key={schema.nodeType}
                    onClick={() => addNode(schema.nodeType)}
                    disabled={!selectedId || schema.nodeType === 'trigger'}
                    className="w-full flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-left transition hover:border-accent/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon className="h-4 w-4 text-accent-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{schema.label}</p>
                      <p className="text-xs text-fg-faint truncate">{schema.description}</p>
                    </div>
                    <Plus className="h-3 w-3 text-accent" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Node config panel */}
          {selectedNode && (
            <div>
              <h2 className="text-sm font-semibold mb-2">Node Config</h2>
              <Card className="p-3 space-y-3">
                <div>
                  <label className="text-xs text-fg-secondary">Name</label>
                  <input
                    type="text"
                    value={selectedNode.name}
                    onChange={(e) => {
                      const updated = { ...selectedNode, name: e.target.value };
                      setSelectedNode(updated);
                      setNodes(nodes.map((n) => (n.id === updated.id ? updated : n)));
                    }}
                    className="w-full rounded border border-border bg-app px-2 py-1 text-sm mt-1"
                  />
                </div>
                {(() => {
                  const schema = allNodeSchemas.find((s) => s.nodeType === selectedNode.type);
                  if (!schema) return null;
                  return schema.fields.map((field) => (
                    <div key={field.key}>
                      <label className="text-xs text-fg-secondary">
                        {field.label}
                        {field.required && <span className="text-danger"> *</span>}
                      </label>
                      {field.type === 'select' && field.options ? (
                        <select
                          value={String(selectedNode.config?.[field.key] ?? '')}
                          onChange={(e) => updateNodeConfig(field.key, e.target.value)}
                          className="w-full rounded border border-border bg-app px-2 py-1 text-sm mt-1"
                        >
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'boolean' ? (
                        <input
                          type="checkbox"
                          checked={Boolean(selectedNode.config?.[field.key])}
                          onChange={(e) => updateNodeConfig(field.key, e.target.checked)}
                          className="mt-1"
                        />
                      ) : field.type === 'number' ? (
                        <input
                          type="number"
                          value={Number(selectedNode.config?.[field.key] ?? 0)}
                          onChange={(e) => updateNodeConfig(field.key, Number(e.target.value))}
                          className="w-full rounded border border-border bg-app px-2 py-1 text-sm mt-1"
                        />
                      ) : (
                        <input
                          type="text"
                          value={String(selectedNode.config?.[field.key] ?? '')}
                          onChange={(e) => updateNodeConfig(field.key, e.target.value)}
                          className="w-full rounded border border-border bg-app px-2 py-1 text-sm mt-1"
                        />
                      )}
                      {field.description && (
                        <p className="text-xs text-fg-faint mt-1">{field.description}</p>
                      )}
                    </div>
                  ));
                })()}
              </Card>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
