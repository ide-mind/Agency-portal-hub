import 'dotenv/config';

import fetch from 'node-fetch';

async function test() {
  const apiKey = process.env.CLICKUP_API_KEY;
  const folderId = process.env.CLICKUP_FOLDER_ID;
  if(!apiKey || !folderId) {
    console.log("Missing credentials.");
    return;
  }
  
  const listsData = await fetch(`https://api.clickup.com/api/v2/folder/${folderId}/list`, {
    headers: { 'Authorization': apiKey }
  });
  const lists = await listsData.json();
  const listId = lists.lists[0].id;
  
  const tasksData = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?page=0&include_closed=true&subtasks=true`, {
    headers: { 'Authorization': apiKey }
  });
  
  const data = await tasksData.json();
  const tasks = data.tasks || [];
  
  // LOGIC FROM CLIENTPORTAL
  const getParentId = (t) => {
    if (!t.parent) return null;
    if (typeof t.parent === 'object' && t.parent.id) return t.parent.id;
    return String(t.parent);
  };
  
  const tasksById = new Map();
  const childrenByParent = new Map();
  const roots = [];

  tasks.forEach(t => tasksById.set(t.id, t));

  tasks.forEach(t => {
    const pId = getParentId(t);
    if (pId && tasksById.has(pId)) {
      if (!childrenByParent.has(pId)) childrenByParent.set(pId, []);
      childrenByParent.get(pId).push(t);
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

  const buckets = STAGES.map(stage => ({ ...stage, items: [], mainTask: null }));

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
        buckets[targetBucketIndex].items.push(...childrenByParent.get(root.id));
      }
    }
  });

  buckets.forEach(bucket => {
      const exactMatch = bucket.items.find(t => t.name.trim().toLowerCase() === bucket.label.toLowerCase());
      const looseMatch = bucket.items.find(t => t.name.toLowerCase().includes(bucket.label.toLowerCase()));
      bucket.mainTask = exactMatch || looseMatch || null;
  });

  const isDone = (status) => ['complete', 'closed', 'done', 'finished'].includes(status?.toLowerCase() || '');
  const isInProgress = (status) => ['in progress', 'running', 'doing', 'active', 'development', 'in review', 'review', 'planning'].includes(status?.toLowerCase() || '');

  let activeBucket = buckets.find(b => b.mainTask && isInProgress(b.mainTask.status.status));
  if (!activeBucket) {
      activeBucket = buckets.find(b => b.mainTask && !isDone(b.mainTask.status.status));
  }
  if (!activeBucket && buckets.some(b => b.mainTask)) {
      activeBucket = [...buckets].reverse().find(b => b.mainTask); 
  }

  console.log("Buckets:", buckets.map(b => ({ label: b.label, mainTaskName: b.mainTask?.name, itemsCount: b.items.length })));
  console.log("Active Bucket:", activeBucket ? activeBucket.label : 'None');

  if (activeBucket) {
      const activeSubtasks = activeBucket.items.filter(t => t.id !== activeBucket.mainTask.id && !isDone(t.status.status));
      console.log("Active Subtasks count:", activeSubtasks.length);
      console.log("MainTask dates:", "start_date:", activeBucket.mainTask.start_date, "due_date:", activeBucket.mainTask.due_date);
  }

}

test();
