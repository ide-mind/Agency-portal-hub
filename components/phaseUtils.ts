import { ClickUpTask } from '../types';

export function getPhaseData(tasks: ClickUpTask[]) {
    if (!tasks || tasks.length === 0) return { count: 0, daysText: "No Dates Set", phaseName: "Planning" };

    const getParentId = (t: ClickUpTask): string | null => {
      if (!t.parent) return null;
      if (typeof t.parent === 'object' && (t.parent as any).id) return (t.parent as any).id;
      return String(t.parent);
    };
    
    const tasksById = new Map<string, ClickUpTask>();
    const childrenByParent = new Map<string, ClickUpTask[]>();
    const roots: ClickUpTask[] = [];

    tasks.forEach(t => tasksById.set(t.id, t));

    tasks.forEach(t => {
      const pId = getParentId(t);
      if (pId && tasksById.has(pId)) {
        if (!childrenByParent.has(pId)) childrenByParent.set(pId, []);
        childrenByParent.get(pId)!.push(t);
      } else {
        roots.push(t);
      }
    });

    const STAGES = [
      { id: 'planning', label: 'Planning', keywords: ['planning', 'strategy', 'discovery'] },
      { id: 'design', label: 'Design', keywords: ['design', 'wireframe', 'ui', 'ux'] },
      { id: 'revision', label: 'Revision', keywords: ['revision', 'feedback', 'review'] },
      { id: 'testing', label: 'Testing', keywords: ['testing', 'qa', 'staging'] },
      { id: 'handoff', label: 'Handoff', keywords: ['handoff', 'delivery', 'live', 'prod'] }
    ];

    const buckets = STAGES.map(stage => ({ ...stage, items: [] as ClickUpTask[], mainTask: null as ClickUpTask | null }));

    roots.forEach(root => {
      const statusLower = root.status.status.toLowerCase();
      const nameLower = root.name.toLowerCase();
      let targetBucketIndex = -1;
      for (let i = 0; i < buckets.length; i++) {
        if (buckets[i].keywords.some(k => statusLower.includes(k) || nameLower.includes(k))) {
          targetBucketIndex = i;
          break;
        }
      }
      if (targetBucketIndex !== -1) {
        buckets[targetBucketIndex].items.push(root);
        if (childrenByParent.has(root.id)) {
          buckets[targetBucketIndex].items.push(...childrenByParent.get(root.id)!);
        }
      }
    });

    buckets.forEach(bucket => {
        const exactMatch = bucket.items.find(t => t.name.trim().toLowerCase() === bucket.label.toLowerCase());
        const looseMatch = bucket.items.find(t => t.name.toLowerCase().includes(bucket.label.toLowerCase()));
        bucket.mainTask = exactMatch || looseMatch || null;
    });

    const isDone = (status?: string) => ['complete', 'closed', 'done', 'finished'].includes(status?.toLowerCase() || '');
    const isInProgress = (status?: string) => ['in progress', 'running', 'doing', 'active', 'development', 'in review', 'review', 'planning'].includes(status?.toLowerCase() || '');

    let activeBucket = buckets.find(b => b.mainTask && isInProgress(b.mainTask.status.status));
    if (!activeBucket) {
        activeBucket = buckets.find(b => b.mainTask && !isDone(b.mainTask.status.status));
    }
    if (!activeBucket && buckets.some(b => b.mainTask)) {
        activeBucket = [...buckets].reverse().find(b => b.mainTask); 
    }

    if (!activeBucket || !activeBucket.mainTask) return { count: 0, daysText: "No Dates Set", phaseName: "Planning" };

    const activeSubtasks = activeBucket.items.filter(t => t.id !== activeBucket!.mainTask!.id && !isDone(t.status.status));
    const count = activeSubtasks.length;
    
    const rootTarget = activeBucket.mainTask;

    let daysText = "-";
    if (rootTarget.start_date && rootTarget.due_date) {
        const start = new Date(parseInt(rootTarget.start_date));
        const due = new Date(parseInt(rootTarget.due_date));
        const diffTime = Math.abs(due.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysText = `${diffDays} Days Phase`;
    } else if (rootTarget.due_date) {
        const due = new Date(parseInt(rootTarget.due_date));
        const now = new Date();
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) daysText = `${Math.abs(diffDays)} Days Overdue`;
        else daysText = `${diffDays} Days Left`;
    } else {
        daysText = "No Dates Set";
    }

    return { count, daysText, phaseName: activeBucket.label };
}
