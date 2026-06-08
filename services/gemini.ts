import { ClickUpTask } from '../types';

export const generateExecutiveSummary = async (
  clientName: string,
  tasks: ClickUpTask[]
): Promise<string> => {
  if (tasks.length === 0) return "No data available for analysis.";

  try {
    const response = await fetch('/api/gemini/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ clientName, tasks })
    });
    
    if (!response.ok) {
        throw new Error("Failed to fetch summary from server");
    }
    const data = await response.json();
    return data.summary || "Could not generate summary.";
  } catch (error) {
    console.error("Server API Error:", error);
    return "Error generating AI summary.";
  }
};
