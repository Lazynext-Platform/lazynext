export function taskOutputUrls(value: unknown): string[] {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (output): output is string => typeof output === 'string' && output.length > 0,
  );
}

type TaskCandidate = {
  templateId: string;
  cost: number;
};

export function isInternalTaskTemplate(templateId: string): boolean {
  return templateId.includes(':') || templateId.endsWith('-shot');
}

/**
 * The same Atlas getUrl may be attached to both a "creation placeholder" and an internal billing task.
 * Status claiming, refunds and persistence must land on the internal task, never mistakenly operating on a cost=0 creation placeholder.
 */
export function selectInternalTask<T extends TaskCandidate>(tasks: T[]): T | undefined {
  return tasks.find((task) => isInternalTaskTemplate(task.templateId))
    || tasks.find((task) => task.cost > 0)
    || tasks[0];
}
