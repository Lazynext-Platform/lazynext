// ── Workflow Builder v2 — Node Library ──
// Provides trigger types, action types, integration types, condition
// operators, default node templates, and config schemas for the visual
// workflow editor.

import type {
  WorkflowNodeType,
  WorkflowTriggerType,
  ConditionOperator,
  WorkflowNode,
} from './workflow-types';

// ── Config schema definition ──

export interface ConfigFieldSchema {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'array' | 'object' | 'date';
  required?: boolean;
  options?: string[];
  default?: unknown;
  description?: string;
}

export interface NodeSchema {
  nodeType: WorkflowNodeType;
  category: 'trigger' | 'logic' | 'action' | 'integration' | 'flow';
  label: string;
  description: string;
  fields: ConfigFieldSchema[];
}

export interface TriggerTypeDefinition {
  type: WorkflowTriggerType;
  label: string;
  description: string;
  fields: ConfigFieldSchema[];
}

export interface ActionTypeDefinition {
  action: string;
  label: string;
  description: string;
  fields: ConfigFieldSchema[];
}

export interface IntegrationTypeDefinition {
  integration: string;
  label: string;
  description: string;
  fields: ConfigFieldSchema[];
}

// ── Trigger types ──

const TRIGGER_TYPES: TriggerTypeDefinition[] = [
  {
    type: 'manual',
    label: 'Manual',
    description: 'Start the workflow manually from the UI or API.',
    fields: [],
  },
  {
    type: 'schedule',
    label: 'Schedule',
    description: 'Run on a recurring cron schedule.',
    fields: [
      {
        key: 'cron',
        label: 'Cron Expression',
        type: 'string',
        required: true,
        default: '0 * * * *',
        description: 'Standard 5-field cron expression.',
      },
      {
        key: 'timezone',
        label: 'Timezone',
        type: 'string',
        default: 'UTC',
      },
    ],
  },
  {
    type: 'event',
    label: 'Event',
    description: 'Start when a platform event is emitted.',
    fields: [
      {
        key: 'eventType',
        label: 'Event Type',
        type: 'string',
        required: true,
        default: 'task.created',
      },
      {
        key: 'filter',
        label: 'Filter Expression',
        type: 'string',
        description: 'Optional JSON-path filter expression.',
      },
    ],
  },
  {
    type: 'webhook',
    label: 'Webhook',
    description: 'Start when an external webhook is received.',
    fields: [
      {
        key: 'method',
        label: 'HTTP Method',
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        default: 'POST',
      },
      {
        key: 'path',
        label: 'Path',
        type: 'string',
        default: '/webhook',
      },
      {
        key: 'secret',
        label: 'Secret',
        type: 'string',
        description: 'Optional shared secret for HMAC verification.',
      },
    ],
  },
  {
    type: 'condition',
    label: 'Condition Trigger',
    description: 'Start when a condition becomes true (evaluated on a schedule).',
    fields: [
      {
        key: 'field',
        label: 'Field',
        type: 'string',
        required: true,
      },
      {
        key: 'operator',
        label: 'Operator',
        type: 'select',
        options: ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains'],
        default: 'eq',
      },
      {
        key: 'value',
        label: 'Value',
        type: 'string',
        required: true,
      },
      {
        key: 'checkInterval',
        label: 'Check Interval (seconds)',
        type: 'number',
        default: 60,
      },
    ],
  },
];

// ── Action types ──

