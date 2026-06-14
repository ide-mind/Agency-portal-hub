import 'dotenv/config';

async function test() {
  const apiKey = process.env.CLICKUP_API_KEY;
  const folderId = process.env.CLICKUP_FOLDER_ID;
  const res = await fetch(`https://api.clickup.com/api/v2/folder/${folderId}/list`, {
    headers: { Authorization: apiKey }
  });
  const listsData = await res.json();
  const listId = listsData.lists[0].id;
  
  const tasksRes = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?page=0&include_closed=true&subtasks=true`, {
    headers: { Authorization: apiKey }
  });
  const tasksData = await tasksRes.json();
  
  const tasks = tasksData.tasks || [];
  
  console.log("Total tasks fetched:", tasks.length);
  
  const planningTasks = tasks.filter(t => t.name.toLowerCase().includes('planning'));
  console.log("Planning tasks:", planningTasks.map(t => ({ id: t.id, name: t.name, parent: t.parent })));
  
  // Find subtasks of the first planning task
  if (planningTasks.length > 0) {
      const pid = planningTasks[0].id;
      const subtasks = tasks.filter(t => t.parent === pid || (t.parent && t.parent.id === pid));
      console.log(`Subtasks of ${pid}:`, subtasks.length);
      console.log("First subtask:", subtasks[0] ? { id: subtasks[0].id, name: subtasks[0].name, parent: subtasks[0].parent } : null);
  }
}

test();
