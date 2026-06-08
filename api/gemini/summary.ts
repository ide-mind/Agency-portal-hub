import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    const { clientName, tasks } = req.body;
    
    if (!tasks || tasks.length === 0) {
      return res.json({ summary: "No data available for analysis." });
    }

    if (!apiKey) {
      const completed = tasks.filter((t: any) => ['complete', 'closed', 'done', 'finished'].includes(t.status.status.toLowerCase())).length;
      const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
      return res.json({ summary: `[Mock Summary] Project "${clientName}" has a total of ${tasks.length} tasks, with ${completed} completed (${progress}%). The team's current focus is on the remaining ${tasks.length - completed} pending tasks. Overall, project progress is tracking according to the mapped milestones, with specific attention required on any blocked items.` });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const taskSummary = tasks.map((t: any) => 
      `- Task: ${t.name} | Status: ${t.status.status} | Assignees: ${t.assignees?.map((a: any) => a.username).join(', ') || 'Unassigned'}`
    ).join('\n');

    const prompt = `
        Act as a Senior Project Manager. 
        Review the following task list for the project "${clientName}".
        Write a concise, professional 3-4 sentence project update summary intended for the client.
        Focus on what is completed, what is in progress, and the overall status. Do not include greetings or sign-offs.

        Tasks:
        ${taskSummary}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return res.json({ summary: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