const ACTION_TYPES: ActionTypeDefinition[] = [
  {
    action: 'create_task',
    label: 'Create Task',
    description: 'Create a new task in the CRM.',
    fields: [
      { key: 'title', label: 'Title', type: 'string', required: true },
      { key: 'description', label: 'Description', type: 'string' },
      { key: 'assigneeId', label: 'Assignee ID', type: 'string' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    ],
  },
  {
    action: 'update_task',
    label: 'Update Task',
    description: 'Update an existing task.',
    fields: [
      { key: 'taskId', label: 'Task ID', type: 'string', required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['todo', 'in_progress', 'done', 'cancelled'] },
      { key: 'assigneeId', label: 'Assignee ID', type: 'string' },
    ],
  },
  {
    action: 'create_goal',
    label: 'Create Goal',
    description: 'Create a new goal/OKR.',
    fields: [
      { key: 'title', label: 'Title', type: 'string', required: true },
      { key: 'target', label: 'Target Value', type: 'number', required: true },
      { key: 'metric', label: 'Metric', type: 'string' },
      { key: 'deadline', label: 'Deadline', type: 'date' },
    ],
  },
  {
    action: 'send_notification',
    label: 'Send Notification',
    description: 'Send an in-app notification to a user.',
    fields: [
      { key: 'userId', label: 'User ID', type: 'string', required: true },
      { key: 'title', label: 'Title', type: 'string', required: true },
      { key: 'message', label: 'Message', type: 'string', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['info', 'success', 'warning', 'error'], default: 'info' },
    ],
  },
  {
    action: 'create_event',
    label: 'Create Event',
    description: 'Create a calendar event.',
    fields: [
      { key: 'title', label: 'Title', type: 'string', required: true },
      { key: 'start', label: 'Start', type: 'date', required: true },
      { key: 'end', label: 'End', type: 'date', required: true },
      { key: 'attendees', label: 'Attendees', type: 'array' },
    ],
  },
  {
    action: 'update_record',
    label: 'Update Record',
    description: 'Update a CRM record by type and id.',
    fields: [
      { key: 'recordType', label: 'Record Type', type: 'select', options: ['customer', 'deal', 'task', 'goal'], required: true },
      { key: 'recordId', label: 'Record ID', type: 'string', required: true },
      { key: 'fields', label: 'Fields (JSON)', type: 'object' },
    ],
  },
  {
    action: 'assign_tag',
    label: 'Assign Tag',
    description: 'Add a tag to a record.',
    fields: [
      { key: 'recordType', label: 'Record Type', type: 'string', required: true },
      { key: 'recordId', label: 'Record ID', type: 'string', required: true },
      { key: 'tag', label: 'Tag', type: 'string', required: true },
    ],
  },
  {
    action: 'log_activity',
    label: 'Log Activity',
    description: 'Record an activity log entry.',
    fields: [
      { key: 'type', label: 'Activity Type', type: 'string', required: true },
      { key: 'description', label: 'Description', type: 'string', required: true },
      { key: 'metadata', label: 'Metadata (JSON)', type: 'object' },
    ],
  },
];

// ── Integration types ──

const INTEGRATION_TYPES: IntegrationTypeDefinition[] = [
  {
    integration: 'http_request',
    label: 'HTTP Request',
    description: 'Make an outbound HTTP request.',
    fields: [
      { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default: 'GET' },
      { key: 'url', label: 'URL', type: 'string', required: true },
      { key: 'headers', label: 'Headers (JSON)', type: 'object' },
      { key: 'body', label: 'Body (JSON)', type: 'object' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 30000 },
    ],
  },
  {
    integration: 'database_query',
    label: 'Database Query',
    description: 'Run a database query (read-only).',
    fields: [
      { key: 'model', label: 'Model', type: 'string', required: true },
      { key: 'operation', label: 'Operation', type: 'select', options: ['findUnique', 'findMany', 'count', 'aggregate'], default: 'findMany' },
      { key: 'query', label: 'Query (JSON)', type: 'object' },
    ],
  },
  {
    integration: 'ai_generate',
    label: 'AI Generate',
    description: 'Generate text via the Atlas AI API.',
    fields: [
      { key: 'prompt', label: 'Prompt', type: 'string', required: true },
      { key: 'model', label: 'Model', type: 'string', default: 'atlas-default' },
      { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 1000 },
      { key: 'temperature', label: 'Temperature', type: 'number', default: 0.7 },
    ],
  },
  {
    integration: 'webhook_send',
    label: 'Send Webhook',
    description: 'Send a webhook to an external endpoint.',
    fields: [
      { key: 'url', label: 'URL', type: 'string', required: true },
      { key: 'event', label: 'Event Name', type: 'string', required: true },
      { key: 'payload', label: 'Payload (JSON)', type: 'object' },
      { key: 'secret', label: 'Signing Secret', type: 'string' },
    ],
  },
  {
    integration: 'email_send',
    label: 'Send Email',
    description: 'Send a transactional email.',
    fields: [
      { key: 'to', label: 'To', type: 'string', required: true },
      { key: 'subject', label: 'Subject', type: 'string', required: true },
      { key: 'body', label: 'Body', type: 'string', required: true },
      { key: 'templateId', label: 'Template ID', type: 'string' },
    ],
  },
];

// ── Condition operators ──

const CONDITION_OPERATORS: Array<{ operator: ConditionOperator; label: string; description: string }> = [
  { operator: 'eq', label: 'Equals', description: 'Field equals value.' },
  { operator: 'ne', label: 'Not Equals', description: 'Field does not equal value.' },
  { operator: 'gt', label: 'Greater Than', description: 'Field is greater than value.' },
  { operator: 'lt', label: 'Less Than', description: 'Field is less than value.' },
  { operator: 'gte', label: 'Greater Than or Equal', description: 'Field is greater than or equal to value.' },
  { operator: 'lte', label: 'Less Than or Equal', description: 'Field is less than or equal to value.' },
  { operator: 'contains', label: 'Contains', description: 'Field contains value (string or array).' },
  { operator: 'startsWith', label: 'Starts With', description: 'Field starts with value.' },
  { operator: 'endsWith', label: 'Ends With', description: 'Field ends with value.' },
  { operator: 'in', label: 'In', description: 'Field is in the list of values.' },
  { operator: 'notIn', label: 'Not In', description: 'Field is not in the list of values.' },
  { operator: 'empty', label: 'Is Empty', description: 'Field is empty/null/undefined.' },
  { operator: 'notEmpty', label: 'Is Not Empty', description: 'Field has a value.' },
];

// ── Node schemas (by node type) ──

const NODE_SCHEMAS: NodeSchema[] = [
  {
    nodeType: 'trigger',
    category: 'trigger',
    label: 'Trigger',
    description: 'The starting point of a workflow.',
    fields: [
      { key: 'type', label: 'Trigger Type', type: 'select', options: ['manual', 'schedule', 'event', 'webhook', 'condition'], required: true, default: 'manual' },
    ],
  },
  {
    nodeType: 'action',
    category: 'action',
    label: 'Action',
    description: 'Perform a CRM or platform action.',
    fields: [
      { key: 'action', label: 'Action', type: 'select', options: ACTION_TYPES.map((a) => a.action), required: true },
    ],
  },
  {
    nodeType: 'condition',
    category: 'logic',
    label: 'Condition',
    description: 'Branch the workflow based on a condition.',
    fields: [
      { key: 'field', label: 'Field', type: 'string', required: true },
      { key: 'operator', label: 'Operator', type: 'select', options: CONDITION_OPERATORS.map((o) => o.operator), required: true, default: 'eq' },
      { key: 'value', label: 'Value', type: 'string' },
    ],
  },
  {
    nodeType: 'parallel',
    category: 'flow',
    label: 'Parallel',
    description: 'Run multiple branches concurrently.',
    fields: [
      { key: 'branches', label: 'Branches', type: 'array', description: 'Array of branch definitions.' },
    ],
  },
  {
    nodeType: 'loop',
    category: 'flow',
    label: 'Loop',
    description: 'Iterate over items or repeat until a condition is met.',
    fields: [
      { key: 'type', label: 'Loop Type', type: 'select', options: ['for', 'while', 'forEach'], required: true, default: 'forEach' },
      { key: 'items', label: 'Items', type: 'string', description: 'Variable reference or literal array.' },
      { key: 'condition', label: 'Condition', type: 'string', description: 'For while loops.' },
      { key: 'maxIterations', label: 'Max Iterations', type: 'number', default: 100 },
    ],
  },
  {
    nodeType: 'delay',
    category: 'flow',
    label: 'Delay',
    description: 'Pause execution for a duration.',
    fields: [
      { key: 'duration', label: 'Duration', type: 'number', required: true, default: 60 },
      { key: 'unit', label: 'Unit', type: 'select', options: ['seconds', 'minutes', 'hours', 'days'], default: 'seconds' },
    ],
  },
  {
    nodeType: 'integration',
    category: 'integration',
    label: 'Integration',
    description: 'Call an external integration.',
    fields: [
      { key: 'integration', label: 'Integration', type: 'select', options: INTEGRATION_TYPES.map((i) => i.integration), required: true },
    ],
  },
  {
    nodeType: 'approval',
    category: 'flow',
    label: 'Approval',
    description: 'Pause and wait for human approval.',
    fields: [
      { key: 'approverId', label: 'Approver ID', type: 'string', required: true },
      { key: 'message', label: 'Message', type: 'string' },
      { key: 'timeoutHours', label: 'Timeout (hours)', type: 'number', default: 72 },
    ],
  },
  {
    nodeType: 'notification',
    category: 'action',
    label: 'Notification',
    description: 'Send a notification.',
    fields: [
      { key: 'userId', label: 'User ID', type: 'string', required: true },
      { key: 'title', label: 'Title', type: 'string', required: true },
      { key: 'message', label: 'Message', type: 'string', required: true },
      { key: 'channel', label: 'Channel', type: 'select', options: ['in_app', 'email', 'sms', 'slack'], default: 'in_app' },
    ],
  },
  {
    nodeType: 'transform',
    category: 'logic',
    label: 'Transform',
    description: 'Transform data with a mapping or expression.',
    fields: [
      { key: 'expression', label: 'Expression', type: 'string', required: true, description: 'JavaScript-like expression or JSON mapping.' },
      { key: 'input', label: 'Input Variable', type: 'string' },
    ],
  },
  {
    nodeType: 'http',
    category: 'integration',
    label: 'HTTP',
    description: 'Make an HTTP request.',
    fields: [
      { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default: 'GET' },
      { key: 'url', label: 'URL', type: 'string', required: true },
      { key: 'headers', label: 'Headers (JSON)', type: 'object' },
      { key: 'body', label: 'Body (JSON)', type: 'object' },
    ],
  },
  {
    nodeType: 'ai',
    category: 'integration',
    label: 'AI',
    description: 'Generate content via AI.',
    fields: [
      { key: 'prompt', label: 'Prompt', type: 'string', required: true },
      { key: 'model', label: 'Model', type: 'string', default: 'atlas-default' },
      { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 1000 },
    ],
  },
  {
    nodeType: 'database',
    category: 'integration',
    label: 'Database',
    description: 'Query or mutate the database.',
    fields: [
      { key: 'model', label: 'Model', type: 'string', required: true },
      { key: 'operation', label: 'Operation', type: 'select', options: ['create', 'update', 'delete', 'findUnique', 'findMany'], required: true },
      { key: 'data', label: 'Data (JSON)', type: 'object' },
    ],
  },
];

// ── Service ──

export const WorkflowNodeLibrary = {
  /** Return all available trigger type definitions. */
  getTriggerTypes(): TriggerTypeDefinition[] {
    return TRIGGER_TYPES;
  },

  /** Return all available action type definitions. */
  getActionTypes(): ActionTypeDefinition[] {
    return ACTION_TYPES;
  },

  /** Return all available integration type definitions. */
  getIntegrationTypes(): IntegrationTypeDefinition[] {
    return INTEGRATION_TYPES;
  },

  /** Return all condition operators with labels and descriptions. */
  getConditionOperators(): Array<{ operator: ConditionOperator; label: string; description: string }> {
    return CONDITION_OPERATORS;
  },

  /** Return the default config template for a given node type. */
  getNodeTemplate(nodeType: WorkflowNodeType): Record<string, unknown> {
    const schema = NODE_SCHEMAS.find((s) => s.nodeType === nodeType);
    if (!schema) return {};
    const template: Record<string, unknown> = {};
    for (const field of schema.fields) {
      if (field.default !== undefined) {
        template[field.key] = field.default;
      }
    }
    // For trigger nodes, also seed the trigger-type-specific defaults.
    if (nodeType === 'trigger' && template.type) {
      const trig = TRIGGER_TYPES.find((t) => t.type === template.type);
      if (trig) {
        for (const field of trig.fields) {
          if (field.default !== undefined) {
            template[field.key] = field.default;
          }
        }
      }
    }
    // For action nodes, seed action-specific defaults.
    if (nodeType === 'action' && template.action) {
      const act = ACTION_TYPES.find((a) => a.action === template.action);
      if (act) {
        for (const field of act.fields) {
          if (field.default !== undefined) {
            template[field.key] = field.default;
          }
        }
      }
    }
    // For integration nodes, seed integration-specific defaults.
    if (nodeType === 'integration' && template.integration) {
      const integ = INTEGRATION_TYPES.find((i) => i.integration === template.integration);
      if (integ) {
        for (const field of integ.fields) {
          if (field.default !== undefined) {
            template[field.key] = field.default;
          }
        }
      }
    }
    return template;
  },

  /** Return the config schema for a given node type. */
  getNodeSchema(nodeType: WorkflowNodeType): NodeSchema | null {
    return NODE_SCHEMAS.find((s) => s.nodeType === nodeType) || null;
  },

  /** Return all node types grouped by category. */
  getAllNodeTypes(): Record<string, NodeSchema[]> {
    const grouped: Record<string, NodeSchema[]> = {};
    for (const schema of NODE_SCHEMAS) {
      if (!grouped[schema.category]) grouped[schema.category] = [];
      grouped[schema.category].push(schema);
    }
    return grouped;
  },

  /** Create a fully-formed WorkflowNode with defaults for a given type. */
  createNode(nodeType: WorkflowNodeType, name?: string): WorkflowNode {
    const schema = NODE_SCHEMAS.find((s) => s.nodeType === nodeType);
    return {
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: nodeType,
      name: name || schema?.label || nodeType,
      config: this.getNodeTemplate(nodeType),
      position: { x: 0, y: 0 },
    };
  },
};
