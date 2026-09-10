// ── Notification defaults, labels, and constants ──
//
// The Notification model (prisma/schema.prisma) only has: id, userId,
// workspaceId, type, title, body, read, createdAt. Extra fields (category,
// priority, actionUrl, metadata, organizationId, createdBy, archived) are
// encoded as a JSON envelope inside the `body` column — see
// notification-service.ts for the serialization logic.

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'mention'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'agent_completed'
  | 'agent_failed'
  | 'budget_alert'
  | 'security_alert'
  | 'deployment_status'
  | 'comment'
  | 'system'
  | 'deadline_approaching'
  | 'goal_progress'
  | 'plan_updated';

export type NotificationCategory =
  | 'task'
  | 'agent'
  | 'approval'
  | 'security'
  | 'system'
  | 'social'
  | 'financial'
  | 'deployment';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type DigestFrequency = 'instant' | 'hourly' | 'daily' | 'weekly';

export const DIGEST_FREQUENCIES: DigestFrequency[] = [
  'instant',
  'hourly',
  'daily',
  'weekly',
];

/** Map a notification type to its category. */
export const TYPE_TO_CATEGORY: Record<NotificationType, NotificationCategory> = {
  task_assigned: 'task',
  task_completed: 'task',
  mention: 'social',
  approval_requested: 'approval',
  approval_granted: 'approval',
  approval_denied: 'approval',
  agent_completed: 'agent',
  agent_failed: 'agent',
  budget_alert: 'financial',
  security_alert: 'security',
  deployment_status: 'deployment',
  comment: 'social',
  system: 'system',
  deadline_approaching: 'task',
  goal_progress: 'system',
  plan_updated: 'system',
};

export interface NotificationTypeMeta {
  type: NotificationType;
  label: string;
  category: NotificationCategory;
  /** Default delivery settings for a new user. */
  defaultInApp: boolean;
  defaultEmail: boolean;
}

/** All notification types with labels and default delivery settings. */
export const NOTIFICATION_TYPES: NotificationTypeMeta[] = [
  { type: 'task_assigned', label: 'Task Assigned', category: 'task', defaultInApp: true, defaultEmail: true },
  { type: 'task_completed', label: 'Task Completed', category: 'task', defaultInApp: true, defaultEmail: false },
  { type: 'mention', label: 'Mention', category: 'social', defaultInApp: true, defaultEmail: true },
  { type: 'approval_requested', label: 'Approval Requested', category: 'approval', defaultInApp: true, defaultEmail: true },
  { type: 'approval_granted', label: 'Approval Granted', category: 'approval', defaultInApp: true, defaultEmail: true },
  { type: 'approval_denied', label: 'Approval Denied', category: 'approval', defaultInApp: true, defaultEmail: true },
  { type: 'agent_completed', label: 'Agent Completed', category: 'agent', defaultInApp: true, defaultEmail: false },
  { type: 'agent_failed', label: 'Agent Failed', category: 'agent', defaultInApp: true, defaultEmail: true },
  { type: 'budget_alert', label: 'Budget Alert', category: 'financial', defaultInApp: true, defaultEmail: true },
  { type: 'security_alert', label: 'Security Alert', category: 'security', defaultInApp: true, defaultEmail: true },
  { type: 'deployment_status', label: 'Deployment Status', category: 'deployment', defaultInApp: true, defaultEmail: false },
  { type: 'comment', label: 'Comment', category: 'social', defaultInApp: true, defaultEmail: false },
  { type: 'system', label: 'System', category: 'system', defaultInApp: true, defaultEmail: false },
  { type: 'deadline_approaching', label: 'Deadline Approaching', category: 'task', defaultInApp: true, defaultEmail: true },
  { type: 'goal_progress', label: 'Goal Progress', category: 'system', defaultInApp: true, defaultEmail: false },
  { type: 'plan_updated', label: 'Plan Updated', category: 'system', defaultInApp: true, defaultEmail: false },
];

const TYPE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  NOTIFICATION_TYPES.map((t) => [t.type, t.label]),
);

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  task: 'Tasks',
  agent: 'Agents',
  approval: 'Approvals',
  security: 'Security',
  system: 'System',
  social: 'Social',
  financial: 'Financial',
  deployment: 'Deployments',
};

/** Human-readable label for a notification type. */
export function getTypeLabel(type: string): string {
  return TYPE_LABEL_MAP[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Human-readable label for a notification category. */
export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category as NotificationCategory] || category;
}

/** Badge variant for a notification priority. */
export function getPriorityColor(priority: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent' {
  switch (priority) {
    case 'urgent':
      return 'danger';
    case 'high':
      return 'warning';
    case 'normal':
      return 'info';
    case 'low':
    default:
      return 'default';
  }
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  types: Partial<Record<NotificationType, { email: boolean; inApp: boolean }>>;
  digestFrequency: DigestFrequency;
}

/** Default notification preferences for a new user. */
export function getDefaultPreferences(): NotificationPreferences {
  const types: NotificationPreferences['types'] = {};
  for (const meta of NOTIFICATION_TYPES) {
    types[meta.type] = { email: meta.defaultEmail, inApp: meta.defaultInApp };
  }
  return {
    emailEnabled: true,
    inAppEnabled: true,
    types,
    digestFrequency: 'daily',
  };
}
