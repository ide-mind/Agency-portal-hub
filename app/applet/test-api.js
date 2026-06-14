const https = require('https');
const fs = require('fs');
const path = require('path');

function fetch(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  let CLICKUP_API_KEY, CLICKUP_FOLDER_ID;
  for (const line of envFile.split('\n')) {
      if (line.startsWith('CLICKUP_API_KEY=')) CLICKUP_API_KEY = line.split('=')[1].trim();
      if (line.startsWith('CLICKUP_FOLDER_ID=')) CLICKUP_FOLDER_ID = line.split('=')[1].trim();
  }
  const apiKey = CLICKUP_API_KEY;
  const folderId = CLICKUP_FOLDER_ID;
  if(!apiKey || !folderId) {
    console.log("Missing credentials.");
    return;
  }
  
  const listsData = await fetch(`https://api.clickup.com/api/v2/folder/${folderId}/list`, {
    headers: { 'Authorization': apiKey }
  });
  const listId = listsData.lists[0].id;
  
  const tasksData = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?page=0&include_closed=true&subtasks=true`, {
    headers: { 'Authorization': apiKey }
  });
  
  const tasks = tasksData.tasks || [];
  console.log("Total tasks fetched:", tasks.length);
  
  const planningTasks = tasks.filter(t => t.name.toLowerCase().includes('planning'));
  console.log("Planning roots:", planningTasks.filter(t => !t.parent).map(t => ({ id: t.id, name: t.name, parent: t.parent })));
  
  const roots = tasks.filter(t => !t.parent);
  console.log("Found roots:", roots.length);

  // Group by parent
  const parentMap = new Map();
  tasks.forEach(t => {
      let pid = t.parent;
      if (pid && typeof pid === 'object') pid = pid.id;
      if (!parentMap.has(pid)) parentMap.set(pid, []);
      parentMap.get(pid).push(t);
  });
  console.log("Roots with subtasks:");
  roots.forEach(r => {
      if (parentMap.has(r.id)) {
          console.log(`- ${r.name} has ${parentMap.get(r.id).length} subtasks`);
      }
  });

  console.log("Found parent fields type:");
  const subtasks = tasks.filter(t => !!t.parent);
  if (subtasks.length > 0) {
      console.log(typeof subtasks[0].parent, subtasks[0].parent);
  }

})();
