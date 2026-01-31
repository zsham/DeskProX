
import { GoogleGenAI, Type } from "@google/genai";
import { Ticket, Comment } from "../types";

// Always use process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Fix: Using gemini-3-flash-preview for basic summarization task
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
    // Fix: Handle potential undefined response.text
    return response.text || "Summary not available.";
  } catch (error) {
    console.error("Gemini Summarization Error:", error);
    return "Could not generate summary at this time.";
  }
};

// Fix: Using gemini-3-flash-preview for response suggestion
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
    // Fix: Handle potential undefined response.text
    return response.text || "I recommend looking into the reported issue further before responding.";
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return "I recommend looking into the reported issue further before responding.";
  }
};

// Fix: Using gemini-3-pro-preview for complex classification and reasoning with vision support
export const classifyTicket = async (title: string, description: string, images?: string[]) => {
  const textPart = {
    text: `
      Classify the following helpdesk ticket title and description into one of these categories:
      Hardware, Software, Bug, Access, Network, Other.
      Also provide a priority recommendation: LOW, MEDIUM, HIGH, URGENT.
      If images are provided, use them to confirm the category (e.g., a photo of a broken screen is Hardware).

      Title: ${title}
      Description: ${description}
    `
  };

  const parts: any[] = [textPart];
  
  if (images && images.length > 0) {
    images.forEach(imgBase64 => {
      // Remove data:image/...;base64, prefix if present
      const cleanBase64 = imgBase64.includes(',') ? imgBase64.split(',')[1] : imgBase64;
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: "image/jpeg" 
        }
      });
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
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
    
    // Fix: Handle potential undefined response.text and trim safely
    const text = response.text;
    if (!text) return { category: 'Other', priority: 'MEDIUM' };
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Classification Error:", error);
    return { category: 'Other', priority: 'MEDIUM' };
  }
};
