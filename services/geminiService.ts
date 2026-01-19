
import { GoogleGenAI, Type } from "@google/genai";
import { Ticket, Comment } from "../types";

// Always use process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const summarizeTicket = async (ticket: Ticket, comments: Comment[]) => {
  const commentText = comments.map(c => `${c.userId}: ${c.content}`).join('\n');
  const prompt = `
    Summarize the following helpdesk ticket and its conversation history.
    Provide a concise summary of the issue, current status, and next steps.
    
    Ticket Title: ${ticket.title}
    Description: ${ticket.description}
    Conversation:
    ${commentText}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Summarization Error:", error);
    return "Could not generate summary at this time.";
  }
};

export const suggestResponse = async (ticket: Ticket, comments: Comment[]) => {
  const lastUserComment = [...comments].reverse().find(c => c.userId === ticket.creatorId);
  const prompt = `
    As a helpdesk professional (PIC), suggest a helpful and polite response to the following ticket.
    
    Ticket: ${ticket.title}
    Context: ${ticket.description}
    Last client message: ${lastUserComment?.content || "No client messages yet."}
    
    Provide exactly one suggested response.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return "I recommend looking into the reported issue further before responding.";
  }
};

export const classifyTicket = async (title: string, description: string) => {
  const prompt = `
    Classify the following helpdesk ticket title and description into one of these categories:
    Hardware, Software, Bug, Access, Network, Other.
    Also provide a priority recommendation: LOW, MEDIUM, HIGH, URGENT.

    Title: ${title}
    Description: ${description}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            priority: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["category", "priority"]
        }
      }
    });
    // Ensure response text is trimmed before JSON parsing
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Gemini Classification Error:", error);
    return { category: 'Other', priority: 'MEDIUM' };
  }
};
