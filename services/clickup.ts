import { ClickUpList, ClickUpTask, ClickUpListResponse, ClickUpTaskResponse } from '../types';

const BASE_URL = 'https://api.clickup.com/api/v2';

// Note: In a production environment, ClickUp API calls should go through a proxy to avoid CORS.
// For this demo, we assume the user might use a CORS unblocker or the API permits it in certain contexts.
// If direct browser access fails, this logic remains valid but requires a proxy middleware.

export const fetchLists = async (folderId: string, apiKey: string): Promise<ClickUpList[]> => {
  if (!folderId || !apiKey) return [];

  try {
    const response = await fetch(`${BASE_URL}/folder/${folderId}/list`, {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`ClickUp API Error: ${response.statusText}`);
    }

    const data: ClickUpListResponse = await response.json();
    return data.lists;
  } catch (error) {
    console.error("Failed to fetch lists:", error);
    throw error;
  }
};

export const fetchTasks = async (listId: string, apiKey: string): Promise<ClickUpTask[]> => {
  if (!listId || !apiKey) return [];

  try {
    // Fetching page 0, include subtasks enabled via subtasks=true
    const response = await fetch(`${BASE_URL}/list/${listId}/task?page=0&include_closed=true&subtasks=true`, {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`ClickUp API Error: ${response.statusText}`);
    }

    const data: ClickUpTaskResponse = await response.json();
    return data.tasks;
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    throw error;
  }
};