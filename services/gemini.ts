import { GoogleGenAI } from "@google/genai";
import { ClickUpTask } from '../types';

export const generateExecutiveSummary = async (
  apiKey: string,
  clientName: string,
  tasks: ClickUpTask[]
): Promise<string> => {
  if (tasks.length === 0) return "No data available for analysis.";

  if (!apiKey) {
    const completed = tasks.filter(t => ['complete', 'closed', 'done', 'finished'].includes(t.status.status.toLowerCase())).length;
    const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return `[Mock Summary] Project "${clientName}" has a total of ${tasks.length} tasks, with ${completed} completed (${progress}%). The team's current focus is on the remaining ${tasks.length - completed} pending tasks. Overall, project progress is tracking according to the mapped milestones, with specific attention required on any blocked items.`;
  }

  const ai = new GoogleGenAI({ apiKey });

  // Prepare data for the model
  const taskSummary = tasks.map(t => 
    `- Task: ${t.name} | Status: ${t.status.status} | Assignees: ${t.assignees.map(a => a.username).join(', ') || 'Unassigned'}`
  ).join('\n');

  const prompt = `
    Act as a Senior Project Manager. 
    Analyze the following task list for client "${clientName}".
    
    Tasks:
    ${taskSummary}
    
    Write a professional, concise, 3-sentence executive summary.
    1. Identify completed milestones or progress.
    2. Mention the current focus.
    3. Highlight potential risks based on task statuses (e.g., stuck tasks, lack of assignees).
    
    Do not use markdown formatting like bolding or headers. Keep it plain text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating AI summary. Please check your Google API Key.";
  }
};